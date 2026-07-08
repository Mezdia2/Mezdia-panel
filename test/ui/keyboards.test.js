import { describe, it, expect } from "vitest";
import {
  mainMenuKeyboard,
  backToMainKeyboard,
  cancelKeyboard,
  askTokenKeyboard,
  pickCfAccountKeyboard,
  accountsListKeyboard,
  accountDetailKeyboard,
  confirmRemoveAccountKeyboard,
  deploymentsListKeyboard,
  deploymentDetailKeyboard,
  backToDeploymentKeyboard,
  confirmDeleteDeploymentKeyboard,
} from "../../src/ui/keyboards.js";

describe("keyboards.js", () => {
  describe("mainMenuKeyboard", () => {
    it("has 3 rows: add account, accounts list, help", () => {
      const kb = mainMenuKeyboard();
      expect(kb.inline_keyboard).toHaveLength(3);
    });

    it("first button is 'add cloudflare account'", () => {
      const kb = mainMenuKeyboard();
      expect(kb.inline_keyboard[0][0].callback_data).toBe("acct:add");
    });

    it("second button navigates to accounts", () => {
      const kb = mainMenuKeyboard();
      expect(kb.inline_keyboard[1][0].callback_data).toBe("menu:accounts");
    });

    it("third button navigates to help", () => {
      const kb = mainMenuKeyboard();
      expect(kb.inline_keyboard[2][0].callback_data).toBe("menu:help");
    });
  });

  describe("backToMainKeyboard", () => {
    it("has one button going to menu:main", () => {
      const kb = backToMainKeyboard();
      expect(kb.inline_keyboard[0][0].callback_data).toBe("menu:main");
    });
  });

  describe("cancelKeyboard", () => {
    it("has cancel button going to menu:main", () => {
      const kb = cancelKeyboard();
      expect(kb.inline_keyboard[0][0].callback_data).toBe("menu:main");
    });
  });

  describe("askTokenKeyboard", () => {
    it("has URL button to Cloudflare API tokens page", () => {
      const kb = askTokenKeyboard();
      expect(kb.inline_keyboard[0][0].url).toContain("dash.cloudflare.com/profile/api-tokens");
    });

    it("has cancel button", () => {
      const kb = askTokenKeyboard();
      expect(kb.inline_keyboard[1][0].callback_data).toBe("menu:main");
    });
  });

  describe("pickCfAccountKeyboard", () => {
    it("creates a button for each candidate", () => {
      const candidates = [
        { id: "c1", name: "Account A" },
        { id: "c2", name: "Account B" },
      ];
      const kb = pickCfAccountKeyboard(candidates);
      expect(kb.inline_keyboard).toHaveLength(3); // 2 candidates + cancel
      expect(kb.inline_keyboard[0][0].callback_data).toBe("acct:pick:c1");
      expect(kb.inline_keyboard[1][0].callback_data).toBe("acct:pick:c2");
    });

    it("appends cancel button", () => {
      const kb = pickCfAccountKeyboard([{ id: "c1", name: "A" }]);
      expect(kb.inline_keyboard[1][0].callback_data).toBe("menu:main");
    });
  });

  describe("accountsListKeyboard", () => {
    it("creates a button for each account", () => {
      const accounts = [
        { id: "a1", cfAccountName: "Acc 1" },
        { id: "a2", cfAccountName: "Acc 2" },
      ];
      const kb = accountsListKeyboard(accounts);
      expect(kb.inline_keyboard[0][0].callback_data).toBe("acct:view:a1");
      expect(kb.inline_keyboard[1][0].callback_data).toBe("acct:view:a2");
    });

    it("appends 'add new' and 'back' buttons", () => {
      const kb = accountsListKeyboard([]);
      const lastRow = kb.inline_keyboard[kb.inline_keyboard.length - 1];
      expect(lastRow[0].callback_data).toBe("menu:main");
      // Add new button should exist
      const addBtn = kb.inline_keyboard.find((row) => row[0].callback_data === "acct:add");
      expect(addBtn).toBeDefined();
    });
  });

  describe("accountDetailKeyboard", () => {
    it("has deploy, deployments list, remove, and back buttons", () => {
      const kb = accountDetailKeyboard("a1");
      const flatBtns = kb.inline_keyboard.flat();
      expect(flatBtns.some((b) => b.callback_data === "acct:deploy:a1")).toBe(true);
      expect(flatBtns.some((b) => b.callback_data === "acct:deployments:a1")).toBe(true);
      expect(flatBtns.some((b) => b.callback_data === "acct:remove:a1")).toBe(true);
      expect(flatBtns.some((b) => b.callback_data === "menu:accounts")).toBe(true);
    });
  });

  describe("confirmRemoveAccountKeyboard", () => {
    it("has confirm and cancel buttons", () => {
      const kb = confirmRemoveAccountKeyboard("a1");
      expect(kb.inline_keyboard).toHaveLength(2);
      expect(kb.inline_keyboard[0][0].callback_data).toBe("acct:remove_confirm:a1");
      expect(kb.inline_keyboard[1][0].callback_data).toBe("acct:view:a1");
    });
  });

  describe("deploymentsListKeyboard", () => {
    it("creates a button for each deployment", () => {
      const deployments = [
        { id: "d1", label: "Panel 1", scriptName: "mz-1" },
        { id: "d2", scriptName: "mz-2" },
      ];
      const kb = deploymentsListKeyboard(deployments, "a1");
      expect(kb.inline_keyboard[0][0].callback_data).toBe("dep:view:d1");
      expect(kb.inline_keyboard[1][0].callback_data).toBe("dep:view:d2");
      // Uses label if present, scriptName otherwise
      expect(kb.inline_keyboard[0][0].text).toContain("Panel 1");
      expect(kb.inline_keyboard[1][0].text).toContain("mz-2");
    });

    it("appends deploy and back buttons", () => {
      const kb = deploymentsListKeyboard([], "a1");
      const flatBtns = kb.inline_keyboard.flat();
      expect(flatBtns.some((b) => b.callback_data === "acct:deploy:a1")).toBe(true);
      expect(flatBtns.some((b) => b.callback_data === "acct:view:a1")).toBe(true);
    });
  });

  describe("deploymentDetailKeyboard", () => {
    it("shows pause button when status is active", () => {
      const dep = { id: "d1", accountId: "a1", status: "active" };
      const kb = deploymentDetailKeyboard(dep);
      const flatBtns = kb.inline_keyboard.flat();
      expect(flatBtns.some((b) => b.callback_data === "dep:pause:d1")).toBe(true);
      expect(flatBtns.some((b) => b.callback_data === "dep:resume:d1")).toBe(false);
    });

    it("shows resume button when status is paused", () => {
      const dep = { id: "d1", accountId: "a1", status: "paused" };
      const kb = deploymentDetailKeyboard(dep);
      const flatBtns = kb.inline_keyboard.flat();
      expect(flatBtns.some((b) => b.callback_data === "dep:resume:d1")).toBe(true);
      expect(flatBtns.some((b) => b.callback_data === "dep:pause:d1")).toBe(false);
    });

    it("includes stats, creds, logs, reset, update, delete buttons", () => {
      const dep = { id: "d1", accountId: "a1", status: "active" };
      const kb = deploymentDetailKeyboard(dep);
      const flatBtns = kb.inline_keyboard.flat();
      expect(flatBtns.some((b) => b.callback_data === "dep:stats:d1")).toBe(true);
      expect(flatBtns.some((b) => b.callback_data === "dep:creds:d1")).toBe(true);
      expect(flatBtns.some((b) => b.callback_data === "dep:logs:d1")).toBe(true);
      expect(flatBtns.some((b) => b.callback_data === "dep:reset:d1")).toBe(true);
      expect(flatBtns.some((b) => b.callback_data === "dep:update:d1")).toBe(true);
      expect(flatBtns.some((b) => b.callback_data === "dep:delete:d1")).toBe(true);
    });
  });

  describe("backToDeploymentKeyboard", () => {
    it("has back button pointing to deployment", () => {
      const kb = backToDeploymentKeyboard("d1");
      expect(kb.inline_keyboard[0][0].callback_data).toBe("dep:view:d1");
    });
  });

  describe("confirmDeleteDeploymentKeyboard", () => {
    it("has confirm and cancel buttons", () => {
      const dep = { id: "d1" };
      const kb = confirmDeleteDeploymentKeyboard(dep);
      expect(kb.inline_keyboard[0][0].callback_data).toBe("dep:delete_confirm:d1");
      expect(kb.inline_keyboard[1][0].callback_data).toBe("dep:view:d1");
    });
  });
});
