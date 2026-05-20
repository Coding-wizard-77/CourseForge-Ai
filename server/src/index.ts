import { createApp } from "./app.js";
import { env, featureFlags } from "./services/env.js";
import { runStartupValidation } from "./services/startupValidator.js";
import { logger } from "./utils/logger.js";

await runStartupValidation();

const app = await createApp();

app.listen(env.PORT, () => {
  logger.success(`Server running on port ${env.PORT}`);
  logger.info("Integrations", featureFlags);
});
