const fs = require("node:fs");
const path = require("node:path");

function allowedScopes() {
  const toolsPath = path.join(__dirname, "tools");

  try {
    return [
      "repo",
      ...fs
        .readdirSync(toolsPath, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
        .map((entry) => entry.name)
        .sort()
    ];
  } catch {
    return ["repo"];
  }
}

module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-empty": [2, "never"],
    "scope-case": [2, "always", "kebab-case"],
    "scope-enum": [2, "always", allowedScopes()]
  },
  helpUrl: "https://www.conventionalcommits.org/"
};
