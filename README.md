# Activity API

A small, production-ready backend to log activity updates and expose current status (`building`, `learning`) over HTTP.

This API is designed for long-term personal use and acts as a single source of truth for:
- activity logs
- current work and learning status

Live URL:  
https://activity-api.mohitgauniyal.workers.dev

##### Code -> Local Test -> Git Commit/Push -> Deploy
---

## Development & Deployment Workflow

### Local development
Run the API locally for testing:
```bash
wrangler dev
```

---

### Deploying to production
Push the current code live:
```bash
wrangler deploy
```

This is the **only command** that updates the live API.  
Editing files alone does not affect production.

---

### Recommended daily flow
```text
Edit code
↓
wrangler dev
↓
git commit
↓
wrangler deploy
```

---

## Secrets

Admin-only endpoints require an admin token.

Set once:
```bash
wrangler secret put ADMIN_TOKEN
```

Secrets are stored securely and persist across deployments.

---

## Database Notes

- Activity logs are **append-only**
- Status items are **soft-deleted** (`is_active = 0`)
- Older status entries are preserved for history

Schema changes must be applied manually.

### Apply schema changes

Local database:
```bash
wrangler d1 execute DB --local --file=db/schema.sql
```

Production database:
```bash
wrangler d1 execute DB --remote --file=db/schema.sql
```

---

## API Endpoints

### Public Endpoints

#### Get current status
Returns active `building` and `learning` items.

```http
GET /status
```

Example:
```bash
curl https://activity-api.mohitgauniyal.workers.dev/status
```

Response:
```json
{
  "building": [],
  "learning": []
}
```

---

#### Get activity logs
Returns recent logs (newest first).

```http
GET /logs?limit=10
```

Example:
```bash
curl https://activity-api.mohitgauniyal.workers.dev/logs
```

Response:
```json
[
  {
    "id": 1,
    "type": "tech",
    "message": "Backend API wired successfully.",
    "created_at": "2026-01-13 05:14:41"
  }
]
```

---

### Admin Endpoints  
(All require `x-admin-token` header)

#### Create a log
```http
POST /logs
```

Example:
```bash
curl -X POST https://activity-api.mohitgauniyal.workers.dev/logs \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -d '{"type":"tech","message":"Did something useful"}'
```

---

#### Create or update a status item
```http
POST /status
```

Create:
```bash
curl -X POST https://activity-api.mohitgauniyal.workers.dev/status \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -d '{"section":"building","title":"Activity Feed API"}'
```

Update:
```bash
curl -X POST https://activity-api.mohitgauniyal.workers.dev/status \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -d '{"id":1,"section":"building","title":"Updated title"}'
```

---

#### Delete a status item (soft delete)
```http
DELETE /status/:id
```

Example:
```bash
curl -X DELETE https://activity-api.mohitgauniyal.workers.dev/status/1 \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"
```

---

#### Reorder status items
```http
POST /status/reorder
```

Example:
```bash
curl -X POST https://activity-api.mohitgauniyal.workers.dev/status/reorder \
  -H "Content-Type: application/json" \
  -H "x-admin-token: YOUR_ADMIN_TOKEN" \
  -d '{"section":"building","ids":[3,1,2]}'
```

---

## Error Behavior

- Unauthorized admin access → `401 Unauthorized`
- Invalid payloads → `400 Bad Request`
- Unknown routes → `404 Not Found`

---

## Notes

- All timestamps are stored in UTC
- Clients are expected to format time locally
- This API is intended to be consumed by:
  - personal websites
  - admin panels
  - Telegram bots

---

## Deployment Safety

- Each deploy creates a new immutable version
- Rollback is done by redeploying an older git commit
- Deployments are atomic (no downtime)

---

## Status

- Production: ✅ live  
- Database: ✅ initialized  
- Secrets: ✅ configured  
- Safe to extend
