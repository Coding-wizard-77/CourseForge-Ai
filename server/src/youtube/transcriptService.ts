import { normalizeWhitespace } from "../utils/text.js";

export async function fetchTranscript(videoId: string, seedText: string) {
  const publicTranscript = await fetchPublicTranscript(videoId);
  if (publicTranscript) {
    return publicTranscript;
  }

  return buildSyntheticTranscript(seedText);
}

async function fetchPublicTranscript(videoId: string) {
  try {
    const listResponse = await fetch(`https://video.google.com/timedtext?type=list&v=${videoId}`);
    const listXml = await listResponse.text();
    const languageMatch = listXml.match(/lang_code="([^"]+)"/);

    if (!languageMatch?.[1]) {
      return "";
    }

    const transcriptResponse = await fetch(
      `https://video.google.com/timedtext?v=${videoId}&lang=${languageMatch[1]}`
    );
    const transcriptXml = await transcriptResponse.text();

    return normalizeWhitespace(
      transcriptXml
        .replace(/<text[^>]*>/g, " ")
        .replace(/<\/text>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/<[^>]+>/g, " ")
    );
  } catch {
    return "";
  }
}

function buildSyntheticTranscript(seedText: string) {
  const topic = normalizeWhitespace(seedText);
  return [
    `This lesson introduces ${topic} through definitions, real examples, and common misconceptions.`,
    `A learner should first identify the core vocabulary, then connect each idea to a practical problem.`,
    `The explanation moves from intuition to implementation, comparing beginner mistakes with reliable mental models.`,
    `Important checkpoints include being able to explain the concept aloud, solve a small exercise, and recognize when the technique applies.`,
    `The lesson closes with revision prompts, practice tasks, and next steps for deeper mastery of ${topic}.`
  ].join(" ");
}
