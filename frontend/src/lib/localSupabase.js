const USERS_KEY = "localSupabase.users";
const SESSION_KEY = "localSupabase.session";
const TABLE_PREFIX = "localSupabase.table.";

function getJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function setJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    email_confirmed_at: user.email_confirmed_at || null,
    user_metadata: user.user_metadata || {},
  };
}

function tableKey(tableName) {
  return `${TABLE_PREFIX}${tableName}`;
}

class LocalTableQuery {
  constructor(tableName) {
    this.tableName = tableName;
    this.filters = [];
    this.operation = "select";
    this.payload = null;
  }

  select() {
    return this;
  }

  eq(column, value) {
    this.filters.push({ column, value });
    return this;
  }

  insert(payload) {
    this.operation = "insert";
    this.payload = payload;
    return this.execute();
  }

  upsert(payload) {
    this.operation = "upsert";
    this.payload = payload;
    return this.execute();
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async maybeSingle() {
    const result = await this.execute();
    return {
      data: Array.isArray(result.data) ? result.data[0] || null : result.data,
      error: null,
    };
  }

  async execute() {
    const key = tableKey(this.tableName);
    const rows = getJson(key, []);

    if (this.operation === "insert") {
      const nextRows = [...rows, this.payload];
      setJson(key, nextRows);
      return { data: this.payload, error: null };
    }

    if (this.operation === "upsert") {
      const payloads = Array.isArray(this.payload) ? this.payload : [this.payload];
      const nextRows = [...rows];

      payloads.forEach((payload) => {
        const index = nextRows.findIndex((row) => row.id === payload.id);
        if (index >= 0) {
          nextRows[index] = { ...nextRows[index], ...payload };
        } else {
          nextRows.push(payload);
        }
      });

      setJson(key, nextRows);
      return { data: Array.isArray(this.payload) ? payloads : payloads[0], error: null };
    }

    const data = rows.filter((row) =>
      this.filters.every((filter) => row[filter.column] === filter.value)
    );

    return { data, error: null };
  }
}

export const localSupabase = {
  auth: {
    async signUp({ email, password, options = {} }) {
      const users = getJson(USERS_KEY, []);
      const normalizedEmail = email.trim().toLowerCase();

      if (users.some((user) => user.email === normalizedEmail)) {
        return { data: {}, error: { message: "User already exists" } };
      }

      const user = {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        password,
        email_confirmed_at: null,
        verification_code: "123456",
        user_metadata: options.data || {},
      };

      setJson(USERS_KEY, [...users, user]);
      localStorage.removeItem(SESSION_KEY);

      return { data: { user: publicUser(user), session: null }, error: null };
    },

    async signInWithPassword({ email, password }) {
      const users = getJson(USERS_KEY, []);
      const normalizedEmail = email.trim().toLowerCase();
      const user = users.find(
        (candidate) =>
          candidate.email === normalizedEmail && candidate.password === password
      );

      if (!user) {
        return { data: {}, error: { message: "Invalid email or password" } };
      }

      if (!user.email_confirmed_at) {
        return { data: {}, error: { message: "Email not confirmed" } };
      }

      setJson(SESSION_KEY, { userId: user.id });

      return { data: { user: publicUser(user) }, error: null };
    },

    async signInWithOAuth({ provider, options = {} }) {
      if (provider !== "google") {
        return { data: {}, error: { message: "Unsupported OAuth provider" } };
      }

      const users = getJson(USERS_KEY, []);
      const existing = users.find((candidate) => candidate.email === "local.google.user@example.com");
      const user = existing || {
        id: crypto.randomUUID(),
        email: "local.google.user@example.com",
        password: null,
        email_confirmed_at: new Date().toISOString(),
        user_metadata: {
          full_name: "Local Google User",
        },
      };

      if (!existing) setJson(USERS_KEY, [...users, user]);
      setJson(SESSION_KEY, { userId: user.id });
      window.location.href = options.redirectTo || "/dashboard";

      return { data: { user: publicUser(user) }, error: null };
    },

    async getUser() {
      const session = getJson(SESSION_KEY, null);
      const users = getJson(USERS_KEY, []);
      const user = users.find((candidate) => candidate.id === session?.userId);

      return { data: { user: publicUser(user) }, error: null };
    },

    async getSession() {
      const { data } = await this.getUser();

      return {
        data: {
          session: data.user ? { user: data.user } : null,
        },
        error: null,
      };
    },

    async setSession() {
      return this.getSession();
    },

    async exchangeCodeForSession() {
      return this.getSession();
    },

    async verifyOtp({ email, token, type }) {
      if (type !== "signup") {
        return { data: {}, error: { message: "Unsupported verification type" } };
      }

      const users = getJson(USERS_KEY, []);
      const normalizedEmail = email?.trim().toLowerCase();
      const index = users.findIndex((candidate) => candidate.email === normalizedEmail);
      if (index < 0 || users[index].verification_code !== token) {
        return { data: {}, error: { message: "Invalid or expired verification code" } };
      }

      users[index] = {
        ...users[index],
        email_confirmed_at: new Date().toISOString(),
        verification_code: null,
      };
      setJson(USERS_KEY, users);
      setJson(SESSION_KEY, { userId: users[index].id });
      return {
        data: { user: publicUser(users[index]), session: { user: publicUser(users[index]) } },
        error: null,
      };
    },

    async resend({ email }) {
      const users = getJson(USERS_KEY, []);
      const index = users.findIndex(
        (candidate) => candidate.email === email?.trim().toLowerCase()
      );
      if (index >= 0) {
        users[index] = { ...users[index], verification_code: "123456" };
        setJson(USERS_KEY, users);
      }
      return { data: {}, error: null };
    },

    async resetPasswordForEmail(email) {
      const users = getJson(USERS_KEY, []);
      const user = users.find(
        (candidate) => candidate.email === email?.trim().toLowerCase()
      );
      if (user) setJson(SESSION_KEY, { userId: user.id });
      return { data: {}, error: null };
    },

    async updateUser({ password }) {
      const session = getJson(SESSION_KEY, null);
      const users = getJson(USERS_KEY, []);
      const index = users.findIndex((candidate) => candidate.id === session?.userId);
      if (index < 0) {
        return { data: {}, error: { message: "Password reset session expired" } };
      }
      users[index] = { ...users[index], password };
      setJson(USERS_KEY, users);
      return { data: { user: publicUser(users[index]) }, error: null };
    },

    async signOut() {
      localStorage.removeItem(SESSION_KEY);
      return { error: null };
    },
  },

  from(tableName) {
    return new LocalTableQuery(tableName);
  },
};
