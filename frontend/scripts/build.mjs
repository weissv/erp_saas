import { spawn } from "node:child_process";

const HEARTBEAT_INTERVAL_MS = 15000;

function runStep(command, args, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: process.env,
    });

    const heartbeat = setInterval(() => {
      console.log(`[build] ${label} is still running...`);
    }, HEARTBEAT_INTERVAL_MS);

    const cleanup = () => clearInterval(heartbeat);

    child.on("error", (error) => {
      cleanup();
      reject(error);
    });

    child.on("exit", (code, signal) => {
      cleanup();

      if (code === 0) {
        resolve();
        return;
      }

      if (signal) {
        reject(new Error(`${label} terminated with signal ${signal}`));
        return;
      }

      reject(new Error(`${label} failed with exit code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  await runStep("npx", ["tsc"], "TypeScript build");
  await runStep("npx", ["vite", "build"], "Vite build");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});