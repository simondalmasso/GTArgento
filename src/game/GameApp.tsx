import { useEffect, useRef, useState } from "react";
import { QuienesSonGame } from "./engine";
import { useHud } from "./store";
import { WORLD } from "./config";
import { ROSTER, type PlayerId } from "../missions/MissionDirector";

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<QuienesSonGame | null>(null);
  const hud = useHud();
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerId>("moria");
  const [joy, setJoy] = useState({ x: 0, y: 0, on: false });
  const joyOrg = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new QuienesSonGame(canvas);
    gameRef.current = game;
    let dead = false;
    game.init().then(() => {
      if (!dead) useHud.getState().patch({ loaded: true });
    });
    const onResize = () => game.resize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      dead = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      game.dispose();
    };
  }, []);

  const begin = () => {
    gameRef.current?.audio.unlock();
    gameRef.current?.start(selectedPlayer);
  };

  const onJoy = (e: React.PointerEvent) => {
    const el = e.currentTarget.getBoundingClientRect();
    const cx = el.left + el.width / 2;
    const cy = el.top + el.height / 2;
    if (e.type === "pointerdown") {
      joyOrg.current = { x: cx, y: cy };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (!joyOrg.current) return;
    if (e.type === "pointerup" || e.type === "pointercancel") {
      joyOrg.current = null;
      setJoy({ x: 0, y: 0, on: false });
      gameRef.current?.input.setJoy(0, 0, false);
      return;
    }
    const dx = (e.clientX - joyOrg.current.x) / 56;
    const dy = (e.clientY - joyOrg.current.y) / 56;
    const m = Math.hypot(dx, dy);
    const x = m > 1 ? dx / m : dx;
    const y = m > 1 ? dy / m : dy;
    setJoy({ x, y, on: true });
    gameRef.current?.input.setJoy(x, -y, true);
  };

  const stars = Math.round(hud.entity * 5);
  const money = "$" + String(Math.max(0, Math.floor(hud.money))).padStart(8, "0");

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-night text-cream">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {hud.mode !== "intro" && (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div className="absolute left-3 top-3 max-w-[min(92vw,22rem)] sm:left-5 sm:top-4">
            <div className="logo-moria">{hud.characterName}</div>
            <div className="logo-ba">Buenos Aires</div>
            <div className="hud-panel mt-4 rounded-2xl px-4 py-3">
              <div className="mb-1 flex items-center gap-2 text-[0.7rem] font-hud font-bold tracking-widest text-pink">
                <span className="inline-block size-2 rounded-full bg-pink" />
                {hud.missionTitle}
              </div>
              <p className="font-hud text-sm leading-snug text-cream">{ROSTER[hud.selectedPlayer].briefing}</p>
              <label className="mt-2 flex items-center gap-2 font-hud text-sm text-muted">
                <span className={"grid size-4 place-items-center rounded-sm border border-cream/40 " + (hud.objectiveDone ? "bg-mint" : "")} />
                {hud.missionObjective}
              </label>
            </div>
          </div>

          <div className="absolute right-3 top-3 flex items-start gap-3 sm:right-5 sm:top-4">
            <div className="text-right">
              <div className="digital text-xl sm:text-2xl">{hud.time}</div>
              <div className="digital text-lg sm:text-xl">{money}</div>
              <div className="mt-1 font-hud text-lg font-bold text-heart">♥ {hud.heart}</div>
              <div className="mt-1 flex justify-end gap-1">
                {Array.from({ length: 5 }).map((_, i) => <i key={i} className={"star " + (i < stars ? "on" : "")} />)}
              </div>
            </div>
            <div className="grid size-16 place-items-center rounded-xl border-2 border-pink bg-night-2 font-display text-2xl text-pink shadow-hud sm:size-20" aria-label={"Avatar 3D de " + hud.characterName}>
              {hud.characterName.split(" ").map((part) => part[0]).join("").slice(0, 2)}
            </div>
          </div>

          {!hud.isMobile && (
            <div className="absolute right-5 top-1/2 hidden -translate-y-1/2 font-hud text-xs leading-6 text-cream/80 lg:block">
              <div><b>W A S D</b> Mover</div>
              <div>Mouse Cámara</div>
              <div><b>E</b> Interactuar</div>
              <div><b>Q</b> ¿Quiénes son?</div>
              <div><b>Shift</b> Correr</div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
            <Minimap px={hud.playerX} pz={hud.playerZ} yaw={hud.playerYaw} dist={hud.distance} inTaxi={hud.inTaxi} targetX={hud.objectiveX ?? WORLD.theater.x} targetZ={hud.objectiveZ ?? WORLD.theater.z} />
          </div>

          <div className="absolute bottom-4 right-3 sm:bottom-6 sm:right-6">
            <div className="phone-card w-28 rounded-[1.4rem] px-3 py-4 sm:w-32">
              <div className="text-center font-hud text-[0.65rem] tracking-[0.2em] text-muted">OBJETIVO</div>
              <div className="mt-3 font-hud text-sm font-bold leading-tight"><span className="text-pink">📍</span> {hud.missionObjective}</div>
              {hud.missionRemaining !== null && <div className="mt-2 font-hud text-xs text-heart">TIEMPO {Math.ceil(hud.missionRemaining)} s</div>}
              <div className="mt-2 font-hud text-xs text-muted">{Math.max(0, Math.round(hud.distance))} m</div>
            </div>
          </div>

          <div className="absolute bottom-24 left-1/2 w-[min(92vw,36rem)] -translate-x-1/2 sm:bottom-8">
            <div className="subtitle-bar rounded-full px-4 py-2 text-center font-hud text-sm">
              <span className="font-bold text-pink">{hud.characterName}: </span>{hud.subtitle.startsWith(hud.characterName + ":") ? hud.subtitle.slice(hud.characterName.length + 1).trim() : hud.subtitle}
            </div>
          </div>
        </div>
      )}

      {hud.isMobile && hud.mode === "playing" && (
        <div className="absolute inset-0 z-20">
          <div className="absolute bottom-8 left-6" onPointerDown={onJoy} onPointerMove={onJoy} onPointerUp={onJoy} onPointerCancel={onJoy}>
            <div className="joy-base relative">
              <div className="joy-knob absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ transform: `translate(calc(-50% + ${joy.x * 36}px), calc(-50% + ${joy.y * 36}px))` }} />
            </div>
          </div>
          <div className="absolute bottom-8 right-4 flex flex-col items-end gap-3">
            <button className="mob-btn special pointer-events-auto" onPointerDown={() => gameRef.current?.input.tap("special")}>Q</button>
            <div className="flex gap-2">
              <button
                className="mob-btn pointer-events-auto"
                onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); gameRef.current?.input.setRun(true); }}
                onPointerUp={() => gameRef.current?.input.setRun(false)}
                onPointerCancel={() => gameRef.current?.input.setRun(false)}
              >RUN</button>
              <button className="mob-btn pointer-events-auto" onPointerDown={() => gameRef.current?.input.tap("interact")}>{hud.inTaxi ? "SALIR" : "TAXI"}</button>
            </div>
          </div>
        </div>
      )}

      {(hud.mode === "intro" || !hud.loaded) && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-night/65 px-4 py-2 text-center">
          <div className="max-h-[96dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-night/85 px-4 py-5 shadow-hud sm:px-8 sm:py-7">
            <div className="logo-moria mx-auto">GTARGENTO</div>
            <div className="logo-ba mx-auto">Buenos Aires · cuatro misiones</div>
            <p className="mx-auto mt-4 max-w-xl font-hud text-sm text-cream/80 sm:text-base">Elegí protagonista. Cada selección cambia el personaje 3D y la misión; la historia es una parodia ficticia.</p>
            <div className="mt-5 grid grid-cols-1 gap-2 text-left sm:grid-cols-2">
              {(["moria", "facundo", "franco", "tini"] as PlayerId[]).map((id) => {
                const person = ROSTER[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setSelectedPlayer(id); gameRef.current?.selectPlayer(id); }}
                    disabled={!hud.loaded}
                    className={"rounded-2xl border px-4 py-3 text-left transition " + (selectedPlayer === id ? "border-pink bg-pink/10 shadow-hud" : "border-white/10 bg-white/5 hover:border-pink/50")}
                  >
                    <span className="block font-display text-lg text-cream">{person.displayName}</span>
                    <span className="mt-1 block font-hud text-sm font-bold text-pink">{person.title}</span>
                    <span className="mt-1 block font-hud text-xs text-muted">{person.abilityName}</span>
                  </button>
                );
              })}
            </div>
            <p className="mx-auto mt-4 max-w-xl font-hud text-sm text-cream/80">{ROSTER[selectedPlayer].briefing}</p>
            <button className="mt-5 rounded-full bg-pink-deep px-8 py-3 font-hud text-lg font-bold tracking-wide text-cream shadow-hud" onClick={begin} disabled={!hud.loaded}>
              {hud.loaded ? "JUGAR" : "Cargando Corrientes…"}
            </button>
            <p className="mt-3 font-hud text-xs text-muted">WASD / joystick · mouse / swipe para cámara · E interactuar · Q habilidad</p>
          </div>
        </div>
      )}

      {(hud.mode === "won" || hud.mode === "failed") && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-night/80 px-6 text-center">
          <div className="hud-panel max-w-lg rounded-3xl px-8 py-8">
            <h2 className="font-display text-4xl text-pink">{hud.mode === "won" ? "MISIÓN COMPLETADA" : "MISIÓN FALLIDA"}</h2>
            <p className="mt-3 font-hud text-cream/80">{hud.mode === "won" ? hud.missionWinText : hud.missionFailText}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button className="rounded-full bg-pink-deep px-6 py-3 font-hud font-bold" onClick={() => gameRef.current?.restart()}>REINTENTAR</button>
              <button className="rounded-full border border-pink/60 px-6 py-3 font-hud font-bold text-cream" onClick={() => { setSelectedPlayer(hud.selectedPlayer); gameRef.current?.selectPlayer(hud.selectedPlayer); }}>CAMBIAR PERSONAJE</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Minimap({ px, pz, yaw, dist, inTaxi, targetX, targetZ }: { px: number; pz: number; yaw: number; dist: number; inTaxi: boolean; targetX: number; targetZ: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;

    const mapX = (x: number) => 80 + (x / WORLD.walkHalf) * 52;
    const mapZ = (z: number) => 18 + ((82 - z) / (82 - -128)) * 124;

    g.clearRect(0, 0, 160, 160);
    g.fillStyle = "#1a1520";
    g.beginPath(); g.arc(80, 80, 76, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#3a3348"; g.lineWidth = 6;
    g.beginPath(); g.moveTo(80, 10); g.lineTo(80, 150); g.moveTo(40, 10); g.lineTo(40, 150); g.moveTo(120, 10); g.lineTo(120, 150); g.stroke();

    g.fillStyle = "#7cff9a";
    g.beginPath(); g.arc(mapX(targetX), mapZ(targetZ), 5, 0, Math.PI * 2); g.fill();

    const x = mapX(px); const y = mapZ(pz);
    g.save(); g.translate(x, y); g.rotate(-yaw); g.fillStyle = inTaxi ? "#ffd000" : "#ff4ec8";
    g.beginPath(); g.moveTo(0, -9); g.lineTo(-6, 7); g.lineTo(6, 7); g.closePath(); g.fill(); g.restore();

    g.fillStyle = "#e8c36a"; g.font = "bold 11px Rajdhani, sans-serif"; g.fillText("N", 74, 22);
    g.fillStyle = "#f4e8d8"; g.font = "bold 10px Rajdhani, sans-serif"; g.fillText(`${Math.max(0, Math.round(dist))} m`, 58, 151);
  }, [px, pz, yaw, dist, inTaxi, targetX, targetZ]);

  return <canvas ref={ref} width={160} height={160} className="minimap-ring size-28 rounded-full sm:size-36" />;
}
