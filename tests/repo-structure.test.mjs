import assert from "node:assert/strict";
import { createReadStream, existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const toolsRoot = path.join(repoRoot, "tools");
const testsRoot = path.join(repoRoot, "tests");

const requiredManifestFields = [
  "slug",
  "name",
  "version",
  "description",
  "entrypoint",
  "capabilities",
  "browserApis",
  "externalApis",
  "localStorageKeys",
  "testCommand",
  "interactionNotes"
];

async function listToolDirectories() {
  const entries = await readdir(toolsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();
}

function toolTestCandidates(slug) {
  return [
    path.join(toolsRoot, slug, `${slug}.test.mjs`),
    path.join(toolsRoot, slug, `${slug}.test.js`),
    path.join(toolsRoot, slug, `${slug}.spec.mjs`),
    path.join(toolsRoot, slug, `${slug}.spec.js`),
    path.join(testsRoot, `${slug}.test.mjs`),
    path.join(testsRoot, `${slug}.test.js`),
    path.join(testsRoot, `${slug}.spec.mjs`),
    path.join(testsRoot, `${slug}.spec.js`)
  ];
}

async function readManifest(slug) {
  const manifestPath = path.join(toolsRoot, slug, "agent.json");
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function contentTypeFor(filePath) {
  switch (path.extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".md":
      return "text/markdown; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

async function startStaticServer(root) {
  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      let requestPath = decodeURIComponent(requestUrl.pathname);

      if (requestPath.endsWith("/")) {
        requestPath += "index.html";
      }

      const filePath = path.normalize(path.join(root, requestPath));
      const rootWithSeparator = root.endsWith(path.sep) ? root : `${root}${path.sep}`;

      if (filePath !== root && !filePath.startsWith(rootWithSeparator)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      response.writeHead(200, { "content-type": contentTypeFor(filePath) });
      createReadStream(filePath).pipe(response);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      response.writeHead(500);
      response.end("Server error");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

test("tools directory exists", async () => {
  const toolsStats = await stat(toolsRoot);
  assert.equal(toolsStats.isDirectory(), true);
});

test("every tool directory has the required files", async () => {
  const slugs = await listToolDirectories();

  for (const slug of slugs) {
    const toolRoot = path.join(toolsRoot, slug);
    assert.ok(existsSync(path.join(toolRoot, "index.html")), `${slug} is missing index.html`);
    assert.ok(existsSync(path.join(toolRoot, "README.md")), `${slug} is missing README.md`);
    assert.ok(existsSync(path.join(toolRoot, "agent.json")), `${slug} is missing agent.json`);
    assert.ok(existsSync(path.join(toolRoot, "changelog.md")), `${slug} is missing changelog.md`);
    assert.ok(
      toolTestCandidates(slug).some((candidate) => existsSync(candidate)),
      `${slug} is missing a test file`
    );
  }
});

test("every tool manifest has the required agent metadata", async () => {
  const slugs = await listToolDirectories();

  for (const slug of slugs) {
    const manifest = await readManifest(slug);

    for (const field of requiredManifestFields) {
      assert.ok(Object.hasOwn(manifest, field), `${slug}/agent.json is missing ${field}`);
    }

    assert.equal(manifest.slug, slug, `${slug}/agent.json slug must match its directory`);
    assert.match(
      manifest.version,
      /^\d+\.\d+\.\d+$/,
      `${slug}/agent.json version must be SemVer, for example 1.0.0`
    );
    assert.equal(manifest.entrypoint, "index.html", `${slug}/agent.json entrypoint must be index.html`);
    assert.equal(typeof manifest.name, "string", `${slug}/agent.json name must be a string`);
    assert.equal(typeof manifest.description, "string", `${slug}/agent.json description must be a string`);
    assert.equal(typeof manifest.testCommand, "string", `${slug}/agent.json testCommand must be a string`);
    assert.equal(
      typeof manifest.interactionNotes,
      "string",
      `${slug}/agent.json interactionNotes must be a string`
    );

    for (const field of ["capabilities", "browserApis", "externalApis", "localStorageKeys"]) {
      assert.equal(Array.isArray(manifest[field]), true, `${slug}/agent.json ${field} must be an array`);
    }
  }
});

test("every tool changelog documents the current version", async () => {
  const slugs = await listToolDirectories();

  for (const slug of slugs) {
    const manifest = await readManifest(slug);
    const changelog = await readFile(path.join(toolsRoot, slug, "changelog.md"), "utf8");
    const versionHeadingPattern = new RegExp(`^## \\[?${escapeRegExp(manifest.version)}\\]?\\b`, "m");

    assert.match(changelog, /^# Changelog\b/m, `${slug}/changelog.md must include a Changelog title`);
    assert.match(
      changelog,
      versionHeadingPattern,
      `${slug}/changelog.md must include a heading for version ${manifest.version}`
    );
  }
});

test("every tool page loads without console errors", { skip: !(await listToolDirectories()).length }, async () => {
  const slugs = await listToolDirectories();
  const server = await startStaticServer(toolsRoot);
  const browser = await chromium.launch();

  try {
    for (const slug of slugs) {
      const page = await browser.newPage();
      const errors = [];

      page.on("console", (message) => {
        if (message.type() === "error") {
          errors.push(message.text());
        }
      });
      page.on("pageerror", (error) => errors.push(error.message));

      const response = await page.goto(`${server.origin}/${slug}/`, {
        waitUntil: "domcontentloaded"
      });

      assert.ok(response?.ok(), `${slug} did not return a successful response`);
      assert.ok(await page.locator("body").evaluate((body) => body.childElementCount > 0), `${slug} has an empty body`);
      assert.deepEqual(errors, [], `${slug} logged browser errors`);

      await page.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
});
