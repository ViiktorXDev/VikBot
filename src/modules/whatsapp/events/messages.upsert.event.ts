// src/modules/whatsapp/events/messages.handler.ts
import { getContentType, proto, type WASocket } from "@whiskeysockets/baileys";
import { createWAContext } from "../../../core/createWAcontext.js";

export function registerMessageHandler(sock: WASocket, telegramId: number) {
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages as proto.IWebMessageInfo[]) {
      if (!msg?.message) continue;
      if (msg.key?.fromMe) continue;
      if (!msg.key?.remoteJid) continue;

      const msgType = getContentType(msg.message);
      if (!msgType) continue;
      if (msgType === "protocolMessage") continue;
      if (msgType === "senderKeyDistributionMessage") continue;

      const ctx = createWAContext(sock, msg, telegramId);

      console.log(`[${telegramId}] ${ctx.chatId}: ${ctx.text}`);

      // exemplo de uso:
      // if (ctx.text === "ping") await ctx.reply("pong!");
    }
  });
}
