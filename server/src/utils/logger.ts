export type LogLevel = "debug" | "info" | "warn" | "error" | "success";

const symbols: Record<LogLevel, string> = {
  debug: "•",
  info: "i",
  warn: "!",
  error: "x",
  success: "✓"
};

export const logger = {
  debug(message: string, meta?: unknown) {
    write("debug", message, meta);
  },
  info(message: string, meta?: unknown) {
    write("info", message, meta);
  },
  warn(message: string, meta?: unknown) {
    write("warn", message, meta);
  },
  error(message: string, meta?: unknown) {
    write("error", message, meta);
  },
  success(message: string, meta?: unknown) {
    write("success", message, meta);
  }
};

function write(level: LogLevel, message: string, meta?: unknown) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${symbols[level]} ${message}`;

  if (meta === undefined) {
    console[level === "success" ? "log" : level](line);
    return;
  }

  console[level === "success" ? "log" : level](line, sanitizeMeta(meta));
}

function sanitizeMeta(meta: unknown) {
  if (!meta || typeof meta !== "object") {
    return meta;
  }

  return JSON.parse(
    JSON.stringify(meta, (key, value) => {
      if (/key|token|secret|password|url/i.test(key) && typeof value === "string") {
        if (value === "<empty>") {
          return value;
        }
        return maskSecret(value);
      }
      return value;
    })
  );
}

export function maskSecret(value = "") {
  if (!value) {
    return "<empty>";
  }

  if (value.length <= 8) {
    return "****";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}
