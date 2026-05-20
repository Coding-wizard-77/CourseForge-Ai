import { validateDatabaseConnection } from "./services/startupValidator.js";
import { logger } from "./utils/logger.js";

const result = await validateDatabaseConnection();

if (!result.ok) {
  logger.error("Prisma test failed", result);
  process.exitCode = 1;
} else {
  logger.success("Prisma test passed", result);
}
