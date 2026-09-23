# Protected WordPress.org deployment

GitHub is the canonical release source. Profile B publishes only the exact
Quality-tested plugin ZIP and its SHA-256 file, then makes the GitHub release
immutable. The WordPress.org workflow runs only after the canonical
`Release Please` workflow has completed successfully and independently binds
that exact main commit to one immutable GitHub release before it can enter the
protected deployment environment.

Routine deployment is disabled while `deployment.json` has `enabled: false`.
There is no manual bypass. Do not set a `wordpressOrgSlug`, add environment
secrets, or enable deployment until WordPress.org has approved the manually
submitted ZIP and assigned the real slug.

## First activation

The initial WordPress.org review remains a manual submission of the exact
reviewed release ZIP. After WordPress.org assigns the production slug:

1. configure `WORDPRESS_ORG_USERNAME` and `WORDPRESS_ORG_PASSWORD` only in
   the protected `wordpress-org` GitHub Environment;
2. commit the assigned `wordpressOrgSlug` to `deployment.json`;
3. set `enabled` to `true`;
4. set `syncListingAssets` to `true` only when the committed
   `wordpress-org/assets/` artwork should be synchronized with that release;
5. review and merge those source-controlled changes normally.

The next qualified immutable GitHub release will then be eligible for the
protected SVN deployment. A failed or unavailable WordPress.org deployment
does not mutate or replace the canonical GitHub release; remediation uses a
new source fix, fresh qualification, and a new version/tag.

## Listing assets

`syncListingAssets` is the only routine switch for copying the committed
listing artwork to SVN `assets/`. It is deliberately source controlled rather
than a workflow-dispatch input. Leave it `false` when only plugin
`trunk`/tag contents should change.

Listing artwork remains outside the installable plugin ZIP and is never copied
to SVN `trunk` or release tags.
