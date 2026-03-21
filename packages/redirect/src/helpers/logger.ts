import { config } from "../config.ts";

const LEVELS: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LEVELS[config.loggerLevel] ?? 0;

export const logger = {
  debug: (...args: unknown[]) => {
    if (currentLevel <= LEVELS.debug) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (currentLevel <= LEVELS.info) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (currentLevel <= LEVELS.warn) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (currentLevel <= LEVELS.error) console.error(...args);
  },
  log: (...args: unknown[]) => {
    console.log(...args);
  },
};
