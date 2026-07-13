import { describe, expect, it } from "vitest";
import { needsTranslation } from "../src/translate.js";

describe("needsTranslation", () => {
  it("日本語タイトルはfalse", () => {
    expect(needsTranslation("Claude Codeの新機能について")).toBe(false);
  });

  it("英語タイトルはtrue", () => {
    expect(needsTranslation("Claude Code adds new browser feature")).toBe(true);
  });

  it("日本語が一部でも含まれればfalse", () => {
    expect(needsTranslation("Notion AI update: 新機能")).toBe(false);
  });
});
