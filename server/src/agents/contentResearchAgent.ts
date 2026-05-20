import { embedTexts, cosineSimilarity } from "../embeddings/embeddingService.js";
import type { AiProvider } from "../lib/ai/provider.js";
import { scoreVideo } from "../services/scoring.js";
import type { PlannerModule, YouTubeCandidate } from "../types/course.js";
import { youtubeService } from "../youtube/youtubeService.js";

export interface RankedVideoCandidate extends YouTubeCandidate {
  moduleTitle: string;
  semanticScore: number;
  qualityScore: number;
}

export async function researchContent(topic: string, modules: PlannerModule[], ai?: AiProvider) {
  const usedVideoIds = new Set<string>();
  const rankedByModule: RankedVideoCandidate[][] = [];

  for (const module of modules) {
    const candidates = await youtubeService.searchEducationalVideos(module.searchQuery, 20);
    const ranked = await rankCandidates(topic, module, candidates, ai);
    const unique = ranked.filter((candidate) => !usedVideoIds.has(candidate.youtubeVideoId));
    const selected = unique.slice(0, 1);
    selected.forEach((candidate) => usedVideoIds.add(candidate.youtubeVideoId));

    rankedByModule.push(selected);
  }

  return rankedByModule;
}

async function rankCandidates(topic: string, module: PlannerModule, candidates: YouTubeCandidate[], ai?: AiProvider) {
  const queryText = `${topic}. ${module.title}. ${module.focus}. ${module.outcomes.join(" ")}`;
  const candidateTexts = candidates.map(
    (candidate) => `${candidate.title}. ${candidate.description}. ${candidate.transcript.slice(0, 1800)}`
  );
  const [queryEmbedding, ...candidateEmbeddings] = await embedTexts([queryText, ...candidateTexts], ai);

  return candidates
    .map((candidate, index) => {
      const semanticScore = Math.max(0, cosineSimilarity(queryEmbedding, candidateEmbeddings[index]));
      const qualityScore = scoreVideo(candidate, semanticScore);

      return {
        ...candidate,
        moduleTitle: module.title,
        semanticScore,
        qualityScore
      };
    })
    .sort((left, right) => right.qualityScore - left.qualityScore);
}
