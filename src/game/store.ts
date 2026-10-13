import { create } from "zustand";
import type { MissionSnapshot } from "./mission";
import type { PlayerId, Phase } from "../missions/MissionDirector";

export type HudState = MissionSnapshot & {
  selectedPlayer: PlayerId;
  characterName: string;
  missionTitle: string;
  missionObjective: string;
  missionRemaining: number | null;
  objectiveX: number | null;
  objectiveZ: number | null;
  missionPhase: Phase;
  missionWinText: string;
  missionFailText: string;
  isMobile: boolean;
  isPortrait: boolean;
  loaded: boolean;
  loadMsg: string;
  playerX: number;
  playerZ: number;
  playerYaw: number;
};

const base: HudState = {
  mode: "intro",
  selectedPlayer: "moria",
  characterName: "Moria Casán",
  missionTitle: "¿QUIÉNES SON?",
  missionObjective: "Llegá al boliche",
  missionRemaining: null,
  objectiveX: null,
  objectiveZ: null,
  missionPhase: "BRIEFING",
  missionWinText: "MISIÓN COMPLETADA",
  missionFailText: "MISIÓN FALLIDA",
  entity: 0,
  specialCd: 0,
  stunnedUntil: 0,
  money: 100,
  heart: 100,
  time: "21 : 47",
  distance: 450,
  objectiveDone: false,
  inTaxi: false,
  canInteract: false,
  subtitle: "Moria: Que hablen… total, soy leyenda.",
  specialReady: true,
  isMobile: false,
  isPortrait: false,
  loaded: false,
  loadMsg: "Calentando Corrientes…",
  playerX: 8.4,
  playerZ: 62,
  playerYaw: 0,
};

export const useHud = create<HudState & { patch: (p: Partial<HudState>) => void }>((set) => ({
  ...base,
  patch: (p) => set(p),
}));
