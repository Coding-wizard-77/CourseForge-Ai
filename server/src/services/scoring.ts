import type { YouTubeCandidate } from "../types/course.js";
import { clamp, roundScore } from "../utils/number.js";

export function scoreVideo(candidate: YouTubeCandidate, semanticScore: number) {
  const durationScore = scoreDuration(candidate.duration);
  const engagementScore = clamp(Math.log10(candidate.views + candidate.likes * 20 + 10) / 7, 0, 1);
  const transcriptScore = clamp(candidate.transcript.split(/\s+/).length / 600, 0.35, 1);
  const channelScore = credibleChannelBoost(candidate.channelTitle);

  const qualityScore =
    semanticScore * 0.42 +
    transcriptScore * 0.22 +
    engagementScore * 0.18 +
    durationScore * 0.12 +
    channelScore * 0.06;

  return roundScore(clamp(qualityScore, 0, 1));
}

function scoreDuration(duration: string) {
  const minutes = parseDurationMinutes(duration);
  if (minutes >= 8 && minutes <= 28) {
    return 1;
  }
  if (minutes > 28 && minutes <= 45) {
    return 0.78;
  }
  if (minutes >= 4 && minutes < 8) {
    return 0.72;
  }
  return 0.55;
}

function parseDurationMinutes(duration: string) {
  const hours = Number(duration.match(/(\d+)h/)?.[1] ?? 0);
  const minutes = Number(duration.match(/(\d+)m/)?.[1] ?? 0);
  const seconds = Number(duration.match(/(\d+)s/)?.[1] ?? 0);
  return hours * 60 + minutes + seconds / 60;
}

function credibleChannelBoost(channel: string) {
  const normalized = channel.toLowerCase();
  const trustedSignals = ["mit", "khan", "freecodecamp", "stanford", "harvard", "net ninja", "corey"];
  return trustedSignals.some((signal) => normalized.includes(signal)) ? 1 : 0.72;
}
