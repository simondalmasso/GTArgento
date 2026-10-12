# AUD · Evaluación de repositorios y referencias para GTArgento (2026-10-12)

**Propósito:** transformar enlaces recibidos en decisiones de arquitectura. **Regla:** ni estar en GitHub ni tener demo implica permiso para copiar código/assets. Estado de cada fuente: **verificado directamente**, **evaluación preliminar (licencia pendiente)** o **referencia solamente**. Este informe NO afirma haber compilado todos los proyectos; pruebas de integración pertenecen a ARQ y deben registrarse.

**Decisión general:** construir un solo mini GTA argentino sobre Three.js WebGL2. Usar **técnicas** de autores ajenos, no mezclar 15 motores, sistemas de materiales y renderizadores. Priorizar 1) Moria y tres personajes 3D verdaderos, 2) Buenos Aires identificable, 3) controles/auto/misiones, 4) performance y UI. Un asset con términos dudosos no entra en producción.

## A — ADOPTAR/PROBAR EN EL PIPELINE (no implica copiar modelos de ejemplo)

| Referencia | Qué nos aporta | Acción concreta | Licencia/riesgo |
|---|---|---|---|
| [mrdoob/three.js](https://github.com/mrdoob/three.js) / [examples](https://threejs.org/examples/) | Renderer WebGL, GLTFLoader, InstancedMesh/BatchedMesh, AnimationMixer, cameracollision primitives | Mantener dependencia `three` pinneada + glTF; usar ejemplos de referencia con autor/atribución en lo que proceda | **MIT verificado** para librería; assets individuales de demos pueden tener sus propias licencias |
| [ashemag/human-atlas](https://github.com/ashemag/human-atlas) / [demo](https://human-atlas-seven.vercel.app/) | Gran número de objetos con geometría agrupada, textura GPU de visibilidad/selección, picking lógico separado | Prototipo de batching de fachadas/props y menú 3D | **MIT código**, datos de anatomía **CC BY 4.0**; no importarlos al juego |
| [hxtnv/three-freecam](https://github.com/hxtnv/three-freecam) | inspector 3D, fly/orbit/frame a nivel dev, pequeño | Activar SOLO con flag dev `?debug=1`; capturar avatar 360 y colisiones | **MIT** verificado; NO third-person player controller |
| [MaxLiu22/Motion2MixamoRig](https://github.com/MaxLiu22/Motion2MixamoRig) | retarget de video a rig Mixamo y GLB para animaciones | Prueba OFFLINE en solo 1 avatar test; comparar fps/quality vs animación manual/Mixamo | Código **Apache-2.0**, pero SMPL-X y pesos modelos sujetos a licencias propias, prototipo experimental; verificar **antes** de importar activos |
| [lightningpixel/modly](https://github.com/lightningpixel/modly) | generación de modelos 3D local con GPU, posible pipeline personajes/props | Solo herramienta OFFLINE bajo USD0 si el equipo tiene GPU suficiente y términos de pesos compatibles; retopología/rigging manual posterior | MIT app; modelos/weights/extensiones a verificar individualmente |
| [oil-oil/oil-motion](https://github.com/oil-oil/oil-motion) | skill generación/verificación de timeline controlado por scroll/pointer/touch | Aplicar SOLO para intro/selección si assets aptos y costo cero; preferir AnimationMixer en gameplay | **MIT** código skill, contenido/generadores externos requieren auditoría |
| [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) | dirección audiovisual enteramente en código; referencias de secuencias | Inspiración para breve pantalla de presentación y feedback mission passed, sin importar vídeos | MIT código; guías CC BY 4.0 y terceros licencias individuales |
| [riba2534/claude-opus-5-5-demo](https://github.com/riba2534/claude-opus-5-5-demo) | experimento one-prompt de juegos reales con pruebas, soak test, reparación de blackscreen y CDN | Adoptar **ritual QA**: comparar estado visual, soak test, capturas, consola y reparación tras deploy; no copiar personajes/mapas | License de código no confirmada en esta auditoría; bench only |

## B — RESEARCH / BENCHMARK VISUAL (NO DEPENDENCIA INMEDIATA)

| Recurso | Lectura para GTArgento | Restricción |
|---|---|---|
| [Tencent Hunyuan3D WorldClaw](https://github.com/Tencent-Hunyuan/Hunyuan3D-WorldClaw) | coarse-to-fine 3D world intent→regions→object placement; útil para manifiesto de Corrientes | **Repo publicado solo como paper/proyecto** (README/assets), no herramienta lista para producción |
| [Fugtemypt123/VIGA](https://github.com/Fugtemypt123/VIGA) | Generator→render→Verifier→repair con comparación multivista de Moria | MIT en repo; instalación pesada Conda, CUDA recomendada, SAM y llaves OPENAI/MESHY: NO integrarlo en runtime ni asumir $0 |
| [Kenton-GMI/sakuragaoka-station](https://github.com/Kenton-GMI/sakuragaoka-station) | calles densas/procedural a escala mini-world; inspirar dressing y señales | Licencia de reutilización original NO confirmada aquí; inspeccionar LICENSE y contenidos antes de copiar |
| [dgreenheck/tidewater](https://github.com/dgreenheck/tidewater) | modularidad game/world/player/audio/ui, ambiente memorable, investigación de pruebas y performance | Código MIT verificado; features de motor/oceánico/WebGPU no se transplantan; assets terceros con CREDITS |
| [MengTo/seijaku](https://github.com/MengTo/seijaku) y [demo](https://seijaku.mengto.here.now/) | composición arquitectónica y luz, textura/material con alto detalle, debug/perf `?perf`, assets audit | **Autor declara expresamente NO REUSE** de código y arte originales, solo idea y comparación visual |
| [MengTo/Skills](https://github.com/MengTo/Skills) | técnicas de dirección de producto/visual | Revisar licencia skill a skill y adaptación sin copiar activos propietarios |
| [lhlGitHub/threejs-architecture-effects](https://github.com/lhlGitHub/threejs-architecture-effects) | técnicas de fachadas, iluminación y post FX | No importar a producción sin evaluar licencia, costo GPU y funcionamiento mobile |
| [lisa.locomotive.ca](https://lisa.locomotive.ca/en) | narrativa, direction, spatial animation, web experiental | benchmark diseño, no copiar bundles |
| [tiltshift-in-html.ybouane.com](https://tiltshift-in-html.ybouane.com/) | profundidad de campo fake en menú/selector | sólo si móvil no pierde legibilidad/FPS; no fullscreen blur en gameplay |
| [inspora.design](https://www.inspora.design/) | editorial visual y jerarquía de marca | benchmark creativo |
| [threetopia.com](https://threetopia.com/), [editor.pascal.app](https://editor.pascal.app/next) | authoring y UX de edición interactiva | benchmarks; no segundo motor |
| [isoglow.dev](https://isoglow.dev/demo/3d#tw) | posible composición/luz volumétrica 3D | benchmark, costo de shader a medir |
| [JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) | posible secuencia técnica de animación | pendiente verificación directa de licencia/compatibilidad: NO dependencia |
| [SamG-Coder/clearwater](https://github.com/SamG-Coder/clearwater) | referencias shaders/ambiente | licencia e impacto GPU no verificados |
| [GBurgardt/pokemon-emerald-arena](https://github.com/GBurgardt/pokemon-emerald-arena) | UI narrativa/arena | descartar assets/franquicia, sólo UX abstracta |
| [somethingbig.ai/world](https://somethingbig.ai/world/) | mundo guiado por narrativa/interacción | benchmark creativo |
| [taxi.murat.works](https://taxi.murat.works/) | sensación de conducción de un objetivo urbano | benchmark input/cámara |
| [messenger.abeto.co](https://messenger.abeto.co/) | estándar de mundo pequeño y hermoso/consistente | benchmark producto, no reutilizar assets |
| [godawful.vercel.app](https://godawful.vercel.app/) / [seijaku](https://seijaku.mengto.here.now/) | web showcase | no deriva licencia sobre bundles |
| [lisa](https://lisa.locomotive.ca/en) | scroll/storytelling transitions | no scroll obligatorio en juego en tiempo real |

## C — EXCLUIR DEL RUNTIME / APLAZAR (razón documentada)

| Recurso | Decisión AUD |
|---|---|
| [bhouston/three-dlss-nr](https://github.com/bhouston/three-dlss-nr/) | **NO USAR**: WebGPU-only, sin WebGL fallback; benchmark público da >200ms/frame a 512px en 3060Ti; no sirve mobile live |
| [gavinyork/zephyr3d](https://github.com/gavinyork/zephyr3d) | MIT, interesante WebGL/WebGPU/editor, **pero** segundo renderer con APIs propias generaría refactor innecesario |
| [abppbd/3D-engine-in-web-browser](https://github.com/abppbd/3D-engine-in-web-browser), [jftucker/browser-3d-engine](https://github.com/jftucker/browser-3d-engine) | construir motor propio para un mini-game retrasa personaje, Baires y gameplay; investigar para aprendizaje, no reemplazo |
| [amirmushichge/unreal-home-wizard](https://github.com/amirmushichge/unreal-home-wizard), [Unreal MCP](https://dev.epicgames.com/documentation/unreal-engine/unreal-mcp-in-unreal-editor), [godotengine.org](https://godotengine.org/es/) | son herramientas de edición/motores distintos; no rebase salvo benchmarks medidos invalidados |
| [Mixar-AI/mixar-app](https://github.com/Mixar-AI/mixar-app) | Blender-powered workflow **GPL-3.0-or-later**; no copiar código al navegador Three.js; inspiración de interfaz |
| [AlexRed29/GTASymlinkGenerator](https://github.com/AlexRed29/GTASymlinkGenerator), [GTA_Symlink_Generator](https://github.com/AlexRed29/GTA_Symlink_Generator), [Vice City wasm](https://joncodeofficial.github.io/gta-vice-city-wasm/) | no aporta assets originales licenciados: evitar material de GTA/Rockstar y herramientas de mod/puertos para distribución |
| [noahdunnagan/mcopt](https://github.com/noahdunnagan/mcopt/releases/tag/v0.2.0-alpha.1) | herramienta ajena a mini-city runtime; no dependencia hasta especificación de caso de uso |
| [rehan-remade/universal-modder](https://github.com/rehan-remade/universal-modder), [lightningpixel/modly](https://github.com/lightningpixel/modly) | modding no reutilizable, Modly solo offline condicionado a pesos/modelos |
| [KingKongRobotics/jumper](https://github.com/KingKongRobotics/jumper) | no integrar sin caso específico de locomoción y licencia |
| [genex-games/genex-plugins](https://github.com/genex-games/genex-plugins), [genex.games/tools](https://genex.games/tools) | generación opcional, sólo con tarifa efectivamente cero y condiciones legales verificadas |
| [wedulab.com](https://wedulab.com/), [geowgs84.ai / PyVista](https://www.geowgs84.ai/post/why-pyvista-is-the-preferred-python-3d-visualization-framework) | orientados a otros pipelines; no justifican conversión de Three.js |
| [Mixar-AI/mixar-app](https://github.com/Mixar-AI/mixar-app) / [lightningpixel/modly](https://github.com/lightningpixel/modly) | **generador/editor no motor de gameplay**; rigging/LOD/licencia siguen siendo necesarios |
| [Motion2MixamoRig](https://github.com/MaxLiu22/Motion2MixamoRig) | si pesa demasiado/weights no autorizados, preferir rig/animaciones accesibles y simplificadas; nunca bloquear toda la release |

## D — Pasos ejecutables para ARQ: 3 pruebas de alto retorno

**Experimento 1: batching world.** Reutilizá patrones de Human Atlas: instanced street props y fachadas; medición de frame time/draw calls ANTES y DESPUÉS en el mismo viewport, sin copiar datos anatómicos. Criterio: caída clara de draw calls sin romper colisiones/visibilidad.

**Experimento 2: avatar 360.** Usá FreeCam como herramienta de captura con posiciones fijas y una cuadrícula frontal, 3/4, perfil, espalda para Moria y los cuatro personajes; el control humano de parecido visual invalida «pasa tests». Guardá capturas en Drive y etiqueta de versión GLB.

**Experimento 3: verify-repair autónomo.** Tras cada build, screenshot real de teatro, Moria, avenida, taxi, menú portrait. Inspector compara con referencias objetivas, escribe máximo 3 defectos de mayor impacto, ARQ corrige y repite. Tomá el método de VIGA, sin montar sus enormes dependencias ni consumir API.

### Política de source y licencias

Nunca instalar más de una solución por categoría "por si acaso". Anotar para todo asset: URL exacta, snapshot versión, creador, licencia del asset **no solo repo**, si fue modificado, atribución, y revisión de likeness. Si licencia "no reuse" → **no copiar**. Si "unknown" → sólo inspiración. Cambios de dependencia requieren evidencia de FPS/jugabilidad real.

### Fuente de autoridad y límite de esta revisión

Constatado por README/LICENSE publicados para: Three.js, Seijaku, Human Atlas, VIGA, Motion2MixamoRig, Modly, Oil-Motion, Tidewater, three-freecam, three-dlss-nr, Zephyr3D y WorldClaw. Los demás enlaces se clasifican de forma preliminar por relevancia: **no afirmamos licencias no leídas ni pruebas funcionales no realizadas**. Este informe debe actualizarse con resultados reproducibles de ARQ, no con adjetivos o estrellas de GitHub.

**Prioridad final:** Parecido realista de Moria > Baires auténtico > mecánicas y movilidad > selector/historia > refinamiento visual > ingeniería opcional. Todos son obligatorios para release.
