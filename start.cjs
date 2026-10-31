const { spawnSync } = require("node:child_process");

const result = spawnSync(
  "npm",
  ["run", "start", "--workspace", "@polebio/api"],
  { stdio: "inherit", shell: true }
);

process.exit(result.status ?? 1);
