import { z } from "zod";
import { env, featureFlags } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { timeAsync, withTimeout } from "../utils/timing.js";
import type { YouTubeCandidate } from "../types/course.js";
import { fetchTranscript } from "./transcriptService.js";

const SearchResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.object({ videoId: z.string() }),
      snippet: z.object({
        title: z.string(),
        description: z.string().default(""),
        thumbnails: z
          .object({
            high: z.object({ url: z.string().url() }).optional(),
            medium: z.object({ url: z.string().url() }).optional(),
            default: z.object({ url: z.string().url() }).optional()
          })
          .optional(),
        channelTitle: z.string()
      })
    })
  )
});

const VideoDetailsResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      statistics: z
        .object({
          viewCount: z.string().optional(),
          likeCount: z.string().optional()
        })
        .optional(),
      contentDetails: z.object({ duration: z.string().optional() }).optional()
    })
  )
});

type SearchItem = z.infer<typeof SearchResponseSchema>["items"][number];
type VideoDetailsItem = z.infer<typeof VideoDetailsResponseSchema>["items"][number];

export interface YouTubeHealth {
  service: "YouTube";
  ok: boolean;
  skipped?: boolean;
  videos?: Array<{
    videoId: string;
    title: string;
    thumbnail: string;
    duration: string;
    channel: string;
  }>;
  latencyMs?: number;
  error?: string;
  fix?: string;
}

export class YouTubeService {
  async searchEducationalVideos(query: string, maxResults = 20, strict = false): Promise<YouTubeCandidate[]> {
    if (!featureFlags.youtube) {
      return demoVideos(query, maxResults);
    }

    try {
      const params = new URLSearchParams({
        key: env.YOUTUBE_API_KEY ?? "",
        part: "snippet",
        q: `${query} tutorial explanation course`,
        type: "video",
        videoCategoryId: "27",
        maxResults: String(maxResults),
        safeSearch: "strict",
        relevanceLanguage: "en"
      });

      const body = await fetchYouTubeJson(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
      const search = SearchResponseSchema.parse(body);
      const ids = search.items.map((item) => item.id.videoId).filter(Boolean);
      const details = await this.fetchVideoDetails(ids);

      return Promise.all(
        search.items.map(async (item) => this.mapSearchItemToCandidate(item, details.get(item.id.videoId)))
      );
    } catch (error) {
      if (strict) {
        throw error;
      }
      logger.warn("YouTube search falling back to demo resources", {
        query,
        error: error instanceof Error ? error.message : "unknown error"
      });
      return demoVideos(query, maxResults);
    }
  }

  async validateConnection(): Promise<YouTubeHealth> {
    if (!featureFlags.youtube) {
      return {
        service: "YouTube",
        ok: false,
        skipped: true,
        error: "YOUTUBE_API_KEY is empty.",
        fix: "Enable YouTube Data API v3 in Google Cloud and set YOUTUBE_API_KEY in server/.env."
      };
    }

    try {
      const timing = await timeAsync("YouTube search test", () =>
        withTimeout("YouTube API search test", this.searchEducationalVideos("C++ pointers tutorial", 5, true), 25_000)
      );

      const videos = timing.result.slice(0, 5).map((video) => ({
        videoId: video.youtubeVideoId,
        title: video.title,
        thumbnail: video.thumbnail,
        duration: video.duration,
        channel: video.channelTitle
      }));

      if (!videos.length || videos.some((video) => !video.videoId || !video.title || !video.thumbnail || !video.channel)) {
        throw new Error("YouTube response did not contain valid videos with titles, thumbnails, IDs, and channels.");
      }

      logger.success("YouTube API connected", { videos: videos.length, latencyMs: timing.latencyMs });

      return {
        service: "YouTube",
        ok: true,
        videos,
        latencyMs: timing.latencyMs
      };
    } catch (error) {
      return {
        service: "YouTube",
        ok: false,
        error: error instanceof Error ? error.message : "YouTube validation failed.",
        fix: explainYouTubeFix(error)
      };
    }
  }

  private async mapSearchItemToCandidate(item: SearchItem, detail?: VideoDetailsItem): Promise<YouTubeCandidate> {
    const seedText = `${item.snippet.title}. ${item.snippet.description}`;

    return {
      youtubeVideoId: item.id.videoId,
      title: decodeHtml(item.snippet.title),
      description: decodeHtml(item.snippet.description),
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      duration: parseIsoDuration(detail?.contentDetails?.duration),
      thumbnail: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? "",
      channelTitle: item.snippet.channelTitle,
      views: Number(detail?.statistics?.viewCount ?? 0),
      likes: Number(detail?.statistics?.likeCount ?? 0),
      transcript: await fetchTranscript(item.id.videoId, seedText)
    };
  }

  private async fetchVideoDetails(ids: string[]) {
    if (ids.length === 0) {
      return new Map<string, VideoDetailsItem>();
    }

    const params = new URLSearchParams({
      key: env.YOUTUBE_API_KEY ?? "",
      part: "statistics,contentDetails",
      id: ids.join(",")
    });

    const body = await fetchYouTubeJson(`https://www.googleapis.com/youtube/v3/videos?${params.toString()}`);
    const details = VideoDetailsResponseSchema.parse(body);
    return new Map(details.items.map((item) => [item.id, item]));
  }
}

async function fetchYouTubeJson(url: string) {
  const response = await withTimeout("YouTube HTTP request", fetch(url), 20_000);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? JSON.stringify((body as { error: unknown }).error)
        : `HTTP ${response.status}`;
    throw new Error(`YouTube API request failed: ${message}`);
  }

