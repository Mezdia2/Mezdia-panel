import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  startDeploy,
  handleLabelMessage,
  listDeploymentsScreen,
  showDeploymentDetail,
  showStats,
  showCreds,
  showLogs,
  pauseDeployment,
  resumeDeployment,
  resetTraffic,
  updateWorker,
  confirmDeleteDeploymentScreen,
  deleteDeploymentConfirmed,
} from "../../src/handlers/deployments.js";
import { createMockEnv } from "../helpers.js";

vi.mock("../../src/lib/telegram.js", () => ({
  sendMessage: vi.fn(async () => ({ ok: true, result: { message_id: 99 } })),
  editMessageText: vi.fn(async () => ({ ok: true })),
  answerCallbackQuery: vi.fn(async () => ({ ok: true })),
  escapeHtml: vi.fn((s) => s),
  code: vi.fn((s) => `<code>${s}</code>`),
  kb: vi.fn((rows) => ({ inline_keyboard: rows })),
  btn: vi.fn((text, data) => ({ text, callback_data: data })),
}));

vi.mock("../../src/lib/provision.js", () => ({
  deployNewPanel: vi.fn(async () => ({
    scriptName: "mz-new",
    databaseId: "db-new",
    subdomain: "test-sub",
    workerUrl: "https://mz-new.test-sub.workers.dev",
    apiRoute: "abc123",
    masterKey: "pass123",
    apiKey: "key456",
    deviceId: "device-789",
    subscriptionUrl: "https://mz-new.test-sub.workers.dev/abc123",
    dashboardUrl: "https://mz-new.test-sub.workers.dev/abc123/dash",
  })),
  redeployPanel: vi.fn(async () => {}),
  destroyPanel: vi.fn(async () => {}),
  callPanelApi: vi.fn(async () => ({
    success: true,
    stats: {
      traffic: { totalGB: 1.5, dailyGB: 0.3 },
      account: { status: "active" },
      system: { activeConnections: 5, uptimeSeconds: 3600 },
    },
    logs: [{ ts: "2024-01-15T10:00:00Z", type: "Auth", detail: "Login" }],
  })),
}));

