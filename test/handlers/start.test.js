import { describe, it, expect, vi, beforeEach } from "vitest";
import { showMainMenu, showHelp, handleCancel } from "../../src/handlers/start.js";
import { createMockEnv } from "../helpers.js";

vi.mock("../../src/lib/telegram.js", () => ({
  sendMessage: vi.fn(async () => ({ ok: true })),
  editMessageText: vi.fn(async () => ({ ok: true })),
  answerCallbackQuery: vi.fn(async () => ({ ok: true })),
  escapeHtml: vi.fn((s) => s),
  code: vi.fn((s) => `<code>${s}</code>`),
  kb: vi.fn((rows) => ({ inline_keyboard: rows })),
  btn: vi.fn((text, data) => ({ text, callback_data: data })),
}));

describe("start.js", () => {
  let env;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  describe("showMainMenu", () => {
    it("sends welcome message on first greet", async () => {
      await showMainMenu(env, 12345, null, true);
      const { sendMessage } = await import("../../src/lib/telegram.js");
      expect(sendMessage).toHaveBeenCalledWith(
        env,
        12345,
        expect.stringContaining("Mezdia"),
        expect.any(Object)
      );
    });

    it("sends just menu prompt when not greeting", async () => {
      await showMainMenu(env, 12345, null, false);
      const { sendMessage } = await import("../../src/lib/telegram.js");
      const text = sendMessage.mock.calls[0][2];
      expect(text).toContain("ساده‌ترین مسیر");
    });

    it("edits message when messageId is provided", async () => {
      await showMainMenu(env, 12345, 42);
      const { editMessageText } = await import("../../src/lib/telegram.js");
      expect(editMessageText).toHaveBeenCalledWith(
        env,
        12345,
        42,
        expect.any(String),
        expect.any(Object)
      );
    });

    it("sends new message when no messageId", async () => {
      await showMainMenu(env, 12345, null);
      const { sendMessage } = await import("../../src/lib/telegram.js");
      expect(sendMessage).toHaveBeenCalled();
    });
  });

  describe("showHelp", () => {
    it("sends help text with commands", async () => {
      await showHelp(env, 12345, null);
      const { sendMessage } = await import("../../src/lib/telegram.js");
      const text = sendMessage.mock.calls[0][2];
      expect(text).toContain("/start");
      expect(text).toContain("/help");
      expect(text).toContain("/cancel");
    });

    it("edits message when messageId is provided", async () => {
      await showHelp(env, 12345, 42);
      const { editMessageText } = await import("../../src/lib/telegram.js");
      expect(editMessageText).toHaveBeenCalled();
    });
  });

  describe("handleCancel", () => {
    it("clears session and sends cancelled message", async () => {
      await handleCancel(env, 12345, 12345);
      const { sendMessage } = await import("../../src/lib/telegram.js");
      const text = sendMessage.mock.calls[0][2];
      expect(text).toContain("لغو شد");
    });

    it("session is cleared", async () => {
      await env.BOT_DB.put(
        "session:12345",
        JSON.stringify({ state: "awaiting_cf_token", data: {} })
      );
      await handleCancel(env, 12345, 12345);
      const session = await env.BOT_DB.get("session:12345");
      expect(session).toBeNull();
    });
  });
});
