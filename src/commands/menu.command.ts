import { Bot } from "grammy";
import { botMenu } from "../modules/menus/menu-commands.js";

export async function registerMenuCommand(bot: Bot) {
  bot.command("menu", async (ctx) => {
    ctx.reply("Comandos disponives:", {
      reply_markup: botMenu,
    });
  });
}
