---
title: "npm publish --provenance breaks Trusted Publishing OIDC flow"
date: 2026-05-28
pr: https://github.com/hatlabs/signalk-halpi/pull/17
tags: [npm, ci, oidc, trusted-publishing, github-actions, release-workflow]
---

# Problem

`Publish Stable Release` workflow's `npm-publish` job consistently failed with:

```
npm notice publish Signed provenance statement with source and build information from GitHub Actions
npm notice publish Provenance statement published to transparency log
npm error code E404
npm error 404 Not Found - PUT https://registry.npmjs.org/signalk-halpi
npm error 404  'signalk-halpi@0.1.4' is not in this registry.
```

Provenance signing via the GitHub OIDC token succeeded (sigstore accepted it; the attestation landed in the Rekor transparency log). The subsequent `PUT` to the npm registry was rejected as 404.

The Trusted Publisher entry on npmjs.com was correctly configured:
- Organization or user: `hatlabs`
- Repository: `signalk-halpi`
- Workflow filename: `release.yml`
- Environment: (blank)
- Allowed actions: `Allow npm publish` ✓

`package.json` `repository.url` was `git+https://github.com/hatlabs/signalk-halpi.git`, matching the GitHub repo. A previous version (`0.1.3`, published 2026-03-29) had landed via the same workflow and Trusted Publisher entry; its attestation showed `_npmUser.trustedPublisher.id = "github"`. So OIDC trusted publishing had demonstrably worked for this package, then broke.

# Root Cause

`npm publish --provenance --access public`.

The explicit `--provenance` flag belongs to the older **token-based** provenance flow, where the workflow passes `NODE_AUTH_TOKEN` and `--provenance` makes npm additionally sign an attestation. When using **Trusted Publishing**, npm 11.5.1+ automatically:

1. Detects the GitHub Actions OIDC env vars.
2. Signs a provenance attestation via sigstore (this part succeeds even with `--provenance` set).
3. Exchanges the OIDC token for a short-lived npm publish token via the registry's trusted-publishing endpoint.
4. Uses that short-lived token to PUT the package.

With `--provenance` set *and* no `NODE_AUTH_TOKEN`, npm appears to take a hybrid code path: it does the provenance signing (step 2) but skips the OIDC publish-token exchange (step 3), then attempts the PUT with no usable credential — which the registry rejects as 404.

The npm docs are genuinely inconsistent on this point:

- The older `generating-provenance-statements` page shows `npm publish --provenance --access public` with an explicit `NODE_AUTH_TOKEN`.
- The newer `trusted-publishers` page shows a bare `npm publish` (no flags) with no token.

Using the older example's flag in the newer flow's auth mode is what broke us.

# Solution

Match the trusted-publishing docs example exactly:

```yaml
- uses: actions/setup-node@v6
  with:
    node-version: '24'
    registry-url: 'https://registry.npmjs.org'
    package-manager-cache: false
- run: npm publish
```

Specifically:
- **Drop `--provenance`**. Trusted Publishing generates provenance automatically; the explicit flag steers npm into the wrong auth code path.
- **Drop `--access public`**. Only required on the first publish of an unscoped package; subsequent publishes inherit the existing public access.
- **Keep `registry-url:`** so setup-node configures npmjs as the publish target. (Dropping it in PR #15 caused `ENEEDAUTH` because npm then had no registry configured at all and didn't attempt OIDC.)

# Verification

`signalk-halpi@0.1.4` published successfully on 2026-05-28 after PR #17 landed; npm `dist-tags.latest` updated from `0.1.3` to `0.1.4`. Provenance attestation on the new version shows the same `trustedPublisher.id = "github"` as before.

# Wrong Hypotheses Tested First

Documented honestly to save future debug time:

1. **PR #15** — Hypothesized `setup-node`'s `registry-url:` was writing an empty `_authToken=${NODE_AUTH_TOKEN}` that interfered with OIDC discovery. **Wrong.** Removing `registry-url:` made the failure worse (`ENEEDAUTH` instead of `E404`).
2. **PR #16** — Hypothesized `setup-node@v4` had a different `.npmrc` behavior than `@v6`. **Wrong.** Bumping to `@v6` had no effect on the publish failure. (It is still worth keeping for the unrelated Node 20 deprecation sweep.)
3. **Trusted Publisher entry misconfiguration** — Hypothesized one of the four fields didn't match. **Wrong.** User-supplied screenshot confirmed all four fields exactly matched.

The wrong hypotheses were all on the workflow's auth-configuration side; the real cause was the publish-command code path being selected by an out-of-place flag.

# If You Hit This in Another Repo

Any GitHub-Actions-driven npm release workflow that uses Trusted Publishing should use a **bare `npm publish`**, not `npm publish --provenance --access public`. If you see provenance signing succeed and then a 404 PUT, drop the flags first.
