import { BaileysEventMap, type WASocket } from "@whiskeysockets/baileys";
import { groupMetadataCache } from "../cache/groupMetadata.cache.js";

export async function registerGroupParticipants(sock: WASocket) {
  sock.ev.on(
    "group-participants.update",
    async (update: BaileysEventMap["group-participants.update"]) => {
      const { id, action } = update;
      groupMetadataCache.invalidate(id);
      switch (action) {
        case "add":
          // await participantAddHandler(sock, update);
          break;
        case "remove":
          // await participantRemoveHandler(sock, update);
          break;
        case "promote":
          // await participantPromoteHandler(sock, update);
          break;
        case "demote":
          // await participantDemoteHandler(sock, update);
          break;
      }
    },
  );
}
