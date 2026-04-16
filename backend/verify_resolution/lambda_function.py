"""
verify_resolution.py — AI-powered Proof-of-Resolution verifier for JanSevaAI.

Triggered by S3 when a worker uploads a resolution proof photo (key pattern: *_99.*).
Compares the "Before" (citizen's original photo) with the "After" (worker's proof)
using Amazon Bedrock Nova Lite Vision to verify the fix is genuine.

Anti-Corruption Layer:
- Checks if both photos are from the same location (visual landmarks).
- Checks if the civic issue has actually been resolved.
- Flags suspicious resolutions for Admin review.
"""

import json
import logging
import os
import urllib.parse
from decimal import Decimal
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

REGION = os.environ.get("REGION", "ap-south-1")
TABLE_NAME = os.environ.get("TABLE_NAME", "Complaints")
# Vision model for before/after comparison — Amazon Nova Lite in us-east-1
VISION_MODEL_ID = os.environ.get("VISION_MODEL_ID", "amazon.nova-lite-v1:0")

s3_client = boto3.client("s3", region_name=REGION)
dynamodb = boto3.resource("dynamodb", region_name=REGION)
nova_client = boto3.client("bedrock-runtime", region_name="us-east-1")

VERIFICATION_PROMPT = (
    "You are an AI auditor for a municipal complaint resolution system. "
    "You are given TWO images:\n\n"
    "IMAGE 1 (BEFORE): The original civic complaint photo submitted by a citizen. "
    "It shows a civic issue like a pothole, garbage dump, broken streetlight, or waterlogging.\n\n"
    "IMAGE 2 (AFTER): A resolution proof photo uploaded by a field worker who claims to have fixed the issue.\n\n"
    "Your job is to verify the resolution by answering THREE questions:\n\n"
    "1. LOCATION MATCH: Do both photos appear to be taken at the SAME location? "
    "Look for matching visual landmarks (buildings, walls, trees, road markings, sidewalks, signs).\n\n"
    "2. ISSUE RESOLVED: Has the civic issue been genuinely fixed? "
    "For example: pothole filled with asphalt, garbage cleaned up, streetlight repaired, water drained.\n\n"
    "3. CONFIDENCE: How confident are you in your assessment (0.0 to 1.0)?\n\n"
    "Respond with ONLY a JSON object. Examples:\n"
    'Genuine fix:      {"location_match": true, "issue_resolved": true, "confidence": 0.92, "summary": "Pothole properly filled with asphalt. Same road corner visible."}\n'
    'Suspicious:       {"location_match": false, "issue_resolved": false, "confidence": 0.85, "summary": "Photos appear to be from different locations. No matching landmarks."}\n'
    'Partial fix:      {"location_match": true, "issue_resolved": false, "confidence": 0.78, "summary": "Same location confirmed but garbage is still partially visible."}'
)


def get_image_bytes(bucket, key):
    """Download image from S3 and return raw bytes + format."""
    response = s3_client.get_object(Bucket=bucket, Key=key)
    image_bytes = response["Body"].read()
    ext = key.rsplit(".", 1)[-1].lower()
    if ext == "jpg":
        ext = "jpeg"
    if ext not in ["jpeg", "png", "webp", "gif"]:
        ext = "jpeg"
    return image_bytes, ext


def find_original_image_key(bucket, incident_id):
    """Find the original complaint image (index 1) for this incident."""
    # Try common extensions
    for ext in ["jpg", "jpeg", "png", "webp"]:
        candidate_key = f"complaints/{incident_id}_1.{ext}"
        try:
            s3_client.head_object(Bucket=bucket, Key=candidate_key)
            logger.info("Found original image: %s", candidate_key)
            return candidate_key
        except Exception:
            continue

    # Fallback: list objects with the incident_id prefix
    try:
        response = s3_client.list_objects_v2(
            Bucket=bucket, Prefix=f"complaints/{incident_id}_1", MaxKeys=5
        )
        contents = response.get("Contents", [])
        if contents:
            key = contents[0]["Key"]
            logger.info("Found original image via listing: %s", key)
            return key
    except Exception as exc:
        logger.warning("Could not list original images: %s", str(exc))

    return None


