import { spawnSync } from "node:child_process";

const insideWorkTree = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
  stdio: "ignore"
});

if (insideWorkTree.status !== 0) {
  process.exit(0);
}

const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
  stdio: "inherit"
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
