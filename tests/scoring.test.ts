import { describe, expect, it } from "vitest";
import { computeScore, detectDeadline } from "../src/scoring.js";
import type { RawItem, ScoringConfig } from "../src/types.js";

const scoringConfig: ScoringConfig = {
  sourceWeights: { changelog: 10, "official-blog": 8, "tech-article": 3, aggregator: 1 },
  keywordBoost: { Claude: 2, MCP: 3 },
  keywordPenalty: { 求人: -100 },
  engagement: { hatenaPerBookmark: 0.5, hnPerPoint: 0.2, maxBonus: 20 },
  deadline: { keywords: ["まで", "終了"], datePatterns: ["\\d{1,2}[/月]\\s?\\d{1,2}日?"], bonus: 15 },
  windowDays: 14,
};

function makeItem(overrides: Partial<RawItem>): RawItem {
  return {
    title: "Claude Codeの新機能",
    url: "https://example.com/a",
    sourceId: "zenn-claude",
    sourceType: "tech-article",
    publishedAt: null,
    engagement: 0,
    ...overrides,
  };
}

describe("detectDeadline", () => {
  it("キーワードと日付表現の両方がある場合にtrue", () => {
    expect(detectDeadline("11月30日までにサポート終了", scoringConfig.deadline)).toBe(true);
  });

  it("キーワードのみでは false", () => {
    expect(detectDeadline("サポート終了のお知らせ", scoringConfig.deadline)).toBe(false);
  });

  it("日付表現のみでは false", () => {
    expect(detectDeadline("11月30日にリリース", scoringConfig.deadline)).toBe(false);
  });
});

describe("computeScore", () => {
  it("ソース重みとキーワード加点が反映される", () => {
    const item = makeItem({ title: "Claude Codeに新しいMCP対応が追加" });
    const { score } = computeScore(item, scoringConfig);
    expect(score).toBe(3 + 2 + 3);
  });

  it("ノイズ語で大きく減点される", () => {
    const item = makeItem({ title: "Claude Codeエンジニア求人のお知らせ" });
    const { score } = computeScore(item, scoringConfig);
    expect(score).toBeLessThan(0);
  });

  it("期限付きの場合ボーナスとisDeadlineが付く", () => {
    const item = makeItem({ title: "Claude Pro 11月30日まで値上げ前料金で提供終了" });
    const { score, isDeadline } = computeScore(item, scoringConfig);
    expect(isDeadline).toBe(true);
    expect(score).toBeGreaterThanOrEqual(3 + 2 + 15);
  });
});
