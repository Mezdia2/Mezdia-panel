import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  startAddAccount,
  handleTokenMessage,
  handleAccountPick,
  listAccountsScreen,
  showAccountDetail,
  confirmRemoveAccountScreen,
  removeAccountConfirmed,
} from "../../src/handlers/accounts.js";
import { createMockEnv } from "../helpers.js";

vi.mock("../../src/lib/telegram.js", () => ({
  sendMessage: vi.fn(async () => ({ ok: true })),
  editMessageText: vi.fn(async () => ({ ok: true })),
  answerCallbackQuery: vi.fn(async () => ({ ok: true })),
  escapeHtml: vi.fn((s) => s),
  code: vi.fn((s) => `<code>${s}</code>`),
  kb: vi.fn((rows) => ({ inline_keyboard: rows })),
  btn: vi.fn((text, data) => ({ text, callback_data: data })),
  urlBtn: vi.fn((text, url) => ({ text, url })),
  replyKb: vi.fn((rows) => ({ keyboard: rows, resize_keyboard: true })),
  replyBtn: vi.fn((text) => ({ text })),
  removeKb: vi.fn(() => ({ remove_keyboard: true })),
}));

vi.mock("../../src/lib/cloudflare.js", () => ({
  listAccounts: vi.fn(),
  CloudflareApiError: class extends Error {},
}));

vi.mock("../../src/lib/provision.js", () => ({
  destroyPanel: vi.fn(async () => {}),
}));

