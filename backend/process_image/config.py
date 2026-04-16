"""
config.py — Environment variable loader for JanSevaAI process_image Lambda.

Centralizes all environment variable access so that no other module
reads os.environ directly. Provides sensible defaults for local testing.
"""

import os


# ── AWS Region ───────────────────────────────────────────────────────────────
REGION: str = os.environ.get("REGION", "ap-south-1")

# ── S3 ───────────────────────────────────────────────────────────────────────
BUCKET_NAME: str = os.environ.get("BUCKET_NAME", "JanSevaAI-images")

# ── DynamoDB ─────────────────────────────────────────────────────────────────
TABLE_NAME: str = os.environ.get("TABLE_NAME", "Complaints")

# ── YOLO FastAPI Inference Endpoint (EC2) ────────────────────────────────────
EC2_ENDPOINT: str = os.environ.get("EC2_ENDPOINT", "http://localhost:8000/predict")

# ── Amazon Bedrock Models ────────────────────────────────────────────────────
# Text generation (complaint descriptions) — Amazon Nova Micro in us-east-1
TEXT_MODEL_ID: str = os.environ.get("TEXT_MODEL_ID", "amazon.nova-micro-v1:0")
# Vision/classification (image analysis & resolution verification) — Amazon Nova Lite in us-east-1
VISION_MODEL_ID: str = os.environ.get("VISION_MODEL_ID", "amazon.nova-lite-v1:0")

# ── Amazon SES ───────────────────────────────────────────────────────────────
SES_SOURCE_EMAIL: str = os.environ.get("SES_SOURCE_EMAIL", "").strip()

# ── Amazon SNS (SMS) ────────────────────────────────────────────────────────
SMS_NOTIFICATIONS_ENABLED: bool = os.environ.get("SMS_NOTIFICATIONS_ENABLED", "true").lower() in (
	"1",
	"true",
	"yes",
)

# ── Timeouts (seconds) ──────────────────────────────────────────────────────
# Default increased to 25s to better tolerate cold starts/network jitter.
YOLO_TIMEOUT: int = int(os.environ.get("YOLO_TIMEOUT", "25"))