describe("deployments.js", () => {
  let env;

  beforeEach(() => {
    env = createMockEnv();
    vi.clearAllMocks();
  });

  describe("startDeploy", () => {
    it("sets session to awaiting_deploy_label", async () => {
      await env.BOT_DB.put(
        "accounts:12345",
        JSON.stringify([{ id: "a1", cfAccountName: "Test", token: "tok" }])
      );
      await startDeploy(env, 12345, 12345, 1, "a1");
      const session = JSON.parse(await env.BOT_DB.get("session:12345"));
      expect(session.state).toBe("awaiting_deploy_label");
      expect(session.data.accountId).toBe("a1");
    });

    it("shows not found for missing account", async () => {
      await startDeploy(env, 12345, 12345, 1, "nonexistent");
      const { editMessageText } = await import("../../src/lib/telegram.js");
      const text = editMessageText.mock.calls[0][3];
      expect(text).toContain("یافت نشد");
    });

    it("rejects deploy when account already has a worker", async () => {
      await env.BOT_DB.put(
        "accounts:12345",
        JSON.stringify([{ id: "a1", cfAccountName: "Test", token: "tok" }])
      );
      await env.BOT_DB.put(
        "deployments:12345",
        JSON.stringify([{ id: "d1", accountId: "a1", scriptName: "mz-1" }])
      );
      await startDeploy(env, 12345, 12345, 1, "a1");
      const { sendMessage } = await import("../../src/lib/telegram.js");
      const text = sendMessage.mock.calls[0][2];
      expect(text).toContain("هر حساب کلادفلر فقط");
    });
  });

  describe("handleLabelMessage", () => {
    it("deploys with provided label", async () => {
      await env.BOT_DB.put(
        "accounts:12345",
        JSON.stringify([{ id: "a1", cfAccountName: "Test", token: "tok" }])
      );
      await env.BOT_DB.put(
        "session:12345",
        JSON.stringify({
          state: "awaiting_deploy_label",
          data: { accountId: "a1" },
        })
      );
      await handleLabelMessage(env, 12345, 12345, "My Panel", {
        state: "awaiting_deploy_label",
        data: { accountId: "a1" },
      });
      // Session should be cleared
      const session = await env.BOT_DB.get("session:12345");
      expect(session).toBeNull();
      // Deployment should be saved
      const deps = JSON.parse(await env.BOT_DB.get("deployments:12345"));
      expect(deps).toHaveLength(1);
      expect(deps[0].label).toBe("My Panel");
    });

    it("deploys with empty label on /skip", async () => {
      await env.BOT_DB.put(
        "accounts:12345",
        JSON.stringify([{ id: "a1", cfAccountName: "Test", token: "tok" }])
      );
      await handleLabelMessage(env, 12345, 12345, "/skip", {
        state: "awaiting_deploy_label",
        data: { accountId: "a1" },
      });
      const deps = JSON.parse(await env.BOT_DB.get("deployments:12345"));
      expect(deps[0].label).toBe("");
    });

    it("truncates label to 60 chars", async () => {
      await env.BOT_DB.put(
        "accounts:12345",
        JSON.stringify([{ id: "a1", cfAccountName: "Test", token: "tok" }])
      );
      const longLabel = "A".repeat(100);
      await handleLabelMessage(env, 12345, 12345, longLabel, {
        state: "awaiting_deploy_label",
        data: { accountId: "a1" },
      });
      const deps = JSON.parse(await env.BOT_DB.get("deployments:12345"));
      expect(deps[0].label).toHaveLength(60);
    });

    it("shows not found for missing account", async () => {
      await handleLabelMessage(env, 12345, 12345, "test", {
        state: "awaiting_deploy_label",
        data: { accountId: "nonexistent" },
      });
      const { sendMessage } = await import("../../src/lib/telegram.js");
      const text = sendMessage.mock.calls[0][2];
      expect(text).toContain("یافت نشد");
    });
  });

  describe("listDeploymentsScreen", () => {
    it("shows empty message when no deployments", async () => {
      await listDeploymentsScreen(env, 12345, 12345, 1, "a1");
      const { editMessageText } = await import("../../src/lib/telegram.js");
      const text = editMessageText.mock.calls[0][3];
      expect(text).toContain("هیچ ورکری");
    });

    it("shows header when deployments exist", async () => {
      await env.BOT_DB.put(
        "deployments:12345",
        JSON.stringify([{ id: "d1", accountId: "a1", scriptName: "mz-1" }])
      );
      await listDeploymentsScreen(env, 12345, 12345, 1, "a1");
      const { editMessageText } = await import("../../src/lib/telegram.js");
      const text = editMessageText.mock.calls[0][3];
      expect(text).toContain("ورکرهای این حساب");
    });
  });

  describe("showDeploymentDetail", () => {
    it("shows deployment info", async () => {
      await env.BOT_DB.put(
        "deployments:12345",
        JSON.stringify([
          { id: "d1", accountId: "a1", label: "Panel 1", scriptName: "mz-1", createdAt: Date.now() },
        ])
      );
      await showDeploymentDetail(env, 12345, 12345, 1, "d1");
      const { editMessageText } = await import("../../src/lib/telegram.js");
      const text = editMessageText.mock.calls[0][3];
      expect(text).toContain("Panel 1");
    });

    it("shows not found for missing deployment", async () => {
      await showDeploymentDetail(env, 12345, 12345, 1, "nonexistent");
      const { editMessageText } = await import("../../src/lib/telegram.js");
      const text = editMessageText.mock.calls[0][3];
      expect(text).toContain("یافت نشد");
    });
  });

  describe("showStats", () => {
    it("fetches and displays stats", async () => {
      await env.BOT_DB.put(
        "deployments:12345",
        JSON.stringify([
          { id: "d1", accountId: "a1", label: "Panel", workerUrl: "https://test.workers.dev", apiRoute: "abc", apiKey: "key" },
        ])
      );
      await showStats(env, 12345, 12345, 1, "d1");
      const { editMessageText } = await import("../../src/lib/telegram.js");
      // Should be called at least twice (fetching + result)
      expect(editMessageText.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("showCreds", () => {
    it("displays credentials", async () => {
      await env.BOT_DB.put(
        "deployments:12345",
        JSON.stringify([
          {
            id: "d1",
            accountId: "a1",
            label: "Panel",
            subscriptionUrl: "https://sub",
            dashboardUrl: "https://dash",
            masterKey: "pass",
            apiKey: "key",
          },
        ])
      );
      await showCreds(env, 12345, 12345, 1, "d1");
      const { editMessageText } = await import("../../src/lib/telegram.js");
      const text = editMessageText.mock.calls[0][3];
      expect(text).toContain("pass");
      expect(text).toContain("key");
    });
  });

  describe("pauseDeployment", () => {
    it("pauses deployment and updates status", async () => {
      await env.BOT_DB.put(
        "deployments:12345",
        JSON.stringify([
          { id: "d1", accountId: "a1", label: "Panel", workerUrl: "https://test.workers.dev", apiRoute: "abc", apiKey: "key" },
        ])
      );
      await pauseDeployment(env, 12345, 12345, 1, "d1");
      const deps = JSON.parse(await env.BOT_DB.get("deployments:12345"));
      expect(deps[0].status).toBe("paused");
    });
  });

  describe("resumeDeployment", () => {
    it("resumes deployment and updates status", async () => {
      await env.BOT_DB.put(
        "deployments:12345",
        JSON.stringify([
          { id: "d1", accountId: "a1", label: "Panel", status: "paused", workerUrl: "https://test.workers.dev", apiRoute: "abc", apiKey: "key" },
        ])
      );
      await resumeDeployment(env, 12345, 12345, 1, "d1");
      const deps = JSON.parse(await env.BOT_DB.get("deployments:12345"));
      expect(deps[0].status).toBe("active");
    });
  });

  describe("resetTraffic", () => {
    it("resets traffic counters", async () => {
      await env.BOT_DB.put(
        "deployments:12345",
        JSON.stringify([
          { id: "d1", accountId: "a1", workerUrl: "https://test.workers.dev", apiRoute: "abc", apiKey: "key" },
        ])
      );
      await resetTraffic(env, 12345, 12345, 1, "d1");
      const { editMessageText } = await import("../../src/lib/telegram.js");
      const text = editMessageText.mock.calls[editMessageText.mock.calls.length - 1][3];
      expect(text).toContain("بازنشانی");
    });
  });

  describe("updateWorker", () => {
    it("redeploys the worker", async () => {
      await env.BOT_DB.put(
        "accounts:12345",
        JSON.stringify([{ id: "a1", cfAccountName: "Test", token: "tok" }])
      );
      await env.BOT_DB.put(
        "deployments:12345",
        JSON.stringify([
          { id: "d1", accountId: "a1", scriptName: "mz-1", databaseId: "db-1", apiKey: "key" },
        ])
      );
      await updateWorker(env, 12345, 12345, 1, "d1");
      const { editMessageText } = await import("../../src/lib/telegram.js");
      const text = editMessageText.mock.calls[editMessageText.mock.calls.length - 1][3];
      expect(text).toContain("بارگذاری شد");
    });
  });

  describe("confirmDeleteDeploymentScreen", () => {
    it("shows delete confirmation", async () => {
      await env.BOT_DB.put(
        "deployments:12345",
        JSON.stringify([{ id: "d1", accountId: "a1", label: "Important" }])
      );
      await confirmDeleteDeploymentScreen(env, 12345, 12345, 1, "d1");
      const { editMessageText } = await import("../../src/lib/telegram.js");
      const text = editMessageText.mock.calls[0][3];
      expect(text).toContain("Important");
      expect(text).toContain("غیرقابل بازگشت");
    });
  });

  describe("deleteDeploymentConfirmed", () => {
    it("removes deployment and destroys panel", async () => {
      await env.BOT_DB.put(
        "accounts:12345",
        JSON.stringify([{ id: "a1", cfAccountName: "Test", token: "tok" }])
      );
      await env.BOT_DB.put(
        "deployments:12345",
        JSON.stringify([
          { id: "d1", accountId: "a1", scriptName: "mz-1", databaseId: "db-1" },
        ])
      );
      await deleteDeploymentConfirmed(env, 12345, 12345, 1, "d1", "cb-1");
      const deps = JSON.parse(await env.BOT_DB.get("deployments:12345"));
      expect(deps).toHaveLength(0);
    });

    it("removes deployment even if destroyPanel fails", async () => {
      const { destroyPanel } = await import("../../src/lib/provision.js");
      destroyPanel.mockRejectedValue(new Error("CF API error"));
      await env.BOT_DB.put(
        "accounts:12345",
        JSON.stringify([{ id: "a1", token: "tok" }])
      );
      await env.BOT_DB.put(
        "deployments:12345",
        JSON.stringify([{ id: "d1", accountId: "a1", scriptName: "mz-1", databaseId: "db-1" }])
      );
      await deleteDeploymentConfirmed(env, 12345, 12345, 1, "d1", "cb-1");
      const deps = JSON.parse(await env.BOT_DB.get("deployments:12345"));
      expect(deps).toHaveLength(0);
    });
  });
});
