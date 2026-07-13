import type { RawItem, ScoringConfig } from "./types.js";

export function detectDeadline(text: string, config: ScoringConfig["deadline"]): boolean {
  const hasKeyword = config.keywords.some((kw) => text.includes(kw));
  if (!hasKeyword) return false;
  return config.datePatterns.some((pattern) => new RegExp(pattern).test(text));
}

export function computeScore(item: RawItem, config: ScoringConfig): { score: number; isDeadline: boolean } {
  let score = config.sourceWeights[item.sourceType] ?? 0;

  for (const [keyword, boost] of Object.entries(config.keywordBoost)) {
    if (item.title.includes(keyword)) {
      score += boost;
    }
  }

  for (const [keyword, penalty] of Object.entries(config.keywordPenalty)) {
    if (item.title.includes(keyword)) {
      score += penalty;
    }
  }

  const engagementBonus = Math.min(
    item.engagement * (item.sourceId.startsWith("hn-") ? config.engagement.hnPerPoint : config.engagement.hatenaPerBookmark),
    config.engagement.maxBonus
  );
  score += engagementBonus;

  const isDeadline = detectDeadline(item.title, config.deadline);
  if (isDeadline) {
    score += config.deadline.bonus;
  }

  return { score, isDeadline };
}
