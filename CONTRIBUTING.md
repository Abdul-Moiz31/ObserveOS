# Contributing to ObserveOS

First off, thank you for considering contributing to ObserveOS. This project is built in the open, and contributions of any size — typo fixes, bug reports, new provider wrappers, dashboard features — are genuinely welcome.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Security Issues](#security-issues)

## Code of Conduct

Be respectful, assume good intent, and keep feedback focused on the code and ideas, not the person. Harassment or discrimination of any kind will not be tolerated.

## Ways to Contribute

- **Bug reports** — found something broken? [Open an issue](https://github.com/Abdul-Moiz31/ObserveOS/issues/new).
- **Bug fixes** — pick up an open issue, or fix something you found yourself.
- **New provider wrappers** — add support for another LLM provider under `packages/sdk/src/providers`.
- **Dashboard features** — new views, charts, or filters under `packages/dashboard`.
- **Documentation** — clarify setup steps, fix typos, add examples.
- **Tests** — increase coverage, especially around cost calculation and the trace pipeline.

## Getting Started

1. **Fork** the repository and clone your fork:

   ```bash
   git clone https://github.com/<your-username>/ObserveOS.git
   cd ObserveOS
   ```

2. **Install dependencies** (Node.js >= 20, npm 10.x required):

   ```bash
   npm ci
   ```

3. **Set up your environment:**

   ```bash
   cp .env.example .env
   ```

   Fill in the values you need — you don't need real Cloudflare credentials to work on the SDK alone.

4. **Run the dev servers:**

   ```bash
   npm run dev
   ```

## Project Structure

```
packages/
├── sdk/         # observeos npm package — provider wrappers, tracer, exporter
├── worker/      # Cloudflare Worker — ingestion API, auth, D1 storage
└── dashboard/   # Next.js — trace/cost/error views
```

See the [README](./README.md#project-structure) for a more detailed breakdown. If you're adding a new provider wrapper, model it after an existing one in `packages/sdk/src/providers/` and export it from `packages/sdk/src/index.ts`.

## Development Workflow

```bash
npm run dev          # all dev servers, in parallel
npm run build         # build all packages
npm test              # run all test suites
npm run lint           # lint all packages
npm run type-check     # type-check all packages
npm run format          # format with Prettier
```

Scope commands to a single package with npm workspace flags when iterating:

```bash
npm run test --workspace=packages/sdk
npm run dev --workspace=packages/worker
npm run dev --workspace=packages/dashboard
```

## Coding Standards

- **TypeScript strict mode** — no `any` unless there's no reasonable alternative, and prefer narrowing over casting.
- **No unrelated changes** — keep PRs focused; don't reformat files you didn't otherwise touch.
- **Match existing patterns** — look at neighboring code (e.g. an existing provider wrapper or route handler) before introducing a new pattern.
- **Run `npm run format` and `npm run lint`** before committing — CI will fail the build otherwise.
- **Public SDK APIs need types** — anything exported from `packages/sdk/src/index.ts` should have explicit, documented types.

## Testing

- The SDK uses [Vitest](https://vitest.dev/). Add or update tests under `packages/sdk/src/__tests__` for any change to tracer, exporter, cost calculation, or provider wrapper behavior.
- Run the full suite with `npm test`, or scope it with `npm run test --workspace=packages/sdk`.
- New providers should include tests covering: a successful call, an error response, and cost/token accounting.
- PRs that change worker routes should be tested locally against `wrangler dev` before submission.

## Commit Messages

Use clear, descriptive commit messages. Conventional prefixes are encouraged but not strictly enforced:

```
feat: add wrapGemini() provider wrapper
fix: correct token cost calculation for gpt-4o
docs: clarify D1 setup steps in README
chore: bump turbo to 2.1.0
```

## Pull Request Process

1. Create a branch off `main`: `git checkout -b feat/your-feature`.
2. Make your changes, with tests where applicable.
3. Run the full check suite locally before opening a PR:

   ```bash
   npm run type-check && npm run lint && npm test && npm run build
   ```

4. Open a PR against `main` with:
   - A clear description of **what** changed and **why**.
   - Linked issue(s), if applicable (`Closes #123`).
   - Screenshots for any dashboard/UI changes.
5. The `pr.yml` GitHub Actions workflow will automatically type-check, lint, test, and build your branch. All checks must pass before merge.
6. Address review feedback via additional commits — no need to force-push or squash until a maintainer asks.
7. A maintainer will merge once the PR is approved and CI is green.

## Reporting Bugs

When filing a bug report, please include:

- What you expected to happen vs. what actually happened.
- Steps to reproduce, ideally a minimal code snippet.
- Which package is affected (`sdk`, `worker`, or `dashboard`).
- Your Node.js version and OS.
- Any relevant logs (with `OBSERVEOS_DEBUG=true` if it's an SDK issue).

## Suggesting Features

Open an issue describing the problem you're trying to solve, not just the feature itself — context helps us evaluate whether it fits the project's scope (self-hosted, provider-agnostic LLM observability). Check the [Roadmap](./README.md#roadmap) first to see if it's already planned.

## Security Issues

Please **do not** open a public issue for security vulnerabilities. Instead, email the maintainer directly at **abdulmoiz3140@gmail.com** with details, and allow time for a fix before public disclosure.

---

Thanks again for contributing — every PR, issue, and suggestion helps make ObserveOS better.
