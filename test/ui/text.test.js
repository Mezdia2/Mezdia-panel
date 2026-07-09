import { describe, it, expect } from "vitest";
import { formatDate, T } from "../../src/ui/text.js";

describe("text.js", () => {
  describe("formatDate", () => {
    it("formats a timestamp correctly", () => {
      // 2024-01-15 10:30:00 UTC
      const ts = Date.UTC(2024, 0, 15, 10, 30, 0);
      const result = formatDate(ts);
      expect(result).toMatch(/2024-01-15/);
    });

    it("returns '-' for falsy values", () => {
      expect(formatDate(0)).toBe("-");
      expect(formatDate(null)).toBe("-");
      expect(formatDate(undefined)).toBe("-");
    });

    it("pads single digits", () => {
      // Use a local timestamp to match formatDate's behavior (uses local time via new Date(ts))
      const d = new Date(2024, 0, 5, 9, 5, 0);
      const result = formatDate(d.getTime());
      expect(result).toContain("01-05");
      expect(result).toMatch(/09:05|0[0-9]:05/);
    });
  });

  describe("T (text constants)", () => {
    it("has welcome message", () => {
      expect(T.welcome).toContain("Mezdia");
      expect(T.welcome).toContain("دیپلوی خودکار");
    });

    it("has help text with commands", () => {
      expect(T.help).toContain("/start");
      expect(T.help).toContain("/help");
      expect(T.help).toContain("/cancel");
    });

    it("has askToken instruction", () => {
      expect(T.askToken).toContain("API Token");
    });

    it("has tokenInvalid error", () => {
      expect(T.tokenInvalid).toContain("نامعتبر");
    });

    it("has deploying message", () => {
      expect(T.deploying).toContain("دیپلوی");
    });

    it("deploySuccess is a function", () => {
      const dep = {
        label: "Test Panel",
        scriptName: "mz-test",
        subscriptionUrl: "https://test.workers.dev/abc",
        dashboardUrl: "https://test.workers.dev/abc/dash",
        masterKey: "secret123",
        apiKey: "key456",
        deviceId: "device-789",
      };
      const text = T.deploySuccess(dep);
      expect(text).toContain("دیپلوی موفق");
      expect(text).toContain("Test Panel");
      expect(text).toContain("secret123");
      expect(text).toContain("key456");
    });

    it("deployFailed is a function", () => {
      const text = T.deployFailed("timeout");
      expect(text).toContain("ناموفق");
      expect(text).toContain("timeout");
    });

    it("deploymentDetail is a function", () => {
      const dep = { label: "Panel 1", scriptName: "mz-1", createdAt: Date.now() };
      const text = T.deploymentDetail(dep);
      expect(text).toContain("Panel 1");
      expect(text).toContain("mz-1");
    });

    it("statsResult formats stats correctly", () => {
      const dep = { label: "Panel" };
      const stats = {
        stats: {
          traffic: { totalGB: 1.5, dailyGB: 0.3 },
          account: { status: "active" },
          system: { activeConnections: 5, uptimeSeconds: 3600 },
        },
      };
      const text = T.statsResult(dep, stats);
      expect(text).toContain("فعال");
      expect(text).toContain("1.5");
      expect(text).toContain("5");
    });

    it("statsResult shows paused status", () => {
      const dep = { label: "Panel" };
      const stats = {
        stats: {
          traffic: {},
          account: { status: "paused" },
          system: { activeConnections: 0, uptimeSeconds: 0 },
        },
      };
      const text = T.statsResult(dep, stats);
      expect(text).toContain("متوقف");
    });

    it("logsResult handles empty logs", () => {
      const dep = { label: "Panel" };
      const text = T.logsResult(dep, []);
      expect(text).toContain("گزارشی ثبت نشده");
    });

    it("logsResult formats log entries", () => {
      const dep = { label: "Panel" };
      const logs = [
        { ts: "2024-01-15T10:00:00Z", type: "Auth", detail: "Login from 1.2.3.4" },
      ];
      const text = T.logsResult(dep, logs);
      expect(text).toContain("Auth");
      expect(text).toContain("Login from 1.2.3.4");
    });

    it("showCreds displays all credentials", () => {
      const dep = {
        label: "Test",
        subscriptionUrl: "https://sub",
        dashboardUrl: "https://dash",
        masterKey: "pass",
        apiKey: "key",
      };
      const text = T.showCreds(dep);
      expect(text).toContain("https://sub");
      expect(text).toContain("https://dash");
      expect(text).toContain("pass");
      expect(text).toContain("key");
    });

    it("confirmRemoveAccount shows warning with deployments", () => {
      const acc = { cfAccountName: "My Account" };
      const text = T.confirmRemoveAccount(acc, 3);
      expect(text).toContain("3 ورکر");
    });

    it("confirmRemoveAccount shows no-deployment message", () => {
      const acc = { cfAccountName: "My Account" };
      const text = T.confirmRemoveAccount(acc, 0);
      expect(text).toContain("My Account");
      expect(text).toContain("حذف شود");
    });

    it("accountAdded includes account name", () => {
      const text = T.accountAdded("Production");
      expect(text).toContain("Production");
      expect(text).toContain("اضافه شد");
    });

    it("accountDetail shows account info", () => {
      const acc = { cfAccountName: "My CF", cfAccountId: "cf-123" };
      const text = T.accountDetail(acc, 5);
      expect(text).toContain("My CF");
      expect(text).toContain("cf-123");
      expect(text).toContain("5");
    });

    it("confirmDeleteDeployment shows warning", () => {
      const dep = { label: "Important", scriptName: "mz-imp" };
      const text = T.confirmDeleteDeployment(dep);
      expect(text).toContain("Important");
      expect(text).toContain("غیرقابل بازگشت");
    });
  });
});
