import * as cheerio from "cheerio";
import type { RawItem, RssSourceConfig } from "../types.js";
import { normalizeUrl } from "../normalize.js";
import { loadSnapshot, saveSnapshot, type SnapshotEntry } from "../store.js";

const FETCH_TIMEOUT_MS = 15_000;
const MIN_TITLE_LENGTH = 8;
const MAX_ENTRIES = 60;

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ai-notion-digest-bot/1.0" },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractEntries(html: string, baseUrl: string): SnapshotEntry[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const entries: SnapshotEntry[] = [];

  $("a[href]").each((_, el) => {
    if (entries.length >= MAX_ENTRIES) return;
    const href = $(el).attr("href");
    if (!href) return;
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (title.length < MIN_TITLE_LENGTH) return;

    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(href, baseUrl).toString();
    } catch {
      return;
    }
    if (!absoluteUrl.startsWith(new URL(baseUrl).origin)) return;

    let normalized: string;
    try {
      normalized = normalizeUrl(absoluteUrl);
    } catch {
      return;
    }
    if (seen.has(normalized)) return;
    seen.add(normalized);
    entries.push({ title, url: absoluteUrl });
  });

  return entries;
}

export async function fetchHtmlDiffSource(source: RssSourceConfig): Promise<RawItem[]> {
  const html = await fetchHtml(source.url);
  const currentEntries = extractEntries(html, source.url);
  const previousEntries = await loadSnapshot(source.id);
  const previousUrls = new Set(previousEntries.map((e) => normalizeUrl(e.url)));

  const newEntries = currentEntries.filter((e) => !previousUrls.has(normalizeUrl(e.url)));

  await saveSnapshot(source.id, currentEntries);

  return newEntries.map((entry) => ({
    title: entry.title,
    url: entry.url,
    sourceId: source.id,
    sourceType: source.sourceType,
    publishedAt: null,
    engagement: 0,
  }));
}
