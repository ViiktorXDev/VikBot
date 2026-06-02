// src/modules/whatsapp/context/context.ts
import {
  normalizeMessageContent,
  proto,
  type WASocket,
} from "@whiskeysockets/baileys";
import { quote } from "../modules/whatsapp/utils/messages.utils.js";
import {
  NewsletterReply,
  sendNewsletter,
} from "../modules/whatsapp/utils/send-message.utils.js";

type MessageKey = proto.IMessageKey & {
  remoteJidAlt?: string;
  participantAlt?: string;
};

export interface BotContext {
  sock: WASocket;
  msg: proto.IWebMessageInfo;
  telegramId: number;

  chatId: string;
  senderId: string;
  isGroup: boolean;
  text: string | null;
  pushName: string | null;
  messageId: string | null;

  reply: (text: string) => Promise<void>;
  react: (emoji: string) => Promise<void>;
  sendText: (jid: string, text: string) => Promise<void>;
  replyNewsletter: (
    data: Omit<NewsletterReply, "sock" | "destination">,
  ) => Promise<void>; // 👈
}

function extractText(msg: proto.IWebMessageInfo): string | null {
  const content = normalizeMessageContent(msg.message ?? null);
  if (!content) return null;

  return (
    content.conversation ??
    content.extendedTextMessage?.text ??
    content.imageMessage?.caption ??
    content.videoMessage?.caption ??
    content.documentMessage?.caption ??
    null
  );
}

function resolveJids(msg: proto.IWebMessageInfo): {
  chatId: string;
  senderId: string;
  isGroup: boolean;
} {
  const key = msg.key as MessageKey;
  const rawRemoteJid = key.remoteJid as string;
  const remoteJidAlt = key.remoteJidAlt;
  const isGroup = rawRemoteJid.endsWith("@g.us");
  const isPrivate = !isGroup;

  const chatId = isPrivate && remoteJidAlt ? remoteJidAlt : rawRemoteJid;

  const rawParticipant = key.participant as string | undefined;
  const rawParticipantAlt = key.participantAlt;

  const participant =
    typeof rawParticipant === "string" && rawParticipant.trim()
      ? rawParticipant
      : undefined;

  const participantAlt =
    typeof rawParticipantAlt === "string" && rawParticipantAlt.trim()
      ? rawParticipantAlt
      : undefined;

  const senderId =
    participant ?? participantAlt ?? remoteJidAlt ?? rawRemoteJid;

  return { chatId, senderId, isGroup };
}

export function createWAContext(
  sock: WASocket,
  msg: proto.IWebMessageInfo,
  telegramId: number,
): BotContext {
  const { chatId, senderId, isGroup } = resolveJids(msg);
  const text = extractText(msg);
  const msgKey = msg.key ?? {};

  return {
    sock,
    msg,
    telegramId,
    chatId,
    senderId,
    isGroup,
    text,
    pushName: msg.pushName ?? null,
    messageId: msgKey.id ?? null,

    async reply(text: string) {
      await sock.sendMessage(chatId, { text }, { quoted: quote(msg) });
    },

    async react(emoji: string) {
      await sock.sendMessage(chatId, {
        react: { text: emoji, key: msgKey },
      });
    },

    async sendText(jid: string, text: string) {
      await sock.sendMessage(jid, { text });
    },

    async replyNewsletter(data: Omit<NewsletterReply, "sock" | "destination">) {
      return sendNewsletter({
        sock,
        destination: chatId,
        msg,
        ...data,
      });
    },
  };
}
