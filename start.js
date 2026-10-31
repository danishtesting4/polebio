import { spawnSync } from "node:child_process";

const npm = "/usr/local/bin/npm";
const commands = [
  ["run", "build", "--workspace", "@polebio/shared"],
  ["run", "build", "--workspace", "@polebio/api"],
  ["run", "start", "--workspace", "@polebio/api"]
];

for (const args of commands) {
  const result = spawnSync(npm, args, { stdio: "inherit" });
  if (result.error) {
    console.error("Could not run npm:", result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
