import { eq } from "drizzle-orm";
import { db } from "../../../config/database.config.js";
import {
  NewUser,
  User,
  users,
} from "../../../database/schemas/users.schema.js";

export class UsersRepository {
  async create(data: NewUser): Promise<User | null> {
    const [result] = await db.insert(users).values(data).returning();

    return result ?? null;
  }

  async getById(telegramId: number): Promise<User | null> {
    const [result] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);

    return result ?? null;
  }

  async update(
    telegramId: number,
    data: Partial<NewUser>,
  ): Promise<User | null> {
    const [result] = await db
      .update(users)
      .set(data)
      .where(eq(users.telegramId, telegramId))
      .returning();

    return result ?? null;
  }

  async upsert(data: NewUser): Promise<User | null> {
    const [result] = await db
      .insert(users)
      .values(data)
      .onConflictDoUpdate({
        target: users.telegramId,
        set: {
          username: data.username,
          firstName: data.firstName,
          lastName: data.lastName,
          languageCode: data.languageCode,
          lastInteractionAt: new Date(),
        },
      })
      .returning();

    return result ?? null;
  }

  async delete(telegramId: number): Promise<boolean> {
    const [result] = await db
      .delete(users)
      .where(eq(users.telegramId, telegramId))
      .returning();

    return !!result;
  }
}

export const usersRepo = new UsersRepository();
