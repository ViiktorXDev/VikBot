import { Bot } from "grammy";
import { adminGuard } from "../middlewares/admin.guard.js";
import { keysRepo } from "../modules/keys/repo/key.repository.js";
import { generateKeyCode } from "../modules/keys/utils/key.utils.js";
export function registerAdminCommands(bot: Bot) {
  // /newkey 30 → cria uma key que expira em 30 dias
  bot.command("newkey", adminGuard, async (ctx) => {
    const args = ctx.match.trim(); // "30"
    const days = parseInt(args);

    if (!days || isNaN(days)) {
      return ctx.reply("Uso: /newkey <dias>\nExemplo: /newkey 30");
    }

    const code = generateKeyCode(); // "ABC-123-XYZ"
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const key = await keysRepo.create({ code, expiresAt });

    return ctx.reply(
      `✅ Key criada! Clique no codigo para copiar\n\n` +
        `Código: \`${key!.code}\`\n` +
        `Expira em: ${days} dias (${expiresAt.toLocaleDateString("pt-BR")})`,
      { parse_mode: "Markdown" },
    );
  });

  // /revokekey ABC-123-XYZ
  bot.command("revokekey", adminGuard, async (ctx) => {
    const code = ctx.match.trim();
    if (!code) return ctx.reply("Uso: /revokekey <code>");

    const key = await keysRepo.revoke(code);
    if (!key) return ctx.reply("Key não encontrada.");

    return ctx.reply(`✅ Key \`${key.code}\` revogada.`, {
      parse_mode: "Markdown",
    });
  });
}
