import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { filterHistoricalTestedUpTo } from '../scripts/filter-v230-plugin-check-results.mjs';

const workflow = await readFile(
	'.github/workflows/reconcile-v2.3.0-followup.yml',
	'utf8'
);
const pluginCheckStart = workflow.indexOf('\n    plugin-check:\n');
const publishStart = workflow.indexOf('\n    publish:\n', pluginCheckStart + 1);

assert.ok(pluginCheckStart > 0, 'follow-up Plugin Check job is missing');
assert.ok(publishStart > pluginCheckStart, 'follow-up publisher is missing');

const pluginCheck = workflow.slice(pluginCheckStart, publishStart);
const publisher = workflow.slice(publishStart);

const exactFinding = {
	line: 0,
	column: 0,
	type: 'ERROR',
	code: 'outdated_tested_upto_header',
	message:
		'Tested up to: 7.0 < 7.1. The "Tested up to" value in your plugin is not set to the current version of WordPress. This means your plugin will not show up in searches, as we require plugins to be compatible and documented as tested up to the most recent version of WordPress.',
	docs: 'https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/#readme-header-information',
};

function assertContains(text, needle) {
	assert.ok(text.includes(needle), `missing contract text: ${needle}`);
}

function results(blocks) {
	const rendered = blocks
		.map(({ file, findings }) => `FILE: ${file}\n${JSON.stringify(findings)}`)
		.join('\n\n');
	return `${rendered}\n`;
}

test('authenticates the exact failed producer', () => {
	assert.doesNotMatch(workflow, /workflow_dispatch:/);
	for (const evidence of [
		'workflows: [Reconcile v2.3.0]',
		"github.event.workflow_run.path == '.github/workflows/reconcile-v2.3.0.yml'",
		'github.event.workflow_run.head_repository.full_name == github.repository',
		"github.event.workflow_run.conclusion == 'failure'",
		'RAN_RECONCILE_RUN_ID: ${{ github.event.workflow_run.id }}',
	]) {
		assertContains(pluginCheck, evidence);
	}

	for (const evidence of [
		"require_job 'Rebuild exact historical v2.3.0 source' success",
		"require_job 'Historical v2.3.0 / PHP 8.0 / WordPress 6.8 / Jetpack 15.5' success",
		"require_job 'Historical v2.3.0 / PHP 8.5 / WordPress latest / Jetpack latest' success",
		"require_job 'Historical v2.3.0 / Plugin Check' failure",
		"require_job 'Publish and read back missing v2.3.0' skipped",
	]) {
		assertContains(pluginCheck, evidence);
	}
});

test('consumes exact artifact and pinned Plugin Check stack', () => {
	for (const evidence of [
		'name: ran-emailoctopus-v2.3.0-reconciliation-${{ github.event.workflow_run.id }}',
		'run-id: ${{ github.event.workflow_run.id }}',
		'PLUGIN_CHECK_CORE_REF: WordPress/WordPress#7.0.3',
		'PLUGIN_CHECK_WP_ENV_VERSION: 11.13.0',
		'ref: 98a1788320d0add90df2d8183934ecccbc4e05d2',
		'node scripts/filter-v230-plugin-check-results.mjs',
		'node .plugin-check-action/dist/index.js "$RESULTS_FILE"',
	]) {
		assertContains(pluginCheck, evidence);
	}
});

test('publisher remains source-free and exact', () => {
	assert.match(
		publisher,
		/permissions:\n\s+actions: read\n\s+contents: write\n\s+issues: write\n\s+pull-requests: write/
	);
	assert.doesNotMatch(publisher, /actions\/checkout@/);
	assert.doesNotMatch(
		publisher,
		/pnpm install|composer install|create-release-assets\.sh|smoke-saved-form\.php/
	);

	for (const evidence of [
		'test "$live_main" = "$RAN_TRIGGER_SHA"',
		'git/matching-refs/tags/${RAN_RELEASE_TAG}',
		'gh api --method POST "repos/${GITHUB_REPOSITORY}/releases"',
		'uploads.github.com/repos/${GITHUB_REPOSITORY}/releases/${RELEASE_ID}/assets',
		'--argjson release_id "$RELEASE_ID"',
		'Published v2.3.0 readback did not converge to the qualified provenance',
	]) {
		assertContains(publisher, evidence);
	}

	assert.doesNotMatch(publisher, /gh release create/);
	assert.doesNotMatch(workflow, /deploy-wordpress-org|WORDPRESS_ORG|svn/);
});

test('filter removes only the exact historical drift', () => {
	const warning = {
		line: 0,
		column: 0,
		type: 'WARNING',
		code: 'unexpected_markdown_file',
		message: 'Unexpected markdown file "THIRD-PARTY.md" detected in plugin root.',
		docs: '',
	};
	const filtered = filterHistoricalTestedUpTo(
		results([
			{ file: 'readme.txt', findings: [exactFinding] },
			{ file: 'THIRD-PARTY.md', findings: [warning] },
		]),
		'Tested up to: 7.0\n'
	);
	assert.doesNotMatch(filtered, /outdated_tested_upto_header/);
	assert.match(filtered, /unexpected_markdown_file/);
});

test('filter preserves unrelated errors', () => {
	const otherError = {
		line: 1,
		column: 1,
		type: 'ERROR',
		code: 'other_error',
		message: 'Other error',
		docs: '',
	};
	const filtered = filterHistoricalTestedUpTo(
		results([{ file: 'readme.txt', findings: [exactFinding, otherError] }]),
		'Tested up to: 7.0\n'
	);
	assert.match(filtered, /other_error/);
});

test('filter rejects source drift', () => {
	assert.throws(
		() =>
			filterHistoricalTestedUpTo(
				results([{ file: 'readme.txt', findings: [exactFinding] }]),
				'Tested up to: 7.1\n'
			),
		/exactly one Tested up to: 7\.0/
	);
});

test('filter rejects changed finding', () => {
	const changed = { ...exactFinding, code: 'different_code' };
	assert.throws(
		() =>
			filterHistoricalTestedUpTo(
				results([{ file: 'readme.txt', findings: [changed] }]),
				'Tested up to: 7.0\n'
			),
		/Expected exactly one historical Tested up to finding; found 0/
	);
});

test('filter rejects duplicate findings', () => {
	assert.throws(
		() =>
			filterHistoricalTestedUpTo(
				results([
					{ file: 'readme.txt', findings: [exactFinding, exactFinding] },
				]),
				'Tested up to: 7.0\n'
			),
		/Expected exactly one historical Tested up to finding; found 2/
	);
});
