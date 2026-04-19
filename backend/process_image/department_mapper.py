"""
department_mapper.py — Category-to-department mapper for JanSevaAI Lambda.

Maps detected issue categories to the responsible municipal department.
"""

import logging

logger = logging.getLogger(__name__)

# ── Department Lookup Table ──────────────────────────────────────────────────
# Labels must match worker `department` values in Admin (PWD, Sanitation, …).
DEPARTMENT_MAP: dict[str, str] = {
    "pothole":     "PWD",
    "garbage":     "Sanitation",
    "water":       "Water Supply",
    "streetlight": "Electricity",
}

DEFAULT_DEPARTMENT: str = "PWD"


def get_department(category: str) -> str:
    """
    Return the municipal department responsible for a given issue category.

    Args:
        category: Detected issue type (case-insensitive).

    Returns:
        Department name string. Falls back to PWD if the category is not recognized.
    """
    cat = category.lower().strip()
    department = DEPARTMENT_MAP.get(cat, DEFAULT_DEPARTMENT)

    if department == DEFAULT_DEPARTMENT:
        logger.info(
            "No specific department for category '%s' — using '%s'",
            category,
            DEFAULT_DEPARTMENT,
        )

    return department
