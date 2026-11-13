# Contributing

Thanks for helping! A few ground rules keep easy-cookie trustworthy.

## Setup

```sh
pnpm install
pnpm --filter @easy-cookie/core build   # other packages consume its build
pnpm test
```

The consent server's tests need Postgres. Start it with `docker compose up -d db`, or point `DATABASE_URL` at your own instance.

## Rules that are not negotiable

These come from the Italian Garante 2021 cookie guidelines and the EDPB cookie banner taskforce. PRs that weaken them will not be merged, even behind an option:

- accept and reject must keep equal visual weight;
- the X must count as a rejection;
- categories must stay off by default (no pre-ticked boxes);
- scrolling or continued browsing must never count as consent;
- withdrawing must stay as easy as consenting.

## The forked engine

`packages/core/src/engine` is a source fork of vanilla-cookieconsent v3.3.0. When you change it:
- keep its Jest tests green (`pnpm --filter @easy-cookie/core test`);
- record the change in `packages/core/UPSTREAM.md`.

When you port a fix from upstream, record the upstream commit in the same file.

## Commits and PRs

- Small, focused PRs, with a test for every bug fix.
- Visitor-facing copy must exist in both IT and EN (`packages/core/src/shared/defaults.ts`).

## Releasing to npm

Releases are automated (`.github/workflows/release.yml`):

1. With every change that should reach npm, add a changeset: `pnpm changeset`. Pick the bump and write one changelog line.
2. On `main`, the release workflow opens or updates a **Version Packages** pull request with the new versions and changelogs.
3. Merging that pull request publishes the bumped `@easy-cookie/*` packages to npm, with provenance.

Publishing uses npm Trusted Publishing, so there is no npm token in the repository secrets. Each package is configured on npmjs.com (package → Settings → Trusted publishing) with: GitHub Actions, owner `Aleloca`, repository `easy-cookie`, workflow `release.yml`.
