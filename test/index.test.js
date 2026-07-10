import { describe, it, expect, vi, beforeEach } from "vitest";
import worker from "../src/index.js";
import { createMockEnv, createMockCtx } from "./helpers.js";

vi.mock("../src/lib/telegram.js", () => ({
  setWebhook: vi.fn(async () => ({ ok: true })),
  sendMessage: vi.fn(async () => ({ ok: true })),
  editMessageText: vi.fn(async () => ({ ok: true })),
  answerCallbackQuery: vi.fn(async () => ({ ok: true })),
  escapeHtml: vi.fn((s) => s),
  code: vi.fn((s) => `<code>${s}</code>`),
  kb: vi.fn((rows) => ({ inline_keyboard: rows })),
  btn: vi.fn((text, data) => ({ text, callback_data: data })),
}));

vi.mock("../src/handlers/router.js", () => ({
  routeMessage: vi.fn(async () => {}),
  routeCallbackQuery: vi.fn(async () => {}),
}));

describe("index.js (Worker entry point)", () => {
  let env;
  let ctx;

  beforeEach(() => {
    env = createMockEnv();
    ctx = createMockCtx();
    vi.clearAllMocks();
  });

  describe("GET / (root)", () => {
    it("returns 200 with running message", async () => {
      const req = new Request("https://example.com/");
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain("Mezdia deployment bot is running");
    });
  });

  describe("GET /install", () => {
    it("returns 401 without correct key", async () => {
      const req = new Request("https://example.com/install?key=wrong");
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(401);
    });

    it("returns 401 without key param", async () => {
      const req = new Request("https://example.com/install");
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(401);
    });

    it("sets webhook and returns result with correct key", async () => {
      const req = new Request("https://example.com/install?key=test-admin-key");
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.webhookUrl).toContain("/telegram/webhook");
      expect(body.result.ok).toBe(true);
    });
  });

  describe("POST /telegram/webhook", () => {
    it("returns 405 for non-POST requests", async () => {
      const req = new Request("https://example.com/telegram/webhook", { method: "GET" });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(405);
    });

    it("returns 401 with wrong secret token", async () => {
      const req = new Request("https://example.com/telegram/webhook", {
        method: "POST",
        headers: {
          "X-Telegram-Bot-Api-Secret-Token": "wrong-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: { text: "/start" } }),
      });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(401);
    });

    it("accepts valid webhook with correct secret", async () => {
      const req = new Request("https://example.com/telegram/webhook", {
        method: "POST",
        headers: {
          "X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: { text: "/start", chat: { id: 123 }, from: { id: 123 } },
        }),
      });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toBe("OK");
    });

    it("returns 400 for invalid JSON", async () => {
      const req = new Request("https://example.com/telegram/webhook", {
        method: "POST",
        headers: {
          "X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret",
          "Content-Type": "application/json",
        },
        body: "not-json",
      });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(400);
    });

    it("handles message updates via ctx.waitUntil", async () => {
      const update = {
        message: { text: "/start", chat: { id: 123 }, from: { id: 123 } },
      };
      const req = new Request("https://example.com/telegram/webhook", {
        method: "POST",
        headers: {
          "X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(update),
      });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(200);
      // Wait for background tasks
      await Promise.all(ctx._waiting);
      const { routeMessage } = await import("../src/handlers/router.js");
      expect(routeMessage).toHaveBeenCalled();
    });

    it("handles callback_query updates via routeCallbackQuery", async () => {
      const update = {
        callback_query: { id: "cb-1", data: "menu:main", from: { id: 123 }, message: { chat: { id: 123 }, message_id: 1 } },
      };
      const req = new Request("https://example.com/telegram/webhook", {
        method: "POST",
        headers: {
          "X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(update),
      });
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(200);
      await Promise.all(ctx._waiting);
      const { routeCallbackQuery } = await import("../src/handlers/router.js");
      expect(routeCallbackQuery).toHaveBeenCalled();
    });
  });

  describe("unknown routes", () => {
    it("returns 200 for unknown GET routes", async () => {
      const req = new Request("https://example.com/some/path");
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(200);
    });
  });

  describe("error handling", () => {
    it("does not crash on handler errors", async () => {
      const { routeMessage } = await import("../src/handlers/router.js");
      routeMessage.mockRejectedValue(new Error("unexpected"));
      const update = {
        message: { text: "/start", chat: { id: 123 }, from: { id: 123 } },
      };
      const req = new Request("https://example.com/telegram/webhook", {
        method: "POST",
        headers: {
          "X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(update),
      });
      const res = await worker.fetch(req, env, ctx);
      // Should still return 200 to Telegram
      expect(res.status).toBe(200);
    });
  });
});
