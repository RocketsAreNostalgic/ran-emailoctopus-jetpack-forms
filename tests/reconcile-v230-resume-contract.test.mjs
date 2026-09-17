import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile(
	'.github/workflows/reconcile-v2.3.0-resume.yml',
	'utf8'
);
const pluginCheckStart = workflow.indexOf('\n    plugin-check:\n');
const publishStart = workflow.indexOf('\n    publish:\n', pluginCheckStart + 1);

assert.ok(pluginCheckStart > 0, 'resume Plugin Check job is missing');
assert.ok(publishStart > pluginCheckStart, 'resume publisher job is missing');

const pluginCheck = workflow.slice(pluginCheckStart, publishStart);
const publisher = workflow.slice(publishStart);

function includes(target, value) {
	assert.ok(target.includes(value), `missing contract: ${value}`);
}

test('resume is canonical and bound to the qualified source run', () => {
	assert.doesNotMatch(workflow, /workflow_dispatch:/);
	for (const value of [
		"github.event.workflow_run.path == '.github/workflows/quality.yml'",
		'github.event.workflow_run.head_repository.full_name == github.repository',
		"RAN_SOURCE_RUN: '35268651964'",
		'RAN_SOURCE_HEAD: c76aadf6c3da3cceb08e36fe777f0d61ccf11b7d',
		'RAN_HISTORICAL_COMMIT: 48a76148363ea1672b8d93f6e0914d2d37644db5',
		'RAN_RELEASE_HEAD: 913c70025639fb497d24823e92dca4467ee69196',
		'RAN_RELEASE_TREE: a37c05b57e68a7543f99c27093844876b6ffd428',
		'RAN_ARTIFACT_NAME: ran-emailoctopus-v2.3.0-reconciliation-35268651964',
		'group: release-please-main',
		'cancel-in-progress: false',
	]) {
		includes(workflow, value);
	}
});

test('resume Plugin Check proves and consumes fixed qualification', () => {
	for (const value of [
		'actions: read',
		'contents: read',
		'actions/runs/${RAN_SOURCE_RUN}',
		'Rebuild exact historical v2.3.0 source',
		'Historical v2.3.0 / PHP 8.0 / WordPress 6.8 / Jetpack 15.5',
		'Historical v2.3.0 / PHP 8.5 / WordPress latest / Jetpack latest',
		'run-id: ${{ env.RAN_SOURCE_RUN }}',
		'node scripts/filter-v230-plugin-check-results.mjs',
		'PLUGIN_CHECK_CORE_REF: WordPress/WordPress#7.0.3',
		'PLUGIN_CHECK_WP_ENV_VERSION: 11.13.0',
	]) {
		includes(pluginCheck, value);
	}
});

test('resume publisher is source-free and exact-tag gated', () => {
	for (const value of [
		'actions: read',
		'contents: write',
		'issues: write',
		'pull-requests: write',
		'git/matching-refs/tags/${RAN_RELEASE_TAG}',
		'Exact external tag ${RAN_RELEASE_TAG} is required',
		'.object.type == "commit" and .object.sha == $commit',
	]) {
		includes(publisher, value);
	}
	assert.doesNotMatch(publisher, /actions\/checkout@/);
	assert.doesNotMatch(
		publisher,
		/pnpm install|composer install|create-release-assets\.sh/
	);
});

test('resume publisher preserves numeric release identity', () => {
	const create = publisher.indexOf(
		'gh api --method POST "repos/${GITHUB_REPOSITORY}/releases"'
	);
	const upload = publisher.indexOf(
		'https://uploads.github.com/repos/${GITHUB_REPOSITORY}/releases/${RELEASE_ID}/assets?name=${asset_name}'
	);
	const readback = publisher.indexOf(
		'Read back exact tag, release, assets, and digests'
	);
	const labels = publisher.indexOf(
		'Reconcile Release Please PR labels only after exact publication readback'
	);

	assert.ok(create > 0, 'numeric release creation is missing');
	assert.ok(upload > create, 'asset upload must follow release creation');
	assert.ok(readback > upload, 'exact readback must follow asset mutation');
	assert.ok(labels > readback, 'lifecycle labels must be reconciled last');
	includes(
		publisher.slice(readback),
		'.id == $release_id and .tag_name == $tag and .target_commitish == $commit'
	);
	includes(
		publisher.slice(readback),
		'[.assets[] | {name, digest}] | sort_by(.name)'
	);
});

test('resume path cannot deploy to WordPress.org', () => {
	assert.doesNotMatch(workflow, /deploy-wordpress-org|WORDPRESS_ORG|svn/);
});
