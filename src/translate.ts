const FETCH_TIMEOUT_MS = 8_000;
const JAPANESE_PATTERN = /[぀-ヿ㐀-鿿]/;

export function needsTranslation(title: string): boolean {
  return !JAPANESE_PATTERN.test(title);
}

interface MyMemoryResponse {
  responseData?: { translatedText?: string };
}

export async function translateToJa(text: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ja`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as MyMemoryResponse;
    const translated = data.responseData?.translatedText;
    if (!translated || JAPANESE_PATTERN.test(translated) === false) return null;
    return translated;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
