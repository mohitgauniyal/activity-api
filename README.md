# 🚀 Activity API

A small, production-ready backend to log activity updates and expose current status (`building`, `learning`) over HTTP. Designed for long-term personal use as a single source of truth for activity logs and current status.

**Live URL:** [https://activity-api.mohitgauniyal.workers.dev](https://activity-api.mohitgauniyal.workers.dev)

---

## 🛠 Features

- **Activity Logs**: Append-only logs for tracking progress.
- **Status Tracking**: Manage active `building` and `learning` items.
- **Secure Admin**: Protected endpoints using `x-admin-token`.
- **D1 Database**: Powered by Cloudflare D1 for high availability.

---

## 🚀 Quick Start

### Local Development
Run the API locally for testing:
```bash
npm run dev
```

### Deployment
Push the current code live to Cloudflare Workers:
```bash
npm run deploy
```
> [!NOTE]
> This is the **only command** that updates the live API. Editing files alone does not affect production.

---

## 🔐 Configuration

### Secrets
Admin-only endpoints require an admin token. Set it once using:
```bash
wrangler secret put ADMIN_TOKEN
```
Secrets are stored securely and persist across deployments.

---

## 💾 Database Management

- Activity logs are **append-only**.
- Status items are **soft-deleted** (`is_active = 0`).
- Schema changes must be applied manually.

### Apply Schema Changes

**Local Database:**
```bash
wrangler d1 execute DB --local --file=db/schema.sql
```

**Production Database:**
```bash
wrangler d1 execute DB --remote --file=db/schema.sql
```

---

## 📡 API Endpoints

### Public Endpoints

#### Get Current Status
Returns active `building` and `learning` items.
- **GET** `/status`
- **Example:** `curl https://activity-api.mohitgauniyal.workers.dev/status`

#### Get Activity Logs
Returns recent logs (newest first).
- **GET** `/logs?limit=10`
- **Example:** `curl https://activity-api.mohitgauniyal.workers.dev/logs`

---

### Admin Endpoints
*(All require `x-admin-token` header)*

#### Create a Log
- **POST** `/logs`
- **Body:** `{"type":"tech","message":"..."}`

#### Create or Update Status
- **POST** `/status`
- **Body (Create):** `{"section":"building","title":"..."}`
- **Body (Update):** `{"id":1,"section":"building","title":"..."}`

#### Delete Status (Soft Delete)
- **DELETE** `/status/:id`

#### Reorder Status
- **POST** `/status/reorder`
- **Body:** `{"section":"building","ids":[3,1,2]}`

---

## ⚖️ License

This project is licensed under the [MIT License](LICENSE).
