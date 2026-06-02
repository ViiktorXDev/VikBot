// src/index.ts
import "dotenv/config";
import { Context, NextFunction } from "grammy";
import { bot } from "./bot.js";
import "./commands/index.js";
import { registerCommands } from "./commands/index.js";
import {
  numberQuantityHandler,
  textAdHandler,
} from "./modules/broadcasts/handlers/brodcast-command.handler.js";
import { keysRepo } from "./modules/keys/repo/key.repository.js";
import { acquireKey } from "./modules/keys/templates/key.buttonts.js";
import { registerMenus } from "./modules/menus/index.js";
import { mainMenu } from "./modules/menus/main-menu.js";
import { usersRepo } from "./modules/users/repo/users.repository.js";
import { sessions } from "./modules/users/sessions/sessions.js";
import { normalizePhoneNumber } from "./modules/whatsapp/utils/phone.utils.js";
import {
  reconnectAllSessions,
  requestPairingCode,
} from "./modules/whatsapp/whatsapp.manager.js";
registerMenus(bot);
registerCommands(bot);
// ── middleware: upsert do usuário a cada interação ───────────
bot.use(async (ctx: Context, next: NextFunction) => {
  const from = ctx.from;
  if (!from) return;

  await usersRepo.upsert({
    telegramId: from.id,
    username: from.username,
    firstName: from.first_name,
    lastName: from.last_name,
    languageCode: from.language_code,
    lastInteractionAt: new Date(),
  });

  if (!sessions.hasSession(from.id)) {
    sessions.createSession(from.id, "idle");
  }

  return next();
});

// ── /start ───────────────────────────────────────────────────
bot.command("start", async (ctx: Context) => {
  const userId = ctx.from!.id;

  sessions.deleteSession(userId);
  sessions.createSession(userId, "idle");

  const user = await usersRepo.getById(userId);

  if (user?.isAuthorized) {
    return ctx.reply("Bem-vindo de volta! Acesse as opções abaixo:", {
      reply_markup: mainMenu,
    });
  }

  return ctx.reply(
    "Clique no botão abaixo para adquirir a sua key de acesso ao bot\nDepois de adquirir, use /key",
    { reply_markup: acquireKey },
  );
});

// ── /key ─────────────────────────────────────────────────────
bot.command("key", async (ctx: Context) => {
  const userId = ctx.from!.id;
  const user = await usersRepo.getById(userId);

  if (user?.isAuthorized) {
    const activeKey = await keysRepo.getActiveKeyByUser(userId);

    if (activeKey) {
      const diff = activeKey.expiresAt.getTime() - Date.now();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      const dateStr = activeKey.expiresAt.toLocaleDateString("pt-BR");

      if (user.isAdmin) {
        return ctx.reply(
          `✅ Acesso ativo.\n\n` +
            `Key expira em ${days} dia(s) — ${dateStr}.\n\n` +
            `Para testar uma nova key use: /key force`,
        );
      }

      return ctx.reply(
        `✅ Você já tem acesso ativo.\n\nSua key expira em ${days} dia(s) — ${dateStr}.`,
      );
    }

    await usersRepo.update(userId, { isAuthorized: false });
  }

  const isForced =
    typeof ctx.match === "string" && ctx.match.trim() === "force";
  if (user?.isAdmin && user?.isAuthorized && !isForced) return;

  sessions.deleteSession(userId);
  sessions.createSession(userId, "awaiting_key");
  sessions.setData(userId, { keyAttempts: 0 });

  return ctx.reply("Digite sua key de acesso:", {
    reply_markup: { force_reply: true },
  });
});

// ── mensagens de texto ───────────────────────────────────────
bot.on("message:text", async (ctx) => {
  const userId = ctx.from!.id;
  const text = ctx.message!.text!;

  if (text.startsWith("/")) return;

  const session = sessions.hasSession(userId)
    ? sessions.getSession(userId)
    : sessions.createSession(userId, "idle");
  console.log(session.state);

  if (session.state === "awaiting_numbers_count") {
    await numberQuantityHandler(Number(text), ctx);
    return;
  } else if (session.state === "awaiting_ad_text") {
    await textAdHandler(text, ctx);
    return;
  }

  // ── fluxo: pareamento WhatsApp ───────────────────────────
  if (session.state === "awaiting_phone") {
    const raw = text.replace(/\D/g, "");

    if (raw.length < 10 || raw.length > 15) {
      return ctx.reply(
        "❌ Número inválido. Digite com DDI e DDD.\nExemplo: `5581999999999`",
        { parse_mode: "Markdown" },
      );
    }

    await ctx.reply("⏳ Gerando código de pareamento...");

    try {
      const phone = normalizePhoneNumber(raw); // 👈 normaliza aqui
      const code = await requestPairingCode(userId, phone);

      sessions.deleteSession(userId);
      sessions.createSession(userId, "idle");

      return ctx.reply(
        `✅ Código gerado!\n\n` +
          `No WhatsApp, vá em:\n` +
          `*Configurações → Aparelhos conectados → Conectar aparelho*\n\n` +
          `Digite o código:\n\`${code}\``,
        { parse_mode: "Markdown" },
      );
    } catch {
      sessions.deleteSession(userId);
      sessions.createSession(userId, "idle");

      return ctx.reply(
        "❌ Falha ao gerar o código. Verifique o número e tente novamente.",
      );
    }
  }

  // ── fluxo: ativação de key ───────────────────────────────
  if (session.state !== "awaiting_key") {
    return ctx.reply(
      "Use /key para ativar seu acesso.\nUse /start se já tiver uma key.",
      { reply_markup: acquireKey },
    );
  }

  const attempts = session.data.keyAttempts ?? 0;

  if (attempts >= 3) {
    sessions.deleteSession(userId);
    sessions.createSession(userId, "idle");
    return ctx.reply(
      "❌ Muitas tentativas. Adquira uma nova key: wa.me/+558291506383",
    );
  }

  const key = await keysRepo.getActiveByCode(text.trim());

  if (!key) {
    sessions.setData(userId, { keyAttempts: attempts + 1 });
    const remaining = 3 - (attempts + 1);
    return ctx.reply(
      `❌ Key inválida ou expirada. Tentativas restantes: ${remaining}`,
    );
  }

  await keysRepo.markAsUsed(key.code, userId);
  await usersRepo.update(userId, { isAuthorized: true });

  sessions.deleteSession(userId);
  sessions.createSession(userId, "idle");

  return ctx.reply("✅ Key válida! Acesso liberado.", {
    reply_markup: mainMenu,
  });
});

await reconnectAllSessions();

bot.start();
bot.catch(console.error);
