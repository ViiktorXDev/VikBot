import { Context } from "grammy";

export const userId = (ctx: Context) => ctx.from?.id;
