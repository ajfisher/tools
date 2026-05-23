# Agent Guide

This repository hosts small static browser tools for `https://tools.ajfisher.me`.

## Non-Negotiable Shape

- Put deployable tools in `tools/<slug>/`.
- The public entrypoint for each tool is `tools/<slug>/index.html`.
- Keep each tool as a single self-contained HTML file with embedded HTML, CSS, and JavaScript.
- Do not add a runtime framework or bundler unless the user explicitly approves it for that tool.
- Add `tools/<slug>/README.md`, `tools/<slug>/agent.json`, `tools/<slug>/changelog.md`, and a test file for every tool.
- Keep repo-wide infrastructure outside `tools/<slug>/` unless it is meant to be deployed.

## Implementation Defaults

- Use vanilla JavaScript and browser platform APIs first.
- Prefer custom elements, `<template>`, declarative HTML, and small plain functions over framework patterns.
- Use modern CSS: custom properties, nesting, container queries, grid, flexbox, logical properties, modern selectors, and responsive sizing.
- Keep UI practical and direct. These are tools, not landing pages.
- Use external APIs with `fetch` when useful, but do not put private secrets in browser code.
- Document all browser permissions, prompts, network calls, and persistent storage.
- If a runtime library is proposed, record why it is needed and get confirmation before adding it.

## Tool Manifest

Every `agent.json` must include:

```json
{
  "slug": "example-tool",
  "name": "Example Tool",
  "version": "1.0.0",
  "description": "One sentence explaining what the tool does.",
  "entrypoint": "index.html",
  "capabilities": [],
  "browserApis": [],
  "externalApis": [],
  "localStorageKeys": [],
  "testCommand": "npm test",
  "interactionNotes": "How an agent should use or verify this tool."
}
```

Rules:

- `slug` must match the directory name.
- `version` must be SemVer. New tools start at `1.0.0`.
- `entrypoint` must be `index.html`.
- Use arrays for capabilities, browser APIs, external APIs, and storage keys.
- Use empty arrays when a field does not apply.
- `interactionNotes` should explain how an automated agent can drive the UI, which selectors or workflows matter, and any permissions that need manual approval.

## Commits, Versions, And Changelogs

- Use Conventional Commits for commit messages and PR titles.
- CI validates PR titles with commitlint; keep PR titles ready to use as squash merge commit messages.
- Local commit messages are validated by `.githooks/commit-msg`; run `npm install` or `npm run hooks:install` if the hook is not active.
- Scope tool changes with the tool slug: `feat(packing-list): add reusable trip templates`.
- Use `repo` for repository infrastructure: `ci(repo): tighten deploy checks`.
- Unknown scopes are rejected. For a new tool, create `tools/<slug>/` before committing with that slug as the scope.
- Keep each tool independently versioned in `tools/<slug>/agent.json`.
- Keep each tool's release notes in `tools/<slug>/changelog.md`.
- New tools must start at `1.0.0` and include a `1.0.0` changelog entry.
- Current tool versions must appear in their changelog.
- Use deterministic bump rules: breaking changes bump major, `feat` bumps minor, `fix` and `perf` bump patch.
- Do not silently bump a version. The implementation, `agent.json`, and `changelog.md` should move together in the same change.

## Testing Expectations

- Run `npm test` before handing work back.
- Add targeted tests for the tool behavior, not only the shared smoke test.
- Tool tests may live beside the tool as `tools/<slug>/<slug>.test.mjs` or centrally as `tests/<slug>.test.mjs`.
- Browser tests should serve from `tools/` so local paths match deployed paths.
- Avoid tests that depend on live third-party services unless the tool cannot be validated any other way.

## Deployment Constraints

- GitHub Actions syncs `tools/` to the root of the configured S3 bucket on pushes to `main`.
- Files under `tools/<slug>/` may become public unless excluded by the deploy workflow.
- Do not commit secrets, tokens, personal API keys, or private endpoint credentials.
- Do not rely on server-side code unless the user explicitly changes the hosting model.

## Useful Practice From Similar Repos

Simon Willison's tools repo is a useful reference for low-friction static tools: single-purpose pages, a catalogue-style README, per-tool documentation, and Playwright-backed browser checks. Preserve this repo's directory-per-tool layout and AWS deployment model when adapting those ideas.
