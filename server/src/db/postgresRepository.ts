import pg from "pg";
import { env } from "../services/env.js";
import type { Course, CourseModule, Difficulty, QuizAttempt, QuizQuestion, UserProgress, VideoResource } from "../types/course.js";
import { createId } from "../utils/id.js";
import type { CourseRepository } from "./repository.js";
import { schemaSql } from "./schema.js";

const { Pool } = pg;

export class PostgresRepository implements CourseRepository {
  private pool = new Pool({ connectionString: env.DATABASE_URL });

  async init() {
    await this.pool.query(schemaSql);
  }

  async saveCourse(course: Course) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO users (id, name, email, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [course.userId, "Demo Learner", `${course.userId}@courseforge.local`, ""]
      );

      await client.query(
        `INSERT INTO courses (id, user_id, title, topic, difficulty, estimated_hours, roadmap, agents_trace, personalization, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           topic = EXCLUDED.topic,
           difficulty = EXCLUDED.difficulty,
           estimated_hours = EXCLUDED.estimated_hours,
           roadmap = EXCLUDED.roadmap,
           agents_trace = EXCLUDED.agents_trace,
           personalization = EXCLUDED.personalization`,
        [
          course.id,
          course.userId,
          course.title,
          course.topic,
          course.difficulty,
          course.estimatedHours,
          JSON.stringify(course.roadmap),
          JSON.stringify(course.agentsTrace),
          JSON.stringify(course.personalization),
          course.createdAt
        ]
      );

      for (const module of course.modules) {
        await client.query(
          `INSERT INTO modules (id, course_id, title, module_order, summary, learning_objectives)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title,
             module_order = EXCLUDED.module_order,
             summary = EXCLUDED.summary,
             learning_objectives = EXCLUDED.learning_objectives`,
          [
            module.id,
            module.courseId,
            module.title,
            module.moduleOrder,
            module.summary,
            JSON.stringify(module.learningObjectives)
          ]
        );

        for (const video of module.videos) {
          await client.query(
            `INSERT INTO videos (
              id, module_id, youtube_video_id, title, url, duration, thumbnail, channel_title,
              views, likes, transcript, semantic_score, quality_score, summary, key_takeaways, flashcards
            )
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
             ON CONFLICT (id) DO UPDATE SET
               title = EXCLUDED.title,
               transcript = EXCLUDED.transcript,
               semantic_score = EXCLUDED.semantic_score,
               quality_score = EXCLUDED.quality_score,
               summary = EXCLUDED.summary,
               key_takeaways = EXCLUDED.key_takeaways,
               flashcards = EXCLUDED.flashcards`,
            [
              video.id,
              video.moduleId,
              video.youtubeVideoId,
              video.title,
              video.url,
              video.duration,
              video.thumbnail,
              video.channelTitle,
              video.views,
              video.likes,
              video.transcript,
              video.semanticScore,
              video.qualityScore,
              video.summary,
              JSON.stringify(video.keyTakeaways),
              JSON.stringify(video.flashcards)
            ]
          );

          for (const quiz of video.quiz) {
            await client.query(
              `INSERT INTO quizzes (id, video_id, type, question, options, correct_answer, explanation, difficulty)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
               ON CONFLICT (id) DO UPDATE SET
                 question = EXCLUDED.question,
                 options = EXCLUDED.options,
                 correct_answer = EXCLUDED.correct_answer,
                 explanation = EXCLUDED.explanation`,
              [
                quiz.id,
                quiz.videoId,
                quiz.type,
                quiz.question,
                JSON.stringify(quiz.options),
                quiz.correctAnswer,
                quiz.explanation,
                quiz.difficulty
              ]
            );
          }
        }
      }

      await client.query("COMMIT");
      return course;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getCourse(id: string) {
    const courseResult = await this.pool.query("SELECT * FROM courses WHERE id = $1", [id]);
    const courseRow = courseResult.rows[0];
    if (!courseRow) {
      return null;
    }

    const moduleResult = await this.pool.query("SELECT * FROM modules WHERE course_id = $1 ORDER BY module_order", [id]);
    const modules = await Promise.all(moduleResult.rows.map((row) => this.hydrateModule(row)));

    return {
      id: courseRow.id,
      userId: courseRow.user_id,
      title: courseRow.title,
      topic: courseRow.topic,
      difficulty: courseRow.difficulty as Difficulty,
      estimatedHours: courseRow.estimated_hours,
      createdAt: new Date(courseRow.created_at).toISOString(),
      roadmap: courseRow.roadmap,
      modules,
      agentsTrace: courseRow.agents_trace,
      personalization: courseRow.personalization
    };
  }

