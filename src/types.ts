export type SourceType = "changelog" | "official-blog" | "tech-article" | "aggregator";

export interface RawItem {
  title: string;
  url: string;
  sourceId: string;
  sourceType: SourceType;
  publishedAt: string | null;
  engagement: number;
}

export interface Item extends RawItem {
  normalizedUrl: string;
  firstSeenAt: string;
  score: number;
  isDeadline: boolean;
}

export interface RssSourceConfig {
  id: string;
  url: string;
  sourceType: SourceType;
}

export interface SourcesConfig {
  rss: RssSourceConfig[];
  htmlDiff: RssSourceConfig[];
}

export interface ScoringConfig {
  sourceWeights: Record<SourceType, number>;
  keywordBoost: Record<string, number>;
  keywordPenalty: Record<string, number>;
  engagement: {
    hatenaPerBookmark: number;
    hnPerPoint: number;
    maxBonus: number;
  };
  deadline: {
    keywords: string[];
    datePatterns: string[];
    bonus: number;
  };
  windowDays: number;
}

export interface FetchResult {
  sourceId: string;
  ok: boolean;
  count: number;
  error?: string;
}
