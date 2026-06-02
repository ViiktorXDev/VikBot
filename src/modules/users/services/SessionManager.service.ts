// ─────────────────────────────────────────────────────────────
// SessionManager — in-memory session management for chat bots
// ─────────────────────────────────────────────────────────────

type UserId = number | string;

export interface Session<TState extends string, TData extends object> {
  userId: UserId;
  state: TState;
  data: Partial<TData>;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionManagerOptions<TState extends string, TData extends object> {
  /** Valid states — any value outside this set is rejected */
  states: readonly TState[];

  /** Optional allowed transitions: { FROM: [TO, TO] }
   *  If omitted, any transition is allowed */
  transitions?: Partial<Record<TState, TState[]>>;

  /** Session TTL in ms (default: 10 minutes) */
  ttl?: number;

  /** Cleanup interval in ms (default: 1 minute) */
  cleanupInterval?: number;

  /** Lifecycle hooks */
  hooks?: {
    onCreate?: (session: Session<TState, TData>) => void;
    onExpire?: (session: Session<TState, TData>) => void;
    onDelete?: (session: Session<TState, TData>) => void;
  };
}

export class SessionManager<TState extends string, TData extends object> {
  private readonly sessions = new Map<UserId, Session<TState, TData>>();
  private readonly validStates: ReadonlySet<TState>;
  private readonly transitions?: Partial<Record<TState, TState[]>>;
  private readonly ttl: number;
  private readonly hooks: NonNullable<
    SessionManagerOptions<TState, TData>["hooks"]
  >;
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(private readonly options: SessionManagerOptions<TState, TData>) {
    this.validStates = new Set(options.states);
    this.transitions = options.transitions;
    this.ttl = options.ttl ?? 10 * 60 * 1000;
    this.hooks = options.hooks ?? {};

    // Cleanup runs on a separate interval — never blocks the event loop
    const interval = options.cleanupInterval ?? 60 * 1000;
    this.cleanupTimer = setInterval(() => this.cleanup(), interval);

    // Allows Node.js to exit even if the interval is still running
    if (this.cleanupTimer.unref) this.cleanupTimer.unref();
  }

  // ── public API ──────────────────────────────────────────────

  createSession(userId: UserId, initialState: TState): Session<TState, TData> {
    this.assertValidState(initialState);

    // Overwrite silently — idempotent behavior on reconnect
    const session: Session<TState, TData> = {
      userId,
      state: initialState,
      data: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sessions.set(userId, session);
    this.hooks.onCreate?.(session);
    return session;
  }

  getSession(userId: UserId): Session<TState, TData> {
    const session = this.sessions.get(userId);

    if (!session) {
      throw new SessionNotFoundError(userId);
    }

    if (this.isExpired(session)) {
      this.hooks.onExpire?.(session);
      this.sessions.delete(userId);
      throw new SessionExpiredError(userId);
    }

    return session;
  }

  setState(userId: UserId, newState: TState): Session<TState, TData> {
    console.log(newState);
    
    this.assertValidState(newState);

    const session = this.getSession(userId);

    if (this.transitions) {
      const allowed = this.transitions[session.state];

      // If transitions are defined for the current state, enforce them
      if (allowed && !allowed.includes(newState)) {
        throw new InvalidTransitionError(session.state, newState);
      }
    }

    session.state = newState;
    session.updatedAt = new Date();
    return session;
  }

  setData(userId: UserId, partialData: Partial<TData>): Session<TState, TData> {
    const session = this.getSession(userId);

    // Shallow merge — avoids replacing unrelated fields
    session.data = { ...session.data, ...partialData };
    session.updatedAt = new Date();
    return session;
  }

  hasSession(userId: UserId): boolean {
    const session = this.sessions.get(userId);
    if (!session) return false;

    if (this.isExpired(session)) {
      this.hooks.onExpire?.(session);
      this.sessions.delete(userId);
      return false;
    }

    return true;
  }

  deleteSession(userId: UserId): void {
    const session = this.sessions.get(userId);
    if (!session) return;

    this.hooks.onDelete?.(session);
    this.sessions.delete(userId);
  }

  /** Release the cleanup interval — call on bot shutdown */
  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.sessions.clear();
  }

  get size(): number {
    return this.sessions.size;
  }

  // ── private ─────────────────────────────────────────────────

  private isExpired(session: Session<TState, TData>): boolean {
    return Date.now() - session.updatedAt.getTime() > this.ttl;
  }

  private assertValidState(state: TState): void {
    if (!this.validStates.has(state)) {
      throw new InvalidStateError(state, [...this.validStates]);
    }
  }

  private cleanup(): void {
    for (const [userId, session] of this.sessions) {
      if (this.isExpired(session)) {
        this.hooks.onExpire?.(session);
        this.sessions.delete(userId);
      }
    }
  }
}

// ── errors ───────────────────────────────────────────────────

export class SessionNotFoundError extends Error {
  constructor(userId: UserId) {
    super(`Session not found for user: ${userId}`);
    this.name = "SessionNotFoundError";
  }
}

export class SessionExpiredError extends Error {
  constructor(userId: UserId) {
    super(`Session expired for user: ${userId}`);
    this.name = "SessionExpiredError";
  }
}

export class InvalidStateError extends Error {
  constructor(state: string, valid: string[]) {
    super(`Invalid state "${state}". Valid states: [${valid.join(", ")}]`);
    this.name = "InvalidStateError";
  }
}

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Transition "${from}" → "${to}" is not allowed`);
    this.name = "InvalidTransitionError";
  }
}

// ── example ──────────────────────────────────────────────────

/*
type BotState = "idle" | "awaiting_key" | "authorized";

interface BotData {
  keyAttempts: number;
  inputBuffer: string;
}

const sessions = new SessionManager<BotState, BotData>({
  states: ["idle", "awaiting_key", "authorized"],

  transitions: {
    idle:         ["awaiting_key"],
    awaiting_key: ["idle", "authorized"],
    authorized:   ["idle"],
  },

  ttl: 15 * 60 * 1000,           // 15 minutes
  cleanupInterval: 60 * 1000,    // cleanup every 1 minute

  hooks: {
    onCreate: (s) => console.log(`[session] created for ${s.userId}`),
    onExpire: (s) => console.log(`[session] expired for ${s.userId}`),
    onDelete: (s) => console.log(`[session] deleted for ${s.userId}`),
  },
});

// user sends /start
sessions.createSession(123456, "idle");

// user initiates key activation
sessions.setState(123456, "awaiting_key");
sessions.setData(123456, { keyAttempts: 0 });

// user sends a key
const session = sessions.getSession(123456);
sessions.setData(123456, { keyAttempts: session.data.keyAttempts! + 1 });
sessions.setState(123456, "authorized");

// bot shutdown
sessions.destroy();
*/
