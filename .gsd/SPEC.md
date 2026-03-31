# SPEC.md — Worker Visibility Restoration

> **Status**: `FINALIZED`
>
> ⚠️ **Planning Lock**: No code may be written until this spec is marked `FINALIZED`.

## Vision
Permanently resolve the "No workers found" regression on the JanSevaAI Admin Workers dashboard to ensure municipal administrators can manage their field workforce reliably.

## Goals
1. **Restore List Visibility** — Ensure the 4+ registered workers in the DynamoDB `Workers` table are correctly reflected in the UI.
2. **Harden Auth Flow** — Eliminate silent failures in the `getWorkers` API call.
3. **Audit Data Mapping** — Ensure DynamoDB attribute names match the frontend's expected schema.

## Non-Goals (Out of Scope)
- Adding new worker features (messaging, tracking).
- Refactoring the entire auth service.
- Changing the database schema.

## Constraints
- Must use existing AWS Lambda and DynamoDB infrastructure.
- Must maintain JWT role-based access control (Admin only).
- Performance must remain under 2s for worker list retrieval.

## Success Criteria
- [ ] `getWorkers` API call returns `200 OK` with 4+ items.
- [ ] Admin Workers page displays worker names, phones, and departments.
- [ ] Total count in the "Active Workers" stat matches the table count.
- [ ] Verification evidence (Screenshot + Console output) captured.

## Technical Requirements

| Requirement | Priority | Notes |
|-------------|----------|-------|
| JWT Consistency | Must-have | `auth` and `manage_workers` must use same secret. |
| Error Transparency | Must-have | Disable silent mock fallback for `/workers`. |
| Path Robustness | Must-have | Handle proxy path variations in Lambda. |

---

*Last updated: 2026-03-27*
