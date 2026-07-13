import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Item } from "./types.js";

const SOURCE_LABELS: Record<string, string> = {
  "zenn-claudecode": "Zenn",
  "zenn-claude": "Zenn",
  "zenn-notion": "Zenn",
  "qiita-claudecode": "Qiita",
  "qiita-notion": "Qiita",
  "qiita-claude": "Qiita",
  "hatena-claudecode": "はてブ",
  "hatena-notionai": "はてブ",
  "hatena-anthropic": "はてブ",
  "gigazine": "GIGAZINE",
  "itmedia-aiplus": "ITmedia AI+",
  "publickey": "Publickey",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateJst(iso: string | null): string {
  if (!iso) return "日付不明";
  const date = new Date(iso);
  return date.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });
}

function sourceLabel(item: Item): string {
  return SOURCE_LABELS[item.sourceId] ?? item.sourceType;
}

function renderItemRow(item: Item): string {
  const engagementText = item.engagement > 0 ? `<span class="engagement">👍 ${item.engagement}</span>` : "";
  return `<li class="item">
  <a class="title" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
  <div class="meta">
    <span class="badge">${escapeHtml(sourceLabel(item))}</span>
    <span class="date">${formatDateJst(item.publishedAt)}</span>
    ${engagementText}
  </div>
</li>`;
}

export function renderHtml(items: Item[], generatedAtIso: string): string {
  const sorted = [...items].sort((a, b) => b.score - a.score);
  const deadlineItems = sorted.filter((i) => i.isDeadline);
  const normalItems = sorted.filter((i) => !i.isDeadline);
  const generatedAtJst = new Date(generatedAtIso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });

  const deadlineSection = deadlineItems.length
    ? `<section class="deadline-section">
  <h2>⏰ 期限付き情報</h2>
  <ul class="item-list">
    ${deadlineItems.map(renderItemRow).join("\n    ")}
  </ul>
</section>`
    : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI/Notionアップデート ダイジェスト</title>
<style>
  :root { color-scheme: light; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Segoe UI", Meiryo, sans-serif;
    background: #f6f7f9;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 16px 48px;
  }
  h1 { font-size: 1.4rem; margin-bottom: 4px; }
  .updated-at { color: #666; font-size: 0.85rem; margin-bottom: 24px; }
  h2 { font-size: 1.1rem; margin: 0 0 12px; }
  .deadline-section {
    background: #fff4e5;
    border: 1px solid #f0b95a;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 24px;
  }
  .item-list { list-style: none; margin: 0; padding: 0; }
  .item {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 10px;
  }
  .title {
    display: block;
    font-weight: 600;
    color: #1155cc;
    text-decoration: none;
    margin-bottom: 6px;
  }
  .title:hover { text-decoration: underline; }
  .meta { font-size: 0.8rem; color: #666; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .badge {
    background: #eef2ff;
    color: #3730a3;
    border-radius: 4px;
    padding: 2px 8px;
    font-weight: 500;
  }
  .engagement { color: #b45309; }
  footer { margin-top: 32px; color: #888; font-size: 0.8rem; text-align: center; }
  @media (max-width: 480px) {
    .container { padding: 16px 12px 32px; }
  }
</style>
</head>
<body>
<div class="container">
  <h1>AI/Notionアップデート ダイジェスト</h1>
  <div class="updated-at">最終更新 ${escapeHtml(generatedAtJst)}(JST)</div>
  ${deadlineSection}
  <section>
    <h2>新着アップデート</h2>
    <ul class="item-list">
      ${normalItems.map(renderItemRow).join("\n      ")}
    </ul>
  </section>
  <footer>掲載件数 ${sorted.length}件(直近14日分)</footer>
</div>
</body>
</html>
`;
}

export async function writeDocs(items: Item[], generatedAtIso: string): Promise<void> {
  const docsDir = path.resolve("docs");
  await mkdir(docsDir, { recursive: true });

  const html = renderHtml(items, generatedAtIso);
  await writeFile(path.join(docsDir, "index.html"), html, "utf-8");

  const data = {
    generatedAt: generatedAtIso,
    items: [...items].sort((a, b) => b.score - a.score),
  };
  await writeFile(path.join(docsDir, "data.json"), JSON.stringify(data, null, 2) + "\n", "utf-8");
}
