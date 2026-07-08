import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listAccounts,
  getAccountSubdomain,
  createAccountSubdomain,
  createD1Database,
  deleteD1Database,
  uploadWorkerScript,
  enableWorkersDevRoute,
  deleteWorkerScript,
  CloudflareApiError,
} from "../../src/lib/cloudflare.js";

describe("cloudflare.js", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ success: true, result: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listAccounts", () => {
    it("returns formatted account list", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          new Response(
            JSON.stringify({
              success: true,
              result: [
                { id: "acc1", name: "Account 1" },
                { id: "acc2", name: "Account 2" },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
      );
      const accounts = await listAccounts("test-token");
      expect(accounts).toEqual([
        { id: "acc1", name: "Account 1" },
        { id: "acc2", name: "Account 2" },
      ]);
    });

    it("sends correct authorization header", async () => {
      await listAccounts("my-api-token");
      const [, opts] = fetch.mock.calls[0];
      expect(opts.headers.Authorization).toBe("Bearer my-api-token");
    });

    it("throws CloudflareApiError on failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          new Response(
            JSON.stringify({
              success: false,
              errors: [{ code: 10000, message: "Authentication error" }],
            }),
            { status: 401, headers: { "Content-Type": "application/json" } }
          )
        )
      );
      await expect(listAccounts("bad-token")).rejects.toThrow(CloudflareApiError);
    });
  });

  describe("getAccountSubdomain", () => {
    it("returns the subdomain string", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          new Response(
            JSON.stringify({ success: true, result: { subdomain: "my-sub" } }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
      );
      const sub = await getAccountSubdomain("tok", "acc1");
      expect(sub).toBe("my-sub");
    });

    it("returns null on error (subdomain may not exist)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new Error("not found");
        })
      );
      const sub = await getAccountSubdomain("tok", "acc1");
      expect(sub).toBeNull();
    });
  });

  describe("createAccountSubdomain", () => {
    it("sends PUT request with subdomain", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          new Response(
            JSON.stringify({ success: true, result: { subdomain: "new-sub" } }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
      );
      const result = await createAccountSubdomain("tok", "acc1", "new-sub");
      expect(result).toBe("new-sub");
      const [url, opts] = fetch.mock.calls[0];
      expect(url).toContain("/accounts/acc1/workers/subdomain");
      expect(opts.method).toBe("PUT");
    });
  });

  describe("createD1Database", () => {
    it("creates database and returns UUID", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          new Response(
            JSON.stringify({ success: true, result: { uuid: "db-uuid-123" } }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
      );
      const uuid = await createD1Database("tok", "acc1", "my-db");
      expect(uuid).toBe("db-uuid-123");
      const [, opts] = fetch.mock.calls[0];
      expect(opts.method).toBe("POST");
      const body = JSON.parse(opts.body);
      expect(body.name).toBe("my-db");
    });
  });

  describe("deleteD1Database", () => {
    it("sends DELETE request", async () => {
      await deleteD1Database("tok", "acc1", "db-123");
      const [url, opts] = fetch.mock.calls[0];
      expect(url).toContain("/d1/database/db-123");
      expect(opts.method).toBe("DELETE");
    });

    it("does not throw on error (best-effort cleanup)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new Error("already deleted");
        })
      );
      await expect(deleteD1Database("tok", "acc1", "db-123")).resolves.toBeUndefined();
    });
  });

  describe("uploadWorkerScript", () => {
    it("uploads script via PUT with FormData", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          new Response(
            JSON.stringify({ success: true, result: { id: "script-1" } }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
      );
      const bindings = [{ type: "d1", name: "IOT_DB", id: "db-1" }];
      const result = await uploadWorkerScript("tok", "acc1", "mz-test", "source code", bindings, "2024-09-23");
      expect(result).toEqual({ id: "script-1" });
      const [url, opts] = fetch.mock.calls[0];
      expect(url).toContain("/workers/scripts/mz-test");
      expect(opts.method).toBe("PUT");
    });

    it("throws CloudflareApiError on upload failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          new Response(
            JSON.stringify({
              success: false,
              errors: [{ message: "Script name already exists" }],
            }),
            { status: 409, headers: { "Content-Type": "application/json" } }
          )
        )
      );
      await expect(
        uploadWorkerScript("tok", "acc1", "mz-dup", "src", [], "2024-09-23")
      ).rejects.toThrow("Script name already exists");
    });
  });

  describe("enableWorkersDevRoute", () => {
    it("sends POST to enable route", async () => {
      await enableWorkersDevRoute("tok", "acc1", "mz-test");
      const [url, opts] = fetch.mock.calls[0];
      expect(url).toContain("/workers/scripts/mz-test/subdomain");
      expect(opts.method).toBe("POST");
      const body = JSON.parse(opts.body);
      expect(body.enabled).toBe(true);
      expect(body.previews_enabled).toBe(false);
    });
  });

  describe("deleteWorkerScript", () => {
    it("sends DELETE request", async () => {
      await deleteWorkerScript("tok", "acc1", "mz-test");
      const [url, opts] = fetch.mock.calls[0];
      expect(url).toContain("/workers/scripts/mz-test");
      expect(opts.method).toBe("DELETE");
    });

    it("does not throw on error (best-effort cleanup)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          throw new Error("not found");
        })
      );
      await expect(deleteWorkerScript("tok", "acc1", "mz-test")).resolves.toBeUndefined();
    });
  });

  describe("CloudflareApiError", () => {
    it("stores message, status, and errors", () => {
      const err = new CloudflareApiError("test error", 400, [{ code: 1 }]);
      expect(err.message).toBe("test error");
      expect(err.status).toBe(400);
      expect(err.errors).toEqual([{ code: 1 }]);
      expect(err).toBeInstanceOf(Error);
    });
  });
});
