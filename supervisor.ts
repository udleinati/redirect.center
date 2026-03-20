const INITIAL_DELAY = 1000;
const MAX_DELAY = 30000;
const STABLE_THRESHOLD = 60000; // Reset backoff after 60s of stable uptime

let delay = INITIAL_DELAY;
let shouldRun = true;

function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[supervisor] ${timestamp} ${message}`);
}

async function runProcess(): Promise<number> {
  const scriptPath = new URL("./src/main.ts", import.meta.url).pathname;

  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "run",
      "--allow-net",
      "--allow-read",
      "--allow-env",
      "--unstable-kv",
      scriptPath,
    ],
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const process = command.spawn();

  // Forward signals to child process
  const signalHandler = () => {
    shouldRun = false;
    log("Shutdown signal received, stopping child process...");
    process.kill("SIGTERM");
  };

  Deno.addSignalListener("SIGINT", signalHandler);
  Deno.addSignalListener("SIGTERM", signalHandler);

  const status = await process.status;

  Deno.removeSignalListener("SIGINT", signalHandler);
  Deno.removeSignalListener("SIGTERM", signalHandler);

  return status.code;
}

async function main(): Promise<void> {
  log("Supervisor started");

  while (shouldRun) {
    const startTime = Date.now();
    log("Starting application...");

    const exitCode = await runProcess();

    if (!shouldRun) {
      log("Graceful shutdown complete");
      Deno.exit(0);
    }

    const uptime = Date.now() - startTime;

    if (uptime >= STABLE_THRESHOLD) {
      delay = INITIAL_DELAY;
      log(`Process exited with code ${exitCode} after ${Math.floor(uptime / 1000)}s (stable). Restarting in ${delay}ms...`);
    } else {
      log(`Process exited with code ${exitCode} after ${Math.floor(uptime / 1000)}s. Restarting in ${delay}ms...`);
      delay = Math.min(delay * 2, MAX_DELAY);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

main();
