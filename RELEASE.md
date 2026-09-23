# Release and WordPress.org submission

GitHub releases are produced from the protected main branch by the shared
Profile B workflow, pinned in `.github/workflows/release-please.yml`.
Release Please owns SemVer, Conventional Commit interpretation, changelog,
release PR, tag and GitHub Release identity.

## Canonical GitHub release

1. Use an ordinary PR and the required terminal `quality` check. The
   repository Quality run builds one deterministic ZIP, SHA-256 file and CI
   repository manifest, then verifies the archive, generated Admin Shell
   resources, WordPress/Jetpack compatibility and installed ZIP, saved-form
   smoke and pinned Plugin Check results.
2. Once merged, the exact successful main Quality run enters shared Profile B.
   Release Please opens or updates its canonical release PR.
3. The Release Please candidate must pass dispatched Quality at its exact SHA,
   including the shared baseline, plugin-specific checks and terminal
   `quality`. The protected release PR also needs its normal PR check; a
   maintainer may need to approve a run opened by `github-actions[bot]`.
4. Merge the release PR through protected main. A fresh successful merged-main
   Quality run produces the publication artifact. Profile B downloads that
   exact run and attempt, verifies the manifest, SHA-256 and Release Please
   draft identity, uploads only the tested ZIP and checksum, publishes
   immutably, and reads back the exact tag target and asset digests.

The richer repository manifest stays inside the Actions artifact as CI evidence.
Never rebuild or substitute release bytes after qualification. Never attach
assets to an existing published release or use `--clobber`. If a release
fails, fix source/build, qualify a fresh candidate, and use the next
Release Please version and immutable tag.

## WordPress.org

The separate WordPress.org observer runs after a successful Profile B release.
It reads `wordpress-org/deployment.json` from the exact admitted main commit
and currently no-ops because `enabled` is `false`. GitHub release quality
and publication never require WordPress.org credentials.

Before initial directory submission, confirm the approved plugin slug,
contributor account and service permissions. Manually submit the exact
reviewed immutable GitHub release ZIP; do not rebuild it. After WordPress.org
assigns a slug, follow [the protected deployment contract](wordpress-org/DEPLOYMENT.md)
to configure scoped environment secrets and a reviewed committed activation.
Listing artwork stays outside the installable ZIP and is controlled only by
the committed `syncListingAssets` boolean. There is no manual deployment
bypass.
