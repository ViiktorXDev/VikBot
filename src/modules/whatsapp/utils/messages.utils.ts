import {
  getContentType,
  normalizeMessageContent,
  proto,
} from "@whiskeysockets/baileys";
export function quote(msg: proto.IWebMessageInfo) {
  return msg as any;
}

export function extractText(msg: proto.IWebMessageInfo): string | undefined {
  if (!msg?.message) return undefined;

  const m = normalizeMessageContent(msg.message);
  if (!m) return undefined;

  const type = getContentType(m);
  const inner = type ? (m as Record<string, any>)[type] : null;

  return (
    m.conversation ??
    inner?.text ??
    inner?.caption ??
    inner?.selectedDisplayText ??
    inner?.title ??
    inner?.paramsJson ??
    inner?.name ??
    inner?.displayName ??
    undefined
  );
}
