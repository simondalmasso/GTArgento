# GTArgento · Arquitectura de referencia AUD (2026-10-12)

**Estado:** especificación de integración / no implementación. **Autoridad:** [ORDER-003](https://github.com/simondalmasso/GTArgento/issues/3). **Alcance:** un nivel de Buenos Aires, cuatro avatares auténticamente tridimensionales y cuatro misiones diferentes. Este documento NO significa que exista una versión terminada en `main`.

## 1. Decisiones cerradas

- **Runtime:** Vite + TypeScript + Three.js **WebGLRenderer** sobre WebGL2, build estático para Cloudflare Workers Static Assets. Sin Unity/Godot/WebGPU obligatorio, servidor de juegos, base de datos ni render neuronal.
- **Gameplay:** un `World`, una cámara tercera persona, un `InputManager`, un `MissionEngine`, un controlador de personaje y un sistema simple arcade para vehículos. Solo cambian instancias/configuración al elegir avatar.
- **UI:** HTML/CSS overlay y menú sobre un canvas WebGL. React/Zustand del código recuperado GitLab pueden conservarse si la UI ya funciona; **React no debe actualizar posiciones de meshes a 60 Hz**.
- **Activos:** glTF/GLB rigged, WebP (KTX2 solo si compensa medido), instancing/batching de props. No usar cabezas foto-billboard.
- **QA visual:** inspirado en el ciclo VIGA, no dependiente de VIGA. Capturar ángulos comparables y analizar artefactos visuales hasta pasar.
- **Cero gasto autorizado:** no habilitar APIs, tokens pagos ni servicios de generación con cobro.

## 2. Estructura lógica

```text
src/
  main.ts                  # startup, abort handling, context-loss & loader
  core/
    loop.ts                # fixed-step gameplay; render with alpha interpolation
    input.ts               # keyboard/mouse/touch; normalized actions
    game-state.ts          # SELECT/BRIEFING/PLAYING/WON/LOST/PAUSED
    lifecycle.ts           # dispose world/characters/animations/timers
  rendering/
    renderer.ts            # WebGLRenderer configuration, CSS/physical viewport
    quality.ts             # adaptive DPR, GPU/CPU sampling; no mission downgrade
    camera.ts              # third person orbit + collision + car mode
  world/
    manifest.ts            # authored landmarks, roads, routes, colliders, props
    loader.ts              # glTF scene, instanced groups, textures
    collisions.ts          # capsule-AABB / simple cast, character and car masks
    npc.ts                 # pooled pedestrian/paparazzo FSM, spatial buckets
  characters/
    registry.ts            # model IDs, animation clips, cosmetics, rights
    controller.ts          # locomotion FSM shared for all four
    avatars/               # four GLB rigs + look profiles
  vehicle/
    controller.ts          # grounded arcade steering/friction/enter/exit
  missions/
    engine.ts              # typed objective state and guarded transitions
    moria.ts facundo.ts franco.ts tini.ts
  audio/
    sound.ts               # single bus, gesture-unlock, mute, cleanup
  ui/
    select.ts hud.ts touch.ts results.ts
public/
  assets/characters assets/city assets/vehicles assets/audio assets/ui
  robots.txt sitemap.xml og/gtargento.webp
tests/
  unit/ e2e/ visual/
docs/
  ARQ_START_HERE.md TOPOLOGY_MISSIONS.md REFERENCE_RESEARCH.md
  SEO_PLAYBOOK.md ASSET_PIPELINE.md RELEASE_MANIFEST.md
```

Filenames merely illustrate separation: **ARQ may adapt actual filenames to avoid needless refactors**. Main stays stable; integrate through a review branch after Workers-first verification, with provenance.

## 3. Loop, events and state

Use `requestAnimationFrame` and accumulator fixed delta at 1/60 (max catch-up 4) with render interpolation; pause on page visibility, resume without dt spike; avoid duplicate listeners/RAF on character switches. Sample normalized input once each simulation step.

```ts
type PlayerId = 'moria' | 'facundo' | 'franco' | 'tini';
type GamePhase = 'select' | 'briefing' | 'playing' | 'won' | 'lost' | 'paused';
type ObjectiveKind = 'reach' | 'collect' | 'evade' | 'ability' | 'drive' | 'time-trial';
interface ObjectiveSpec {
  id: string; kind: ObjectiveKind; targetId: string;
  after?: string[]; requiredCount?: number; timeoutSeconds?: number;
}
interface MissionSpec {
  player: PlayerId; spawn: [number, number, number];
  objectives: ObjectiveSpec[]; failThreshold?: number;
  timerSeconds?: number; winText: string; failText: string;
}
interface ControlFrame {
  moveX: number; moveY: number; lookX: number; lookY: number;
  sprint: boolean; ability: boolean; interact: boolean; pause: boolean;
}
```

Key invariants: only `PLAYING` allows objectives; target IDs reference a loaded world manifest; prerequisite graph is acyclic; reaching a final destination before collecting mandatory items never wins; collision/trigger logic independent of FPS; retries reinitialize all pressure/timer/NPC states. No debug teleport in production E2E.

## 4. Three.js scene budget and visual design

Target 60 Hz desktop / capable midrange mobile as measured target (not guaranteed). First-profile budgets, not acceptance absolutes: 80–150 draws typical hero frame, 8–14 active NPCs, texture atlases, shared materials, instanced repeated windows/light poles, limited actual shadow-casting lights, baked static world lighting and glow sprites. Keep a deterministic debug camera **dev only** (three-freecam MIT), frame Moria and landmarks, capture front/side/back reproducibly. Profile renderer.info + frame times/memory; use `InstancedMesh`, `BatchedMesh`, merged BufferGeometry where pickability allows. For objects that must be picked, separate logical IDs from visual batched geometry (Human Atlas pattern).

For GLB use GLTFLoader; consider DRACOLoader or MeshoptDecoder only after controlled CPU startup measurements and transcoder hosting offline; don't layer compressors blindly. Bake billboard advertisements as building *props* if license original; avatar HEAD must always be solid 3D geometry.

Baires manifest should encode exactly one region: Corrientes theatre, Obelisco sightline, cross street, kiosk, colectivo, taxi, nightclub, fictional agency and faux Madrid premiere set; reuse [topology](TOPOLOGY_MISSIONS.md), not four maps. Dress street with coherent porteño details and warm/fuchsia night palette. User veto on visual quality overrides passing mechanical E2E.

## 5. Mobile controls and device state

- Portrait and landscape share whole mission and same avatar; no rotate modal; right drag orbits; left joystick moves; primary Q/interact touch near safe area; car mode maps steering/throttle/brake and retains exits.
- CSS use `100dvh` with `viewport-fit=cover`, `env(safe-area-inset-*)`; canvas physical `devicePixelRatio` clamped/adaptive. Orientation/resize updates viewport, FOV/aspect and touch anchoring **without resetting state**.
- On pointercancel/lost capture, release held action. Keep touch listener passive false only on interactive surface, prevent browser scroll without breaking accessibility. Audio unlock after explicit user gesture. Context loss shows recover UI rather than permanent blank.

## 6. Lifecycle / quality gates

On switch: dispose animation actions, event subscriptions, physics bodies, NPC state, occupied taxi and sound voices; retain world geometry/texture only once. Test repeated select→run→fail/win→retry→select in one page with heap plateau. Maintain `Moria` facial detail and Baires set dressing across quality profiles.

Tests in production must cover 4 complete mission wins and failures, touch portrait/landscape and live rotation, realistic joystick drags, Q and cooldown, enter/drive/exit, NPC pressure, camera obstacle behavior, keyboard and WebKit; record screenshots and device meta. A passed CI test without manual-equivalent gameplay is insufficient. Capture assets + Worker version IDs/hashes to prove deployed exact source.

## 7. Parallel work boundaries for ARQ

1. **Visual-world/character track:** author good GLBs, quality checks, provenance, closeup.
2. **Gameplay track:** unified input/camera/world collision/objective engine, deterministic tests.
3. **UX/SEO track:** menus/HUD/touch/responsive/meta without touching simulation.
4. **Integration track:** verify in one game runtime, deploy Workers, visual/perf regression, reconcile GitHub after deploy.

These can run concurrently but meet at a stable input, world-manifest and mission-event interface, never by direct divergent forks. No change in renderer/engine without measured justification in review evidence.

## 8. External dependencies selected/rejected

**Adopt:** Three.js MIT; human-atlas MIT batching architecture, not anatomy geometry; hxtnv/three-freecam MIT for dev inspector; plain VIGA-style render comparison. Optional offline local Modly MIT for props only after VRAM/weight/license validation. Motion2MixamoRig Apache-2.0 is experimental and upstream motion weights require independent license checks; use only offline, never runtime.

**Do not integrate into web game:** WorldClaw paper-only repo; VIGA research agent requiring Conda/CUDA/API keys; Seijaku no-reuse original code/photography; Mixar Blender GPL app wholesale; three-dlss-nr hundreds ms/frame, WebGPU-only; unrelated Unreal/Unity editor tools, torrent/modded GTA files. More detail: [REFERENCE_RESEARCH](REFERENCE_RESEARCH.md).

**Release sequencing:** Cloudflare staging → full production verification → deployed manifest + rollback → exact-source GitHub review branch/PR → AUD verdict. GitHub `main` must not falsely represent unverified deployment.

## 9. Handoff invariant

When ARQ opens a new chat: read Issue #3, this architecture, ARQ_START_HERE and TOPOLOGY_MISSIONS; inspect live current source again. No reliance on chat-local context. Every meaningful checkpoint records date, sha, Worker version, screenshots, E2E, failures, sources and licenses in Drive.
