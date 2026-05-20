import { featureFlags, getConfigurationIssues, getSafeEnvSummary } from "../config/env.js";
import { aiProvider } from "../lib/ai/provider.js";
import { youtubeService } from "../youtube/youtubeService.js";
import { validatePineconeConnection } from "../vectorDB/vectorStore.js";
import { logger } from "../utils/logger.js";
import { timeAsync, withTimeout } from "../utils/timing.js";

export type ServiceHealth = Awaited<ReturnType<typeof aiProvider.validateConnection>> | Awaited<ReturnType<typeof youtubeService.validateConnection>> | Awaited<ReturnType<typeof validateDatabaseConnection>> | Awaited<ReturnType<typeof validatePineconeConnection>>;

export interface StartupHealthReport {
  checkedAt: string;
  env: ReturnType<typeof getSafeEnvSummary>;
  configurationIssues: ReturnType<typeof getConfigurationIssues>;
  services: ServiceHealth[];
}

export async function runStartupValidation(): Promise<StartupHealthReport> {
  logger.info("Validating backend environment", getSafeEnvSummary());

  const configurationIssues = getConfigurationIssues();
  for (const issue of configurationIssues) {
    logger.warn(`${issue.service}: ${issue.message}`, { fix: issue.fix });
  }

  const services: ServiceHealth[] = [];

  services.push(await aiProvider.validateConnection());
  services.push(await youtubeService.validateConnection());
  services.push(await validateDatabaseConnection());
  services.push(await validatePineconeConnection());

  for (const service of services) {
    if (service.ok) {
      logger.success(`${service.service} validation passed`);
    } else if (service.skipped) {
      logger.warn(`${service.service} validation skipped`, { reason: service.error, fix: service.fix });
    } else {
      logger.error(`${service.service} validation failed`, { error: service.error, fix: service.fix });
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    env: getSafeEnvSummary(),
    configurationIssues,
    services
  };
}

export async function validateDatabaseConnection() {
  if (!featureFlags.postgres) {
    return {
      service: "PostgreSQL" as const,
      ok: false,
      skipped: true,
      error: "DATABASE_URL is empty.",
      fix: "Set DATABASE_URL in server/.env and run npm run db:push --workspace server."
    };
  }

  try {
    const { prisma, validatePrismaConnection } = await import("../lib/prisma.js");
    const timing = await timeAsync("Prisma database test", async () => {
      await withTimeout("Prisma connection", validatePrismaConnection(), 20_000);

      const user = await prisma.user.upsert({
        where: { email: "infra-test@courseforge.local" },
        update: { name: "Infrastructure Test Learner" },
        create: {
          id: "infra_test_user",
          email: "infra-test@courseforge.local",
          name: "Infrastructure Test Learner"
        }
      });

      const fetchedUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id }
      });

      const course = await prisma.course.upsert({
        where: { id: "infra_test_course" },
        update: {
          title: "Infrastructure Test Course",
          topic: "C++ pointers",
          difficulty: "beginner",
          estimatedHours: 1,
          roadmap: { modules: [] },
          agentsTrace: [],
          personalization: { nextActions: [] },
          userId: fetchedUser.id
        },
        create: {
          id: "infra_test_course",
          title: "Infrastructure Test Course",
          topic: "C++ pointers",
          difficulty: "beginner",
          estimatedHours: 1,
          roadmap: { modules: [] },
          agentsTrace: [],
          personalization: { nextActions: [] },
          userId: fetchedUser.id
        },
        include: { user: true }
      });

      if (course.user.id !== fetchedUser.id) {
        throw new Error("Prisma relation validation failed: course.user did not match created user.");
      }

      return {
        userId: fetchedUser.id,
        courseId: course.id,
        relationVerified: true
      };
    });

    logger.success("PostgreSQL connected", { latencyMs: timing.latencyMs });
    logger.success("Prisma initialized");
    logger.success("Prisma CRUD and relations verified", timing.result);

    return {
      service: "PostgreSQL" as const,
      ok: true,
      latencyMs: timing.latencyMs,
      userId: timing.result.userId,
      courseId: timing.result.courseId,
      relationVerified: timing.result.relationVerified
    };
  } catch (error) {
    return {
      service: "PostgreSQL" as const,
      ok: false,
      error: error instanceof Error ? error.message : "Database validation failed.",
      fix: explainDatabaseFix(error)
    };
  }
}

function explainDatabaseFix(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/does not exist|table|relation/i.test(message)) {
    return "Database schema is missing or out of sync. Run npm run db:push --workspace server, or npm run db:migrate --workspace server.";
  }
  if (/connect|timeout|ENOTFOUND|ECONNREFUSED|P1001/i.test(message)) {
    return "Check DATABASE_URL, Neon host availability, SSL settings, and network access.";
  }
  if (/authentication|password|permission|P1000/i.test(message)) {
    return "Check Neon username/password and database permissions in DATABASE_URL.";
  }
  if (/PrismaClientInitializationError|adapter/i.test(message)) {
    return "Regenerate Prisma with npm run prisma:generate --workspace server and ensure @prisma/adapter-pg is installed.";
  }
  return "Run npm run prisma:validate --workspace server, npm run prisma:generate --workspace server, then npm run db:push --workspace server.";
}
