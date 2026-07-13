import { describe, expect, it } from "vitest";
import { normalizeUrl } from "../src/normalize.js";

describe("normalizeUrl", () => {
  it("クエリパラメータを除去する", () => {
    expect(normalizeUrl("https://example.com/a?utm_source=x&b=1")).toBe("https://example.com/a");
  });

  it("フラグメントを除去する", () => {
    expect(normalizeUrl("https://example.com/a#section")).toBe("https://example.com/a");
  });

  it("末尾スラッシュを統一する", () => {
    expect(normalizeUrl("https://example.com/a/")).toBe("https://example.com/a");
  });

  it("ホスト名を小文字化する", () => {
    expect(normalizeUrl("https://Example.COM/a")).toBe("https://example.com/a");
  });

  it("ルートパスの末尾スラッシュは維持する", () => {
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });
});
