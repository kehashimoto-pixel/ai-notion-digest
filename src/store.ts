import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Item } from "./types.js";

const STATE_DIR = path.resolve("state");
const SEEN_URLS_PATH = path.join(STATE_DIR, "seen-urls.json");
const ITEMS_PATH = path.join(STATE_DIR, "items.json");
const SNAPSHOTS_DIR = path.join(STATE_DIR, "snapshots");

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function loadSeenUrls(): Promise<Set<string>> {
  const list = await readJson<string[]>(SEEN_URLS_PATH, []);
  return new Set(list);
}

export async function saveSeenUrls(urls: Set<string>): Promise<void> {
  await writeJson(SEEN_URLS_PATH, Array.from(urls).sort());
}

export async function loadItems(): Promise<Item[]> {
  return readJson<Item[]>(ITEMS_PATH, []);
}

export async function saveItems(items: Item[]): Promise<void> {
  await writeJson(ITEMS_PATH, items);
}

export interface SnapshotEntry {
  title: string;
  url: string;
}

export async function loadSnapshot(id: string): Promise<SnapshotEntry[]> {
  return readJson<SnapshotEntry[]>(path.join(SNAPSHOTS_DIR, `${id}.json`), []);
}

export async function saveSnapshot(id: string, entries: SnapshotEntry[]): Promise<void> {
  await writeJson(path.join(SNAPSHOTS_DIR, `${id}.json`), entries);
}