describe("accounts.js", () => {
  let env;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  describe("startAddAccount", () => {
    it("sets session to awaiting_cf_token", async () => {
      await startAddAccount(env, 12345, 12345, 1);
      const sessionRaw = await env.BOT_DB.get("session:12345");
      expect(sessionRaw).not.toBeNull();
      const session = JSON.parse(sessionRaw);
      expect(session.state).toBe("awaiting_cf_token");
    });

    it("sends ask token prompt", async () => {
      await startAddAccount(env, 12345, 12345, 1);
      const { sendMessage } = await import("../../src/lib/telegram.js");
      expect(sendMessage).toHaveBeenCalledTimes(2);
      expect(sendMessage.mock.calls[1][2]).toContain("API Token");
    });
  });

  describe("handleTokenMessage", () => {
    it("shows error for invalid token", async () => {
      const { listAccounts } = await import("../../src/lib/cloudflare.js");
      listAccounts.mockRejectedValue(new Error("Invalid token"));
      await handleTokenMessage(env, 12345, 12345, "bad-token");
      const { sendMessage } = await import("../../src/lib/telegram.js");
      const text = sendMessage.mock.calls[0][2];
      expect(text).toContain("نامعتبر");
    });

    it("shows error when token has no accounts", async () => {
      const { listAccounts } = await import("../../src/lib/cloudflare.js");
      listAccounts.mockResolvedValue([]);
      await handleTokenMessage(env, 12345, 12345, "valid-token");
      const { sendMessage } = await import("../../src/lib/telegram.js");
      const text = sendMessage.mock.calls[0][2];
      expect(text).toContain("حسابی یافت نشد");
    });

    it("auto-finalizes when token has exactly one account", async () => {
      const { listAccounts } = await import("../../src/lib/cloudflare.js");
      listAccounts.mockResolvedValue([{ id: "cf-1", name: "My Account" }]);
      await handleTokenMessage(env, 12345, 12345, "valid-token");
      // Session should be cleared after finalization
      const session = await env.BOT_DB.get("session:12345");
      expect(session).toBeNull();
      // Account should be saved
      const accountsRaw = await env.BOT_DB.get("accounts:12345");
      expect(accountsRaw).not.toBeNull();
      const accounts = JSON.parse(accountsRaw);
      expect(accounts).toHaveLength(1);
      expect(accounts[0].cfAccountId).toBe("cf-1");
    });

    it("shows pick screen when token has multiple accounts", async () => {
      const { listAccounts } = await import("../../src/lib/cloudflare.js");
      listAccounts.mockResolvedValue([
        { id: "cf-1", name: "Account 1" },
        { id: "cf-2", name: "Account 2" },
      ]);
      await handleTokenMessage(env, 12345, 12345, "multi-token");
      const sessionRaw = await env.BOT_DB.get("session:12345");
      const session = JSON.parse(sessionRaw);
      expect(session.state).toBe("awaiting_cf_account_pick");
      expect(session.data.candidates).toHaveLength(2);
    });
  });

  describe("handleAccountPick", () => {
    it("finalizes account when valid candidate", async () => {
      await env.BOT_DB.put(
        "session:12345",
        JSON.stringify({
          state: "awaiting_cf_account_pick",
          data: {
            token: "my-token",
            candidates: [{ id: "cf-1", name: "Chosen Account" }],
          },
        })
      );
      await handleAccountPick(env, 12345, 12345, 1, "cf-1", {
        state: "awaiting_cf_account_pick",
        data: {
          token: "my-token",
          candidates: [{ id: "cf-1", name: "Chosen Account" }],
        },
      });
      const accounts = JSON.parse(await env.BOT_DB.get("accounts:12345"));
      expect(accounts[0].cfAccountName).toBe("Chosen Account");
    });

    it("shows error when candidate not found", async () => {
      await env.BOT_DB.put(
        "session:12345",
        JSON.stringify({
          state: "awaiting_cf_account_pick",
          data: { token: "tok", candidates: [] },
        })
      );
      await handleAccountPick(env, 12345, 12345, 1, "nonexistent", {
        state: "awaiting_cf_account_pick",
        data: { token: "tok", candidates: [] },
      });
      const { sendMessage } = await import("../../src/lib/telegram.js");
      expect(sendMessage.mock.calls[0][2]).toContain("موردی پیدا نشد");
    });
  });

  describe("listAccountsScreen", () => {
    it("shows empty message when no accounts", async () => {
      await listAccountsScreen(env, 12345, 12345, 1);
      const { sendMessage } = await import("../../src/lib/telegram.js");
      const text = sendMessage.mock.calls[0][2];
      expect(text).toContain("حسابی اضافه نشده");
    });

    it("shows accounts list when accounts exist", async () => {
      await env.BOT_DB.put(
        "accounts:12345",
        JSON.stringify([{ id: "a1", cfAccountName: "My Account" }])
      );
      await listAccountsScreen(env, 12345, 12345, 1);
      const { sendMessage } = await import("../../src/lib/telegram.js");
      const text = sendMessage.mock.calls[0][2];
      expect(text).toContain("حساب‌های Cloudflare");
    });
  });

  describe("showAccountDetail", () => {
    it("shows account info with deployment count", async () => {
      await env.BOT_DB.put(
        "accounts:12345",
        JSON.stringify([
          { id: "a1", cfAccountName: "Prod", cfAccountId: "cf-123" },
        ])
      );
      await env.BOT_DB.put(
        "deployments:12345",
        JSON.stringify([
          { id: "d1", accountId: "a1" },
          { id: "d2", accountId: "a1" },
        ])
      );
      await showAccountDetail(env, 12345, 12345, 1, "a1");
      const { sendMessage } = await import("../../src/lib/telegram.js");
      const text = sendMessage.mock.calls[0][2];
      expect(text).toContain("Prod");
      expect(text).toContain("2");
    });

    it("shows not found when account doesn't exist", async () => {
      await showAccountDetail(env, 12345, 12345, 1, "nonexistent");
      const { sendMessage } = await import("../../src/lib/telegram.js");
      const text = sendMessage.mock.calls[0][2];
      expect(text).toContain("موردی پیدا نشد");
    });
  });

  describe("confirmRemoveAccountScreen", () => {
    it("shows confirmation with deployment count", async () => {
      await env.BOT_DB.put(
        "accounts:12345",
        JSON.stringify([{ id: "a1", cfAccountName: "To Delete" }])
      );
      await env.BOT_DB.put(
        "deployments:12345",
        JSON.stringify([{ id: "d1", accountId: "a1" }])
      );
      await confirmRemoveAccountScreen(env, 12345, 12345, 1, "a1");
      const { sendMessage } = await import("../../src/lib/telegram.js");
      const text = sendMessage.mock.calls[0][2];
      expect(text).toContain("To Delete");
      expect(text).toContain("ورکر متصل");
    });
  });

  describe("removeAccountConfirmed", () => {
    it("removes account and all deployments", async () => {
      await env.BOT_DB.put(
        "accounts:12345",
        JSON.stringify([{ id: "a1", cfAccountName: "Gone", token: "tok" }])
      );
      await env.BOT_DB.put(
        "deployments:12345",
        JSON.stringify([
          { id: "d1", accountId: "a1", scriptName: "mz-1", databaseId: "db-1" },
        ])
      );
      await removeAccountConfirmed(env, 12345, 12345, 1, "a1", "cb-1");
      const accounts = JSON.parse(await env.BOT_DB.get("accounts:12345"));
      expect(accounts).toHaveLength(0);
      const deployments = JSON.parse(await env.BOT_DB.get("deployments:12345"));
      expect(deployments).toHaveLength(0);
    });

    it("handles missing account gracefully", async () => {
      await removeAccountConfirmed(env, 12345, 12345, 1, "nonexistent", "cb-1");
      const { sendMessage } = await import("../../src/lib/telegram.js");
      const text = sendMessage.mock.calls[0][2];
      expect(text).toContain("موردی پیدا نشد");
    });
  });
});
