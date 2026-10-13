export type Actions = {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  run: boolean;
  special: boolean;
  interact: boolean;
  jump: boolean;
  pause: boolean;
};

const empty = (): Actions => ({
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  run: false,
  special: false,
  interact: false,
  jump: false,
  pause: false,
});

export class Input {
  keys = new Set<string>();
  actions: Actions = empty();
  joy = { x: 0, y: 0, active: false };
  look = { x: 0, y: 0 };
  private edges = new Set<string>();
  private lookPtr: number | null = null;
  private joyPtr: number | null = null;
  private lastSpecial = false;
  private lastInteract = false;
  private lastPause = false;
  private runHeld = false;
  injected: string[] | null = null;

  constructor(private el: HTMLElement) {
    this.onKey = this.onKey.bind(this);
    this.onPtr = this.onPtr.bind(this);
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("keyup", this.onKey);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    el.addEventListener("pointerdown", this.onPtr);
    el.addEventListener("pointermove", this.onPtr);
    el.addEventListener("pointerup", this.onPtr);
    el.addEventListener("pointercancel", this.onPtr);
    el.addEventListener("contextmenu", this.onContextMenu);
  }

  private onBlur = () => {
    this.keys.clear();
    this.runHeld = false;
  };

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.keys.clear();
      this.runHeld = false;
    }
  };

  private onContextMenu = (e: Event) => e.preventDefault();

  setJoy(x: number, y: number, active: boolean) {
    this.joy.x = x;
    this.joy.y = y;
    this.joy.active = active;
  }

  setRun(active: boolean) {
    this.runHeld = active;
  }

  setLookDelta(dx: number, dy: number) {
    this.look.x += dx;
    this.look.y += dy;
  }

  tap(name: "special" | "interact" | "run" | "jump") {
    this.edges.add(name);
  }

  setKeys(codes: string[]) {
    this.injected = codes;
  }

  private onKey(e: KeyboardEvent) {
    const game = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "ShiftLeft",
      "ShiftRight",
      "KeyQ",
      "KeyE",
      "KeyF",
      "Space",
      "Tab",
      "Escape",
    ];
    if (game.includes(e.code)) e.preventDefault();
    if (e.type === "keydown") this.keys.add(e.code);
    else this.keys.delete(e.code);
  }

  private onPtr(e: PointerEvent) {
    const r = this.el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const left = x < r.width * 0.42;
    if (e.type === "pointerdown") {
      if (left) {
        this.joyPtr = e.pointerId;
      } else {
        this.lookPtr = e.pointerId;
        try {
          this.el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
    }
    if (e.pointerId === this.lookPtr && (e.type === "pointermove" || e.type === "pointerdown")) {
      this.look.x += e.movementX;
      this.look.y += e.movementY;
    }
    if (e.type === "pointerup" || e.type === "pointercancel") {
      if (e.pointerId === this.lookPtr) this.lookPtr = null;
      if (e.pointerId === this.joyPtr) this.joyPtr = null;
    }
  }

  sample(): Actions {
    const k = this.injected ? new Set(this.injected) : this.keys;
    let mx = this.joy.x;
    let my = this.joy.y;
    if (k.has("KeyA") || k.has("ArrowLeft")) mx -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) mx += 1;
    if (k.has("KeyW") || k.has("ArrowUp")) my += 1;
    if (k.has("KeyS") || k.has("ArrowDown")) my -= 1;
    const m = Math.hypot(mx, my);
    if (m > 1) {
      mx /= m;
      my /= m;
    }
    const specialEdge = (!this.lastSpecial && (k.has("KeyQ") || this.edges.has("special"))) || this.edges.has("special");
    const interactEdge =
      (!this.lastInteract && (k.has("KeyE") || k.has("KeyF") || this.edges.has("interact"))) ||
      this.edges.has("interact");
    const pauseEdge = !this.lastPause && k.has("Escape");
    this.lastSpecial = k.has("KeyQ");
    this.lastInteract = k.has("KeyE") || k.has("KeyF");
    this.lastPause = k.has("Escape");
    const a: Actions = {
      moveX: mx,
      moveY: my,
      lookX: this.look.x,
      lookY: this.look.y,
      run: k.has("ShiftLeft") || k.has("ShiftRight") || this.runHeld || this.edges.has("run"),
      special: specialEdge,
      interact: interactEdge,
      jump: k.has("Space") || this.edges.has("jump"),
      pause: pauseEdge,
    };
    this.look.x = 0;
    this.look.y = 0;
    this.edges.clear();
    this.actions = a;
    return a;
  }

  dispose() {
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("keyup", this.onKey);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.el.removeEventListener("pointerdown", this.onPtr);
    this.el.removeEventListener("pointermove", this.onPtr);
    this.el.removeEventListener("pointerup", this.onPtr);
    this.el.removeEventListener("pointercancel", this.onPtr);
    this.el.removeEventListener("contextmenu", this.onContextMenu);
  }
}
