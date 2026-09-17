import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile(
	'.github/workflows/reconcile-v2.3.0-resume.yml',
	'utf8'
);
const admissionStart = workflow.indexOf('\n    admission:\n');
const pluginCheckStart = workflow.indexOf('\n    plugin-check:\n');
const publishStart = workflow.indexOf('\n    publish:\n', pluginCheckStart + 1);

assert.ok(admissionStart > 0, 'resume admission job is missing');
assert.ok(pluginCheckStart > admissionStart, 'resume Plugin Check job is missing');
assert.ok(publishStart > pluginCheckStart, 'resume publisher job is missing');

const admission = workflow.slice(admissionStart, pluginCheckStart);
const pluginCheck = workflow.slice(pluginCheckStart, publishStart);
const publisher = workflow.slice(publishStart);
const pluginCheckHeader = pluginCheck.slice(0, pluginCheck.indexOf('\n        steps:\n'));

function includes(target, value) {
	assert.ok(target.includes(value), `missing contract: ${value}`);
}

test('resume authenticates the exact merged resume PR before tooling checkout', () => {
	assert.doesNotMatch(workflow, /workflow_dispatch:/);
	for (const value of [
		"github.event.workflow_run.path == '.github/workflows/quality.yml'",
		'github.event.workflow_run.head_repository.full_name == github.repository',
		"RAN_RESUME_PR: '27'",
		'.merge_commit_sha == $trigger',
		'.head.ref == "fix/reconcile-v2.3.0-historical-plugin-check"',
		'.title == "fix(release): resume v2.3.0 historical reconciliation"',
	]) {
		includes(admission, value);
	}
	includes(pluginCheck, 'needs: admission');
	includes(pluginCheck, "if: ${{ needs.admission.result == 'success' }}");
	assert.ok(
		workflow.indexOf('Prove the trigger is the exact merged resume PR') <
			workflow.indexOf(
				'actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd'
			),
		'trusted tooling must not be checked out before resume admission'
	);
});

test('resume is bound to the fixed historical qualification evidence', () => {
	for (const value of [
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

test('resume Plugin Check scopes API credentials away from historical execution', () => {
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
		'PLUGIN_CHECK_VERSION: 2.1.0',
		'PLUGIN_CHECK_WP_ENV_VERSION: 11.13.0',
		'wp plugin install plugin-check --version="$PLUGIN_CHECK_VERSION" --activate',
		'wp plugin get plugin-check --field=version',
		'test "$installed_plugin_check" = "$PLUGIN_CHECK_VERSION"',
	]) {
		includes(pluginCheck, value);
	}
	assert.doesNotMatch(pluginCheckHeader, /GH_TOKEN|GITHUB_TOKEN/);
	assert.match(
		pluginCheck,
		/name: Prove the fixed historical qualification run\n\s+env:\n\s+GH_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/
	);
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
