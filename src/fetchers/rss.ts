import { XMLParser } from "fast-xml-parser";
import type { RawItem, RssSourceConfig } from "../types.js";

const FETCH_TIMEOUT_MS = 15_000;

async function fetchText(url: string): Promise<string> {
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

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function extractHnEngagement(description: string | undefined): number {
  if (!description) return 0;
  const match = description.match(/Points:\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function extractHatenaEngagement(raw: Record<string, unknown>): number {
  const count = raw["hatena:bookmarkcount"];
  if (count === undefined) return 0;
  const n = Number(extractText(count));
  return Number.isFinite(n) ? n : 0;
}

function extractText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)["#text"]);
  }
  return "";
}

export async function fetchRssSource(source: RssSourceConfig): Promise<RawItem[]> {
  const xml = await fetchText(source.url);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", htmlEntities: true });
  const doc = parser.parse(xml);

  const items: RawItem[] = [];

  // RSS 2.0 (<rss><channel><item>) と RSS 1.0/RDF (<rdf:RDF><item>、はてなブックマーク検索など) の両方に対応
  const rssItems = [...toArray(doc?.rss?.channel?.item), ...toArray(doc?.["rdf:RDF"]?.item)];
  for (const raw of rssItems) {
    const title = extractText(raw.title).trim();
    const link = extractText(raw.link).trim();
    if (!title || !link) continue;
    const dateStr = raw.pubDate ?? raw["dc:date"];
    const pubDate = dateStr ? new Date(dateStr) : null;
    const engagement = source.id.startsWith("hn-")
      ? extractHnEngagement(extractText(raw.description))
      : extractHatenaEngagement(raw);
    items.push({
      title,
      url: link,
      sourceId: source.id,
      sourceType: source.sourceType,
      publishedAt: pubDate && !Number.isNaN(pubDate.getTime()) ? pubDate.toISOString() : null,
      engagement,
    });
  }

  const feedEntries = toArray(doc?.feed?.entry);
  for (const raw of feedEntries) {
    const title = extractText(raw.title).trim();
    let link = "";
    const linkField = raw.link;
    if (Array.isArray(linkField)) {
      const found = linkField.find((l) => l?.["@_rel"] === "alternate") ?? linkField[0];
      link = found?.["@_href"] ?? "";
    } else if (linkField && typeof linkField === "object") {
      link = linkField["@_href"] ?? "";
    } else if (typeof linkField === "string") {
      link = linkField;
    }
    if (!title || !link) continue;
    const dateStr = raw.published ?? raw.updated;
    const date = dateStr ? new Date(dateStr) : null;
    items.push({
      title,
      url: link,
      sourceId: source.id,
      sourceType: source.sourceType,
      publishedAt: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
      engagement: 0,
    });
  }

  return items;
}
