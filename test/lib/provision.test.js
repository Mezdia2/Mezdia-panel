import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  callPanelApi,
  deployNewPanel,
  redeployPanel,
  destroyPanel,
} from "../../src/lib/provision.js";

vi.mock("../../src/lib/cloudflare.js", () => ({
  createD1Database: vi.fn(async () => "db-uuid-123"),
  deleteD1Database: vi.fn(async () => {}),
  uploadWorkerScript: vi.fn(async () => ({})),
  enableWorkersDevRoute: vi.fn(async () => {}),
  deleteWorkerScript: vi.fn(async () => {}),
  getAccountSubdomain: vi.fn(async () => "test-sub"),
  createAccountSubdomain: vi.fn(async () => "new-sub"),
}));

vi.mock("../../src/lib/ids.js", () => ({
  randomHex: vi.fn(() => "aabbccdd1122334455667788"),
  randomPassword: vi.fn(() => "TestPass123"),
  randomSlug: vi.fn(() => "abcdefghij"),
  workerScriptName: vi.fn(() => "mz-abcdefghij"),
}));

describe("provision.js", () => {
  const mockAccount = {
    token: "cf-api-token",
    cfAccountId: "cf-account-123",
  };

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            success: true,
            account: {
              id: "device-uuid",
              subscriptionUrl: "https://mz-test.sub.workers.dev/abc123",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("callPanelApi", () => {
    it("sends GET request with Bearer auth", async () => {
      const deployment = {
        workerUrl: "https://mz-test.workers.dev",
        apiRoute: "abc123",
        apiKey: "secret-key",
      };
      await callPanelApi(deployment, "/api/stats");
      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, opts] = fetch.mock.calls[0];
      expect(url).toBe("https://mz-test.workers.dev/abc123/api/stats");
      expect(opts.method).toBe("GET");
      expect(opts.headers.Authorization).toBe("Bearer secret-key");
    });

    it("sends POST request with body", async () => {
      const deployment = {
        workerUrl: "https://mz-test.workers.dev",
        apiRoute: "abc123",
        apiKey: "secret-key",
      };
      await callPanelApi(deployment, "/api/config", {
        method: "POST",
        body: { config: { name: "Test" } },
      });
      const [url, opts] = fetch.mock.calls[0];
      expect(opts.method).toBe("POST");
      const body = JSON.parse(opts.body);
      expect(body.config.name).toBe("Test");
    });

    it("retries on failure when retry=true", async () => {
      let callCount = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          callCount++;
          if (callCount < 3) {
            return new Response("error", { status: 502 });
          }
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        })
      );
      const deployment = {
        workerUrl: "https://mz-test.workers.dev",
        apiRoute: "abc123",
        apiKey: "key",
      };
      const result = await callPanelApi(deployment, "/api/stats", { retry: true });
      expect(callCount).toBe(3);
      expect(result.ok).toBe(true);
    });

    it("throws after all retries exhausted", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("error", { status: 502 }))
      );
      const deployment = {
        workerUrl: "https://mz-test.workers.dev",
        apiRoute: "abc123",
        apiKey: "key",
      };
      await expect(
        callPanelApi(deployment, "/api/stats", { retry: true })
      ).rejects.toThrow();
    }, 30000);
  });

  describe("deployNewPanel", () => {
    it("creates D1, uploads script, enables route, bootstraps config", async () => {
      const { createD1Database, uploadWorkerScript, enableWorkersDevRoute } = await import(
        "../../src/lib/cloudflare.js"
      );
      const result = await deployNewPanel(mockAccount, "My Panel");
      expect(createD1Database).toHaveBeenCalledWith(
        "cf-api-token",
        "cf-account-123",
        "mz-abcdefghij-db"
      );
      expect(uploadWorkerScript).toHaveBeenCalled();
      expect(enableWorkersDevRoute).toHaveBeenCalledWith(
        "cf-api-token",
        "cf-account-123",
        "mz-abcdefghij"
      );
      expect(result.scriptName).toBe("mz-abcdefghij");
      expect(result.databaseId).toBe("db-uuid-123");
      expect(result.workerUrl).toBe("https://mz-abcdefghij.test-sub.workers.dev");
      expect(result.apiKey).toBe("aabbccdd1122334455667788");
      expect(result.masterKey).toBe("TestPass123");
    });

    it("uses default label when none provided", async () => {
      const result = await deployNewPanel(mockAccount);
      // The bootstrap call should have name: "Mezdia" (default)
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe("redeployPanel", () => {
    it("re-uploads the script with same bindings", async () => {
      const { uploadWorkerScript, enableWorkersDevRoute } = await import(
        "../../src/lib/cloudflare.js"
      );
      const deployment = {
        scriptName: "mz-existing",
        databaseId: "db-existing",
        apiKey: "existing-key",
      };
      await redeployPanel(mockAccount, deployment);
      expect(uploadWorkerScript).toHaveBeenCalledWith(
        "cf-api-token",
        "cf-account-123",
        "mz-existing",
        expect.any(String), // panelSource
        [
          { type: "d1", name: "IOT_DB", id: "db-existing" },
          { type: "secret_text", name: "MEZDIA_API_KEY", text: "existing-key" },
        ],
        "2024-09-23"
      );
      expect(enableWorkersDevRoute).toHaveBeenCalled();
    });
  });

  describe("destroyPanel", () => {
    it("deletes worker script and D1 database", async () => {
      const { deleteWorkerScript, deleteD1Database } = await import(
        "../../src/lib/cloudflare.js"
      );
      const deployment = {
        scriptName: "mz-to-delete",
        databaseId: "db-to-delete",
      };
      await destroyPanel(mockAccount, deployment);
      expect(deleteWorkerScript).toHaveBeenCalledWith(
        "cf-api-token",
        "cf-account-123",
        "mz-to-delete"
      );
      expect(deleteD1Database).toHaveBeenCalledWith(
        "cf-api-token",
        "cf-account-123",
        "db-to-delete"
      );
    });
  });
});
