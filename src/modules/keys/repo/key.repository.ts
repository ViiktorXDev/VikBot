import { and, eq, gt } from "drizzle-orm";
import { db } from "../../../config/database.config.js";
import { Key, keys, NewKey } from "../../../database/schemas/keys.schema.js";

export class KeysRepository {
  async create(data: NewKey): Promise<Key | null> {
    const [result] = await db.insert(keys).values(data).returning();

    return result ?? null;
  }

  async getByCode(code: string): Promise<Key | null> {
    const [result] = await db
      .select()
      .from(keys)
      .where(eq(keys.code, code))
      .limit(1);

    return result ?? null;
  }

  async getActiveByCode(code: string): Promise<Key | null> {
    const [result] = await db
      .select()
      .from(keys)
      .where(
        and(
          eq(keys.code, code),
          eq(keys.status, "active"),
          gt(keys.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return result ?? null;
  }
  async getActiveKeyByUser(telegramId: number): Promise<Key | null> {
    const [result] = await db
      .select()
      .from(keys)
      .where(
        and(
          eq(keys.usedBy, telegramId),
          eq(keys.status, "used"),
          gt(keys.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return result ?? null;
  }
  async markAsUsed(code: string, telegramId: number): Promise<Key | null> {
    const [result] = await db
      .update(keys)
      .set({
        status: "used",
        usedBy: telegramId,
        usedAt: new Date(),
      })
      .where(eq(keys.code, code))
      .returning();

    return result ?? null;
  }

  async revoke(code: string): Promise<Key | null> {
    const [result] = await db
      .update(keys)
      .set({ status: "revoked" })
      .where(eq(keys.code, code))
      .returning();

    return result ?? null;
  }
}
export const keysRepo = new KeysRepository();
