# AI Revenue Recovery Agent

An AI-assisted revenue recovery platform built with Next.js and SQLite.

It detects failed payments and high-risk commerce events, opens recovery cases, prioritizes them, recommends intervention actions, applies guardrails, and tracks outcomes through an auditable workflow.

## 1) What this project does

The system is designed around one core goal: **recover at-risk revenue safely and automatically**.

Main capabilities:

- Detect recovery opportunities from:
  - Failed payment signals
  - Operational events (checkout abandonment, timeout, near-expiry inventory)
- Create and track recovery cases
- Predict recovery probability
- Prioritize intervention
- Decide action (retry, payment link, outreach, discount, escalation, stop)
- Enforce guardrails before execution
- Execute and record outcomes
- Provide dashboard, cases, customer intelligence, audit trail, and simulator UI

## 2) Architecture model (advanced structural view)

This codebase follows a layered workflow model:

1. **Presentation Layer (UI + API)**  
   - Pages and API routes in `src/app/`
2. **Application Layer (Orchestration)**  
   - End-to-end workflows in `src/lib/engine/orchestrator.js`
3. **Domain Intelligence Layer (Decision Engine)**  
   - `classifier.js`, `predictor.js`, `prioritizer.js`, `decider.js`, `guardrails.js`
4. **Infrastructure Layer**  
   - SQLite access + schema in `src/lib/db/`
   - Provider abstraction in `src/lib/providers/`
5. **Simulation & Testing Data Layer**  
   - Seed/scenario generation in `src/lib/simulation/`

### Core flow (payment failure path)

1. A failed payment is inserted/received (webhook/simulator/API path)
2. `processFailedPayment()` is called
3. Engine pipeline runs:
   - classify failure
   - predict recovery probability
   - calculate priority
   - decide recommended action
4. Recovery case is created
5. Recovery action is created (pending/approval as needed)
6. Audit log entry is recorded
7. Action execution runs through guardrails, then provider
8. Outcome updates case/payment/customer state

### Core flow (event-driven path)

1. Event is inserted (`events` table)
2. `processEvent()` maps event -> classification + synthetic payment context
3. Case/action lifecycle runs similarly to payment failure flow
4. Event is marked processed

## 3) Codebase structure

```text
src/
  app/
    api/
      audit/
      cases/
      cron/
      customers/
      dashboard/
      events/
      simulator/
      webhooks/
    audit/
    cases/
    customers/
    simulator/
    layout.js
    page.js
  components/
    charts/
      RecoveryCharts.js
    ui/
      StatusBadge.js
  lib/
    db/
      database.js
      schema.sql
    engine/
      classifier.js
      predictor.js
      prioritizer.js
      decider.js
      guardrails.js
      orchestrator.js
    providers/
      provider.js
      simulation.js
    simulation/
      generator.js
      scenarios.js
    utils/
      formatCurrency.js
```

## 4) API surface map

| Route | Purpose |
|---|---|
| `GET /api/dashboard` | Dashboard metrics, trend, breakdowns |
| `GET /api/cases` | List/filter/sort recovery cases |
| `POST /api/cases` | Open case from payment id |
| `GET /api/cases/[id]` | Case detail + actions + audit |
| `PATCH /api/cases/[id]` | Approve/execute/stop/escalate case |
| `POST /api/cases/[id]/actions` | Create manual action (optional immediate execution) |
| `GET /api/customers` | List/search/sort customers |
| `GET /api/customers/[id]` | Customer detail, payments, cases, interventions |
| `GET /api/audit` | Global audit query |
| `POST /api/events` | Ingest event and optionally process recovery case |
| `GET /api/events` | List event records |
| `POST /api/simulator` | Seed database, trigger scenarios/events, simulate outcomes |
| `GET /api/cron` | Process pending automations |
| `POST /api/webhooks` | Handle payment/subscription webhook events |

## 5) Data model

Primary tables (see full DDL in `src/lib/db/schema.sql`):

- `customers`
- `subscriptions`
- `invoices`
- `payments`
- `recovery_cases`
- `recovery_actions`
- `audit_log`
- `events`

Design notes:

- Monetary values are stored in paise (integer).
- `recovery_cases` is the central business entity.
- `recovery_actions` tracks execution lifecycle and approval logic.
- `audit_log` is the traceability backbone.

## 6) Decision engine modules

- `classifier.js`  
  Maps failure/event reasons to category and base recoverability
- `predictor.js`  
  Computes final probability using customer history, retries, timing, and context factors
- `prioritizer.js`  
  Converts risk/business factors to actionable priority score + tier
- `decider.js`  
  Chooses intervention strategy and approval requirements
- `guardrails.js`  
  Blocks unsafe/redundant actions and enforces policy constraints

## 7) Running locally

### Prerequisites

- Node.js 18+ (recommended 20+)

### Install

```bash
npm install
```

### Start dev server

```bash
npm run dev
```

### Production build check

```bash
npm run build
```

### Run production server

```bash
npm run start
```

## 8) Typical workflows

### A) Seed demo data

Use Simulator page (`/simulator`) and run **Seed Database**.

### B) Trigger scenarios

From simulator:
- Trigger event-driven scenarios
- Run bulk scenarios
- Run auto-pilot sweep (`/api/cron`)

### C) Review and action

1. Inspect dashboard for at-risk revenue
2. Open a case
3. Approve/execute/escalate/stop action
4. Verify trace in audit trail

## 9) Extension points

- Add new event/failure reason:
  - Update `classifier.js`
  - Add decision behavior in `decider.js` if needed
  - Add simulator event trigger if needed
- Add new intervention type:
  - Extend `decider.js` and `guardrails.js`
  - Add execution branch in `orchestrator.js`
  - Add UI representation in case details if needed
- Swap provider implementation:
  - Implement `PaymentProvider` interface in `src/lib/providers/provider.js`
  - Wire in orchestrator

## 10) Operational and quality notes

- SQLite is initialized through `getDb()` and schema auto-applied on first access.
- `better-sqlite3` is configured as a server external package in Next config.
- Module alias `@/*` maps to `src/*` (see `jsconfig.json`).
- Simulator + cron endpoints are helpful for deterministic workflow validation.

---

If you are new to this repository, start by reading:

1. `src/lib/engine/orchestrator.js`
2. `src/lib/db/schema.sql`
3. `src/app/page.js`
4. `src/app/api/simulator/route.js`

That sequence gives the fastest end-to-end understanding of the system.
