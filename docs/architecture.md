# Architecture

> **Deployment status (26 Nov 2026): deployed and verified** in the AWS Academy Cloud Developing
> Sandbox (us-east-1): stack `CREATE_COMPLETE`, `/health` 200, and a leave approval processed by the
> worker Lambda via SQS. Evidence: [`evidence/aws-deployment-2026-11-26.txt`](evidence/aws-deployment-2026-11-26.txt).
> The sandbox deletes the stack when its session ends; it is re-created for each demonstration.

## 1. Starting point (original EnterpriseOS)

EnterpriseOS is a multi-tenant workforce-management system: employees, departments,
projects, a task board, attendance (India time zone), leave approvals, performance
reviews, notifications, dashboards and an audit trail.

| Layer | Technology (verified from the code) |
|---|---|
| Frontend | Vanilla HTML/CSS/JS single-page app in `public/`, served by Express, token kept in `sessionStorage` |
| Backend | Node.js (ES modules) + Express 4, all routes in `server/index.js` |
| Auth | JWT (HS256, 8 h) via `jsonwebtoken`, bcrypt (12 rounds) passwords, role checks `SUPER_ADMIN / ADMIN / MANAGER / EMPLOYEE`, forced first-login password change |
| Data | PostgreSQL via `pg`; schema in `server/db.js#migrate()`; `pg-mem` in-memory database when `DATABASE_URL` is empty (development/tests) |
| Tenancy | Every query is scoped by `organization_id` from the JWT |
| Original hosting | Vercel serverless function (`index.js`) + Neon PostgreSQL — **not used or modified by this project** |

## 2. Diagram A — what runs today (verified locally)

Solid lines = verified running (local machine / CI). This is **not** an AWS deployment.

```mermaid
flowchart LR
  B[Browser SPA<br/>public/] -->|HTTPS in prod / HTTP locally| E[Express app<br/>server/index.js]
  E -->|pg| M[(pg-mem in-memory DB<br/>or local PostgreSQL)]
  T[node --test<br/>59 tests] -->|Lambda v2 events| H[Lambda handler<br/>aws/lambda/api-handler.js]
  H -->|loopback 127.0.0.1| E
  E -->|EVENT_TRANSPORT=memory| Q[(in-memory event list)]
  T -->|SQS-shaped records| W[Event worker<br/>aws/lambda/event-worker.js]
```

## 3. Diagram B — AWS architecture (deployed and verified on 26 Nov 2026)

```mermaid
flowchart LR
  subgraph Internet
    U[Employee / Manager / Admin<br/>browser]
  end
  subgraph AWS["AWS account (us-east-1) — infrastructure/template.yaml"]
    APIGW[Amazon API Gateway<br/>HTTP API $default stage<br/>throttle 10 rps / burst 20]
    FURL[Lambda Function URL<br/>fallback front door]
    API[AWS Lambda: enterpriseos-dev-api<br/>Express via loopback bridge<br/>Node.js 24, 512 MB]
    SSM[(SSM Parameter Store<br/>SecureString JWT_SECRET<br/>optional DATABASE_URL)]
    SQS[[Amazon SQS events queue<br/>SSE, TLS-only]]
    DLQ[[SQS dead-letter queue<br/>after 3 receives]]
    WRK[AWS Lambda: enterpriseos-dev-worker<br/>partial batch failures]
    SNS((Amazon SNS<br/>notifications topic))
    CWL[CloudWatch Logs<br/>JSON logs, 7-day retention]
    CWA[CloudWatch alarms<br/>errors, 5xx, DLQ depth]
    OPS((SNS ops-alerts topic))
  end
  subgraph Future["Proposed — not implemented"]
    PG[(Managed PostgreSQL<br/>RDS / Aurora / external)]
    CF[CloudFront + S3 static site]
    DDB[(DynamoDB rate-limit store)]
  end

  U -->|HTTPS| APIGW
  U -.->|HTTPS, if API GW unavailable| FURL
  APIGW -->|AWS_PROXY payload v2| API
  FURL -.-> API
  API -->|cold start: GetParametersByPath| SSM
  API -->|SendMessage LEAVE_DECIDED / TASK_ASSIGNED| SQS
  SQS -->|event source mapping| WRK
  SQS -->|redrive| DLQ
  WRK -->|Publish PII-free summary| SNS
  API --> CWL
  WRK --> CWL
  CWA --> OPS
  API -.->|DatabaseMode=postgresql| PG
  U -.-> CF
  API -.-> DDB

  classDef impl fill:#e8f1ff,stroke:#2b6cb0,color:#1a365d;
  classDef future fill:#f4f4f4,stroke:#9e9e9e,color:#555,stroke-dasharray:4 4;
  class APIGW,FURL,API,SSM,SQS,DLQ,WRK,SNS,CWL,CWA,OPS impl;
  class PG,CF,DDB future;
  linkStyle 12,13,14 stroke:#9e9e9e,stroke-dasharray:2 6;
```

