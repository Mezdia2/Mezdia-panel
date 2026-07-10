import { describe, it, expect, vi, beforeEach } from "vitest";
import { routeMessage, routeCallbackQuery as routeCallback } from "../../src/handlers/router.js";
import { createMockEnv, createMockMessage, createMockCallbackQuery } from "../helpers.js";

vi.mock("../../src/lib/telegram.js", () => ({
  sendMessage: vi.fn(async () => ({ ok: true })),
  editMessageText: vi.fn(async () => ({ ok: true })),
  answerCallbackQuery: vi.fn(async () => ({ ok: true })),
  setWebhook: vi.fn(async () => ({ ok: true })),
  escapeHtml: vi.fn((s) => s),
  code: vi.fn((s) => `<code>${s}</code>`),
  kb: vi.fn((rows) => ({ inline_keyboard: rows })),
  btn: vi.fn((text, data) => ({ text, callback_data: data })),
  urlBtn: vi.fn((text, url) => ({ text, url })),
  replyKb: vi.fn((rows) => ({ keyboard: rows, resize_keyboard: true })),
  replyBtn: vi.fn((text) => ({ text })),
  removeKb: vi.fn(() => ({ remove_keyboard: true })),
}));

vi.mock("../../src/handlers/start.js", () => ({
  showMainMenu: vi.fn(async () => {}),
  showHelp: vi.fn(async () => {}),
  handleCancel: vi.fn(async () => {}),
}));

vi.mock("../../src/handlers/accounts.js", () => ({
  startAddAccount: vi.fn(async () => {}),
  handleTokenMessage: vi.fn(async () => {}),
  handleAccountPick: vi.fn(async () => {}),
  listAccountsScreen: vi.fn(async () => {}),
  showAccountDetail: vi.fn(async () => {}),
  confirmRemoveAccountScreen: vi.fn(async () => {}),
  removeAccountConfirmed: vi.fn(async () => {}),
}));

vi.mock("../../src/handlers/deployments.js", () => ({
  startDeploy: vi.fn(async () => {}),
  handleLabelMessage: vi.fn(async () => {}),
  listDeploymentsScreen: vi.fn(async () => {}),
  showDeploymentDetail: vi.fn(async () => {}),
  showStats: vi.fn(async () => {}),
  showCreds: vi.fn(async () => {}),
  showLogs: vi.fn(async () => {}),
  pauseDeployment: vi.fn(async () => {}),
  resumeDeployment: vi.fn(async () => {}),
  resetTraffic: vi.fn(async () => {}),
  updateWorker: vi.fn(async () => {}),
  confirmDeleteDeploymentScreen: vi.fn(async () => {}),
  deleteDeploymentConfirmed: vi.fn(async () => {}),
}));

