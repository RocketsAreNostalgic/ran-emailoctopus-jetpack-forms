# Release and WordPress.org submission checklist

GitHub is the development source. Before a manual directory submission:

1. Confirm the final plugin slug, WordPress.org contributor account and
   trademark/service permissions.
2. Run `pnpm check`, `pnpm run check:generated`, `composer run phpcs`, and
   `pnpm run release:verify`.
3. Run `pnpm run release:assets` to produce the canonical ZIP, SHA-256 file,
   and JSON manifest from `release-contents.txt`.
4. Install and activate that ZIP in a clean WordPress installation with Jetpack
   active, then run Plugin Check against the unpacked release.
5. Copy the reviewed source to WordPress.org SVN `trunk`, copy that exact
   release to `tags/<version>`, and upload approved directory assets separately
   to `/assets`.
6. Confirm `readme.txt` stable tag, main plugin header version, runtime version
   constant, package metadata, POT project version, and SVN tag all use the same
   `<version>`; do not submit until they agree.

## Existing-release recovery

Published GitHub releases intentionally remain mutable only for bounded recovery
of an existing version. A manual recovery dispatch must be run from protected
`main`; that checked-in ref condition is defence-in-depth against accidental
alternate-ref recovery, while the organisation-level execution-authority policy
is tracked separately in `RocketsAreNostalgic/.github#24`.

Historical repository code is fetched at the requested existing tag, checked
out without repository credentials, verified, and used to rebuild the canonical
ZIP, SHA-256 file, and manifest in a separate job with `permissions: {}`. Only
those rebuilt files cross into a fresh publisher job. The publisher does not
check out or execute the historical repository source.

Before any release mutation, the publisher resolves the live Git tag (peeling
annotated tags to their final commit), requires the existing published release
to target the exact commit recorded in the rebuilt manifest, requires the
release to remain mutable, rejects unexpected or duplicate existing asset names,
and re-verifies manifest, checksum-file, archive, tag, version, and source
identity. Asset deletion and upload are bound to the prevalidated numeric release
ID rather than resolving the mutable tag again during mutation.

After replacement, the publisher re-reads the same release and tag, requires the
exact manifest/ZIP/checksum asset set, and compares GitHub's SHA-256 digest for
every published asset with the rebuilt local file. A partial replacement,
identity drift, target change, asset-set mismatch, digest mismatch, or failed
mutation causes recovery to fail closed. The workflow artifact name is stable
for one workflow run so a failed publisher job can reuse a successful build on
a failed-job rerun; rerunning the build deliberately replaces that same-run
artifact.

This recovery path exists to repair or reconstruct canonical assets for an
already published version, including a separately approved WordPress.org
operation, without minting a new plugin version. It is not a mechanism for
creating a missing release tag or reconciling an unpublished Release Please
candidate; that repository state is tracked separately.

The repository's `wordpress-org/assets/` folder is intentionally separate from
the release ZIP, matching the WordPress.org SVN layout. Routine deployment is
disabled until `wordpress-org/deployment.json` is switched on and the real
WordPress.org slug is assigned.
