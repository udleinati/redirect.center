/**
 * Simple logger with configurable levels.
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LEVELS;

const currentLevel: LogLevel = (Deno.env.get("LOGGER_LEVEL") ?? "debug") as LogLevel;

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= (LEVELS[currentLevel] ?? 0);
}

export const logger = {
  debug(msg: string, ...args: unknown[]) {
    if (shouldLog("debug")) console.log(`[proxy] ${msg}`, ...args);
  },
  info(msg: string, ...args: unknown[]) {
    if (shouldLog("info")) console.log(`[proxy] ${msg}`, ...args);
  },
  warn(msg: string, ...args: unknown[]) {
    if (shouldLog("warn")) console.warn(`[proxy] ${msg}`, ...args);
  },
  error(msg: string, ...args: unknown[]) {
    if (shouldLog("error")) console.error(`[proxy] ${msg}`, ...args);
  },
};
