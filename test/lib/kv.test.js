import { describe, it, expect, beforeEach } from "vitest";
import {
  ensureUser,
  getAccounts,
  saveAccounts,
  addAccount,
  getAccount,
  removeAccount,
  getDeployments,
  saveDeployments,
  addDeployment,
  getDeployment,
  updateDeployment,
  removeDeployment,
  deploymentsForAccount,
  getSession,
  setSession,
  clearSession,
} from "../../src/lib/kv.js";
import { createMockEnv } from "../helpers.js";

describe("kv.js", () => {
  let env;

  beforeEach(() => {
    env = createMockEnv();
  });

  describe("ensureUser", () => {
    it("creates a new user if none exists", async () => {
      const user = await ensureUser(env, 12345, { firstName: "Ali", username: "ali123" });
      expect(user.tgId).toBe(12345);
      expect(user.firstName).toBe("Ali");
      expect(user.username).toBe("ali123");
      expect(user.lang).toBe("fa");
      expect(user.firstSeenAt).toBeTypeOf("number");
    });

    it("returns existing user without overwriting", async () => {
      await ensureUser(env, 12345, { firstName: "Ali" });
      const user2 = await ensureUser(env, 12345, { firstName: "Updated" });
      expect(user2.firstName).toBe("Ali"); // not overwritten
    });

    it("handles missing meta fields gracefully", async () => {
      const user = await ensureUser(env, 999);
      expect(user.firstName).toBe("");
      expect(user.username).toBe("");
    });
  });

  describe("accounts", () => {
    it("returns empty array for new user", async () => {
      const accounts = await getAccounts(env, 12345);
      expect(accounts).toEqual([]);
    });

    it("addAccount appends and returns the account", async () => {
      const acc = { id: "a1", cfAccountId: "cf1", cfAccountName: "My Account", token: "tok" };
      const result = await addAccount(env, 12345, acc);
      expect(result).toEqual(acc);
      const list = await getAccounts(env, 12345);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("a1");
    });

    it("saveAccounts replaces the full list", async () => {
      await addAccount(env, 12345, { id: "a1" });
      await saveAccounts(env, 12345, [{ id: "a2" }, { id: "a3" }]);
      const list = await getAccounts(env, 12345);
      expect(list).toHaveLength(2);
      expect(list.map((a) => a.id)).toEqual(["a2", "a3"]);
    });

    it("getAccount returns a specific account", async () => {
      await addAccount(env, 12345, { id: "a1", name: "First" });
      await addAccount(env, 12345, { id: "a2", name: "Second" });
      const found = await getAccount(env, 12345, "a2");
      expect(found.name).toBe("Second");
    });

    it("getAccount returns null for missing account", async () => {
      const found = await getAccount(env, 12345, "nonexistent");
      expect(found).toBeNull();
    });

    it("removeAccount filters out the target", async () => {
      await addAccount(env, 12345, { id: "a1" });
      await addAccount(env, 12345, { id: "a2" });
      await removeAccount(env, 12345, "a1");
      const list = await getAccounts(env, 12345);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("a2");
    });
  });

  describe("deployments", () => {
    it("returns empty array for new user", async () => {
      const deps = await getDeployments(env, 12345);
      expect(deps).toEqual([]);
    });

    it("addDeployment appends and returns the deployment", async () => {
      const dep = { id: "d1", accountId: "a1", scriptName: "mz-test" };
      const result = await addDeployment(env, 12345, dep);
      expect(result).toEqual(dep);
    });

    it("getDeployment returns a specific deployment", async () => {
      await addDeployment(env, 12345, { id: "d1", scriptName: "mz-1" });
      await addDeployment(env, 12345, { id: "d2", scriptName: "mz-2" });
      const found = await getDeployment(env, 12345, "d2");
      expect(found.scriptName).toBe("mz-2");
    });

    it("getDeployment returns null for missing deployment", async () => {
      expect(await getDeployment(env, 12345, "nope")).toBeNull();
    });

    it("updateDeployment patches fields and sets updatedAt", async () => {
      await addDeployment(env, 12345, { id: "d1", status: "active", label: "old" });
      const updated = await updateDeployment(env, 12345, "d1", { status: "paused", label: "new" });
      expect(updated.status).toBe("paused");
      expect(updated.label).toBe("new");
      expect(updated.updatedAt).toBeTypeOf("number");
    });

    it("updateDeployment returns null for missing deployment", async () => {
      const result = await updateDeployment(env, 12345, "nope", { status: "paused" });
      expect(result).toBeNull();
    });

    it("removeDeployment filters out the target", async () => {
      await addDeployment(env, 12345, { id: "d1" });
      await addDeployment(env, 12345, { id: "d2" });
      await removeDeployment(env, 12345, "d1");
      const list = await getDeployments(env, 12345);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("d2");
    });

    it("deploymentsForAccount filters by accountId", async () => {
      await addDeployment(env, 12345, { id: "d1", accountId: "a1" });
      await addDeployment(env, 12345, { id: "d2", accountId: "a2" });
      await addDeployment(env, 12345, { id: "d3", accountId: "a1" });
      const result = await deploymentsForAccount(env, 12345, "a1");
      expect(result).toHaveLength(2);
      expect(result.map((d) => d.id)).toEqual(["d1", "d3"]);
    });
  });

  describe("sessions", () => {
    it("returns null for no session", async () => {
      const session = await getSession(env, 12345);
      expect(session).toBeNull();
    });

    it("setSession stores state and data", async () => {
      const session = await setSession(env, 12345, "awaiting_cf_token", { foo: "bar" });
      expect(session.state).toBe("awaiting_cf_token");
      expect(session.data.foo).toBe("bar");
      expect(session.updatedAt).toBeTypeOf("number");
    });

    it("getSession retrieves stored session", async () => {
      await setSession(env, 12345, "awaiting_deploy_label", { accountId: "a1" });
      const session = await getSession(env, 12345);
      expect(session.state).toBe("awaiting_deploy_label");
      expect(session.data.accountId).toBe("a1");
    });

    it("clearSession removes the session", async () => {
      await setSession(env, 12345, "awaiting_cf_token");
      await clearSession(env, 12345);
      const session = await getSession(env, 12345);
      expect(session).toBeNull();
    });
  });

  describe("data isolation", () => {
    it("different users have separate data", async () => {
      await addAccount(env, 111, { id: "a1" });
      await addAccount(env, 222, { id: "b1" });
      expect(await getAccounts(env, 111)).toHaveLength(1);
      expect(await getAccounts(env, 222)).toHaveLength(1);
      await removeAccount(env, 111, "a1");
      expect(await getAccounts(env, 222)).toHaveLength(1); // unaffected
    });
  });
});
