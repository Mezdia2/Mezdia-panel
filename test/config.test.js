import { describe, it, expect } from "vitest";
import {
  CF_API_BASE,
  PANEL_COMPAT_DATE,
  PANEL_D1_BINDING,
  PANEL_API_KEY_BINDING,
  SESSION_TTL_SECONDS,
  DEPLOY_INIT_RETRIES,
  DEPLOY_INIT_RETRY_DELAY_MS,
  SCRIPT_NAME_PREFIX,
} from "../src/config.js";

describe("config.js", () => {
  it("CF_API_BASE points to Cloudflare API v4", () => {
    expect(CF_API_BASE).toBe("https://api.cloudflare.com/client/v4");
  });

  it("PANEL_COMPAT_DATE is a valid date string", () => {
    expect(PANEL_COMPAT_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(PANEL_COMPAT_DATE).toISOString()).toContain(PANEL_COMPAT_DATE);
  });

  it("PANEL_D1_BINDING is 'IOT_DB'", () => {
    expect(PANEL_D1_BINDING).toBe("IOT_DB");
  });

  it("PANEL_API_KEY_BINDING is 'MEZDIA_API_KEY'", () => {
    expect(PANEL_API_KEY_BINDING).toBe("MEZDIA_API_KEY");
  });

  it("SESSION_TTL_SECONDS is 15 minutes (900 seconds)", () => {
    expect(SESSION_TTL_SECONDS).toBe(15 * 60);
    expect(SESSION_TTL_SECONDS).toBe(900);
  });

  it("DEPLOY_INIT_RETRIES is a positive integer", () => {
    expect(DEPLOY_INIT_RETRIES).toBeGreaterThan(0);
    expect(Number.isInteger(DEPLOY_INIT_RETRIES)).toBe(true);
  });

  it("DEPLOY_INIT_RETRY_DELAY_MS is a positive integer", () => {
    expect(DEPLOY_INIT_RETRY_DELAY_MS).toBeGreaterThan(0);
    expect(Number.isInteger(DEPLOY_INIT_RETRY_DELAY_MS)).toBe(true);
  });

  it("SCRIPT_NAME_PREFIX is 'mz-'", () => {
    expect(SCRIPT_NAME_PREFIX).toBe("mz-");
  });

  it("all constants are frozen/immutable in practice (not objects that can be mutated)", () => {
    // These are primitives, so they're inherently immutable
    expect(typeof CF_API_BASE).toBe("string");
    expect(typeof PANEL_COMPAT_DATE).toBe("string");
    expect(typeof SESSION_TTL_SECONDS).toBe("number");
    expect(typeof DEPLOY_INIT_RETRIES).toBe("number");
    expect(typeof DEPLOY_INIT_RETRY_DELAY_MS).toBe("number");
    expect(typeof SCRIPT_NAME_PREFIX).toBe("string");
  });
});
