---
milestone: Worker Visibility Fix
version: 1.1.0
updated: 2026-03-27T10:55:00Z
---

# Roadmap

> **Current Phase:** 1 - Investigation
> **Status:** planning

## Must-Haves (from SPEC)

- [ ] Restore List Visibility
- [ ] Harden Auth Flow
- [ ] Audit Data Mapping

---

## Phases

### Phase 1: Investigation & Diagnostics
**Status:** 🔄 In Progress
**Objective:** Identify the root cause of the empty worker list (Auth vs Data vs Network).

**Plans:**
- [ ] Plan 1.1: Audit Lambda logs and JWT secrets.
- [ ] Plan 1.2: Capture failing network request in browser.

---

### Phase 2: Backend Hardening
**Status:** ⬜ Not Started
**Objective:** Ensure Lambda returns data reliably to authenticated admins.

**Plans:**
- [ ] Plan 2.1: Synchronize JWT_SECRET across all Lambdas.
- [ ] Plan 2.2: Ensure `manage_workers` handles path parsing correctly.

---

### Phase 3: Frontend Integration
**Status:** ⬜ Not Started
**Objective:** Update React components to handle and display worker data correctly.

**Plans:**
- [ ] Plan 3.1: Remove mock fallback from `getWorkers` in `api.js`.
- [ ] Plan 3.2: Verify normalization logic in `AdminWorkers.jsx`.

---

### Phase 4: Final Verification
**Status:** ⬜ Not Started
**Objective:** Prove the fix with empirical evidence.

**Plans:**
- [ ] Plan 4.1: Capture screenshot of populated workers table.
- [ ] Plan 4.2: Verify "Active Workers" count accuracy.

---

## Progress Summary

| Phase | Status | Plans | Complete |
|-------|--------|-------|----------|
| 1 | 🔄 | 0/2 | — |
| 2 | ⬜ | 0/2 | — |
| 3 | ⬜ | 0/2 | — |
| 4 | ⬜ | 0/2 | — |
