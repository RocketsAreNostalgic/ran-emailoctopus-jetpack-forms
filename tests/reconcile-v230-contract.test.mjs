import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile(
	'.github/workflows/reconcile-v2.3.0.yml',
	'utf8'
);
const rebuildStart = workflow.indexOf('\n    rebuild:\n');
const compatibilityStart = workflow.indexOf(
	'\n    compatibility:\n',
	rebuildStart + 1
);
const pluginCheckStart = workflow.indexOf(
	'\n    plugin-check:\n',
	compatibilityStart + 1
);
const publishStart = workflow.indexOf('\n    publish:\n', pluginCheckStart + 1);

assert.ok(rebuildStart > 0, 'reconciliation rebuild job is missing');
assert.ok(
	compatibilityStart > rebuildStart,
	'reconciliation compatibility job is missing'
);
assert.ok(
	pluginCheckStart > compatibilityStart,
	'reconciliation Plugin Check job is missing'
);
assert.ok(
	publishStart > pluginCheckStart,
	'reconciliation publisher is missing'
);

const rebuild = workflow.slice(rebuildStart, compatibilityStart);
const compatibility = workflow.slice(compatibilityStart, pluginCheckStart);
const pluginCheck = workflow.slice(pluginCheckStart, publishStart);
const publisher = workflow.slice(publishStart);

test('reconciliation is canonical and hard-coded to the exact historical Release Please identity', () => {
	assert.doesNotMatch(workflow, /workflow_dispatch:/);
	assert.match(
		workflow,
		/types: \[completed\]\n\s+branches: \[main\]\n\npermissions: \{\}/
	);
	assert.match(
		workflow,
		/concurrency:\n\s+group: release-please-main\n\s+cancel-in-progress: false/
	);
	for (const identity of [
		'RAN_HISTORICAL_COMMIT: 48a76148363ea1672b8d93f6e0914d2d37644db5',
		'RAN_RELEASE_HEAD: 913c70025639fb497d24823e92dca4467ee69196',
		'RAN_RELEASE_TREE: a37c05b57e68a7543f99c27093844876b6ffd428',
		"RAN_RELEASE_PR: '10'",
		'RAN_RELEASE_TAG: v2.3.0',
		'RAN_RELEASE_VERSION: 2.3.0',
	]) {
		assert.ok(workflow.includes(identity), `missing identity: ${identity}`);
	}
	assert.match(
		workflow,
		/github\.event\.workflow_run\.path == '\.github\/workflows\/quality\.yml'/
	);
	assert.match(
		workflow,
		/github\.event\.workflow_run\.head_repository\.full_name == github\.repository/
	);
});

test('historical source executes only in read-only qualification jobs', () => {
	for (const lane of [rebuild, compatibility]) {
		assert.match(lane, /permissions: \{\}/);
		assert.doesNotMatch(lane, /GH_TOKEN|secrets\.GITHUB_TOKEN/);
		assert.match(lane, /git checkout --detach "\$RAN_HISTORICAL_COMMIT"/);
		assert.match(
			lane,
			/git rev-parse 'HEAD\^\{tree\}'\)" = "\$RAN_RELEASE_TREE"/
		);
	}
	assert.match(rebuild, /pnpm install --frozen-lockfile/);
	assert.match(rebuild, /composer install --no-interaction/);
	assert.match(
		rebuild,
		/bash scripts\/create-release-assets\.sh "\$RAN_RELEASE_TAG"/
	);
	assert.match(
		rebuild,
		/name: ran-emailoctopus-v2\.3\.0-reconciliation-\$\{\{ github\.run_id \}\}/
	);
	assert.match(rebuild, /retention-days: 30/);
});

