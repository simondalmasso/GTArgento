# QUIÉNES SON

A compact original 3D browser action/comedy game set in a nocturnal Corrientes/Microcentro-inspired Buenos Aires theater district.

Mission: **LLEGÁ AL BOLICHE SIN DARLE ENTIDAD A NADIE.**

Production: `https://quienes-son.simondalmasso44.workers.dev/`

## Stack

- Vite + TypeScript
- vanilla Three.js
- `@dimforge/rapier3d-compat`
- HTML/CSS HUD and touch controls
- Cloudflare Workers Static Assets
- Playwright production E2E

## Controls

Desktop: WASD move, mouse drag camera, Shift sprint, Q `¿QUIÉNES SON?`, E/F enter-exit taxi.

Mobile landscape: left virtual stick, right drag camera, Q special, CORRER, contextual ENTRAR/SALIR.

## Local verification

```bash
npm install
npm run typecheck
npm run lint
npm run build
npm run preview -- --port 4173
```

Run E2E locally after installing Playwright browsers:

```bash
npx playwright install chromium webkit
npm run test:e2e
```

Performance telemetry is exposed only with `?perf=1`.

## Production deployment

The canonical Worker is `quienes-son` on the `simondalmasso44.workers.dev` subdomain. Repository secrets provide `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` to the deployment workflow.

```bash
npm run build
npx wrangler whoami
npx wrangler deploy
```

`wrangler.jsonc` serves `./dist` using current Workers Static Assets with SPA fallback.

## Assets / IP

The shipped V1 uses original procedural 3D geometry, materials, UI and runtime-generated Q audio. No Rockstar/GTA ripped assets, real Moria voice sample, or newspaper reference image is bundled. See [`ASSET_SOURCES.md`](./ASSET_SOURCES.md).

## ORDER-001 governance

Implementation follows Issue #1. Cloudflare production verification precedes canonical reconciliation into `order-001-v1`; the audit PR must remain unmerged until AUD review.
