# GTArgento — ARRANQUE ARQ 🛠 (handoff autónomo)

ROLE_LOCK=ARQ
AUTHORITY=AUD, ORDER-003
PROJECT=https://github.com/simondalmasso/GTArgento
ORDER=https://github.com/simondalmasso/GTArgento/issues/3
EVIDENCE=https://drive.google.com/drive/folders/10lWNSRSsvYuG21GaGZVLyYqyxYVwYEsY
WORKER=https://quienes-son.simondalmasso44.workers.dev/
DATE_CONTEXT=2026-10-10
GIT_POLICY=NO_FORCE_PUSH, NO_AUTO_MERGE, PRESERVE_HISTORY
BUDGET=USD_0 / NO_PAID_CREDITS
DEPLOY=WORKERS_FIRST THEN EXACT_SOURCE_GITHUB
AUD_CONTRACT=NO_WAIT_DURING_INTERNAL_BUILD; AUD_REVIEWS_ONLY_MATERIAL_READY_FOR_AUD_CHECKPOINT

## TU MISIÓN
Implementá y verificá de punta a punta **GTArgento**, UN SOLO nivel 3D de Buenos Aires/Corrientes, aspecto mini GTA original (sin assets Rockstar), cuatro personajes jugables (Moria Casán, Facundo Moyando satírico, Franco Colapinto, Tini Stoessel), cuatro misiones distintas y completas, selector de personaje, auto/peatones/tercera persona, mobile portrait+landscape+rotación en vivo y desktop. Lo central es que SE VEA BONITO, sea JUGABLE y Moria se parezca a Moria de verdad con su referencia fucsia; un prototipo gris o billboard no sirve. No presentar rumores/alegaciones reales como hechos: todo ficción satírica, negocios de Tini con agencia inventada (NO padres), Facundo persecución de objeto/tarjeta sin acosar ni tocar a un NPC, Franco Madrid es SET de estreno en el MISMO mapa.

## AUD RECONSTRUYÓ
GitHub renombrado desde QUIÉNES SON: repo ID 1333691678, privado, main bb841b8382fe5e20f2ee4241dea7ab9f6b44d62f originalmente README solamente; branch order-001-v1 and order-001-deploy at 2e9a89d990c7c355ece04578ea8590008976125f; draft PR #2 NO MERGED. GitLab paralelo simondalmasso/quienes-son tiene main 854c338a..., recovered-web branch 1dbc4afb7048f9aa2bd244dd26ce4dbcde446831 (Three/Vite/React TS + assets + Wrangler), Unity branch 98f19c647785c80015dc387c453d0e2d5a158db1. Re-evaluá la disponibilidad real, los branches/hashes exactos y producción al iniciar. NO inferir que GitHub main y Workers contienen lo mismo. El Worker legacy conserva URL de QUIÉNES SON hasta autorización expresa de cambio. Los viejos README/AGENTS GitLab-only/Unity-only están superseded por ORDER-003.

## TU PRIMERA SESIÓN
1. Leer íntegramente Issue ORDER-003 y esta guía. No pedir resumen al usuario; hay evidencia durable.
2. Clonar/checkout de GTArgento, preservar main/PR #2 sin fusionarlos. Crear rama de implementación con nombre de orden. Leer GitLab recovered-web y recuperar cualquier fuente/asset válido con tabla de procedencia, licencia y archivos.
3. Inspeccionar Worker live usando HTTP + browser: title, assets, headers, consola, capturas, input mobile, reproducción del fallo del usuario, build SHA/Cloudflare version si accesible; registrar incertidumbres. No claim de disponibilidad sin prueba.
4. Confirmar stack: Vite+TS+Three.js WebGL2, HTML/CSS UI, WebAudio, glTF, Playwright. No cambiar a Unity/Godot ni usar GTA/warez/cracks; no recurrir a VIGA/WorldClaw como runtime ni a APIs de pago.
5. Hacer PRIMERA VERTICAL SLICE que sea bonita y usable: una intersección auténtica de Corrientes, iluminación, protagonista Moria 3D frontal/perfil/atrás con look fucsia, cámara y toque vertical. Si se ve mal, arreglar antes de añadir otros personajes.
6. Consolidar módulos engine/input/camera/collisions/vehicles/NPC/missions/selector. Cuatro misiones del Issue #3 sin alterar su alcance. Un solo mundo; cambios de personaje limpian entidades/timers pero NO recrean y descargan la ciudad a cada click.
7. Testeá con INPUT REAL desktop/touch cada misión win/fail/replay, taxi, especiales, orientación viva, safe-area iOS, foco/resume, 0 errores, low-end performance. Repetí ciclos build→render→critique→repair hasta calidad.
8. **CLOUDFLARE FIRST**: staging y luego canonical, registrar version+asset SHA, full E2E en producción. Solamente DESPUÉS reconciliar exactamente el source probado a rama/PR GitHub. NO MERGE main sin revisión AUD.
9. Publicar checkpoint DRIVE/04_EVIDENCE y comentar ORDER-003 con URL, source SHA, version Worker, hashes, 4x mission E2E matrix, assets/licencias, FPS, capturas de 4 turntables+Moria comparada con referencia+hero scene+portrait/landscape, videos y BLOCKERS reales. Responder READY_FOR_AUD, luego esperá auditoría sin anticiparla.

## REGLAS
- Main, historia anterior y PR #2 nunca force-push. Documentos y descripción del repositorio se ordenan sin fingir que son juego terminado.
- No gastos, no token secreto en chat/código, ninguna API de pagos.
- Hero face y Baires tienen gate VISUAL, no solo asserts E2E; si la gente no reconoce Moria ni Baires, seguí corrigiendo.
- No modificar settings/seguridad de Cloudflare ni agregar trackers/analytics/backends salvo absoluta necesidad probada.
- Entrega no aceptada si alguna misión está incompleta o si mobile portrait necesita rotar.
- Screenshot/video de producción real con fecha/version, no render maquillado o mockup.

## CONTRATO DE RESULTADO
READY_FOR_AUD solo si ALL mandatory gates en ORDER-003 PASS. AUD es cerebro/dirección y no interviene durante build; ARQ es ejecución y debe continuar hasta terminar o BLOCKED_REAL demostrado. Los hallazgos y controles van a Drive, link desde ORDER-003.
