import json
import base64
import hmac
import hashlib
import time
import boto3

# --- Configuration ---
SECRET_KEY = "civicai-secure-prod-key-6dae2333-1348-4cf7-aba1-47311f1e6501"
LAMBDA_NAME = "civicai-update-status"
REGION = "ap-south-1"
# Real complaint ID with GPS: 18.460491, 73.8558385
INCIDENT_ID = "bb9389db-9abc-4caa-9bfc-72db8d5200ce"

def create_mock_token(phone="9999999999", role="worker"):
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip('=')
    payload_data = {
        "phone": phone,
        "role": role,
        "exp": int(time.time()) + 3600
    }
    payload = base64.urlsafe_b64encode(json.dumps(payload_data).encode()).decode().rstrip('=')
    sig = base64.urlsafe_b64encode(
        hmac.new(SECRET_KEY.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    ).decode().rstrip('=')
    return f"{header}.{payload}.{sig}"

def test_geofence(lat, lng, desc):
    print(f"\n--- Testing: {desc} ({lat}, {lng}) ---")
    token = create_mock_token()
    client = boto3.client('lambda', region_name=REGION)
    
    event = {
        "path": f"/complaints/{INCIDENT_ID}/status",
        "httpMethod": "PATCH",
        "headers": {
            "Authorization": f"Bearer {token}"
        },
        "body": json.dumps({
            "status": "resolved",
            "resolveLocation": {"lat": lat, "lng": lng},
            "notes": f"Verification test: {desc}"
        })
    }
    
    response = client.invoke(
        FunctionName=LAMBDA_NAME,
        InvocationType='RequestResponse',
        Payload=json.dumps(event)
    )
    
    result = json.loads(response['Payload'].read().decode())
    print(f"Status Code: {result.get('statusCode')}")
    print(f"Body: {result.get('body')}")
    return result

if __name__ == "__main__":
    # Test 1: FAR AWAY (Should fail)
    # Target is 18.46, 73.85. 18.5, 73.9 is ~6km away
    test_geofence(18.5, 73.9, "Far Away (500m+ fail test)")
    
    # Test 2: CLOSE (Should succeed)
    # Target 18.460491, 73.8558385. This is ~10m away.
    test_geofence(18.4605, 73.85585, "Close (10m success test)")
