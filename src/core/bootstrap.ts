import { Bot } from "grammy";
import { registerMenus } from "../modules/menus/index.js";

export function bootstrap(bot: Bot) {
  registerMenus(bot);
}
