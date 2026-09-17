import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const scriptPath = path.join(
	process.cwd(),
	'scripts/filter-v230-plugin-check-results.mjs'
);
const docs =
	'https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/#readme-header-information';
const message =
	'Tested up to: 7.0 < 7.1. The "Tested up to" value in your plugin is not set to the current version of WordPress. This means your plugin will not show up in searches, as we require plugins to be compatible and documented as tested up to the most recent version of WordPress.';

function finding(overrides = {}) {
	return {
		line: 0,
		column: 0,
		type: 'ERROR',
		code: 'outdated_tested_upto_header',
		message,
		docs,
		...overrides,
	};
}

function runFilter({
	readme = 'Tested up to: 7.0\nStable tag: 2.3.0\n',
	findings = [finding()],
} = {}) {
	const root = mkdtempSync(path.join(tmpdir(), 'ran-emailoctopus-v230-'));
	const pluginRoot = path.join(root, 'plugin');
	const resultsPath = path.join(root, 'results.txt');
	const warning = {
		line: 0,
		column: 0,
		type: 'WARNING',
		code: 'unexpected_markdown_file',
		message: 'Unexpected markdown file.',
		docs: '',
	};
	const results = [
		'FILE: readme.txt',
		JSON.stringify(findings),
		'',
		'FILE: THIRD-PARTY.md',
		JSON.stringify([warning]),
		'',
	].join('\n');

	try {
		mkdirSync(pluginRoot, { recursive: true });
		writeFileSync(path.join(pluginRoot, 'readme.txt'), readme);
		writeFileSync(resultsPath, results);
		return spawnSync(
			process.execPath,
			[scriptPath, resultsPath, pluginRoot],
			{
				encoding: 'utf8',
			}
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

function expectFailure(result, pattern) {
	assert.notEqual(result.status, 0);
	assert.match(result.stderr, pattern);
}

test('accepts the exact historical Tested up to drift', () => {
	const result = runFilter();
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /"type":"WARNING"/);
	assert.match(
		result.stdout,
		/Accepted historical v2\.3\.0 Tested up to drift/
	);
	assert.match(result.stdout, /unexpected_markdown_file/);
});

test('rejects a changed historical message', () => {
	const result = runFilter({
		findings: [finding({ message: 'Tested up to: 7.0 < 7.2.' })],
	});
	expectFailure(result, /Unexpected historical Tested up to finding/);
});

test('rejects a different stable tag in historical source', () => {
	const readme = 'Tested up to: 7.0\nStable tag: 2.3.1\n';
	const result = runFilter({ readme });
	expectFailure(result, /Unexpected historical Tested up to finding/);
});

test('rejects duplicate historical findings', () => {
	const exact = finding();
	const result = runFilter({ findings: [exact, { ...exact }] });
	expectFailure(result, /at most one historical v2\.3\.0/);
});

test('leaves unrelated warnings untouched', () => {
	const result = runFilter({ findings: [] });
	assert.equal(result.status, 0, result.stderr);
	assert.match(result.stdout, /unexpected_markdown_file/);
	assert.doesNotMatch(result.stdout, /Accepted historical/);
});
