import { Bot } from "grammy";
import { registerAdminCommands } from "./admin.commands.js";
import { registerMenuCommand } from "./menu.command.js";

export async function registerCommands(bot: Bot) {
  registerAdminCommands(bot);
  registerMenuCommand(bot);
}
