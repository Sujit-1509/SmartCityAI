"""
Pick a field worker for a complaint department by scanning the Workers table.
Uses a stable hash of incident_id to spread load across multiple workers in the same department.
"""

from __future__ import annotations

import hashlib
import logging

from aws_utils import dynamodb_resource
from config import WORKERS_TABLE_NAME

logger = logging.getLogger(__name__)


def select_worker_for_department(department: str, incident_id: str) -> tuple[str, str] | None:
    """
    Return (phone, name) for a worker whose department matches `department`, or None.
    Matching is case-insensitive on both sides.
    """
    if not department or not incident_id:
        return None

    dept_norm = department.strip().lower()
    table = dynamodb_resource.Table(WORKERS_TABLE_NAME)
    matches: list[tuple[str, str]] = []
    scan_kwargs: dict = {}

    try:
        while True:
            response = table.scan(**scan_kwargs)
            for item in response.get("Items", []):
                wdept = (item.get("department") or "").strip().lower()
                if wdept != dept_norm:
                    continue
                phone = item.get("phone")
                if not phone:
                    continue
                name = item.get("name") or phone
                matches.append((phone, name))
            lek = response.get("LastEvaluatedKey")
            if not lek:
                break
            scan_kwargs["ExclusiveStartKey"] = lek
    except Exception as exc:
        logger.error("Workers scan failed for auto-assign: %s", exc)
        return None

    if not matches:
        logger.info(
            "No worker found for department %r (incident %s); leaving complaint unassigned",
            department,
            incident_id,
        )
        return None

    matches.sort(key=lambda x: x[0])
    h = int(hashlib.md5(incident_id.encode("utf-8")).hexdigest(), 16)
    chosen = matches[h % len(matches)]
    logger.info(
        "Auto-assign incident %s to worker %s (%d eligible in %r)",
        incident_id,
        chosen[0],
        len(matches),
        department,
    )
    return chosen
