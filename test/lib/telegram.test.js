import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  escapeHtml,
  code,
  sendMessage,
  editMessageText,
  answerCallbackQuery,
  setWebhook,
  deleteWebhook,
  kb,
  btn,
  urlBtn,
} from "../../src/lib/telegram.js";
import { createMockEnv } from "../helpers.js";

describe("telegram.js", () => {
  let env;

  beforeEach(() => {
    env = createMockEnv();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ ok: true, result: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("escapeHtml", () => {
    it("escapes ampersands", () => {
      expect(escapeHtml("a&b")).toBe("a&amp;b");
    });

    it("escapes angle brackets", () => {
      expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    });

    it("handles null/undefined", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
    });

    it("converts non-strings", () => {
      expect(escapeHtml(123)).toBe("123");
    });
  });

  describe("code", () => {
    it("wraps in <code> tags with escaping", () => {
      expect(code("hello")).toBe("<code>hello</code>");
    });

    it("escapes HTML inside code tags", () => {
      expect(code("<b>bold</b>")).toBe("<code>&lt;b&gt;bold&lt;/b&gt;</code>");
    });
  });

  describe("sendMessage", () => {
    it("calls Telegram API with correct parameters", async () => {
      await sendMessage(env, 12345, "Hello world");
      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, opts] = fetch.mock.calls[0];
      expect(url).toBe("https://api.telegram.org/bottest-bot-token/sendMessage");
      const body = JSON.parse(opts.body);
      expect(body.chat_id).toBe(12345);
      expect(body.text).toBe("Hello world");
      expect(body.parse_mode).toBe("HTML");
      expect(body.disable_web_page_preview).toBe(true);
    });

    it("includes keyboard in reply_markup when provided", async () => {
      const keyboard = kb([[btn("Click", "data")]]);
      await sendMessage(env, 12345, "Test", { keyboard });
      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.reply_markup).toEqual(keyboard);
    });
  });

  describe("editMessageText", () => {
    it("calls editMessageText API", async () => {
      await editMessageText(env, 12345, 42, "Edited text");
      expect(fetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.chat_id).toBe(12345);
      expect(body.message_id).toBe(42);
      expect(body.text).toBe("Edited text");
    });

    it("falls back to sendMessage on failure", async () => {
      // First call fails, second (sendMessage fallback) succeeds
      let callCount = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          callCount++;
          if (callCount === 1) {
            return new Response(JSON.stringify({ ok: false, description: "message not found" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ ok: true, result: { message_id: 99 } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        })
      );
      const result = await editMessageText(env, 12345, 42, "Fallback text");
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result.ok).toBe(true);
    });
  });

  describe("answerCallbackQuery", () => {
    it("calls answerCallbackQuery API", async () => {
      await answerCallbackQuery(env, "cb-123", { text: "Done", showAlert: true });
      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.callback_query_id).toBe("cb-123");
      expect(body.text).toBe("Done");
      expect(body.show_alert).toBe(true);
    });
  });

  describe("setWebhook", () => {
    it("calls setWebhook API with correct params", async () => {
      await setWebhook(env, "https://example.com/hook", "secret123");
      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.url).toBe("https://example.com/hook");
      expect(body.secret_token).toBe("secret123");
      expect(body.allowed_updates).toEqual(["message", "callback_query"]);
      expect(body.drop_pending_updates).toBe(true);
    });
  });

  describe("deleteWebhook", () => {
    it("calls deleteWebhook API", async () => {
      await deleteWebhook(env);
      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.drop_pending_updates).toBe(true);
    });
  });

  describe("keyboard builders", () => {
    it("kb wraps rows in inline_keyboard", () => {
      const result = kb([[btn("A", "a"), btn("B", "b")]]);
      expect(result).toEqual({
        inline_keyboard: [[{ text: "A", callback_data: "a" }, { text: "B", callback_data: "b" }]],
      });
    });

    it("btn creates a callback button", () => {
      expect(btn("Click me", "action:id")).toEqual({
        text: "Click me",
        callback_data: "action:id",
      });
    });

    it("urlBtn creates a URL button", () => {
      expect(urlBtn("Visit", "https://example.com")).toEqual({
        text: "Visit",
        url: "https://example.com",
      });
    });
  });

  describe("error handling", () => {
    it("returns error data when Telegram API returns non-ok", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          new Response(
            JSON.stringify({ ok: false, description: "Bad request: message text is empty" }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
      );
      const result = await sendMessage(env, 12345, "Test");
      expect(result.ok).toBe(false);
      expect(result.description).toContain("Bad request");
    });

    it("handles invalid JSON response from Telegram", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("not json", { status: 200 }))
      );
      const result = await sendMessage(env, 12345, "Test");
      expect(result.ok).toBe(false);
      expect(result.description).toBe("invalid json response");
    });
  });
});
