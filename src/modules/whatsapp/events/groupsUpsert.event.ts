// src/modules/groups/events/registerGroupsUpsert.ts
import { BaileysEventMap, type WASocket } from "@whiskeysockets/baileys";
import { groupMetadataCache } from "../cache/groupMetadata.cache.js";

export function registerGroupsUpsert(sock: WASocket) {
  sock.ev.on("groups.upsert", (groups: BaileysEventMap["groups.upsert"]) => {
    for (const group of groups) {
      if (!group.id) continue;

      groupMetadataCache.set(group.id, group);
    }
  });
}
