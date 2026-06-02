import { Bot } from "grammy";
import { confirmTextAdButton } from "../broadcasts/handlers/brodcast-command.handler.js";
import { mainMenu } from "./main-menu.js";
import { botMenu } from "./menu-commands.js";

export function registerMenus(bot: Bot) {
  console.log("🧠 registrando menus...");

  bot.use(mainMenu);
  console.log("✔ mainMenu registrado");

  bot.use(botMenu);
  console.log("✔ botMenu registrado");

  bot.use(confirmTextAdButton);
  console.log("✔ confirmTextAdButton registrado");
}