  async listUserCourses(userId: string) {
    const result = await this.pool.query("SELECT id FROM courses WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
    const courses = await Promise.all(result.rows.map((row) => this.getCourse(row.id)));
    return courses.filter((course): course is Course => Boolean(course));
  }

  async getVideosByModule(moduleId: string) {
    return this.hydrateVideos(moduleId);
  }

  async getQuizByVideo(videoId: string) {
    return this.hydrateQuiz(videoId);
  }

  async upsertProgress(progress: Omit<UserProgress, "id" | "updatedAt">) {
    await this.pool.query(
      `INSERT INTO users (id, name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [progress.userId, "Demo Learner", `${progress.userId}@courseforge.local`, ""]
    );

    const result = await this.pool.query(
      `INSERT INTO user_progress (id, user_id, video_id, completed, quiz_score, watched_percentage, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (user_id, video_id) DO UPDATE SET
         completed = EXCLUDED.completed,
         quiz_score = EXCLUDED.quiz_score,
         watched_percentage = EXCLUDED.watched_percentage,
         updated_at = NOW()
       RETURNING *`,
      [createId("progress"), progress.userId, progress.videoId, progress.completed, progress.quizScore, progress.watchedPercentage]
    );

    return mapProgress(result.rows[0]);
  }

  async getProgressForUser(userId: string) {
    const result = await this.pool.query("SELECT * FROM user_progress WHERE user_id = $1", [userId]);
    return result.rows.map(mapProgress);
  }

  async saveQuizAttempt(attempt: Omit<QuizAttempt, "id" | "submittedAt">) {
    const result = await this.pool.query(
      `INSERT INTO quiz_attempts (id, user_id, video_id, score, total, weak_areas, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       RETURNING *`,
      [createId("attempt"), attempt.userId, attempt.videoId, attempt.score, attempt.total, JSON.stringify(attempt.weakAreas)]
    );

    return mapAttempt(result.rows[0]);
  }

  async getQuizAttempts(userId: string) {
    const result = await this.pool.query("SELECT * FROM quiz_attempts WHERE user_id = $1 ORDER BY submitted_at DESC", [userId]);
    return result.rows.map(mapAttempt);
  }

  private async hydrateModule(row: any): Promise<CourseModule> {
    const videos = await this.hydrateVideos(row.id);
    return {
      id: row.id,
      courseId: row.course_id,
      title: row.title,
      moduleOrder: row.module_order,
      summary: row.summary,
      learningObjectives: row.learning_objectives,
      videos
    };
  }

  private async hydrateVideos(moduleId: string): Promise<VideoResource[]> {
    const result = await this.pool.query("SELECT * FROM videos WHERE module_id = $1 ORDER BY quality_score DESC", [moduleId]);

    return Promise.all(
      result.rows.map(async (row) => ({
        id: row.id,
        moduleId: row.module_id,
        youtubeVideoId: row.youtube_video_id,
        title: row.title,
        url: row.url,
        duration: row.duration ?? "",
        thumbnail: row.thumbnail ?? "",
        channelTitle: row.channel_title ?? "",
        views: row.views ?? 0,
        likes: row.likes ?? 0,
        transcript: row.transcript ?? "",
        semanticScore: row.semantic_score ?? 0,
        qualityScore: row.quality_score ?? 0,
        summary: row.summary ?? "",
        keyTakeaways: row.key_takeaways ?? [],
        flashcards: row.flashcards ?? [],
        quiz: await this.hydrateQuiz(row.id)
      }))
    );
  }

  private async hydrateQuiz(videoId: string): Promise<QuizQuestion[]> {
    const result = await this.pool.query("SELECT * FROM quizzes WHERE video_id = $1", [videoId]);

    return result.rows.map((row) => ({
      id: row.id,
      videoId: row.video_id,
      type: row.type,
      question: row.question,
      options: row.options ?? [],
      correctAnswer: row.correct_answer,
      explanation: row.explanation,
      difficulty: row.difficulty
    }));
  }
}

function mapProgress(row: any): UserProgress {
  return {
    id: row.id,
    userId: row.user_id,
    videoId: row.video_id,
    completed: row.completed,
    quizScore: row.quiz_score,
    watchedPercentage: row.watched_percentage,
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapAttempt(row: any): QuizAttempt {
  return {
    id: row.id,
    userId: row.user_id,
    videoId: row.video_id,
    score: row.score,
    total: row.total,
    weakAreas: row.weak_areas ?? [],
    submittedAt: new Date(row.submitted_at).toISOString()
  };
}
