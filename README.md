# GTArgento

**Un solo Buenos Aires. Cuatro protagonistas. Cuatro misiones.**

Videojuego 3D original de sátira argentina para navegador, inspirado en la libertad de movimiento de los juegos urbanos arcade pero sin recursos de GTA/Rockstar. Un microbarrio reconocible de Avenida Corrientes / Obelisco, con cámara en tercera persona, NPCs, taxis y juego fluido en móvil vertical, móvil horizontal y escritorio.

> **ESTADO: EN IMPLEMENTACIÓN — ORDER-003.** La rama main contiene documentación de control, NO el release final. La rama histórica order-001-v1 y PR #2 siguen sin fusionarse. No presentar CI verde como DONE.

## Elegí tu protagonista

| Personaje | Misión satírica | Mecánica |
| --- | --- | --- |
| Moria Casán | **¿QUIÉNES SON?**: del teatro al boliche, sin dar entidad a paparazzi | evasión, especial Q, taxi |
| Facundo Moyando | **LA CORRIDA DEL SIGLO**: llevá el pase extraviado al punto de entrega | contrarreloj, obstáculos, resistencia |
| Franco Colapinto | **MADRID EXPRESS**: escapá de un estreno ficticio | conducción arcade, checkpoints |
| Tini Stoessel | **REGLAS DEL SHOW**: recuperá derechos contractuales de agencia ficticia | recolección, sigilo ligero, escape |

Toda historia, agencia, encuentro o supuesto incidente es ficticio y paródico. No se afirman hechos reales sobre relaciones, familiares o conducta de los retratados. No es un producto oficial ni asociado con estas figuras. La publicación de likeness de personas vivas requiere revisión de derechos de imagen.

## Links de trabajo

- [ORDER-003 — especificación completa y definición de DONE](https://github.com/simondalmasso/GTArgento/issues/3).
- [ARQ_START_HERE — handoff integral desde cero](docs/ARQ_START_HERE.md).
- [Drive oficial — órdenes, investigaciones y evidencias](https://drive.google.com/drive/folders/10lWNSRSsvYuG21GaGZVLyYqyxYVwYEsY).
- [URL Cloudflare Workers histórica y objetivo](https://quienes-son.simondalmasso44.workers.dev/) — una URL con HTTP 200 no significa misión jugable ni calidad aprobada.
- Legado: GitHub branch order-001-v1, PR #2 sin merge; GitLab simondalmasso/quienes-son branch grokbot/order-002-recovered-web contiene recovery Three/Vite.

## Reglas de ejecución

1. ARQ construye y opera; AUD dirige/audita únicamente tras checkpoint material. No esperar a AUD entre tareas internas.
2. Una sola ciudad 3D y una sola arquitectura, cuatro avatares 3D reales y cuatro misiones completas.
3. Implementación en rama separada, sin sobrescribir ni force-push main o PR históricos.
4. Primero deploy **Cloudflare Workers** y E2E completo de producción. Después reconciliación del **source exacto desplegado** a GitHub y PR revisable.
5. Verificar por screenshot, grabación, hashes, Worker version y tests de mobile portrait/landscape/rotación, desktop, avatar y rutas.
6. **USD 0** autorizado; prohibidos pagos/API de cobro sin permiso.

## Motor

Vite + TypeScript + Three.js WebGL2 + GLB/glTF + WebAudio + HTML/CSS HUD + Playwright. Sin backend, DB ni inferencia IA en runtime del primer release. La aplicación final aún NO reside en main; los módulos están especificados en ORDER-003.

## Criterios visuales

Moria debe verse como Moria (cara adulta reconocible genuinamente 3D, pelo negro largo, outfit fucsia con vestido, medias y abrigo voluminoso) frontal, 3/4 y perfil. Buenos Aires debe leerse sin un rótulo gigante, con teatro, Corrientes, colectivos, taxis y arquitectura porteña. No se aceptan personajes genéricos, fotos planas para cabeza, gris/graybox ni controles bloqueados por orientación.

**GitHub topics sugeridos para settings:** gtargento, game-development, threejs, typescript, webgl, browser-game, argentina, buenos-aires, satire, mobile-game, cloudflare-workers.

## Licencias

No usar GTA assets/audio/código, repacks, voces clonadas sin permiso, música/imágenes no autorizadas ni paquetes copiados de demos sin licencia. Documentar procedencia y derechos de todos los modelos, texturas y audios. Drive centraliza evidencia y hallazgos; GitHub es revisión de source; Workers es producción.
