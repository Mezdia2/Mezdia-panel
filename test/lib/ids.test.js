import { describe, it, expect } from "vitest";
import {
  randomFromAlphabet,
  randomSlug,
  randomPassword,
  randomHex,
  shortId,
  workerScriptName,
} from "../../src/lib/ids.js";

describe("ids.js", () => {
  describe("randomFromAlphabet", () => {
    it("returns a string of the requested length", () => {
      const result = randomFromAlphabet("abc", 10);
      expect(result).toHaveLength(10);
    });

    it("only contains characters from the alphabet", () => {
      const alphabet = "xyz";
      for (let i = 0; i < 50; i++) {
        const result = randomFromAlphabet(alphabet, 20);
        expect(result).toMatch(/^[xyz]+$/);
      }
    });

    it("returns different results on successive calls (probabilistic)", () => {
      const results = new Set();
      for (let i = 0; i < 20; i++) {
        results.add(randomFromAlphabet("abcdef", 12));
      }
      expect(results.size).toBeGreaterThan(1);
    });

    it("handles length 0", () => {
      expect(randomFromAlphabet("abc", 0)).toBe("");
    });

    it("handles length 1", () => {
      const result = randomFromAlphabet("a", 1);
      expect(result).toBe("a");
    });
  });

  describe("randomSlug", () => {
    it("returns lowercase alphanumeric string", () => {
      const slug = randomSlug(8);
      expect(slug).toHaveLength(8);
      expect(slug).toMatch(/^[a-z0-9]+$/);
    });

    it("defaults to length 8", () => {
      expect(randomSlug()).toHaveLength(8);
    });

    it("respects custom length", () => {
      expect(randomSlug(16)).toHaveLength(16);
      expect(randomSlug(3)).toHaveLength(3);
    });
  });

  describe("randomPassword", () => {
    it("returns mixed-case alphanumeric string", () => {
      const pw = randomPassword(14);
      expect(pw).toHaveLength(14);
      expect(pw).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it("defaults to length 14", () => {
      expect(randomPassword()).toHaveLength(14);
    });
  });

  describe("randomHex", () => {
    it("returns a hex string of correct length (2x byte length)", () => {
      const hex = randomHex(24);
      expect(hex).toHaveLength(48);
      expect(hex).toMatch(/^[0-9a-f]+$/);
    });

    it("defaults to 24 bytes (48 hex chars)", () => {
      expect(randomHex()).toHaveLength(48);
    });

    it("respects custom byte length", () => {
      expect(randomHex(4)).toHaveLength(8);
      expect(randomHex(1)).toHaveLength(2);
    });
  });

  describe("shortId", () => {
    it("returns an 8-char lowercase alphanumeric string", () => {
      const id = shortId();
      expect(id).toHaveLength(8);
      expect(id).toMatch(/^[a-z0-9]+$/);
    });

    it("generates unique values", () => {
      const ids = new Set(Array.from({ length: 100 }, () => shortId()));
      expect(ids.size).toBe(100);
    });
  });

  describe("workerScriptName", () => {
    it("prefixes with 'mz-' by default", () => {
      const name = workerScriptName();
      expect(name).toMatch(/^mz-[a-z0-9]+$/);
    });

    it("uses custom prefix", () => {
      const name = workerScriptName("custom-");
      expect(name).toMatch(/^custom-[a-z0-9]+$/);
    });

    it("total length is prefix + 10", () => {
      const name = workerScriptName("mz-");
      expect(name).toHaveLength(13); // "mz-" (3) + 10
    });
  });
});
