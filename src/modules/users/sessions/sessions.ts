// src/modules/users/sessions/sessions.ts
import { SessionManager } from "../services/SessionManager.service.js";

export type BotState =
  | "idle"
  | "awaiting_key"
  | "awaiting_phone"
  | "awaiting_numbers_count"
  | "awaiting_ad_text";

interface BotData {
  keyAttempts: number;
  inputBuffer: string;   // texto do anúncio
  broadcastCount: number; // quantidade de números
}

export const sessions = new SessionManager<BotState, BotData>({
  states: [
    "idle",
    "awaiting_key",
    "awaiting_phone",
    "awaiting_numbers_count",
    "awaiting_ad_text",
  ],
  transitions: {
    idle: ["awaiting_key", "awaiting_phone"],
    awaiting_key: ["idle"],
    awaiting_phone: ["idle", "awaiting_numbers_count"],
    awaiting_numbers_count: ["awaiting_ad_text", "idle"],
    awaiting_ad_text: ["idle"],
  },
  ttl: 10 * 60 * 1000,
  cleanupInterval: 60 * 1000,
});
