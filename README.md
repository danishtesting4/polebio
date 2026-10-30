# PoleBio

PoleBio is a personal profile platform. Each member will eventually have a public profile at:

`https://<username>.polebio.l.cd`

The project is a TypeScript monorepo with a React frontend, a Node.js API, and shared contracts.

## Project structure

```
apps/
  api/       Fastify API
  web/       React + Vite frontend
packages/
  shared/    Shared TypeScript contracts
docs/        Architecture and implementation notes
```

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Getting started

```bash
npm install
npm run dev
```

The frontend runs on Vite's local development server. In a second terminal:

```bash
npm run dev:api
```

The API listens on `http://localhost:4000` by default.

## Current status

This repository contains the initial application foundation. Authentication, profile editing, Supabase persistence, wildcard-domain routing, and Discord Linked Roles are planned features and are not implemented yet.

## Configuration

Copy `apps/api/.env.example` to `apps/api/.env` and adjust values as needed.

Do not commit secrets. Supabase service-role keys and Discord client secrets must remain server-side.