**Legend.** Solid line = deployed and verified on AWS (26 Nov 2026, AWS Academy sandbox). Blue node = deployed component. Dashed blue line = implemented fallback (Function URL), not deployed. Grey dotted node/line = proposed future work (designed only).

## 4. Request flow (HTTP)

1. The browser calls `https://<api-id>.execute-api.us-east-1.amazonaws.com/...` (or the
   Function URL). TLS terminates at AWS.
2. API Gateway applies stage throttling and forwards a **payload v2.0** event to the API
   Lambda (`AWS_PROXY` integration).
3. **Cold start only** (`aws/lambda/api-handler.js`):
   1. `config-loader.js` reads allow-listed SecureStrings (`JWT_SECRET`, `DATABASE_URL`,
      `CORS_ORIGIN`) from `SSM_PARAMETER_PATH` — before the app module is imported,
      because the app validates its secrets at import time.
   2. The API's own origin (`https://` + `requestContext.domainName`, set by AWS) is added
      to the CORS allow-list so same-origin browser POSTs pass.
   3. The **unchanged** Express app is imported; in ephemeral-demo mode the schema and
      synthetic data are created in memory.
   4. The app listens on an ephemeral **127.0.0.1** port inside the sandbox.
4. `http-bridge.js` replays the event as a real HTTP request to that port, overwriting
   `X-Forwarded-For` with the AWS-verified `sourceIp`, then converts the response back
   (text vs base64, `Set-Cookie` → `cookies`).
5. Express runs exactly the same middleware as locally: security headers, CORS, 100 kB
   JSON limit, JWT auth, forced password change, role checks, tenant-scoped SQL.

Why a loopback bridge instead of a library such as `serverless-http`? It adds **no
dependency**, it exercises the real Node HTTP stack (so behaviour is identical to local
runs and to the existing tests), and it works unchanged for API Gateway and Function URLs.
The cost is ~1 ms of loopback overhead per request.

## 5. Event-driven flow (asynchronous)

```mermaid
sequenceDiagram
  participant M as Manager (browser)
  participant A as API Lambda
  participant DB as Database
  participant Q as SQS events
  participant W as Worker Lambda
  participant N as SNS topic
  M->>A: PUT /api/leaves/:id/decision {APPROVED}
  A->>DB: UPDATE leave_requests (tenant + team scoped)
  A->>DB: INSERT notifications, audit_logs (unchanged behaviour)
  A->>Q: SendMessage LEAVE_DECIDED v1 (ids only, no names/emails)
  A-->>M: 200 OK
  Q->>W: batch of ≤10 records
  W->>W: validate contract, structured log
  W->>N: Publish "Leave request <id> was approved."
  W-->>Q: batchItemFailures (only failed ids retried)
  Note over Q: after 3 failed receives → dead-letter queue → CloudWatch alarm
```

* The synchronous notification/audit rows are still written exactly as before, so the
  product works even when `EVENT_TRANSPORT=none` (the local default).
* Publishing never fails a user request: errors are logged (`domain_event_publish_failed`).
* Event contract: `{ id, type, version: 1, occurredAt, organizationId, actorId, data }`.

## 6. Configuration and data modes

| Variable | Local default | AWS stack |
|---|---|---|
| `DATABASE_URL` | empty → pg-mem | from SSM when `DatabaseMode=postgresql` |
| `DEMO_EPHEMERAL_DATABASE` | unset | `true` when `DatabaseMode=ephemeral-demo` |
| `JWT_SECRET` | `.env` | SSM SecureString |
| `EVENT_TRANSPORT` | `none` | `sqs` |
| `REQUEST_LOGGING` | unset | `true` (JSON access logs) |

**Ephemeral-demo mode** exists so the full cloud architecture can be demonstrated with no
database cost. Seed IDs are deterministic (`server/seed.js#demoId`) so every Lambda
container starts with identical users, tasks and leave requests and JWTs work on any
container. *Writes* made in one container are not visible in another, and all data resets
on cold start. It is for demonstrations only; production still refuses the in-memory
database unless the flag is explicitly `true`.

## 7. What deliberately did not change

* No business logic, route, response shape, role rule or SQL semantics changed, except
  two pre-existing queries rewritten to an equivalent form (see
  [`testing-report.md`](testing-report.md#pre-existing-defects-found)).
* Local workflow is unchanged: `npm install && npm run dev`.
* The original repository, Vercel project and Neon database are not referenced by any
  code or configuration in this repository.
