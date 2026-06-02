// src/modules/whatsapp/whatsapp.manager.ts
import { Boom } from "@hapi/boom";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
} from "@whiskeysockets/baileys";
import fs from "fs";
import path from "path";
import Pino from "pino";
import { useSQLiteAuthState } from "./auth/auth-state.js";
import { deleteAuthDb, getAuthDb } from "./auth/authDB.js";
type ConnectionStatus = "connecting" | "open" | "close" | "pairing";
interface WAConnection {
  telegramId: number;
  sock: ReturnType<typeof makeWASocket> | null;
  status: ConnectionStatus;
  reconnectAttempts: number;
  everConnected: boolean; // 👈 persiste entre reconexões
}

const SESSIONS_DIR = path.resolve("./data/auth");
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 5000;
const connections = new Map<number, WAConnection>();
// adiciona no topo
import { bot } from "../../bot.js";
import { groupMetadataCache } from "./cache/groupMetadata.cache.js";
import { registerEventsBaileys } from "./events/index.js";

export function getSock(telegramId: number) {
  const conn = connections.get(telegramId);
  if (!conn || conn.status !== "open" || !conn.sock) return null;
  return conn.sock;
}

// substitui o connectUser e o trecho de reconexão do requestPairingCode
function attachConnectionHandlers(
  sock: WASocket,
  telegramId: number,
  connection: WAConnection,
  db: ReturnType<typeof getAuthDb>,
) {
  sock.ev.on("connection.update", async (update) => {
    const { connection: conn, lastDisconnect } = update;

    if (conn === "open") {
      connection.everConnected = true;
      connection.status = "open";
      connection.reconnectAttempts = 0;

      // estabiliza sessão nova antes de avisar
      if (update.isNewLogin) {
        setTimeout(() => {
          void sock.end(new Error("restart after new login"));
        }, 1500);
        return; // não notifica ainda — vai reconectar e aí avisa
      }
      // Popula o cache com todos os grupos do bot
      try {
        const groups = await sock.groupFetchAllParticipating();
        for (const [jid, meta] of Object.entries(groups)) {
          groupMetadataCache.set(jid, meta);
        }
        console.log(
          `[GroupMetadataCache] ${Object.keys(groups).length} grupos carregados.`,
        );
      } catch (err) {
        console.warn(
          "[GroupMetadataCache] Falha ao popular cache inicial:",
          (err as Error).message,
        );
      }
      registerEventsBaileys(sock, telegramId);
      try {
        await bot.api.sendMessage(
          telegramId,
          "✅ WhatsApp conectado com sucesso!",
        );
      } catch (err) {
        console.error("❌ Erro ao enviar mensagem:", err);
      }
    }

    if (conn === "close") {
      connection.status = "close";
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        const { clearAuth } = useSQLiteAuthState(db);
        clearAuth();
        connections.delete(telegramId);
        try {
          await bot.api.sendMessage(
            telegramId,
            "⚠️ Sua sessão do WhatsApp foi desconectada.\nUse o /start para reconectar.",
          );
        } catch {}
        return;
      }

      if (statusCode === DisconnectReason.restartRequired) {
        await connectUser(telegramId);
        return;
      }

      // ignora closes antes da primeira conexão bem-sucedida
      if (!connection.everConnected) return; // 👈 usa o objeto, não o closure

      if (connection.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        connection.reconnectAttempts++;
        try {
          await bot.api.sendMessage(
            telegramId,
            `🔄 Reconectando WhatsApp... (tentativa ${connection.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
          );
        } catch {}
        await wait(RECONNECT_DELAY_MS * connection.reconnectAttempts);
        await connectUser(telegramId);
      } else {
        try {
          await bot.api.sendMessage(
            telegramId,
            "❌ Não foi possível reconectar.\nUse o /start para conectar novamente.",
          );
        } catch {}
        connections.delete(telegramId);
      }
    }
  });
}
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sessionExists(telegramId: number): boolean {
  return fs.existsSync(path.resolve(`data/auth/${telegramId}.db`));
}

export async function connectUser(
  telegramId: number,
): Promise<ReturnType<typeof makeWASocket>> {
  const db = getAuthDb(telegramId);
  const { state, saveCreds } = useSQLiteAuthState(db);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: Pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: false,
    browser: ["Mac OS", "Chrome", "14.4.1"] as [string, string, string],
    defaultQueryTimeoutMs: undefined,
  });

  // preserva everConnected se já existia — não reseta entre reconexões
  const existing = connections.get(telegramId);
  const connection: WAConnection = {
    telegramId,
    sock,
    status: "connecting",
    reconnectAttempts: existing?.reconnectAttempts ?? 0,
    everConnected: existing?.everConnected ?? false, // 👈
  };

  connections.set(telegramId, connection);
  sock.ev.on("creds.update", saveCreds);
  attachConnectionHandlers(sock, telegramId, connection, db);

  return sock;
}
export async function requestPairingCode(
  telegramId: number,
  phoneNumber: string,
): Promise<string> {
  const existing = connections.get(telegramId);
  if (existing?.sock) {
    try {
      existing.sock.end(undefined);
    } catch {}
    connections.delete(telegramId);
  }

  deleteAuthDb(telegramId);
  await wait(1000); // aumentado pra garantir que o db foi deletado

  const db = getAuthDb(telegramId);
  const { state, saveCreds } = useSQLiteAuthState(db);
  const { version } = await fetchLatestBaileysVersion();

  console.log("[Pairing] Iniciando para:", phoneNumber, "versão WA:", version);

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, Pino({ level: "silent" })),
    },
    printQRInTerminal: false,
    browser: Browsers.macOS("Google Chrome"), // ✅ formato válido conforme doc oficial
    defaultQueryTimeoutMs: undefined,
    logger: Pino({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveCreds);

  const code = await new Promise<string>((resolve, reject) => {
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        console.error("[Pairing] Timeout após 30s");
        reject(new Error("Timeout ao gerar código de pareamento"));
      }
    }, 30_000);

    sock.ev.on("connection.update", async (update) => {
      const { qr, connection, lastDisconnect } = update;

      console.log("[Pairing] evento:", {
        connection,
        hasQR: !!qr,
        statusCode: (lastDisconnect?.error as any)?.output?.statusCode,
      });

      // ✅ QR = WebSocket estável com o servidor WA = hora certa de pedir código
      if (!!qr && !resolved) {
        try {
          console.log("[Pairing] Solicitando código para:", phoneNumber);
          const pairingCode = await sock.requestPairingCode(phoneNumber);
          console.log("[Pairing] ✅ Sucesso:", pairingCode);
          resolved = true;
          clearTimeout(timeout);
          resolve(pairingCode);
        } catch (err: any) {
          console.error(
            "[Pairing] ❌ Falhou:",
            err?.message,
            "status:",
            err?.output?.statusCode,
          );
          if (!resolved) {
            clearTimeout(timeout);
            reject(err);
          }
        }
      }

      if (connection === "close" && !resolved) {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        console.error("[Pairing] Conexão fechada. Status:", statusCode);
        clearTimeout(timeout);
        reject(new Error(`Conexão fechada (${statusCode})`));
      }
    });
  });

  const connection: WAConnection = {
    telegramId,
    sock,
    status: "pairing",
    reconnectAttempts: 0,
    everConnected: false,
  };
  connections.set(telegramId, connection);
  attachConnectionHandlers(sock, telegramId, connection, db);

  return code;
}

export function getConnection(telegramId: number): WAConnection | undefined {
  return connections.get(telegramId);
}

export function disconnectUser(telegramId: number): void {
  const conn = connections.get(telegramId);
  if (conn?.sock) {
    try {
      conn.sock.end(undefined);
    } catch {}
    connections.delete(telegramId);
  }
}

export function deleteSession(telegramId: number): void {
  disconnectUser(telegramId);
  deleteAuthDb(telegramId);
}

export async function reconnectAllSessions(): Promise<void> {
  if (!fs.existsSync(SESSIONS_DIR)) return;

  const entries = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".db")) continue;

    const telegramId = Number(entry.name.replace(".db", ""));
    if (isNaN(telegramId)) continue;

    if (sessionExists(telegramId)) {
      await connectUser(telegramId);
      await wait(1500);
    }
  }
}
