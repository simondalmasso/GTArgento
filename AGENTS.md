# AGENTS.md — GTArgento governed workflow

**Canonical instruction:** https://github.com/simondalmasso/GTArgento/issues/3
**ARQ cold start:** docs/ARQ_START_HERE.md
**Evidence:** https://drive.google.com/drive/folders/10lWNSRSsvYuG21GaGZVLyYqyxYVwYEsY

## Roles and handoffs

AUD = analysis, product direction, research, hard gates, independent review. ARQ = execution, coding, operations and comprehensive testing. ARQ MUST NOT wait for AUD during an internal tranche; publish a complete material checkpoint READY_FOR_AUD only when production runs and all evidence is available. No "DONE" from CI-only.

## One project, one level

GTArgento is an original Argentine satirical browser 3D mini GTA-like game: one small beautiful recognizable Buenos Aires district (Avenida Corrientes + Obelisco cues), four recognisable true 3D protagonists Moria Casán, Facundo Moyando satirical variant, Franco Colapinto, Tini Stoessel; each gets a distinct completed mission, start, win/fail/replay. Moria originally goes from theatre to nightclub avoiding paparazzi and using ¿QUIÉNES SON?; Moria must look like adult Moria in the owner's fuchsia reference. No photo billboard heads, no graybox, no 4-world framework sprawl. Touch portrait and landscape both FIRST CLASS.

## Engineering decisions

WebGL2 Three.js + Vite + TypeScript, GLB/glTF, WebAudio, HTML/CSS UI and Playwright tests; camera, physics/collision, UI touch, selector, vehicle, NPC and mission engine shared across 4 missions. Prefer salvaging known-good work to rewriting. No costly AI inference, cloud DB, heavy Unity/WASM engine, ragdolls or full-city procedural sprawl. No unlicensed GTA assets, music, voices, photos, proprietary game rips, cracked repacks or brand/trademark lookalikes.

## Production sequence

1. Inventory historic main/order-001-v1 + GitLab recovered-web + current Cloudflare Worker state. Preserve their SHA and asset provenance.
2. Build/critique until Moria and city look good, THEN implement four distinct mission loops.
3. Clean install, typecheck, lint, unit & Playwright E2E and visual QA on desktop/Android portrait+landscape/iOS portrait+landscape; midgame rotation MUST NOT reload. Manual play evidence overrides green CI.
4. Stage and deploy CLOUDFARE WORKERS FIRST, preserve original Worker release ID for rollback.
5. Verify production URL, capture Worker version, source/build asset SHA256, all four win/fail runs, 4 character turntables and Baires hero, mobile screenshots, screen recording, actual frame time.
6. Reconcile the same exact tested source to a NEW GitHub branch + PR against main, after deploy; no automatic merges, no force pushes, no false claim parity.
7. Publish READY_FOR_AUD with complete evidence under Drive 04_EVIDENCE and link it on ORDER-003. AUD alone then reviews.

## Safety and truth

All scenes featuring real-person-inspired characters are transparently fictional/parodic, not statements of private-life facts or wrongdoing. Do not portray actual parents/relatives as stealing money, romantic gossip as proven, nor harassment as a win condition. Licenses/likeness/publicity rights must be explicitly tracked. No purchases or billing mutations without explicit user approval. Never commit secrets or keys.

## Scope discipline

Actual usable mobile portrait is NON-NEGOTIABLE. Four complete missions and recognizable players are NON-NEGOTIABLE. Trim cosmetic systems instead of these; no placeholder art in final release. Only BLOCKED_REAL when an external permission/service issue is evidenced and no legal free workaround exists. Continue autonomous execution for ordinary failures.
