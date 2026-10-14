# MolarFlow

**A dental revenue-cycle workspace for practice operations and growth teams.** MolarFlow brings claims follow-up, patient balances, practice health, products, and sales pipeline into one focused dashboard.

> Portfolio project using synthetic data only. It is not a billing system, does not submit claims, and is not designed to store protected health information (PHI).

## What it demonstrates

- A React + TypeScript operations dashboard with TanStack Query for server state, caching, invalidation, and mutations.
- A Django REST API with explicit models, serializers, viewsets, filters, and seed data.
- Dental RCM workflows: claim aging, payer follow-up, denial reasons, patient balances, and collection visibility.
- A practice-facing customer and sales view for onboarding, product adoption, and account follow-up.
- Responsive layouts, accessible controls, meaningful loading/error states, and realistic synthetic records.

## Product areas

### Practice operations

- Monitor submitted, pending, denied, and paid claims.
- Filter the work queue by claim status and search by practice, payer, or procedure.
- Review aging, expected reimbursement, patient responsibility, and denial context.
- Move a claim into follow-up; the UI updates optimistically and reconciles with the API.
- See patient balance totals without displaying patient names or unnecessary identifiers.

### Customer and sales operations

- Review dental group accounts, onboarding stage, monthly recurring revenue, and product adoption.
- Track opportunities for products such as eligibility checks, claims automation, and payment plans.
- Use the account view to connect product footprint with RCM outcomes and next steps.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, TanStack Query |
| Backend | Django, Django REST Framework, django-filter |
| Storage | SQLite for local demo; Django database settings can be configured for PostgreSQL |

## Run locally

### 1. Start the API

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

The API is available at `http://localhost:8000/api/`.

### 2. Start the web app

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal. The development server proxies `/api` requests to Django.

## API overview

| Endpoint | Purpose |
| --- | --- |
| `GET /api/overview/` | RCM KPIs and trend summary |
| `GET /api/claims/` | Filterable claims queue (`status`, `search`) |
| `PATCH /api/claims/{id}/` | Update a claim status or follow-up note |
| `GET /api/practices/` | Practice accounts and onboarding/product context |
| `GET /api/opportunities/` | Sales pipeline and product opportunities |
| `GET /api/products/` | Product catalog and adoption summary |

## Design notes

- The frontend treats API responses as server state and uses query keys scoped by resource and filters.
- Claim follow-up uses a TanStack Query mutation with an optimistic queue update, rollback on error, and invalidation after settlement.
- Django owns the business records and aggregates. The frontend does not duplicate an independent mock dataset.
- Seed records are fictional and intentionally avoid realistic patient identity data.

## Next steps for a production system

- Add authentication, role-based access, tenant isolation, audit events, and secure secrets handling.
- Replace synthetic records with approved integrations and validated dental clearinghouse workflows.
- Add observability, background jobs, rate limits, deployment configuration, and privacy/security review.
- Add workflow tests for permissions, claim transitions, and aggregate correctness.

## License

MIT. See [LICENSE](LICENSE).
