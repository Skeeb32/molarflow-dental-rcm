# Authentication setup

MolarFlow's local React app uses Django session authentication. New stakeholder accounts are inactive until their email is verified. Each registration creates a practice and a least-privilege stakeholder membership for that account; claim, practice, and opportunity querysets are scoped to active memberships.

The public GitHub Pages demo is a static, fictional-data showcase. It does not connect to Django and does not provide authentication. A live authenticated deployment needs a Django host and a frontend served from the same site (or a carefully configured same-site reverse proxy) so secure session cookies, CSRF protection, and OAuth callbacks work together.

## Local development

1. Install backend dependencies and migrate the database:

   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate
   python -m pip install -r requirements.txt
   python manage.py migrate
   ```

2. Local debug defaults use SQLite and print verification/reset messages to the Django terminal. Run the backend:

   ```bash
   python manage.py runserver
   ```

3. In another terminal, install and run the frontend:

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

4. Visit `http://localhost:5173/signup`. After registration, copy the verification URL printed in the Django terminal into your browser. Unverified accounts cannot sign in or access API records.

The local debug-only fallback secret is not suitable for deployment. Set `DJANGO_DEBUG=false` and provide a unique `DJANGO_SECRET_KEY` before deploying. See [`backend/.env.example`](../backend/.env.example) for the supported settings. Django does not load `.env` files automatically; export the values in the process environment or use the host's secret manager.

## Email delivery

In development, the console email backend prints verification and recovery links in the Django process output. For real email delivery, configure `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS` or `EMAIL_USE_SSL`, and `DEFAULT_FROM_EMAIL`. Use an approved sender domain and an account recovery mailbox appropriate for the deployment.

## Google, Microsoft, and Apple sign-in

Each provider is optional and its button is displayed only after the required credentials are present. Create OAuth/OIDC applications with the callback URL matching the host serving the React app and proxying Django's `/accounts/` routes. For local Vite development:

| Provider | Callback URL | Environment variables |
| --- | --- | --- |
| Google | `http://localhost:5173/accounts/google/login/callback/` | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| Microsoft | `http://localhost:5173/accounts/microsoft/login/callback/` | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, optional `MICROSOFT_TENANT` (defaults to `common`) |
| Apple | `http://localhost:5173/accounts/apple/login/callback/` | `APPLE_SERVICE_ID`, `APPLE_KEY_ID`, `APPLE_TEAM_ID`, `APPLE_PRIVATE_KEY` |

For production, register the corresponding HTTPS callback on the production host and configure the matching environment values in the deployment secret manager. Apple requires the provider-issued private key; keep it private and pass newline characters as `\n` if the hosting platform requires a single-line secret. Microsoft `common` permits consumer and organizational accounts; set the tenant ID when the application should be restricted to one organization. Do not commit credentials.

Automatic account matching by email is disabled. To connect another identity to an existing account, use allauth's authenticated account-connection flow after signing in; do not turn on email-based automatic linking without an explicit identity assurance and collision policy.

## Security and data boundaries

- Django session authentication uses HttpOnly session cookies, CSRF-protected unsafe requests, and secure cookies/HTTPS redirect when debug mode is disabled.
- Passwords use Django's password hashers and validators. Password reset tokens expire after one hour; email verification links expire after 24 hours.
- Public auth endpoints are throttled. The default Django local-memory cache is suitable only for a single development process; configure a shared production cache to enforce throttles consistently across workers.
- Registration creates access only to the new practice. Production administrators must provision any additional memberships intentionally.
- The repository's records are synthetic. Do not enter patient information or deploy this portfolio implementation for real PHI without a full security, privacy, operational, and legal review.

**Framework support note:** this project inherits its Django 4.2 and Python 3.8 baseline. Django 4.2 security support ended in April 2026; before any public authenticated deployment, upgrade and verify the app against a currently supported Django release and Python runtime. Django 5.2 is an LTS release and requires Python 3.10 or newer ([Django 5.2 release notes](https://docs.djangoproject.com/en/5.2/releases/5.2/), [Django release support](https://www.djangoproject.com/download/#supported-versions)).

## Tests

Run the auth and tenant-isolation tests after installing the backend requirements:

```bash
cd backend
python manage.py test rcm
```