test('fresh qualification preserves compatibility and pinned Plugin Check evidence', () => {
	assert.match(compatibility, /php: '8\.0'/);
	assert.match(compatibility, /wordpress: '6\.8'/);
	assert.match(compatibility, /jetpack: '15\.5'/);
	assert.match(compatibility, /php: '8\.5'/);
	assert.match(compatibility, /wordpress: latest/);
	assert.match(compatibility, /wp eval-file .*smoke-saved-form\.php/);
	assert.match(
		pluginCheck,
		/PLUGIN_CHECK_CORE_REF: WordPress\/WordPress#7\.0\.3/
	);
	assert.match(pluginCheck, /PLUGIN_CHECK_WP_ENV_VERSION: 11\.13\.0/);
	assert.match(
		pluginCheck,
		/ref: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/
	);
});

test('publisher is source-free and requires a pre-authorized exact tag', () => {
	assert.match(
		publisher,
		/permissions:\n\s+actions: read\n\s+contents: write\n\s+issues: write\n\s+pull-requests: write/
	);
	assert.doesNotMatch(publisher, /actions\/checkout@/);
	assert.doesNotMatch(
		publisher,
		/pnpm install|composer install|create-release-assets\.sh|smoke-saved-form\.php/
	);
	assert.match(
		publisher,
		/Exact external tag \$\{RAN_RELEASE_TAG\} is required at \$\{RAN_HISTORICAL_COMMIT\} before publication/
	);
	assert.match(
		publisher,
		/git\/matching-refs\/tags\/\$\{RAN_RELEASE_TAG\}/
	);
	assert.match(
		publisher,
		/\.object\.type == "commit" and \.object\.sha == \$commit/
	);
	assert.doesNotMatch(publisher, /gh release create/);
});

test('publisher keeps exact identity checks before release mutation and exact readback after it', () => {
	const createRelease = publisher.indexOf(
		'gh api --method POST "repos/${GITHUB_REPOSITORY}/releases"'
	);
	const upload = publisher.indexOf(
		'https://uploads.github.com/repos/${GITHUB_REPOSITORY}/releases/${RELEASE_ID}/assets?name=${asset_name}'
	);
	assert.ok(createRelease > 0, 'release-ID creation is missing');
	assert.ok(
		upload > createRelease,
		'asset upload must follow exact release creation'
	);

	for (const precondition of [
		'live_main="$(gh api',
		'pulls/${RAN_RELEASE_PR}',
		'.merge_commit_sha == $merge',
		'git/commits/${RAN_HISTORICAL_COMMIT}',
		'git/commits/${RAN_RELEASE_HEAD}',
		'manifest_version="$(gh api',
		'.archive == $archive and .commit == $commit and .sha256 == $sha256 and .tag == $tag and .version == $version',
		'git/matching-refs/tags/${RAN_RELEASE_TAG}',
		'Expected exactly one ${RAN_RELEASE_TAG} tag',
	]) {
		const position = publisher.indexOf(precondition);
		assert.ok(position >= 0, `missing precondition: ${precondition}`);
		assert.ok(
			position < createRelease,
			`precondition moved after mutation: ${precondition}`
		);
	}

	for (const postcondition of [
		'RELEASE_ID: ${{ steps.identity.outputs.release-id || steps.draft.outputs.release-id }}',
		'--argjson release_id "$RELEASE_ID"',
		'.id == $release_id and .tag_name == $tag',
		'releases/tags/${RAN_RELEASE_TAG}',
		'git/ref/tags/${RAN_RELEASE_TAG}',
		'[.assets[].name] | sort',
		'[.assets[] | {name, digest}] | sort_by(.name)',
		'Published v2.3.0 readback did not converge to the qualified provenance',
	]) {
		assert.ok(
			publisher.indexOf(postcondition, upload + 1) > upload,
			`missing post-publication readback: ${postcondition}`
		);
	}

	const labels = publisher.indexOf(
		'Reconcile Release Please PR labels only after exact publication readback'
	);
	assert.ok(labels > upload, 'Release Please labels must be reconciled last');
});

test('one-time reconciliation does not deploy to WordPress.org', () => {
	assert.doesNotMatch(workflow, /deploy-wordpress-org|svn|WORDPRESS_ORG/);
});
