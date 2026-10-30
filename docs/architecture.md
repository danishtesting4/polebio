# PoleBio architecture

## Application layout

- `apps/web`: React + Vite single-page application.
- `apps/api`: Fastify HTTP API.
- `packages/shared`: shared TypeScript contracts.

## Planned data and identity

Supabase PostgreSQL is the planned source of truth for accounts and profiles. Supabase Auth is a candidate for authentication, but the login method is intentionally not finalized. Do not add a custom password system before that decision.

Public profiles should be readable only when published. Draft profile data must remain private. Database access should be protected with Row Level Security (RLS).

## Planned profile routing

A profile will resolve from a username subdomain such as `username.polebio.l.cd`. Wildcard DNS and HTTPS routing must be verified before deployment. GitHub Pages alone should not be assumed to provide wildcard subdomain routing.

## Planned Discord integration

Discord OAuth2 and Linked Roles support are planned. Linked Roles require Discord's role connection metadata schema and server-side role connection updates. Never expose a Discord client secret or privileged API credential in the browser.

## Deployment constraints

The initial target is a small Node.js hosting allocation with limited RAM and disk. Keep the API stateless and store durable application data in Supabase rather than on the application host. Configure external HTTPS termination before exposing browser-facing API routes.