  return body;
}

function demoVideos(query: string, maxResults: number): YouTubeCandidate[] {
  const channels = ["freeCodeCamp.org", "Khan Academy", "MIT OpenCourseWare", "The Net Ninja", "Corey Schafer"];
  return Array.from({ length: maxResults }, (_, index) => {
    const number = index + 1;
    const title = `${query}: ${demoAngles[index % demoAngles.length]}`;
    const youtubeVideoId = `demo-${number}`;

    return {
      youtubeVideoId,
      title,
      description: `A focused educational walkthrough covering ${query} with examples, practice, and checkpoints.`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} tutorial ${number}`)}`,
      duration: ["8m 42s", "14m 10s", "22m 05s", "31m 18s", "11m 36s"][index % 5],
      thumbnail: `https://placehold.co/640x360/0f172a/f8fafc?text=${encodeURIComponent(query.slice(0, 28))}`,
      channelTitle: channels[index % channels.length],
      views: 50000 + index * 37000,
      likes: 1200 + index * 640,
      transcript: [
        `This tutorial explains ${query} from first principles and defines the most important terms.`,
        `The instructor demonstrates examples, contrasts common mistakes, and pauses for learner checkpoints.`,
        `A practical exercise shows how to apply ${query} in a real scenario and how to debug misunderstandings.`,
        `The lesson ends with a summary, revision prompts, and suggestions for what to learn next.`
      ].join(" ")
    };
  });
}

const demoAngles = [
  "Beginner Foundations",
  "Visual Intuition and Mental Models",
  "Hands-on Examples",
  "Common Mistakes and Debugging",
  "Interview and Assessment Practice"
];

function parseIsoDuration(value = "PT0M") {
  const match = value.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) {
    return "0m";
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const parts = [];

  if (hours) {
    parts.push(`${hours}h`);
  }
  if (minutes) {
    parts.push(`${minutes}m`);
  }
  if (seconds && !hours) {
    parts.push(`${seconds}s`);
  }

  return parts.join(" ") || "0m";
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function explainYouTubeFix(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/quota|dailyLimitExceeded|rateLimitExceeded/i.test(message)) {
    return "YouTube quota is exhausted. Wait for quota reset, reduce startup checks, or request more quota in Google Cloud.";
  }
  if (/API key|keyInvalid|forbidden|permission/i.test(message)) {
    return "Check YOUTUBE_API_KEY, ensure YouTube Data API v3 is enabled, and confirm API key restrictions allow this server.";
  }
  if (/schema|parse|valid videos/i.test(message)) {
    return "The YouTube response shape changed or was incomplete. Inspect the API response and update the zod schema.";
  }
  return "Verify YOUTUBE_API_KEY, API enablement, quota, network access, and Google Cloud key restrictions.";
}

export const youtubeService = new YouTubeService();
