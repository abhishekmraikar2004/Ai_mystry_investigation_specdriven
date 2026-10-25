# API notes

All routes use `/api/v1`. Errors use `{ "error": { "code": "...", "message": "..." } }`. Case creation requires `Idempotency-Key`; case-specific endpoints require the HttpOnly access cookie.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Service health |
| POST | `/cases` | Validate and queue a case |
| GET | `/cases/:caseId/status` | Generation progress |
| GET | `/cases/:caseId` | Player-safe case and prior result |
| GET | `/cases/:caseId/evidence/:evidenceId` | Open and record evidence |
| POST | `/cases/:caseId/hints` | Unlock the next progressive hint |
| POST | `/cases/:caseId/accusation` | Submit the one final accusation |
