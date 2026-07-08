// Shared test helpers and mock factories.

export function createMockEnv(overrides = {}) {
  const store = new Map();
  return {
    BOT_DB: {
      get: async (key) => store.get(key) ?? null,
      put: async (key, value, opts) => {
        store.set(key, value);
        if (opts?.expirationTtl) {
          // Just track it; real KV would expire.
        }
      },
      delete: async (key) => store.delete(key),
      _store: store,
    },
    TELEGRAM_BOT_TOKEN: "test-bot-token",
    TELEGRAM_WEBHOOK_SECRET: "test-webhook-secret",
    ADMIN_SETUP_KEY: "test-admin-key",
    ...overrides,
  };
}

export function createMockRequest(url, opts = {}) {
  const method = opts.method || "GET";
  const headers = new Headers(opts.headers || {});
  if (opts.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return new Request(url, {
    method,
    headers,
    body: opts.body
      ? typeof opts.body === "string"
        ? opts.body
        : JSON.stringify(opts.body)
      : undefined,
  });
}

export function createMockCtx() {
  const waiting = [];
  return {
    waitUntil: (promise) => waiting.push(promise),
    _waiting: waiting,
  };
}

export function createMockMessage(text, opts = {}) {
  return {
    message_id: opts.message_id || 1,
    chat: { id: opts.chatId || 12345 },
    from: {
      id: opts.tgId || 12345,
      first_name: opts.firstName || "Test",
      username: opts.username || "testuser",
    },
    text: text || "",
    ...opts,
  };
}

export function createMockCallbackQuery(data, opts = {}) {
  return {
    id: opts.id || "cb-1",
    chat_instance: "test",
    from: {
      id: opts.tgId || 12345,
      first_name: opts.firstName || "Test",
      username: opts.username || "testuser",
    },
    message: {
      chat: { id: opts.chatId || 12345 },
      message_id: opts.message_id || 1,
      text: "mock",
    },
    data: data || "",
  };
}

// Minimal fetch mock that records calls and returns configured responses.
export function createFetchMock(responses = {}) {
  const calls = [];
  const handler = async (url, init) => {
    calls.push({ url, init });
    const key = `${init?.method || "GET"} ${url}`;
    const resp = responses[key] || responses[url] || responses["*"];
    if (typeof resp === "function") return resp(url, init);
    if (resp) return resp;
    return new Response(JSON.stringify({ ok: true, result: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return { fetch: handler, calls };
}
