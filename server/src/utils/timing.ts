import { performance } from "node:perf_hooks";

export async function timeAsync<T>(label: string, task: () => Promise<T>) {
  const started = performance.now();
  const result = await task();
  return {
    label,
    result,
    latencyMs: Math.round(performance.now() - started)
  };
}

export async function withTimeout<T>(label: string, task: Promise<T>, timeoutMs = 20_000) {
  let timeout: NodeJS.Timeout | undefined;

  try {
    return await Promise.race([
      task,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
