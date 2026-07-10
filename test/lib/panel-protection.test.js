import { describe, expect, it } from "vitest";
import { findSensitiveWords, protectPanelSource } from "../../src/lib/panel-protection.js";

describe("panel-protection.js", () => {
  it("creates different protected output without leaking configured sensitive words", () => {
    const source = 'const name = "Cloudflare VPN کلادفلر"; function fetch(){ return name; }';
    const first = protectPanelSource(source);
    const second = protectPanelSource(source);

    expect(first).not.toBe(second);
    expect(findSensitiveWords(first)).toEqual([]);
    expect(findSensitiveWords(second)).toEqual([]);
    expect(first).not.toContain("new Function");
    expect(second).not.toContain("new Function");
  });
});
