# tools.ajfisher.me

Static, single-page web tools for <https://tools.ajfisher.me>.

This repository is a catch-all for small browser-native tools that do not need a dedicated application stack. Each tool should be useful on its own, live in one URL path, and run entirely in the browser unless it explicitly calls a public external API.

The setup borrows a few useful practices from [simonw/tools](https://github.com/simonw/tools): keep the main README useful as a catalogue and operating guide, document each tool beside its source, and validate tools with lightweight browser tests. This repo differs by using one directory per tool so AWS S3 and CloudFront can serve paths such as `https://tools.ajfisher.me/packing-list/`.

## Repository Layout

```text
.
├── tools/
│   └── <slug>/
│       ├── index.html
│       ├── README.md
│       ├── agent.json
│       ├── changelog.md
│       └── <slug>.test.mjs
├── tests/
│   └── repo-structure.test.mjs
├── .github/workflows/
│   ├── ci.yml
│   └── deploy.yml
├── AGENTS.md
├── package.json
└── README.md
```

`tools/<slug>/index.html` is the deployable page for `https://tools.ajfisher.me/<slug>/`. Files beside it document and test the tool.

## Tool Contract

Every tool directory must include:

- `index.html`: one complete HTML document with the tool's HTML, CSS, and JavaScript embedded in that file.
- `README.md`: human-readable notes explaining what the tool does, how it works, browser/API requirements, and any privacy or data-storage behavior.
- `agent.json`: structured metadata for agents and automation.
- `changelog.md`: per-tool changelog with the current version documented.
- A test file named either `tools/<slug>/<slug>.test.mjs` or `tests/<slug>.test.mjs`.

The required `agent.json` shape is:

```json
{
  "slug": "packing-list",
  "name": "Packing List",
  "version": "1.0.0",
  "description": "Build and manage a packing checklist in the browser.",
  "entrypoint": "index.html",
  "capabilities": ["local checklist editing"],
  "browserApis": ["localStorage"],
  "externalApis": [],
  "localStorageKeys": ["tools.packing-list.items"],
  "testCommand": "npm test",
  "interactionNotes": "No network calls. User data stays in localStorage."
}
```

Use empty arrays when a tool has no browser APIs, external APIs, or storage keys.

## Versioning And Commits

Use Conventional Commits for PR titles and commit messages:

```text
feat(packing-list): add reusable trip templates
fix(packing-list): preserve checked items after reload
docs(packing-list): clarify localStorage behavior
chore(repo): update deployment workflow
```

Scopes must be tool slugs when a change belongs to one tool, or `repo` for repository infrastructure. The local hook and CI reject unknown scopes; add the `tools/<slug>/` directory before committing `feat(<slug>)` for a new tool. If a change spans several tools, use the most specific scope available in the PR title and explain the affected tools in the body.

CI validates PR titles with commitlint. Use squash merges so the validated PR title becomes the commit on `main`.

Local commits are checked with the same rules through a tracked `commit-msg` hook. `npm install` runs the hook installer automatically; use `npm run hooks:install` if a clone needs to reapply it. Git commit hooks cannot be committed directly into `.git/hooks`, so this repo sets `core.hooksPath` to `.githooks`.

Each tool is independently versioned:

- New tools start at `1.0.0`.
- The tool version lives in `tools/<slug>/agent.json` as `version`.
- Every tool maintains `tools/<slug>/changelog.md`.
- The current `agent.json` version must appear in that tool's changelog.
- Tags should use `tool/<slug>/v<version>` when release tags are needed, for example `tool/packing-list/v1.0.0`.

The deterministic bump rules are:

- `feat(<slug>)` bumps the tool minor version.
- `fix(<slug>)` and `perf(<slug>)` bump the tool patch version.
- A Conventional Commit breaking marker, either `!` or `BREAKING CHANGE:`, bumps the tool major version.
- `docs`, `test`, `style`, `refactor`, `build`, `ci`, and `chore` do not bump a tool unless the PR explicitly changes user-facing behavior; if they do, use `feat`, `fix`, or a breaking marker instead.

This can be fully automated and deterministic as long as commits are scoped to tool slugs and behavior-changing work uses the correct Conventional Commit type. The automation can map changed commits to tool directories, calculate the next SemVer value, update `agent.json`, update `changelog.md`, and tag the release. Human judgment is still needed to choose the correct commit type and mark breaking changes accurately.

## Authoring Principles

- Keep each tool single-page and self-contained. Do not introduce bundlers or build output for individual tools by default.
- Prefer vanilla JavaScript, custom elements, `<template>`, and small local modules inside the page over frameworks.
- Use modern CSS deliberately: custom properties, cascade layers when useful, nesting, container queries, logical properties, grid, flexbox, modern selectors, and responsive constraints.
- Use browser APIs fully where they make sense, including camera, microphone, geolocation, clipboard, file, drag/drop, canvas, workers, storage, and Web Crypto. Tools must prompt clearly through browser-native permission flows and document those APIs.
- External APIs are allowed through `fetch`, but browser-delivered tools must not require private secrets. Any key or token entered by a user must stay in that user's browser unless the tool clearly says otherwise.
- Runtime third-party libraries are not the default. Confirm and document any runtime library before adding it, including why the browser platform is not enough and where the library is loaded from.
- Dev/test dependencies are allowed for repository quality checks. They must not become runtime requirements for tools.

## Documentation

Each tool README should cover:

- purpose and primary workflow
- expected inputs and outputs
- browser APIs, permissions, and prompts
- external APIs and data sent over the network
- `localStorage` or other persistent storage keys
- runtime third-party libraries, if any
- current version and changelog location
- how to run the tool's tests

The root README should stay useful as the high-level catalogue and contributor guide. As tools are added, list them here with a short description and deployed URL.

## Development

Install dependencies:

```bash
npm install
```

This also installs the local commit-message hook.

Run all checks:

```bash
npm test
```

The tests validate the tool directory contract, required agent manifest fields, and browser-load smoke behavior for every tool directory. The browser smoke test starts a local static server rooted at `tools/` and checks each `/<slug>/` path in Chromium.

When adding the first tool locally, install the browser used by Playwright if it is not already present:

```bash
npx playwright install chromium
```

## Deployment

GitHub Actions deploys on pushes to `main`.

The deploy workflow syncs `tools/` to the S3 bucket root:

- `tools/packing-list/index.html` becomes `s3://$S3_BUCKET/packing-list/index.html`
- CloudFront serves it as `https://tools.ajfisher.me/packing-list/`

Required GitHub configuration:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET`
- `CLOUDFRONT_DISTRIBUTION_ID`

The AWS access key should be scoped to the minimum required S3 bucket actions and CloudFront invalidation for the target distribution.

## Tool Catalogue

No tools have been added yet.
