import { describe, it, expect } from "vitest";
import {
  mainMenuKb,
  cancelKb,
  accountsListKb,
  accountDetailKb,
  confirmRemoveAccountKb,
  deploymentsListKb,
  deploymentDetailKb,
  confirmDeleteDeploymentKb,
} from "../../src/ui/keyboards.js";

describe("keyboards.js", () => {
  describe("mainMenuKb", () => {
    it("has 3 rows: add account, accounts list, help", () => {
      const kb = mainMenuKb();
      expect(kb.keyboard).toHaveLength(3);
    });

    it("first button is 'add cloudflare account'", () => {
      const kb = mainMenuKb();
      expect(kb.keyboard[0][0].text).toBe("➕ افزودن حساب کلادفلر");
    });

    it("second button navigates to accounts", () => {
      const kb = mainMenuKb();
      expect(kb.keyboard[1][0].text).toBe("☁️ حساب‌های من");
    });

    it("third button navigates to help", () => {
      const kb = mainMenuKb();
      expect(kb.keyboard[2][0].text).toBe("❓ راهنما");
    });
  });

  describe("cancelKb", () => {
    it("has one cancel button", () => {
      const kb = cancelKb();
      expect(kb.keyboard).toHaveLength(1);
      expect(kb.keyboard[0][0].text).toBe("✖️ لغو");
    });
  });

  describe("accountsListKb", () => {
    it("creates a button for each account with ☁️ prefix", () => {
      const accounts = [
        { id: "a1", cfAccountName: "Acc 1" },
        { id: "a2", cfAccountName: "Acc 2" },
      ];
      const kb = accountsListKb(accounts);
      expect(kb.keyboard[0][0].text).toBe("☁️ Acc 1");
      expect(kb.keyboard[1][0].text).toBe("☁️ Acc 2");
    });

    it("appends 'add new' and 'back' buttons", () => {
      const kb = accountsListKb([]);
      const texts = kb.keyboard.flat().map((b) => b.text);
      expect(texts).toContain("➕ افزودن حساب جدید");
      expect(texts).toContain("🔙 بازگشت به منوی اصلی");
    });
  });

  describe("accountDetailKb", () => {
    it("shows deploy button when hasWorker is false", () => {
      const kb = accountDetailKb(false);
      const texts = kb.keyboard.flat().map((b) => b.text);
      expect(texts).toContain("🚀 دیپلوی ورکر جدید");
      expect(texts).toContain("📋 ورکرهای این حساب");
      expect(texts).toContain("🗑 حذف این حساب");
      expect(texts).toContain("🔙 بازگشت به لیست حساب‌ها");
    });

    it("hides deploy button when hasWorker is true", () => {
      const kb = accountDetailKb(true);
      const texts = kb.keyboard.flat().map((b) => b.text);
      expect(texts).not.toContain("🚀 دیپلوی ورکر جدید");
      expect(texts).toContain("📋 ورکرهای این حساب");
    });
  });

  describe("confirmRemoveAccountKb", () => {
    it("has confirm and cancel buttons", () => {
      const kb = confirmRemoveAccountKb();
      expect(kb.keyboard).toHaveLength(2);
      expect(kb.keyboard[0][0].text).toBe("✅ بله، حذف کن");
      expect(kb.keyboard[1][0].text).toBe("✖️ انصراف");
    });
  });

  describe("deploymentsListKb", () => {
    it("creates a button for each deployment with ⚙️ prefix", () => {
      const deployments = [
        { id: "d1", label: "Panel 1", scriptName: "mz-1" },
        { id: "d2", scriptName: "mz-2" },
      ];
      const kb = deploymentsListKb(deployments);
      expect(kb.keyboard[0][0].text).toBe("⚙️ Panel 1");
      expect(kb.keyboard[1][0].text).toBe("⚙️ mz-2");
    });

    it("omits deploy button when deployments exist", () => {
      const deployments = [
        { id: "d1", label: "Panel 1", scriptName: "mz-1" },
      ];
      const kb = deploymentsListKb(deployments);
      const texts = kb.keyboard.flat().map((b) => b.text);
      expect(texts).not.toContain("🚀 دیپلوی ورکر جدید");
      expect(texts).toContain("🔙 بازگشت به حساب");
    });

    it("shows deploy button when no deployments", () => {
      const kb = deploymentsListKb([]);
      const texts = kb.keyboard.flat().map((b) => b.text);
      expect(texts).toContain("🚀 دیپلوی ورکر جدید");
      expect(texts).toContain("🔙 بازگشت به حساب");
    });
  });

  describe("deploymentDetailKb", () => {
    it("shows pause button when status is active", () => {
      const dep = { id: "d1", accountId: "a1", status: "active" };
      const kb = deploymentDetailKb(dep);
      const texts = kb.keyboard.flat().map((b) => b.text);
      expect(texts).toContain("⏸ توقف");
      expect(texts).not.toContain("▶️ فعال‌سازی");
    });

    it("shows resume button when status is paused", () => {
      const dep = { id: "d1", accountId: "a1", status: "paused" };
      const kb = deploymentDetailKb(dep);
      const texts = kb.keyboard.flat().map((b) => b.text);
      expect(texts).toContain("▶️ فعال‌سازی");
      expect(texts).not.toContain("⏸ توقف");
    });

    it("includes stats, creds, logs, reset, update, delete buttons", () => {
      const dep = { id: "d1", accountId: "a1", status: "active" };
      const kb = deploymentDetailKb(dep);
      const texts = kb.keyboard.flat().map((b) => b.text);
      expect(texts).toContain("📊 وضعیت و مصرف");
      expect(texts).toContain("🔐 اطلاعات دسترسی");
      expect(texts).toContain("📜 گزارش‌ها");
      expect(texts).toContain("🔁 بازنشانی ترافیک");
      expect(texts).toContain("🔄 بروزرسانی ورکر");
      expect(texts).toContain("🗑 حذف ورکر");
    });
  });

  describe("confirmDeleteDeploymentKb", () => {
    it("has confirm and cancel buttons", () => {
      const kb = confirmDeleteDeploymentKb();
      expect(kb.keyboard[0][0].text).toBe("✅ بله، حذف کن");
      expect(kb.keyboard[1][0].text).toBe("✖️ انصراف");
    });
  });
});
