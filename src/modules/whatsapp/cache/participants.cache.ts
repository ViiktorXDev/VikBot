// src/modules/whatsapp/cache/participants.cache.ts
import {
  areJidsSameUser,
  isJidGroup,
  type GroupParticipant,
  type WASocket,
} from "@whiskeysockets/baileys";
import { groupMetadataCache } from "./groupMetadata.cache.js";

type ParticipantWithAlt = GroupParticipant & { idAlt?: string };

class ParticipantsCache {
  async getAll(
    sock: WASocket,
    groupJid: string,
  ): Promise<ParticipantWithAlt[]> {
    if (!isJidGroup(groupJid)) return [];
    const metadata = await groupMetadataCache.get(sock, groupJid);
    return (metadata?.participants ?? []) as ParticipantWithAlt[];
  }

  async getAdmins(
    sock: WASocket,
    groupJid: string,
  ): Promise<ParticipantWithAlt[]> {
    const participants = await this.getAll(sock, groupJid);
    return participants.filter(
      (p) => p.admin === "admin" || p.admin === "superadmin",
    );
  }

  async isAdmin(
    sock: WASocket,
    groupJid: string,
    userJid: string,
  ): Promise<boolean> {
    if (!isJidGroup(groupJid)) return false;
    const participants = await this.getAll(sock, groupJid);
    const participant = participants.find(
      (p) =>
        areJidsSameUser(p.id, userJid) ||
        (p.idAlt && areJidsSameUser(p.idAlt, userJid)),
    );
    if (!participant) return false;
    return participant.admin === "admin" || participant.admin === "superadmin";
  }

  async botIsAdmin(sock: WASocket, groupJid: string): Promise<boolean> {
    if (!sock.user) return false;
    // normaliza o JID do bot — prefere lid se disponível
    const botJid = (sock.user as { lid?: string }).lid ?? sock.user.id;
    return this.isAdmin(sock, groupJid, botJid);
  }

  async isMember(
    sock: WASocket,
    groupJid: string,
    userId: string,
  ): Promise<boolean> {
    const participants = await this.getAll(sock, groupJid);
    return participants.some(
      (p) =>
        areJidsSameUser(p.id, userId) ||
        (p.idAlt && areJidsSameUser(p.idAlt, userId)),
    );
  }

  async getCount(sock: WASocket, groupJid: string): Promise<number> {
    return (await this.getAll(sock, groupJid)).length;
  }

  async getMentions(
    sock: WASocket,
    groupJid: string,
    { excludeBot = true }: { excludeBot?: boolean } = {},
  ): Promise<string[]> {
    const participants = await this.getAll(sock, groupJid);
    let ids = participants.map((p) => p.id);

    if (excludeBot && sock.user) {
      const botJid = (sock.user as { lid?: string }).lid ?? sock.user.id;
      ids = ids.filter((id) => !areJidsSameUser(id, botJid));
    }

    return ids;
  }
}

export const participantsCache = new ParticipantsCache();