def verify_with_nova(before_bytes, before_fmt, after_bytes, after_fmt):
    """Send both images to Amazon Nova Lite Vision for comparison."""
    try:
        response = nova_client.converse(
            modelId=VISION_MODEL_ID,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"text": VERIFICATION_PROMPT},
                        {
                            "image": {
                                "format": before_fmt,
                                "source": {"bytes": before_bytes},
                            }
                        },
                        {
                            "image": {
                                "format": after_fmt,
                                "source": {"bytes": after_bytes},
                            }
                        },
                    ],
                }
            ],
            inferenceConfig={"temperature": 0.1, "maxTokens": 300},
        )

        completion = response["output"]["message"]["content"][0]["text"].strip()

        # Strip markdown code blocks
        if completion.startswith("```"):
            completion = completion.split("\n", 1)[1]
            if completion.endswith("```"):
                completion = completion.rsplit("\n", 1)[0]

        result = json.loads(completion)
        logger.info("Nova verification result: %s", json.dumps(result))
        return result

    except Exception as exc:
        logger.error("Nova verification failed: %s", str(exc))
        return {
            "location_match": None,
            "issue_resolved": None,
            "confidence": 0.0,
            "summary": f"Verification failed: {str(exc)}",
        }


def determine_verification_status(result):
    """Map Nova's response to a verification status."""
    location_match = result.get("location_match")
    issue_resolved = result.get("issue_resolved")
    confidence = float(result.get("confidence", 0.0))

    if location_match and issue_resolved and confidence >= 0.7:
        return "verified"
    elif location_match is False or issue_resolved is False:
        return "suspicious"
    else:
        return "pending_review"


def update_dynamodb(incident_id, verification_status, verification_details):
    """Update the complaint record with verification results."""
    table = dynamodb.Table(TABLE_NAME)

    update_expr = (
        "SET verification_status = :vs, "
        "verification_details = :vd"
    )
    # Normalize verification_details for DynamoDB (Floats -> Decimals)
    if isinstance(verification_details, dict) and "confidence" in verification_details:
        verification_details["confidence"] = Decimal(str(verification_details["confidence"]))

    expr_vals = {
        ":vs": verification_status,
        ":vd": verification_details,
    }

    # If suspicious, set a flag for admin attention
    if verification_status == "suspicious":
        update_expr += ", is_suspicious = :sus"
        expr_vals[":sus"] = True

    table.update_item(
        Key={"incident_id": incident_id},
        UpdateExpression=update_expr,
        ExpressionAttributeValues=expr_vals,
    )
    logger.info(
        "Updated %s verification_status=%s", incident_id, verification_status
    )


def lambda_handler(event, context):
    logger.info("Received event: %s", json.dumps(event, default=str))

    # 1. Extract S3 event
    try:
        record = event["Records"][0]["s3"]
        bucket = record["bucket"]["name"]
        key = urllib.parse.unquote_plus(record["object"]["key"])
    except (KeyError, IndexError) as exc:
        logger.error("Malformed S3 event: %s", str(exc))
        return {"status": "Error", "message": "Invalid S3 event payload"}

    # 2. Only process proof photos (index 99)
    filename = key.split("/")[-1]
    name_part = filename.rsplit(".", 1)[0]

    if "_99" not in name_part:
        logger.info("Not a proof photo, skipping: %s", key)
        return {"status": "Skipped", "reason": "Not a proof photo"}

    # Extract incident_id (everything before _99)
    incident_id = name_part.rsplit("_99", 1)[0]
    logger.info(
        "Processing proof photo for incident %s — bucket=%s key=%s",
        incident_id, bucket, key,
    )

    # 3. Find the original complaint image
    original_key = find_original_image_key(bucket, incident_id)
    if not original_key:
        logger.warning("No original image found for %s, marking as pending_review", incident_id)
        update_dynamodb(incident_id, "pending_review", {
            "summary": "Original complaint photo not found. Manual review required.",
            "confidence": 0.0,
        })
        return {"status": "PendingReview", "reason": "No original image"}

    # 4. Download both images
    logger.info("Downloading before=%s and after=%s", original_key, key)
    before_bytes, before_fmt = get_image_bytes(bucket, original_key)
    after_bytes, after_fmt = get_image_bytes(bucket, key)

    # 5. AI Verification via Nova
    result = verify_with_nova(before_bytes, before_fmt, after_bytes, after_fmt)

    # 6. Determine status
    verification_status = determine_verification_status(result)
    logger.info("Verdict: %s (confidence=%.2f)", verification_status, result.get("confidence", 0))

    # 7. Update DynamoDB
    update_dynamodb(incident_id, verification_status, result)

    return {
        "status": "Verified",
        "incident_id": incident_id,
        "verification_status": verification_status,
        "confidence": result.get("confidence", 0),
        "summary": result.get("summary", ""),
    }
