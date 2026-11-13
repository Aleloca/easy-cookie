# Changesets

Every change that should reach npm comes with a changeset:

```sh
pnpm changeset
```

Pick the packages and the bump (patch / minor / major) and write one line for the changelog. On `main`, the release workflow keeps a "Version Packages" pull request up to date; merging it bumps the versions, writes the changelogs and publishes to npm.

All `@easy-cookie/*` packages share one version number (`fixed` group).
