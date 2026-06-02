import { WASocket } from "@whiskeysockets/baileys";
import { registerGroupParticipants } from "./groups-participant-update.js";
import { registerGroupsUpdate } from "./groups-update.js";
import { registerGroupsUpsert } from "./groupsUpsert.event.js";
import { registerMessageHandler } from "./messages.upsert.event.js";

export function registerEventsBaileys(sock: WASocket, telegramId: number) {
  registerMessageHandler(sock, telegramId);
  registerGroupParticipants(sock);
  registerGroupsUpdate(sock);
  registerGroupsUpsert(sock);
}
