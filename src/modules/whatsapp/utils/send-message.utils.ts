import { WASocket, proto } from "@whiskeysockets/baileys";
import { quote } from "./messages.utils.js";
export type NewsletterReply = {
  text: string;
  mentions?: string[];
  quoted?: boolean;
  newsletterJid?: string;
  newsletterName?: string;
  serverMessageId?: number;
  forwarded?: { isForwarded?: boolean; forwardingScore?: number };
};
export async function sendNewsletter({
  sock,
  msg,
  destination,
  text,
  mentions,
  quoted,
  newsletterJid,
  newsletterName,
  serverMessageId,
  forwarded,
}: NewsletterReply & {
  sock: WASocket;
  destination: string;
  msg?: proto.IWebMessageInfo;
}) {
  await sock.sendMessage(
    destination,
    {
      text,
      mentions,
      contextInfo: {
        isForwarded: forwarded?.isForwarded ?? true,
        forwardingScore: forwarded?.forwardingScore ?? 999,
        forwardedNewsletterMessageInfo: {
          newsletterJid: newsletterJid ?? process.env.NEWSLETTER_JID,
          serverMessageId: serverMessageId ?? 100,
          newsletterName: newsletterName ?? process.env.NEWSLETTER_NAME,
        },
      },
    },
    { quoted: quoted === false ? undefined : msg ? quote(msg) : undefined },
  );
}
