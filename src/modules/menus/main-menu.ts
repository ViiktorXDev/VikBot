// src/modules/menus/main-menu.ts
import { Menu } from "@grammyjs/menu";
import { sessions } from "../users/sessions/sessions.js";
import { getConnection } from "../whatsapp/whatsapp.manager.js";

export const mainMenu = new Menu("main-menu")
  .text("🛜 Conectar WhatsApp", async (ctx) => {
    const userId = ctx.from!.id;
    const connection = getConnection(userId);

    if (connection?.status === "open") {
      return ctx.reply("✅ Seu WhatsApp já está conectado.");
    }

    sessions.deleteSession(userId);
    sessions.createSession(userId, "awaiting_phone");

    return ctx.reply(
      "📱 Digite seu número com DDI e DDD, sem espaços ou símbolos:\n\nExemplo: `5581999999999`",
      { parse_mode: "Markdown" },
    );
  })
  .text("📊 Status", async (ctx) => {
    const userId = ctx.from!.id;
    const connection = getConnection(userId);

    const statusMap = {
      open: "🟢 Conectado",
      connecting: "🟡 Conectando...",
      pairing: "🟡 Aguardando pareamento",
      close: "🔴 Desconectado",
    };

    const status = connection
      ? statusMap[connection.status]
      : "🔴 Desconectado";

    return ctx.reply(`Status do seu WhatsApp: ${status}`);
  })
  .text("🔌 Desconectar", async (ctx) => {
    const userId = ctx.from!.id;
    const connection = getConnection(userId);

    if (!connection) {
      return ctx.reply("Você não tem nenhuma sessão ativa.");
    }

    // importação lazy pra evitar circular
    const { deleteSession } = await import("../whatsapp/whatsapp.manager.js");
    deleteSession(userId);

    return ctx.reply("✅ WhatsApp desconectado e sessão removida.");
  });
