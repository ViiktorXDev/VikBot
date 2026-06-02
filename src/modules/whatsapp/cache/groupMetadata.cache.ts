// src/modules/whatsapp/cache/groupMetadata.cache.ts
import {
  areJidsSameUser,
  type GroupMetadata,
  type WASocket,
} from "@whiskeysockets/baileys";
import NodeCache from "node-cache";

export class GroupMetadataCache {
  private readonly cache = new NodeCache({
    stdTTL: 5 * 60,
    checkperiod: 60,
    useClones: false,
  });

  async get(sock: WASocket, groupJid: string): Promise<GroupMetadata | null> {
    const cached = this.cache.get<GroupMetadata>(groupJid);
    if (cached !== undefined) return cached;
    return this.fetch(sock, groupJid);
  }

  set(groupJid: string, data: GroupMetadata): void {
    this.cache.set(groupJid, data);
  }

  peek(groupJid: string): GroupMetadata | undefined {
    return this.cache.get<GroupMetadata>(groupJid);
  }

  invalidate(groupJid: string): void {
    this.cache.del(groupJid);
  }

  getAll(): GroupMetadata[] {
    return this.cache
      .keys()
      .map((jid) => this.cache.get<GroupMetadata>(jid))
      .filter((m): m is GroupMetadata => m !== undefined);
  }

  getGroupsWithUser(userId: string): GroupMetadata[] {
    return this.getAll().filter((g) =>
      g.participants.some((p) => areJidsSameUser(p.id, userId)),
    );
  }

  private async fetch(
    sock: WASocket,
    groupJid: string,
  ): Promise<GroupMetadata | null> {
    try {
      const data = await sock.groupMetadata(groupJid);
      this.cache.set(groupJid, data);
      return data;
    } catch {
      this.cache.del(groupJid);
      return null;
    }
  }
}

export const groupMetadataCache = new GroupMetadataCache();
