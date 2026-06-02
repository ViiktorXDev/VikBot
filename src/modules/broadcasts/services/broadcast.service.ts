// broadcasts/broadcast.service.ts
import { eq, sql } from "drizzle-orm";
import { db } from "../../../config/database.config.js";
import {
  broadcastNumbers,
  broadcasts,
} from "../../../database/schemas/broadcasts.schema.js";
import { ALL_NUMBERS } from "../../../shared/allNumbers.js";


export async function getNextNumbers(
  telegramId: number,
  count: number,
): Promise<string[]> {
  // Busca todos os números que esse usuário já enviou alguma vez
  const alreadySent = await db
    .select({ phoneNumber: broadcastNumbers.phoneNumber })
    .from(broadcastNumbers)
    .innerJoin(broadcasts, eq(broadcastNumbers.broadcastId, broadcasts.id))
    .where(eq(broadcasts.telegramId, telegramId));

  const sentSet = new Set(alreadySent.map((r) => r.phoneNumber));

  // Pega os próximos que ele ainda não enviou
  const available = ALL_NUMBERS.filter((n) => !sentSet.has(n));

  if (available.length === 0) {
    return []; // já enviou pra todo mundo
  }

  return available.slice(0, count);
}

export async function createBroadcast(telegramId: number, numbers: string[]) {
  const [broadcast] = await db
    .insert(broadcasts)
    .values({
      telegramId,
      totalRequested: numbers.length,
      status: "sending",
    })
    .returning();

  return broadcast;
}

export async function recordSent(
  broadcastId: number,
  phoneNumber: string,
  success: boolean,
) {
  await db.insert(broadcastNumbers).values({
    broadcastId,
    phoneNumber,
    status: success ? "sent" : "failed",
  });

  if (success) {
    await db
      .update(broadcasts)
      .set({ totalSent: sql`${broadcasts.totalSent} + 1` })
      .where(eq(broadcasts.id, broadcastId));
  }
}

export async function finishBroadcast(broadcastId: number) {
  await db
    .update(broadcasts)
    .set({ status: "done", finishedAt: new Date() })
    .where(eq(broadcasts.id, broadcastId));
}
