import { Menu } from "@grammyjs/menu";
import { Context } from "grammy";
import { userId } from "../../../shared/utils/ctx.utils.js";

import { sessions } from "../../users/sessions/sessions.js";
import { getConnection } from "../../whatsapp/whatsapp.manager.js";
import {
  createBroadcast,
  finishBroadcast,
  getNextNumbers,
  recordSent,
} from "../services/broadcast.service.js";
import { smartDelay } from "../../../shared/utils/delay.utils.js";

export async function numberQuantityHandler(counter: number, ctx: Context) {
  const user = userId(ctx);
  if (!user) return;

  if (counter && counter > 0) {
    sessions.setData(user, { broadcastCount: counter });
    sessions.setState(user, "awaiting_ad_text");

    await ctx.reply(`✅ • Você escolheu ${counter} números para divulgar`);
    await ctx.reply(`ℹ️ • Insira o texto que você deseja divulgar:`, {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: "Olá, entre no meu grupo de whatsapp!",
      },
    });
  } else {
    await ctx.reply("❌ • Quantidade inválida! Digite novamente:", {
      reply_markup: { force_reply: true },
    });
  }
}

export async function textAdHandler(text: string, ctx: Context) {
  const user = userId(ctx);
  if (!user) return;

  if (!text.trim().length) {
    await ctx.reply("❌ • O texto inserido é inválido, tente novamente:", {
      reply_markup: {
        force_reply: true,
        input_field_placeholder: "Olá, entre no meu grupo!",
      },
    });
    return;
  }

  sessions.setData(user, { inputBuffer: text });

  await ctx.reply(
    `📋 • *Prévia da mensagem:*\n\n${text}\n\n_Confirme para iniciar o envio._`,
    {
      parse_mode: "Markdown",
      reply_markup: confirmTextAdButton,
    },
  );
}

export const confirmTextAdButton = new Menu("confirm-text-ad").text(
  "✅ • Confirmar e Enviar",
  async (ctx) => {
    const user = userId(ctx);
    if (!user) return;

    let session;
    try {
      session = sessions.getSession(user);
    } catch {
      await ctx.reply("❌ • Sessão expirada. Comece novamente.");
      return;
    }

    const adText = session.data.inputBuffer;
    const count = session.data.broadcastCount ?? 0;

    if (!adText) {
      await ctx.reply("❌ • Nenhum texto encontrado. Comece novamente.");
      return;
    }

    const connection = getConnection(user);
    if (connection?.status !== "open") {
      await ctx.reply("❌ • Seu WhatsApp está desconectado.");
      sessions.deleteSession(user);
      return;
    }

    sessions.deleteSession(user);

    const numbers = await getNextNumbers(user, count);
    if (!numbers.length) {
      await ctx.reply("⚠️ • Não há números disponíveis para divulgar.");
      return;
    }

    const broadcast = await createBroadcast(user, numbers);
    let sent = 0;
    let failed = 0;

    const progressMsg = await ctx.reply(
      `📤 • Enviando...\n\n✅ Enviados: 0\n❌ Falhos: 0\n📊 Total: 0/${numbers.length}`,
    );

    for (let i = 0; i < numbers.length; i++) {
      const number = numbers[i];

      try {
        await connection.sock?.sendMessage(`${number}@s.whatsapp.net`, {
          text: adText,
        });
        await recordSent(broadcast.id, number, true);
        sent++;
      } catch {
        await recordSent(broadcast.id, number, false);
        failed++;
      }

      await ctx.api.editMessageText(
        ctx.chat!.id,
        progressMsg.message_id,
        `📤 • Enviando...\n\n✅ Enviados: ${sent}\n❌ Falhos: ${failed}\n📊 Total: ${sent + failed}/${numbers.length}`,
      );

      // Não aplica delay após o último número
      if (i < numbers.length - 1) {
        await smartDelay(i + 1);
      }
    }

    await finishBroadcast(broadcast.id);

    await ctx.api.editMessageText(
      ctx.chat!.id,
      progressMsg.message_id,
      `✅ • Envio concluído!\n\n✅ Enviados: ${sent}\n❌ Falhos: ${failed}\n📊 Total: ${numbers.length}/${numbers.length}`,
    );
  },
);
