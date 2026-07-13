import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FetchResult, Item, RawItem, ScoringConfig, SourcesConfig } from "./types.js";
import { fetchRssSource } from "./fetchers/rss.js";
import { fetchHtmlDiffSource } from "./fetchers/htmlDiff.js";
import { normalizeUrl } from "./normalize.js";
import { computeScore } from "./scoring.js";
import { loadItems, loadSeenUrls, saveItems, saveSeenUrls } from "./store.js";
import { writeDocs } from "./render.js";

async function loadConfig<T>(relativePath: string): Promise<T> {
  const raw = await readFile(path.resolve(relativePath), "utf-8");
  return JSON.parse(raw) as T;
}

async function collectRawItems(
  sources: SourcesConfig
): Promise<{ rawItems: RawItem[]; results: FetchResult[] }> {
  const rawItems: RawItem[] = [];
  const results: FetchResult[] = [];

  for (const source of sources.rss) {
    try {
      const items = await fetchRssSource(source);
      rawItems.push(...items);
      results.push({ sourceId: source.id, ok: true, count: items.length });
    } catch (error) {
      results.push({ sourceId: source.id, ok: false, count: 0, error: String(error) });
    }
  }

  for (const source of sources.htmlDiff) {
    try {
      const items = await fetchHtmlDiffSource(source);
      rawItems.push(...items);
      results.push({ sourceId: source.id, ok: true, count: items.length });
    } catch (error) {
      results.push({ sourceId: source.id, ok: false, count: 0, error: String(error) });
    }
  }

  return { rawItems, results };
}

function withinWindow(item: Item, windowDays: number, nowMs: number): boolean {
  const referenceIso = item.publishedAt ?? item.firstSeenAt;
  const referenceMs = new Date(referenceIso).getTime();
  const ageMs = nowMs - referenceMs;
  return ageMs <= windowDays * 24 * 60 * 60 * 1000;
}

async function main(): Promise<void> {
  const sources = await loadConfig<SourcesConfig>("config/sources.json");
  const scoring = await loadConfig<ScoringConfig>("config/scoring.json");

  const seenUrls = await loadSeenUrls();
  const existingItems = await loadItems();

  const { rawItems, results } = await collectRawItems(sources);

  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  const newItems: Item[] = [];
  for (const raw of rawItems) {
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeUrl(raw.url);
    } catch {
      continue;
    }
    if (seenUrls.has(normalizedUrl)) continue;
    seenUrls.add(normalizedUrl);

    const { score, isDeadline } = computeScore(raw, scoring);
    if (score <= 0) continue;

    newItems.push({
      ...raw,
      normalizedUrl,
      firstSeenAt: nowIso,
      score,
      isDeadline,
    });
  }

  const mergedItems = [...existingItems, ...newItems].filter((item) =>
    withinWindow(item, scoring.windowDays, nowMs)
  );

  await saveSeenUrls(seenUrls);
  await saveItems(mergedItems);
  await writeDocs(mergedItems, nowIso);

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;
  console.log(`取得結果 成功${okCount}件 / 失敗${failCount}件`);
  for (const r of results) {
    if (r.ok) {
      console.log(`  OK   ${r.sourceId} (${r.count}件)`);
    } else {
      console.log(`  FAIL ${r.sourceId}: ${r.error}`);
    }
  }
  console.log(`新規アイテム ${newItems.length}件 / 掲載中 ${mergedItems.length}件`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
