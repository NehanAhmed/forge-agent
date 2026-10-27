# Releasing Forge

This document is the release checklist for the `@nehanahmed/forge` npm package.

Forge is a CLI-only package. The published command is `forge`; the package does not expose a `main` module for library imports.

## Version policy

- Use semantic versioning.
- While the project is pre-1.0, minor releases may include breaking changes.
- Current target for the dashboard release: `0.2.0`.
- Use patch releases for backwards-compatible fixes.
- Publish prereleases with the `next` npm tag, never `latest`.
- A published npm version is immutable. Do not reuse a version number.

Examples:

```sh
# Stable release
npm version 0.2.0 --no-git-tag-version
git commit -am "chore(release): v0.2.0"
git tag -a v0.2.0 -m "v0.2.0"
git push origin main v0.2.0

# Prerelease
npm version 0.2.1-beta.1 --no-git-tag-version
# Publish with --tag next instead of the default latest
```

## Git tag and npm version rules

- Tag format: `vX.Y.Z`.
- Use annotated tags only.
- The tag commit must be on `main`.
- The tag version must exactly match `package.json` `version`.
- Never publish from a feature branch.
- Never move or reuse a published tag.

Verify a release before publishing:

```sh
git rev-parse vX.Y.Z^{commit}
npm view @nehanahmed/forge@X.Y.Z gitHead
```

The two commit values must match.

## Release checklist

1. Merge the release PR into `main`.
2. Wait for CI to pass on `main`.
3. Confirm `package.json` has the intended version.
4. Run locally:

   ```sh
   pnpm install --frozen-lockfile
   pnpm test
   pnpm build
   pnpm audit --prod --audit-level high
   npm pack --dry-run
   ```

5. Create and push the annotated tag:

   ```sh
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```

6. The release workflow publishes the package with provenance and creates the GitHub Release.
7. Verify:

   ```sh
   npm view @nehanahmed/forge dist-tags
   npm view @nehanahmed/forge@X.Y.Z gitHead
   npm view @nehanahmed/forge@X.Y.Z dist.attestations
   ```

8. Smoke-test the global install in a real terminal:

   ```sh
   npm install --global @nehanahmed/forge@X.Y.Z
   forge
   forge chat
   forge config set-key <key>
   ```

## npm dist-tags

- `latest` is the default version installed by `npm install`.
- `next` is for prereleases.
- `beta` is optional for longer beta cycles.

Publish a prerelease:

```sh
npm publish --tag next --provenance --access public
```

Promote a validated prerelease:

```sh
npm dist-tag add @nehanahmed/forge@X.Y.Z latest
```

## Publishing configuration

The preferred setup is npm Trusted Publishing through GitHub Actions OIDC:

- Repository: `NehanAhmed/forge-agent`
- Workflow: `.github/workflows/release.yml`
- GitHub environment: `npm`
- Workflow permissions: `contents: write`, `id-token: write`
- npm CLI: 11.5.1 or newer (the release workflow uses Node 24)

If Trusted Publishing is not available, use a granular npm token stored as the `NPM_TOKEN` GitHub secret. The release workflow maps it to `NODE_AUTH_TOKEN` only for the publish step. When OIDC is available, npm uses OIDC first; the token is the fallback. Limit the token to this package and enable 2FA bypass only if required.

Do not commit npm tokens or GitHub tokens.

## GitHub environment and tag protection

- Protect `main` with required CI checks.
- Protect `v*` tags so only maintainers can create release tags.
- Configure the `npm` environment with required reviewers.
- Require an explicit approval before a release workflow can publish.

## Historical tag note

`v0.1.0` is a historical tag pointing at the `0.1.1` commit (`669e8d4`). npm `0.1.0` was published from `519f510`.

The tag is intentionally left immutable. Do not use `v0.1.0` to reconstruct the `0.1.0` source; the npm tarball is the source of truth for that release.

`v0.1.1`, `v0.1.2`, and `v0.1.3` point at the correct source commits and have GitHub Releases.

## If a release is bad

- Do not delete or reuse the version.
- Deprecate the version with `npm deprecate`.
- Publish a patch release with the fix.
- Unpublish only when npm policy allows it and the change has been explicitly approved.
