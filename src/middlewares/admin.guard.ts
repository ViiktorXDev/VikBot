// middlewares/admin.guard.ts
import { Context } from "grammy";
import { usersRepo } from "../modules/users/repo/users.repository.js";

export async function adminGuard(ctx: Context, next: () => Promise<void>) {
  const userId = ctx.from?.id;
  if (!userId) return;

  const user = await usersRepo.getById(userId);

  if (!user?.isAdmin) {
    return ctx.reply("⛔ Acesso negado.");
  }

  return next();
}
