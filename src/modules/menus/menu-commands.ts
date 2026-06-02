import { Menu } from "@grammyjs/menu";
import { sessions } from "../users/sessions/sessions.js";
import { getConnection } from "../whatsapp/whatsapp.manager.js";

export const botMenu = new Menu("menu-commands").text(
  "📡 • Divulgar",
  async (ctx) => {
    const userId = ctx.from!.id;
    const connection = getConnection(userId);

    if (connection?.status === "open") {
      sessions.deleteSession(userId);
      sessions.createSession(userId, "awaiting_numbers_count");
      return ctx.reply(
        "🔢 • Insira a quantidade de usuários que você deseja divulgar",
        {
          reply_markup: { force_reply: true },
        },
      );
    } else {
      return ctx.reply("❌ Seu WhatsApp está desconectado.");
    }
  },
);
