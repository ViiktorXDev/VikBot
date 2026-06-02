// src/modules/whatsapp/auth/authState.ts
import {
  AuthenticationCreds,
  AuthenticationState,
  BufferJSON,
  initAuthCreds,
  proto,
  SignalDataTypeMap,
} from "@whiskeysockets/baileys";
import Database from "better-sqlite3";

interface ValueRow {
  value: string;
}

const CREDS_KEY = "creds";
const serialize = (v: unknown): string =>
  JSON.stringify(v, BufferJSON.replacer);
const deserialize = (r: string): unknown => JSON.parse(r, BufferJSON.reviver);

export function useSQLiteAuthState(db: Database.Database): {
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearAuth: () => void;
} {
  const stmtGetCreds = db.prepare("SELECT value FROM auth_creds WHERE id = ?");
  const stmtUpsertCreds = db.prepare(
    "INSERT INTO auth_creds (id, value) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value",
  );
  const stmtGetKey = db.prepare(
    "SELECT value FROM auth_keys WHERE type = ? AND id = ?",
  );
  const stmtUpsertKey = db.prepare(
    "INSERT INTO auth_keys (type, id, value) VALUES (?, ?, ?) ON CONFLICT(type, id) DO UPDATE SET value = excluded.value",
  );
  const stmtDeleteKey = db.prepare(
    "DELETE FROM auth_keys WHERE type = ? AND id = ?",
  );
  const stmtClearCreds = db.prepare("DELETE FROM auth_creds");
  const stmtClearKeys = db.prepare("DELETE FROM auth_keys");

  const rawCreds = stmtGetCreds.get(CREDS_KEY) as ValueRow | undefined;
  const creds: AuthenticationCreds = rawCreds
    ? (deserialize(rawCreds.value) as AuthenticationCreds)
    : initAuthCreds();

  const state: AuthenticationState = {
    creds,
    keys: {
      // cast necessário — o tipo genérico do Baileys não casa com implementações síncronas
      get<T extends keyof SignalDataTypeMap>(
        type: T,
        ids: string[],
      ): { [id: string]: SignalDataTypeMap[T] } {
        const result: { [id: string]: SignalDataTypeMap[T] } = {};
        for (const id of ids) {
          const row = stmtGetKey.get(type as string, id) as
            | ValueRow
            | undefined;
          if (!row) continue;
          let value = deserialize(row.value) as SignalDataTypeMap[T];
          if (type === "app-state-sync-key" && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(
              value as object,
            ) as unknown as SignalDataTypeMap[T];
          }
          result[id] = value;
        }
        return result;
      },

      set(data: {
        [T in keyof SignalDataTypeMap]?: {
          [id: string]: SignalDataTypeMap[T] | null | undefined;
        };
      }): void {
        db.transaction(() => {
          for (const [type, ids] of Object.entries(data)) {
            if (!ids) continue;
            for (const [id, value] of Object.entries(ids)) {
              if (value == null) stmtDeleteKey.run(type, id);
              else stmtUpsertKey.run(type, id, serialize(value));
            }
          }
        })();
      },
    },
  };

  const saveCreds = async (): Promise<void> => {
    stmtUpsertCreds.run(CREDS_KEY, serialize(creds));
  };

  const clearAuth = (): void => {
    db.transaction(() => {
      stmtClearCreds.run();
      stmtClearKeys.run();
    })();
  };

  return { state, saveCreds, clearAuth };
}
