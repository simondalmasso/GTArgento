export type GameMode = "intro" | "playing" | "paused" | "won" | "failed";

export type MissionSnapshot = {
  mode: GameMode;
  entity: number;
  specialCd: number;
  stunnedUntil: number;
  money: number;
  heart: number;
  time: string;
  distance: number;
  objectiveDone: boolean;
  inTaxi: boolean;
  canInteract: boolean;
  subtitle: string;
  specialReady: boolean;
};

export class Mission {
  mode: GameMode = "intro";
  entity = 0;
  specialCd = 0;
  stunnedUntil = 0;
  money = 100;
  clock = 21 * 3600 + 47 * 60;
  subtitle = "Moria: Que hablen… total, soy leyenda.";
  quoteT = 0;
  quoteI = 0;

  start() {
    if (this.mode === "intro" || this.mode === "paused") this.mode = "playing";
  }

  restart() {
    this.mode = "playing";
    this.entity = 0;
    this.specialCd = 0;
    this.stunnedUntil = 0;
    this.money = 100;
    this.clock = 21 * 3600 + 47 * 60;
    this.quoteT = 0;
    this.quoteI = 0;
    this.subtitle = "Moria: Que hablen… total, soy leyenda.";
  }

  tick(dt: number, opts: { photographing: boolean; distance: number; quotes: string[] }) {
    if (this.mode !== "playing") return;
    this.clock += dt * 6;
    this.specialCd = Math.max(0, this.specialCd - dt);
    this.stunnedUntil = Math.max(0, this.stunnedUntil - dt);
    if (opts.photographing) this.entity = Math.min(1, this.entity + 0.16 * dt);
    else this.entity = Math.max(0, this.entity - 0.035 * dt);
    if (this.entity >= 1) {
      this.mode = "failed";
      this.subtitle = "LES DISTE ENTIDAD";
    }
    this.quoteT += dt;
    if (opts.quotes.length > 0 && this.quoteT > 7.5) {
      this.quoteT = 0;
      this.quoteI = (this.quoteI + 1) % opts.quotes.length;
      this.subtitle = "Moria: " + opts.quotes[this.quoteI];
    }
  }

  trySpecial(): boolean {
    if (this.mode !== "playing" || this.specialCd > 0) return false;
    this.specialCd = 7;
    this.stunnedUntil = 4.2;
    this.entity = Math.max(0, this.entity - 0.32);
    this.subtitle = "Moria: ¿QUIÉNES SON?";
    this.money += 50;
    return true;
  }

  reachTheater() {
    if (this.mode !== "playing") return;
    this.mode = "won";
    this.subtitle = "Moria: La platea es mía.";
    this.money += 5000;
  }

  failNow() {
    if (this.mode !== "playing") return;
    this.mode = "failed";
    this.subtitle = "LES DISTE ENTIDAD";
  }

  snapshot(extra: { distance: number; inTaxi: boolean; canInteract: boolean }): MissionSnapshot {
    const h = Math.floor(this.clock / 3600) % 24;
    const m = Math.floor((this.clock % 3600) / 60);
    return {
      mode: this.mode,
      entity: this.entity,
      specialCd: this.specialCd,
      stunnedUntil: this.stunnedUntil,
      money: this.money,
      heart: Math.max(0, Math.round(100 - this.entity * 100)),
      time: String(h).padStart(2, "0") + " : " + String(m).padStart(2, "0"),
      distance: extra.distance,
      objectiveDone: this.mode === "won",
      inTaxi: extra.inTaxi,
      canInteract: extra.canInteract,
      subtitle: this.subtitle,
      specialReady: this.specialCd <= 0,
    };
  }
}

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
