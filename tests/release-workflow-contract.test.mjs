import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const workflowUrl = new URL(
	'../.github/workflows/release-publisher.yml',
	import.meta.url
);
const workflow = readFileSync(workflowUrl, 'utf8');
assert.equal(
	existsSync(
		new URL('../.github/workflows/release-please.yml', import.meta.url)
	),
	false,
	'legacy dispatchable workflow path must stay absent so historical tags cannot be manually dispatched'
);

test('release job requires the canonical Quality workflow path', () => {
	const jobStart = workflow.indexOf('jobs:\n    release-please:');
	const ifMarker = '        if: >-\n';
	const ifStart = workflow.indexOf(ifMarker, jobStart);
	const runsOn = workflow.indexOf('\n        runs-on:', ifStart);

	assert.ok(jobStart >= 0);
	assert.ok(ifStart > jobStart);
	assert.ok(runsOn > ifStart);

	const conditionLines = workflow
		.slice(ifStart + ifMarker.length, runsOn)
		.trimEnd()
		.split('\n');
	const allLinesActive = conditionLines.every((line) => {
		const isIndented = line.startsWith('            ');
		const isComment = line.trimStart().startsWith('#');
		return isIndented && !isComment;
	});
	assert.ok(allLinesActive);

	const condition = conditionLines.map((line) => line.trim()).join(' ');
	const terms = condition
		.replace('${{', '')
		.replace('}}', '')
		.split('&&')
		.map((term) => term.trim());
	const pathGuard =
		"github.event.workflow_run.path == '.github/workflows/quality.yml'";
	assert.ok(terms.includes(pathGuard));
});
