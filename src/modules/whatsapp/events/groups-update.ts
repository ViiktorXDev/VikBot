import { BaileysEventMap, WASocket } from "@whiskeysockets/baileys";
import { groupMetadataCache } from "../cache/groupMetadata.cache.js";

export function registerGroupsUpdate(sock: WASocket) {
  sock.ev.on("groups.update", (updates: BaileysEventMap["groups.update"]) => {
    for (const update of updates) {
      if (!update.id) continue;

      // cache novo — merge com dado existente sem rebuscar na rede
      const current = groupMetadataCache.peek(update.id);
      if (current) {
        groupMetadataCache.set(update.id, { ...current, ...update });
      }
    }
  });
}
