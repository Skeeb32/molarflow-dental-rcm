# MolarFlow demo privacy notice

> **Project notice:** This describes the current portfolio implementation and is not a substitute for a privacy notice reviewed for a real operating organization. Configure a responsible contact and approved notice before production use.

## Information the demo stores

When you register, the Django backend stores your name, work email, username, password hash, the clinic name you enter, account timestamps, email-verification status, and a clinic membership. Passwords are processed by Django's password hashing system and are never stored in plaintext. The application also uses a session cookie and CSRF cookie to maintain sign-in safely. Authentication rate limits use the request address and submitted email as short-lived throttle keys in the configured Django cache.

Social sign-in, when configured, stores the provider identity returned by the selected identity provider. MolarFlow does not request access to email inboxes, calendars, or contacts.

## How information is used

Account details support sign-in, verification, password reset, username recovery, and clinic-scoped access. Recovery messages are sent only to the verified account address. The current local development setup prints email messages to the Django console; a real deployment requires an approved SMTP or email delivery service.

## Data restrictions and limitations

Use synthetic data only. Do not enter patient information or other sensitive clinical records. The GitHub Pages showcase uses fictional browser-side records and does not connect to the Django authentication backend. This repository does not yet include a self-service account deletion or data-retention administration workflow.

Before using the application with real people, the operator must publish a reviewed privacy notice, provide a responsible privacy contact, define retention and deletion procedures, configure secure production hosting and email delivery, and complete any required security and compliance review.
