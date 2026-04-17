<p align="center">
  <img src="src/assets/hero-image.png" alt="JanSevaAI Hero" width="760" />
</p>

<h1 align="center">JanSevaAI</h1>

<p align="center">
  <strong>AI-Powered Municipal Complaint Intelligence Platform</strong>
</p>

<p align="center">
  <a href="https://d1lggct31hc8gn.cloudfront.net"><strong>Live Demo</strong></a>
  ·
  <a href="#problem-we-solve">Problem</a>
  ·
  <a href="#solution-overview">Solution</a>
  ·
  <a href="#architecture">Architecture</a>
  ·
  <a href="#quick-start">Quick Start</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" alt="Vite 7" />
  <img src="https://img.shields.io/badge/AWS-Lambda-orange?logo=amazon-aws&logoColor=white" alt="AWS Lambda" />
  <img src="https://img.shields.io/badge/AI-YOLOv8%20%2B%20Bedrock-0A7B83" alt="YOLOv8 + Bedrock" />
</p>

---

## Problem We Solve

Cities receive thousands of civic complaints, but traditional systems are slow, manual, and opaque.

- Citizens do not know where or how to report issues reliably.
- Municipal teams waste time in manual triage and department routing.
- Workers cannot prove on-site resolution confidently.
- Admins lack actionable, real-time analytics for hotspot planning.

JanSevaAI converts a simple photo into a structured, trackable, department-ready complaint in seconds.

## Solution Overview

JanSevaAI is a full-stack civic platform where citizens upload issue photos (potholes, garbage, streetlights, waterlogging), and AI does the heavy lifting:

1. Detects issue category from image.
2. Estimates severity and urgency.
3. Generates formal complaint text.
4. Routes to the right municipal department.
5. Enables admin oversight and worker execution with proof-based closure.

### Why it stands out

- **Dual AI path**: YOLOv8 on EC2 (primary) + Bedrock Nova Lite fallback (Eco-Mode).
- **Role-based operations**: Citizen, Admin, Worker views with guarded routes/actions.
- **End-to-end traceability**: Complaint lifecycle, status history, proof photo, and geofence checks.
- **Production-ready deployment**: S3 + CloudFront + API Gateway + Lambda + DynamoDB.

---

## Live Demo

- **Production URL**: `https://d1lggct31hc8gn.cloudfront.net`
- **Quick Login**: enter any name, any 10-digit phone, OTP `123456` (demo mode)

### Demo User Roles

- **Citizen**: submit and track complaints
- **Admin**: manage workers, assignments, analytics
- **Worker**: accept/reject/resolve assigned tasks with proof

---

## Feature Highlights

| Capability | What it does |
| --- | --- |
| AI Photo Triage | Auto-classifies complaint type from uploaded images |
| Eco-Mode Fallback | Falls back to Bedrock when YOLO server is unavailable |
| OTP Authentication | Phone-based login using AWS SNS/Pinpoint |
| Worker Operations | Accept/reject tasks, resolve with image proof |
| GPS Proof-of-Work | Geofence checks for worker resolution authenticity |
| SLA Monitoring | Flags warning/breach windows in admin workflow |
| Admin Command Center | Complaint table, bulk actions, worker management |
| Analytics | Trends, category mix, departmental performance, hotspots |
| CSV Export | Filtered complaint exports for reporting and governance |
| Resilient UX | Draft save, mock fallback mode, and graceful error handling |

---

<a id="architecture"></a>
## Architecture

```text
Citizen / Admin / Worker Web App (React + Vite)
               |
               v
      CloudFront + S3 (Frontend Hosting)
               |
               v
          API Gateway (REST)
               |
  +------------+-------------+-----------------------------+
  |            |             |                             |
  v            v             v                             v
Auth       Upload URL     Complaints API              Worker/Admin API
Lambda     Lambda         (submit/get/update)         (assign/bulk/workers)
  |            |             |                             |
  |            v             +-----------+-----------------+
  |          S3 Images                   v
  |            |                    DynamoDB
  |            v                   (Complaints, Users,
  |      S3 Event Trigger            Workers)
  |            |
  |            v
  |     Process Image Lambda
  |            |
  |     +------+----------------+
  |     |                       |
  |     v                       v
  |  YOLOv8 (EC2)       Bedrock Nova Lite
  |   Primary AI          Fallback AI
  |
  +--> JWT issued on OTP verify
```

### Complaint lifecycle

1. User uploads image(s) from frontend.
2. Frontend gets presigned S3 URL and uploads directly.
3. S3 event triggers image processing Lambda.
4. AI detects category/severity and creates enriched complaint data.
5. Citizen finalizes submission with notes + location.
6. Admin assigns worker, tracks SLA and progress.
7. Worker resolves with proof and optional GPS validation.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 7, React Router v7 |
| UI | Vanilla CSS, Design System v3 |
| API | AWS API Gateway (REST) |
| Compute | AWS Lambda (Python 3.12) |
| Data | DynamoDB |
| Object Storage | S3 |
| CDN/Hosting | CloudFront + S3 |
| Auth | AWS SNS / Pinpoint OTP + JWT |
| Vision AI | YOLOv8 on EC2 |
| AI Fallback | Amazon Bedrock Nova Lite |
| LLM Text | Amazon Bedrock Claude 3 Haiku |
| Notifications | Amazon SES |

---

## Project Structure

```text
jansevaAI/
  src/
    components/
    pages/
    services/
      apiClient.js
      authApi.js
      complaintsApi.js
      workersApi.js
      analyticsApi.js
      api.js
  backend/
    auth/
    generate_upload_url/
    process_image/
    submit_complaint/
    get_user_complaints/
    get_complaint/
    update_complaint_status/
    bulk_update/
    assign_complaint/
    manage_workers/
    delete_complaint/
    get_nearby_complaints/
    upvote_complaint/
  docs/
    aws_lambda_gateway_setup.md
    frontend_hosting.md
    yolo_ec2_setup.md
    api_matrix.md
```

---

<a id="quick-start"></a>
## Quick Start

### Prerequisites

- Node.js 18+
- AWS account (for full cloud setup)

### 1) Clone and install

```bash
git clone https://github.com/Sujit-1509/jansevaAI.git
cd jansevaAI
npm install
```

### 2) Configure environment

Create `.env` from `.env.example` and set:

```env
VITE_API_BASE_URL=https://your-api-id.execute-api.ap-south-1.amazonaws.com/prod
```

### 3) Run locally

```bash
npm run dev
```

### 4) Build production

```bash
npm run build
```

Deploy `dist/` to S3 and invalidate CloudFront.

---

## Security and Access Model

- JWT-based authorization for API calls
- Role-based route guards: `citizen`, `admin`, `worker`
- Backend role enforcement inside Lambdas
- Citizens can only access their own complaint data
- Worker resolution supports geofence checks for anti-fraud



## Documentation

- `docs/aws_lambda_gateway_setup.md` - API + Lambda setup
- `docs/frontend_hosting.md` - S3 + CloudFront hosting
- `docs/yolo_ec2_setup.md` - YOLOv8 model server
- `docs/api_matrix.md` - endpoint-to-frontend mapping



## License

MIT

---

<p align="center">
  <strong>JanSevaAI</strong> - Making cities responsive, transparent, and AI-ready.
</p>
