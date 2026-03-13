import logging
import boto3
from decimal import Decimal
from boto3.dynamodb.conditions import Attr

logger = logging.getLogger(__name__)

# scoring weights
SEVERITY_SCORES = {
    "high":           40,
    "medium":         25,
    "low":            10,
    "pending review":  5,
}

CATEGORY_SCORES = {
    "pothole":     20,   # Vehicles can be damaged, safety hazard
    "water":       25,   # Waterlogging/flooding, public health risk
    "garbage":     15,   # Sanitation, but lower immediate danger
    "streetlight": 18,   # Safety at night, crime risk
}

DEFAULT_CATEGORY_SCORE = 10

# Nearby duplicates within this radius (in degrees, ~1km ≈ 0.009)
NEARBY_THRESHOLD_DEG = 0.01
DUPLICATE_BOOST_PER_MATCH = 5  # +5 per nearby same-category complaint
MAX_DUPLICATE_BOOST = 20       # Cap at +20


def calculate_priority(
    category: str,
    severity: str,
    confidence: float,
    latitude: float = None,
    longitude: float = None,
    table_name: str = None,
) -> int:
    # calculate a priority score from 0-100 based on severity, category, confidence, and duplicates
    score = 0
    cat = category.lower().strip()
    sev = severity.lower().strip()

    # 1. severity score
    score += SEVERITY_SCORES.get(sev, 5)

    # 2. category danger score
    score += CATEGORY_SCORES.get(cat, DEFAULT_CATEGORY_SCORE)

    # 3. confidence score
    conf_score = int(min(confidence, 1.0) * 15)
    score += conf_score

    # 4. duplicate boost
    duplicate_boost = 0
    if latitude and longitude and table_name:
        try:
            duplicate_boost = _count_nearby_duplicates(
                cat, latitude, longitude, table_name
            )
        except Exception as exc:
            logger.warning("Duplicate lookup failed: %s", str(exc))

    score += min(duplicate_boost * DUPLICATE_BOOST_PER_MATCH, MAX_DUPLICATE_BOOST)

    # Clamp to 0–100
    final_score = max(0, min(100, score))

    logger.info(
        "Priority calculated: severity=%d, category=%d, confidence=%d, "
        "duplicates=%d (boost=%d) → total=%d",
        SEVERITY_SCORES.get(sev, 5),
        CATEGORY_SCORES.get(cat, DEFAULT_CATEGORY_SCORE),
        conf_score,
        duplicate_boost,
        min(duplicate_boost * DUPLICATE_BOOST_PER_MATCH, MAX_DUPLICATE_BOOST),
        final_score,
    )

    return final_score


def _count_nearby_duplicates(
    category: str,
    latitude: float,
    longitude: float,
    table_name: str,
) -> int:
    # query dynamodb for similar complaints nearby
    dynamodb = boto3.resource("dynamodb", region_name="ap-south-1")
    table = dynamodb.Table(table_name)

    lat_min = Decimal(str(latitude - NEARBY_THRESHOLD_DEG))
    lat_max = Decimal(str(latitude + NEARBY_THRESHOLD_DEG))
    lng_min = Decimal(str(longitude - NEARBY_THRESHOLD_DEG))
    lng_max = Decimal(str(longitude + NEARBY_THRESHOLD_DEG))

    try:
        response = table.scan(
            FilterExpression=(
                Attr("category").eq(category)
                & Attr("latitude").between(lat_min, lat_max)
                & Attr("longitude").between(lng_min, lng_max)
            ),
            ProjectionExpression="incident_id",
            Limit=50,
        )
        count = response.get("Count", 0)
        logger.info(
            "Found %d nearby '%s' complaints within %.4f° radius",
            count, category, NEARBY_THRESHOLD_DEG,
        )
        return count
    except Exception as exc:
        logger.warning("DynamoDB scan for duplicates failed: %s", str(exc))
        return 0
