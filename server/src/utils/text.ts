export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function firstSentence(value: string) {
  const match = normalizeWhitespace(value).match(/^(.+?[.!?])\s/);
  return match?.[1] ?? normalizeWhitespace(value).slice(0, 180);
}

export function topicToTitle(topic: string) {
  return topic
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function chunkText(text: string, maxWords = 180) {
  const words = normalizeWhitespace(text).split(" ");
  const chunks: string[] = [];

  for (let index = 0; index < words.length; index += maxWords) {
    chunks.push(words.slice(index, index + maxWords).join(" "));
  }

  return chunks.filter(Boolean);
}
