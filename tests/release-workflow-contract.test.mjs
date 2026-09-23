import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const release = read('.github/workflows/release-please.yml');
const deploy = read('.github/workflows/deploy-wordpress-org.yml');
const quality = read('.github/workflows/quality.yml');
const deployment = JSON.parse(read('wordpress-org/deployment.json'));

test('shared Profile B admits completed main Quality', () => {
	assert.match(release, /workflows: \[Quality\]/);
	assert.match(release, /branches: \[main\]/);
	assert.match(
		release,
		/release-profile-b\.yml@e2fb19244a301a62f8fae2a80536898adf21fe22/
	);
	assert.match(
		release,
		/artifact-prefix: ran-emailoctopus-jetpack-forms-release/
	);
	assert.doesNotMatch(release, /workflow_dispatch:|--clobber/);
	assert.equal(
		existsSync(new URL('.github/workflows/release-publisher.yml', root)),
		false
	);
	assert.equal(
		existsSync(new URL('scripts/release-recovery-contract.test.mjs', root)),
		false
	);
});

test('Release Please candidates exercise terminal and product Quality', () => {
	assert.match(quality, /github\.event_name == 'workflow_dispatch'/);
	assert.match(
		quality,
		/release-please--branches--main--components--ran-emailoctopus-jetpack-forms/
	);
	assert.match(quality, /RAN_SOURCE_SHA/);
	assert.match(quality, /name: quality\n\s+if:.*workflow_dispatch/);
	assert.match(quality, /ran-profile-b-promotion\.json/);
	assert.match(
		quality,
		/needs:\n\s+- baseline\n\s+- quality\n\s+- compatibility\n\s+- plugin-check/
	);
});

test('WordPress.org observes immutable releases', () => {
	assert.match(deploy, /workflows: \[Release Please\]/);
	assert.match(deploy, /\.immutable == true/);
	assert.match(deploy, /environment: wordpress-org/);
	assert.match(deploy, /needs\.contract\.outputs\.enabled == 'true'/);
	assert.doesNotMatch(deploy, /workflow_dispatch:|--allow-disabled/);
	assert.equal(deployment.enabled, false);
	assert.equal(deployment.syncListingAssets, false);
	assert.doesNotMatch(
		read('scripts/deploy-wordpress-org.sh'),
		/--allow-disabled/
	);
});
