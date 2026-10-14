<!--
MolarFlow README
Project-specific documentation: claims and commands below were checked against the repository source.
-->

<div align="center">

# 🦷 MolarFlow

### The dental RCM workspace for claims, practice health, and product growth.

A portfolio project showing how a React frontend can coordinate real revenue-cycle workflows through a Django API.

[Explore the code](https://github.com/Skeeb32/molarflow-dental-rcm/tree/main/frontend/src) · [Open an issue](https://github.com/Skeeb32/molarflow-dental-rcm/issues/new) · [Read the API guide](#api-reference)

<br />

[![Stars](https://img.shields.io/github/stars/Skeeb32/molarflow-dental-rcm?style=for-the-badge&color=4f8066)](https://github.com/Skeeb32/molarflow-dental-rcm/stargazers)
[![Forks](https://img.shields.io/github/forks/Skeeb32/molarflow-dental-rcm?style=for-the-badge&color=7897a0)](https://github.com/Skeeb32/molarflow-dental-rcm/forks)
[![Open issues](https://img.shields.io/github/issues/Skeeb32/molarflow-dental-rcm?style=for-the-badge&color=b78d5d)](https://github.com/Skeeb32/molarflow-dental-rcm/issues)
[![Last commit](https://img.shields.io/github/last-commit/Skeeb32/molarflow-dental-rcm?style=for-the-badge&color=6d8292)](https://github.com/Skeeb32/molarflow-dental-rcm/commits/main)
[![License: MIT](https://img.shields.io/github/license/Skeeb32/molarflow-dental-rcm?style=for-the-badge&color=5b8c70)](LICENSE)

<br />

![React](https://img.shields.io/badge/React-18-149ECA?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-v5-FF4154?style=flat-square&logo=reactquery&logoColor=white)
![Django](https://img.shields.io/badge/Django-4.2%2B-092E20?style=flat-square&logo=django&logoColor=white)
![DRF](https://img.shields.io/badge/Django_REST_Framework-API-A30000?style=flat-square)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-local_demo-003B57?style=flat-square&logo=sqlite&logoColor=white)

</div>

> **For practices:** see which claims need attention and why.  
> **For customer and growth teams:** connect practice health to products, onboarding, and sales follow-up.  
> **For engineers:** inspect a typed React app using TanStack Query against a Django REST API.

MolarFlow uses fictional records for demonstration. It does not submit claims, connect to payers, or store real patient information.

---

## Try the live demo

**[Open the MolarFlow interactive demo](https://skeeb32.github.io/molarflow-dental-rcm/)** · [Browse the source](https://github.com/Skeeb32/molarflow-dental-rcm)

The public showcase runs as a static GitHub Pages build with fictional seed records. Search, filters, navigation, and the follow-up interaction work in your browser; demo changes are in-memory and reset on refresh. The static site does not host Django authentication. To explore the authenticated Django-backed app, follow the local setup below.

## Visual tour

### Operations dashboard

![MolarFlow operations dashboard with claim aging, payer statuses, practice health, and sales pipeline](docs/media/dashboard.png)

### Claim queue and detail view

The screenshots and short walkthrough below are captured from the running demo. Open the [claims queue](https://skeeb32.github.io/molarflow-dental-rcm/?view=claims) or a [sample claim detail](https://skeeb32.github.io/molarflow-dental-rcm/?view=claim-detail) directly.

<details>
<summary>View the claims queue screenshot</summary>

![MolarFlow claims queue with all ten fictional sample claims](docs/media/claims.png)

</details>

<details>
<summary>View the selected claim detail screenshot</summary>

![MolarFlow claim detail drawer showing payer, billed amount, expected reimbursement, and follow-up note](docs/media/claim-detail.png)

</details>

### Animated walkthrough

![MolarFlow walkthrough moving from the dashboard to the claims queue and selected claim detail](docs/media/claim-follow-up.gif)

## What you can explore

| Revenue-cycle operations | Practice and product growth |
| --- | --- |
| Claims queue with status filters and search | Practice accounts with locations, onboarding stage, MRR, and next step |
| Claim aging, payer, procedure, denial reason, and expected amount | Product catalog for claims, eligibility, and patient-pay workflows |
| Queue a claim for payer follow-up | Sales opportunities linked to a practice and product |
| Dashboard metrics derived from Django records | Pipeline value and product adoption summaries |

**Demo dataset:** 5 practices · 10 claims · 3 products · 4 opportunities. These are deterministic, fictional records loaded by the Django `seed_demo` command.

## Visual architecture

The public GitHub Pages showcase is a client-side build for quick exploration. The diagrams below describe the Django-backed local application data path and claim follow-up interaction.

### Request and data flow

```mermaid
flowchart LR
    U[Practice or operations user] --> UI[React + TypeScript dashboard]
    UI --> Q[TanStack Query]
    Q -->|GET / PATCH| API[Django REST Framework API]
    API --> S[Serializers and viewsets]
    S --> M[Django models]
    M --> DB[(SQLite demo database)]

    API --- O[/api/overview/]
    API --- C[/api/claims/]
    API --- P[/api/practices/]
    API --- R[/api/products/]
    API --- W[/api/opportunities/]
```

### Claim follow-up

```mermaid
sequenceDiagram
    actor User
    participant UI as React claim queue
    participant Query as TanStack Query
    participant API as Django REST API
    participant DB as SQLite

    User->>UI: Queue payer follow-up
    UI->>Query: Start mutation
    Query->>Query: Optimistically mark claim for follow-up
    UI->>API: PATCH /api/claims/{id}/
    API->>DB: Persist status and follow-up note
    DB-->>API: Updated claim
    API-->>UI: Serialized claim
    Query->>Query: Invalidate claims and overview
```

## Why this project exists

Dental revenue-cycle teams work across payer responses, aging claims, denial reasons, patient responsibility, and practice follow-up. Customer teams also need a clear view of practice health and product adoption.

MolarFlow brings those two views into one small, inspectable application. The project is designed to demonstrate frontend ownership and a concrete Django/TanStack Query integration. It is a portfolio MVP, not a production billing platform.

## Engineering highlights

- **Server state with TanStack Query v5.** Query keys separate the overview, claims by status/search, practices, products, and opportunities. The client uses a 30-second stale time, one retry, and disables refetch-on-focus.
- **Optimistic claim follow-up.** The mutation updates cached claim lists, restores prior cache data on error, updates the open detail view on success, then invalidates claims and overview data.
- **A real API boundary.** Django REST Framework owns the records and aggregate metrics; the UI fetches them through a small typed API module.
- **Purposeful domain models.** Practices connect to claims and opportunities; opportunities connect practices to catalog products.
- **Search and filters live at the API.** Claim status and search parameters are passed to Django, with search across reference, payer, procedure, and practice name.
- **Accessible interface states.** Navigation uses buttons, controls have labels, tables include loading and empty states, and claim details open in a labeled drawer.

### Stack and responsibilities

| Layer | Tools | Responsibility in this project |
| --- | --- | --- |
| Web app | React 18, TypeScript, Vite 5 | Responsive dashboard and practice, claim, product, and sales views |
| Server state | TanStack Query v5 | Fetching, caching, optimistic mutation, rollback, and invalidation |
| API | Django 4.2+, Django REST Framework, django-filter | Claim, practice, product, opportunity, and overview endpoints |
| Data | SQLite | Local demo database and seeded sample records |
| UI | CSS, Lucide React | Layout, responsive styles, and interface icons |

**Django is used as an API backend here.** The pages are rendered by React; this repository does not implement Django server-rendered templates.

## Quick start

### Prerequisites

- Python 3.8 or newer
- Node.js 18 or newer
- npm
- SQLite (included with most Python installations)

### 1. Clone the repository

```bash
git clone https://github.com/Skeeb32/molarflow-dental-rcm.git
cd molarflow-dental-rcm
```

### 2. Install and start Django

```bash
cd backend
python -m venv .venv
```

Activate the environment:

```bash
# macOS / Linux
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1
```

Install the API dependencies, apply the schema, and run Django:

```bash
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The API is available at [http://localhost:8000/api/](http://localhost:8000/api/). Start the React app below, choose **Create a clinic account**, and verify the email link printed in the Django terminal. The new account starts with an empty practice workspace; the GitHub Pages showcase remains the way to explore the bundled fictional dashboard data.

### 3. Install and start the React app

Open a second terminal from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` and `/accounts` requests to Django at `http://127.0.0.1:8000`.

### Authentication and provider setup

Local sign-up, email verification, password reset, username recovery, secure sessions, and clinic-scoped API access use Django. In local development, Django prints email links to the server terminal. Google, Apple, and Microsoft buttons appear only after their OAuth credentials and callback URLs have been configured. Follow the [authentication setup guide](docs/authentication-setup.md) before deploying; GitHub Pages is a static demo and does not provide live accounts or email.

### Build the frontend

```bash
cd frontend
npm run build
npm run preview
```

The production bundle is written to `frontend/dist/`. GitHub Actions builds and deploys the client-side showcase to [GitHub Pages](https://skeeb32.github.io/molarflow-dental-rcm/).

## Usage

### Explore claims

- Choose **All claims**, **Follow-up**, **Denied**, or **In review** to filter the queue.
- Search by claim reference, payer, procedure, or practice name.
- Select a claim to inspect amounts, age, denial context, and the latest follow-up note.
- Queue follow-up to update the claim status through the API.

The data API requires a verified, signed-in stakeholder session. Use the browser app to sign in before exploring the browsable API at the endpoints below; unauthenticated requests are denied.

```http
# Overview metrics
GET http://localhost:8000/api/overview/

# Claims in follow-up
GET http://localhost:8000/api/claims/?status=follow_up

# Search claims by payer, procedure, practice, or reference
GET http://localhost:8000/api/claims/?search=Delta
```

### Explore customer and sales data

- Open **Practices** to review locations, account stage, MRR, products, and next step.
- Open **Products & sales** to review the catalog and opportunities by stage, owner, value, and due date.

These views are read-only in the current MVP. The claim endpoint supports `GET` and `PATCH`; practice, product, and opportunity endpoints are read-only.

## API reference

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/overview/` | Claim counts, aging, open expected reimbursement, practice count, pipeline value, and counts by status |
| `GET` | `/api/claims/` | List claims; accepts `status` and `search` query parameters |
| `PATCH` | `/api/claims/{id}/` | Update claim fields such as status and follow-up note |
| `GET` | `/api/practices/` | List practice accounts; supports search |
| `GET` | `/api/products/` | List products |
| `GET` | `/api/opportunities/` | List opportunities; accepts `stage` and `product` filters |

Django REST Framework's browsable API is available at the same local API URLs.

## Configuration and project layout

Local debug settings use SQLite, a development-only fallback secret, and Django's console-email backend. Production requires a unique `DJANGO_SECRET_KEY`, HTTPS, allowed hosts/origins, a real email service, and a same-site frontend/backend deployment. Optional provider sign-ins require provider credentials. See [`backend/.env.example`](backend/.env.example) and the [authentication setup guide](docs/authentication-setup.md). CORS is configured for the local Vite origins.

```text
backend/
├── config/                 # Django settings, URLs, ASGI and WSGI entry points
└── rcm/
    ├── management/         # seed_demo management command
    ├── migrations/         # domain and stakeholder-auth schemas
    ├── auth_views.py       # registration, verification, sessions, recovery
    ├── models.py           # practices, claims, products, memberships, profiles
    ├── serializers.py      # API representations
    └── views.py            # viewsets and overview aggregate
frontend/
└── src/
    ├── auth/               # login, signup, recovery, verification UI
    ├── api.ts              # typed API client and response types
    ├── App.tsx             # navigation, pages, queries, mutation
    ├── main.tsx            # React root and QueryClient configuration
    └── styles.css          # responsive visual system
```

## Validation

The frontend build runs TypeScript's project build before Vite bundles the application:

```bash
cd frontend
npm run build
```

The Django authentication suite covers verification, login gating, recovery response privacy, and practice-level claim isolation. Run it with `cd backend && python manage.py test rcm`. The frontend build checks TypeScript before bundling. GitHub Actions builds and deploys the static showcase when frontend files change. For a local smoke check, start both servers and verify:

1. Registration creates a pending stakeholder and prints a verification link in Django output.
2. Email verification activates the account and creates a session.
3. The authenticated API returns records only for that account's active practice memberships.
4. The public Pages demo loads fictional records without a backend.

## Roadmap

### Implemented

- [x] React + TypeScript dashboard
- [x] TanStack Query resource queries and optimistic claim follow-up
- [x] Django REST API and initial SQLite schema
- [x] Django session authentication, email verification/recovery, and clinic membership scoping
- [x] React login/sign-up, recovery, verification, and optional provider sign-in entry points
- [x] Seeded fictional practices, claims, products, and opportunities
- [x] Search/filter workflows and responsive practice, claims, and sales views

### Planned

- [ ] Expanded role administration and invitation-based practice membership management
- [x] GitHub Actions build and GitHub Pages deployment for the interactive showcase
- [x] Automated Django auth and tenant-scope tests
- [ ] Broader API and UI workflow tests
- [ ] CI checks for migrations and tests
- [ ] Write workflows for practice onboarding and sales opportunities
- [ ] Production database and deployment configuration
- [ ] Real clearinghouse integrations, only after security, privacy, and workflow review

## Contributing

Contributions are welcome. Start with a focused issue or open a discussion in a GitHub issue before making a larger change.

1. Fork the repository and create a branch from `main`.
2. Follow the [Quick start](#quick-start) to run both services.
3. Keep changes scoped and update documentation when behavior changes.
4. Run `npm run build` before opening a pull request.
5. Include a concise description, screenshots for UI changes when available, and steps to verify the change.

Please do not use real patient records, credentials, or production billing data in issues, examples, screenshots, or pull requests.

## For recruiters and engineering teams

MolarFlow demonstrates an end-to-end feature slice across a typed React UI and a Python API:

- Building a domain-oriented frontend across operations and customer-growth workflows.
- Integrating TanStack Query for remote data, cache updates, optimistic UI, rollback, and invalidation.
- Modeling relational business entities in Django and exposing them with DRF serializers and viewsets.
- Implementing API-backed search, filters, aggregates, and seeded demo data.
- Documenting scope and limitations clearly: this is an API-backed portfolio MVP, not production billing software.

The project does **not** claim live payer integrations, HIPAA readiness, production scale, or performance benchmarks. The GitHub Pages showcase uses in-memory synthetic data; the authenticated Django API currently runs locally and needs production hosting, email delivery, and optional OAuth credentials for a public authenticated deployment.

## Project metrics

These are repository/demo facts, not production usage metrics:

- **6** domain models, including stakeholder profiles and practice memberships
- **6** documented data API routes, plus dedicated authentication routes
- **5 / 10 / 3 / 4** seeded practices / claims / products / opportunities
- **1** claim update workflow with optimistic client feedback

Live repository activity is available through the badges at the top of this page. No release, star, contribution, or usage total is asserted here.

## License

MolarFlow is released under the [MIT License](LICENSE).

---

<div align="center">

### If this project is useful, give it a ⭐

Explore the source, fork it for your own learning, or open an issue with a focused improvement.

[⭐ Star MolarFlow](https://github.com/Skeeb32/molarflow-dental-rcm/stargazers) · [🍴 Fork the repo](https://github.com/Skeeb32/molarflow-dental-rcm/fork) · [💬 Open an issue](https://github.com/Skeeb32/molarflow-dental-rcm/issues/new)

</div>