describe("router.js", () => {
  let env;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  describe("routeMessage", () => {
    it("handles /start command", async () => {
      const msg = createMockMessage("/start");
      await routeMessage(env, msg);
      const { showMainMenu } = await import("../../src/handlers/start.js");
      expect(showMainMenu).toHaveBeenCalledWith(env, 12345, 12345, true);
    });

    it("handles /help command", async () => {
      const msg = createMockMessage("/help");
      await routeMessage(env, msg);
      const { showHelp } = await import("../../src/handlers/start.js");
      expect(showHelp).toHaveBeenCalledWith(env, 12345, 12345);
    });

    it("handles /cancel command", async () => {
      const msg = createMockMessage("/cancel");
      await routeMessage(env, msg);
      const { handleCancel } = await import("../../src/handlers/start.js");
      expect(handleCancel).toHaveBeenCalledWith(env, 12345, 12345);
    });

    it("routes to handleTokenMessage when session is awaiting_cf_token", async () => {
      // Set up session in KV
      await env.BOT_DB.put(
        "session:12345",
        JSON.stringify({ state: "awaiting_cf_token", data: {} })
      );
      const msg = createMockMessage("some-api-token");
      await routeMessage(env, msg);
      const { handleTokenMessage } = await import("../../src/handlers/accounts.js");
      expect(handleTokenMessage).toHaveBeenCalledWith(env, 12345, 12345, "some-api-token");
    });

    it("routes to handleLabelMessage when session is awaiting_deploy_label", async () => {
      await env.BOT_DB.put(
        "session:12345",
        JSON.stringify({ state: "awaiting_deploy_label", data: { accountId: "a1" } })
      );
      const msg = createMockMessage("My Panel");
      await routeMessage(env, msg);
      const { handleLabelMessage } = await import("../../src/handlers/deployments.js");
      expect(handleLabelMessage).toHaveBeenCalled();
    });

    it("sends prompt message when no session exists", async () => {
      const msg = createMockMessage("hello");
      await routeMessage(env, msg);
      const { sendMessage } = await import("../../src/lib/telegram.js");
      expect(sendMessage).toHaveBeenCalledWith(
        env,
        12345,
        expect.stringContaining("/start"),
        expect.any(Object)
      );
    });

    it("clears session on unknown session state", async () => {
      await env.BOT_DB.put(
        "session:12345",
        JSON.stringify({ state: "unknown_state", data: {} })
      );
      const msg = createMockMessage("anything");
      await routeMessage(env, msg);
      const session = await env.BOT_DB.get("session:12345");
      expect(session).toBeNull();
    });

    it("creates user on first message", async () => {
      const msg = createMockMessage("/start");
      await routeMessage(env, msg);
      const userRaw = await env.BOT_DB.get("user:12345");
      expect(userRaw).not.toBeNull();
      const user = JSON.parse(userRaw);
      expect(user.tgId).toBe(12345);
    });
  });

  describe("routeCallback", () => {
    it("falls back to unknown message for unsupported legacy menu callback", async () => {
      const cb = createMockCallbackQuery("menu:main");
      await routeCallback(env, cb);
      const { sendMessage } = await import("../../src/lib/telegram.js");
      expect(sendMessage.mock.calls[0][2]).toContain("این گزینه دیگر معتبر نیست");
    });

    it("routes stats callback to showStats", async () => {
      const cb = createMockCallbackQuery("stats:dep1");
      await routeCallback(env, cb);
      const { showStats } = await import("../../src/handlers/deployments.js");
      expect(showStats).toHaveBeenCalled();
    });

    it("routes pause callback to pauseDeployment", async () => {
      const cb = createMockCallbackQuery("pause:dep1");
      await routeCallback(env, cb);
      const { pauseDeployment } = await import("../../src/handlers/deployments.js");
      expect(pauseDeployment).toHaveBeenCalled();
    });

    it("routes resume callback to resumeDeployment", async () => {
      const cb = createMockCallbackQuery("resume:dep1");
      await routeCallback(env, cb);
      const { resumeDeployment } = await import("../../src/handlers/deployments.js");
      expect(resumeDeployment).toHaveBeenCalled();
    });

    it("routes reset callback to resetTraffic", async () => {
      const cb = createMockCallbackQuery("reset:dep1");
      await routeCallback(env, cb);
      const { resetTraffic } = await import("../../src/handlers/deployments.js");
      expect(resetTraffic).toHaveBeenCalled();
    });

    it("routes update callback to updateWorker", async () => {
      const cb = createMockCallbackQuery("update:dep1");
      await routeCallback(env, cb);
      const { updateWorker } = await import("../../src/handlers/deployments.js");
      expect(updateWorker).toHaveBeenCalled();
    });

    it("routes delete callback to confirmDeleteDeploymentScreen", async () => {
      const cb = createMockCallbackQuery("del:dep1");
      await routeCallback(env, cb);
      const { confirmDeleteDeploymentScreen } = await import("../../src/handlers/deployments.js");
      expect(confirmDeleteDeploymentScreen).toHaveBeenCalled();
    });

    it("sends unknown callback message for unrecognized data", async () => {
      const cb = createMockCallbackQuery("unknown:data:here");
      await routeCallback(env, cb);
      const { sendMessage } = await import("../../src/lib/telegram.js");
      // Last call should be the unknown callback message
      const calls = sendMessage.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[2]).toContain("این گزینه دیگر معتبر نیست");
    });

    it("always answers the callback query", async () => {
      const cb = createMockCallbackQuery("menu:main");
      await routeCallback(env, cb);
      const { answerCallbackQuery } = await import("../../src/lib/telegram.js");
      expect(answerCallbackQuery).toHaveBeenCalledWith(env, "cb-1");
    });
  });
});
