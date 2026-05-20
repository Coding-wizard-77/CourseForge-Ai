import { runStartupValidation } from "../services/startupValidator.js";
import { logger } from "../utils/logger.js";

const report = await runStartupValidation();
const failed = report.services.filter((service) => !service.ok && !service.skipped);

try {
  const { prisma } = await import("../lib/prisma.js");
  await prisma.$disconnect();
} catch {
  // Prisma may be unconfigured in fallback mode; no cleanup needed.
}

if (failed.length) {
  logger.error("Infrastructure validation completed with failures", failed);
  process.exitCode = 1;
} else {
  logger.success("Infrastructure validation completed");
}
