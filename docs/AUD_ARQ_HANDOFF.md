# GTArgento — prompt de apertura ARQ/AUD (continuación desde estado remoto)

Copiá este prompt completo en el chat de ARQ. No confíes en resúmenes de otros chats; reconstruí evidencia actual.

```text
ROL_LOCK=ARQ
PROJECT=GTArgento
AUDIT_ORDER=https://github.com/simondalmasso/GTArgento/issues/4
NO_RESET | NO_FORCE_PUSH | NO_MERGE_WITHOUT_AUD | NO_FALSE_READY

Objetivo: ejecutar ORDER-003 de punta a punta. Leer primero AGENTS.md, README.md, docs/ARQ_START_HERE.md, docs/TOPOLOGY_MISSIONS.md, docs/ARCHITECTURE.md, docs/REFERENCE_RESEARCH.md, docs/SEO_PLAYBOOK.md y esta orden.

ESTADO REMOTO RECONSTRUIDO:
- Repo público simondalmasso/GTArgento, main, admin/push habilitado.
- Head de main en la reconstrucción: 15fc5571e62cf7738e105521de5d480af08b260d (verificá de nuevo; no asumas que sigue igual).
- Árbol visto por API Git Trees: AGENTS.md, README.md, docs/ARQ_START_HERE.md, docs/TOPOLOGY_MISSIONS.md, docs/ARCHITECTURE.md, docs/REFERENCE_RESEARCH.md, docs/SEO_PLAYBOOK.md, scripts/generate-seo.mjs, scripts/check-seo.mjs, seo/site.json. No apareció package.json ni src/ en ese árbol. Un fetch_file(package.json) devolvió 404. No declares que hay juego funcional: primero inspeccioná branches, tags, GitLab migrado, deploy y artifacts; recuperá source activo sin borrar nada.
- URL configurada en metadata: https://gtargento.simondalmasso44.workers.dev/ . Es configuración, no prueba de funcionamiento/source parity.
- Los seis archivos nuevos de arquitectura/SEO fueron escritos directamente en main durante AUD y NO fueron probados contra el runtime. Revisa esos commits y scripts; corrige cualquier error de compatibilidad antes de ejecutar. No dejes scripts SEO sin tests.
- Issue ORDER-003 es el único mandato activo de este ciclo: https://github.com/simondalmasso/GTArgento/issues/4

PASOS:
1) Shadow-read-only: inspeccioná todas las refs, tree, historial, PR/issues, CI/artifacts y GitLab si conectado; abre la web en navegador y guarda evidencias. Identifica dónde vive el juego real y cuál source SHA está desplegado. Si no hay código en main, recupera de rama/origen real, no inventes un proyecto de cero hasta saber si existe otro.
2) Crea rama order-003-v1 desde base real, sin reset/force push; conserva main como está. Integra en esa rama la implementación. No merges hasta AUD.
3) Implementa exactamente los cuatro personajes/misiones de ORDER-003. Buenos Aires porteña y reconocible, Moria en modelo 3D volumétrico (nunca billboard), móvil portrait y landscape sin reload, desktop, controles y vehículos donde proceda, win/fail/retry, HUD/audio.
4) Usa Three.js/Vite/TypeScript solo si la inspección confirma que es el runtime correcto o si hace falta reconstrucción mínima justificada. No integres motores adicionales ni API paga por defecto.
5) Corrige y prueba scripts SEO en fixture y build real; indexable debe seguir false hasta gate de derechos/aprobación.
6) Build limpio desde lockfile, typecheck, lint, unit, E2E de las cuatro misiones, pruebas portrait/landscape con giro sin reset, screenshots de estados, consola/network sin fallos, rendimiento desktop/móvil medido.
7) Cloudflare Workers primero: staging si está disponible, deploy, registrar deployment/version ID, probar la URL pública en desktop y teléfono, comparar hashes/source. Después reconciliar exact source a GitHub branch/PR. Nunca digas deploy OK sin HTTP/browser evidence.
8) Comenta Issue #4 con checkpoint reproducible: SHAs, Worker version, URL, logs, test matrix, screenshots, performance, asset provenance/licensing y bugs restantes. READY_FOR_AUD solo con todos los gates PASS. No mergear.

CRITERIOS P0: Moria reconocible en close-up y 360; ciudad Buenos Aires convincente; 4 misiones completas distintas; mobile portrait/landscape; controles/cámara/colisiones; no blank screen; evidencia de producción. Si un criterio falla, corrígelo, no lo ocultes detrás de CI verde.
```
