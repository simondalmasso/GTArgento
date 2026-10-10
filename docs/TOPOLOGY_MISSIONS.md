# GTArgento — Topología única y misiones de referencia (ORDER-003)

Documento ejecutable para ARQ. Mantener una única instancia de mundo y una sola malla de tránsito/colisiones. Todos los números son unidades de mundo ≈ metros de juego; y=0 plano caminable. Se pueden transformar rigidamente para salvar assets de código previo, pero NO cambiar conexiones, hitboxes y requisitos visuales sin documentarlo.

## Plano cartesiano de referencia

Mapa nominal 175m × 85m. +x avanza desde teatro hacia boliche; z define profundidad urbana. Avenida Corrientes sobre eje X con 16m de calzada (z entre -8 y +8) y veredas anchas (z -15..-8 y +8..+15). Los edificios recortan el área desde |z| ≥17, salvo una intersección en x≈-10 y un desvío con callejón. El objetivo no es un largo corredor visual: fachadas profundas, bocacalles falsas, horizonte de Obelisco, 1–2 transversales creíbles y dos trayectorias utilizables.

Nodos y visuales:
- THEATRE T: (-70,+12), marquesina teatral rosa/ámbar, entrada y spawn de Moria.
- KIOSK K: (-47,+12), diarios/puestos, gente.
- INTERSECTION X: (-10,0), cruce de avenida con semáforos, taxi, colectivos, carteles porteños.
- TAXI V: (-30,-5), entrada contextual por botón E/touch.
- SET MADRID M: (0,-29), marquesina de estreno de una película llamada "MADRID" con cámaras; no cambio de mundo.
- AGENCY A: (+28,+12), productora MUSIKA (inventada), documentos/recaudación.
- SHORTCUT S: (+30,-13), callejón decorado, desemboca en vereda sur.
- CLUB N: (+70,+12), club de neón GLAM, victoria de Moria.
- EXIT E: (+70,-10), parada/plaza de taxis, salidas de Franco/Tini/Facundo.
- OBELISK VIEW O: (+82,0) muy al fondo, monumento/silueta o vista axial porteña. Prohibido vender cielo genérico con texto BUENOS AIRES.

Camino principal: T→K→X→A→N (vereda norte).
Camino alternativo: T→K→X→M→S→E→N (sur, más arriesgado pero corto en eventos).
La malla de suelo, los colliders y NPC steering deben dejar transitable ambos caminos. Bloqueos visuales lejos del área jugable, sin choque invisible delante del club. Un solo ascenso sin escaleras realistas para accesibilidad del controlador.

## Registrador de misiones compartido

PlayerId = moria | facundo | franco | tini
State = SELECT | BRIEFING | PLAYING | WON | LOST
Objectives = reach | collect | evade | time-trial | drive | ability
Input = unified move/look/sprint/special/interact/pause

Mission engine emite onMissionStart, onObjectiveStart, onObjectiveComplete, onMissionFail, onMissionWin, onMissionExit. Trigger requiere playerId, missionActive, prerequisites satisfechos y colisión exacta, no distancia gigante que otorgue win accidental. La trayectoria no puede depender de FPS ni ubicación inicial incierta. Missiones sin reloading entero de página. Al cambiar de player: limpiar timer, foto-paparazzi, entidades, vehículo ocupado, cámara, audio, counters, compositor; NO recrear 100MB de mundo.

### 1 MORIA — T a N
Spawn T - objetivo llegar a N, game pressure ENTIDAD desde paparazzi. Distancia paparazzi 12–15m inicia seek, a 3m foto incrementa ENTIDAD con cooldown individual 3s. Q knockback/stun NPCs radio 7m por 1.6s, cooldown 8s y audiovisual elegante, sin ragdoll. Bar 0→100, 100 FAIL. Llegar entrada N al final 100% WIN. Taxi abordable/descendible, usarlo es decisión libre. No teleport sin feedback ni victory por abrir modal.

### 2 FACUNDO — Carrera slapstick no violenta
Spawn (-56,+12). Ficticia "Cande Arziaga" huye con un PASS VIP extraviado. Objeto-meta es un mostrador de entrega cerca de E (no tocar a Cande). 80 segundos con stamina, zonas de flash y gente en vereda; shortcuts. Checkpoint 1 K, checkpoint 2 X, checkpoint 3 S, final E. Objetivos deben resolverse secuencialmente; el objetivo final no depende de perseguir al NPC de cerca o de violencia. Todo presentable como farsa inventada.

### 3 FRANCO — Madrid Express
Spawn M (escenografía en Corrientes), compañero/a ficticio/a sin nombre de persona real. Interact con auto en (-2,-22). Checkpoints (-10,-6)→(+18,-5)→(+45,-5)→E. Tiempo 105s, suma FAMA por choques con autos/obstáculos, prohibir impacto con peatones (freno/colisión sin daño, falla o rebota). Requiere conducir + llegar con auto, no ganar caminando a E. HUD cronómetro y velocidad, cámara coche con FOV coherente.

### 4 TINI — Reglas del show
Spawn A, productora ficticia sin parentesco con figuras reales. Recoger 3 tokens "CONTRATO", "REGALÍAS", "DERECHOS" en A (interior de vestíbulo simple accesible), K+ y S (ubicaciones ej. (+24,+12), (+43,+12), (+42,-12)); evadir cámaras estáticas con conos visuales estilizados y guards no letales, hasta E en 125s. Entrega/escape con coche o a pie; no terminar antes de 3 tokens; nada de "papás robaron" o acusaciones equivalentes. Textos judiciales ficticios no aluden a hechos probados.

## Avatar y cámara

Instanciar GLB rigged de cada protagonista con identical translation origin at foot, normalizar escala humanoide 1.6–1.9m y orientación hacia +x en coordenadas del mundo, preservando proportions de Moria y vestuario aprobado. Moria rotación 360° no muestra textura bilateral pegada a plano. 8–12 animaciones compartidas/cancelables con AnimationMixer; blends idle/walk/run + ability.

Cámara tercera persona: altura objetivo 1.35m, distancia ideal 4.5–6.0m, pitch limitada -20° a +40°, follow damping FPS-independent, raycast contra muros para evitar oclusión; mobile horizontal reduce distancia para mayor FOV, portrait sube cámara un poco pero muestra cabeza+piernas+obstáculos. Compensar movimiento periférico joystick, touch look swipe libre en mitad derecha. No imponer landscape.

## Gates E2E específicos

Cada personaje: seleccionarlo en menú 3D, arrancar, ejecutar TODOS objectives en orden desde input real, provocar pérdida en otra corrida, replay y switch sin reload; locomoción/cámara y taxi donde corresponde, retrato/landscape mid-run. Tests no deben hackear state para conseguir win. Avatar snapshots frontal, 3/4, perfil, espalda y calle Baires desde mismo ángulo; el owner tiene veto visual. Propiedad de las texturas y modelos documentada en ASSET_LICENSES.

One level shared. One engine. Four stories. No placeholder release.
