import fs from 'node:fs';
import path from 'node:path';

const [resultsPath, pluginRoot] = process.argv.slice(2);

if (!resultsPath || !pluginRoot) {
	console.error(
		'Usage: node scripts/filter-v230-plugin-check-results.mjs <results> <plugin-root>'
	);
	process.exit(2);
}

const historicalTestedUpTo = {
	file: 'readme.txt',
	line: 0,
	column: 0,
	type: 'ERROR',
	code: 'outdated_tested_upto_header',
	docs: 'https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/#readme-header-information',
	message:
		'Tested up to: 7.0 < 7.1. The "Tested up to" value in your plugin is not set to the current version of WordPress. This means your plugin will not show up in searches, as we require plugins to be compatible and documented as tested up to the most recent version of WordPress.',
	testedUpTo: '7.0',
	stableTag: '2.3.0',
};

function sourceMatchesHistoricalRelease(file) {
	if (file !== historicalTestedUpTo.file) {
		return false;
	}

	const sourcePath = path.join(pluginRoot, file);
	const sourceLines = fs.readFileSync(sourcePath, 'utf8').split(/\r?\n/);
	const testedUpToHeaders = sourceLines.filter((line) =>
		line.startsWith('Tested up to: ')
	);
	const stableTagHeaders = sourceLines.filter((line) =>
		line.startsWith('Stable tag: ')
	);
	return (
		testedUpToHeaders.length === 1 &&
		testedUpToHeaders[0] ===
			`Tested up to: ${historicalTestedUpTo.testedUpTo}` &&
		stableTagHeaders.length === 1 &&
		stableTagHeaders[0] === `Stable tag: ${historicalTestedUpTo.stableTag}`
	);
}

function isHistoricalTestedUpTo(file, finding) {
	return (
		file === historicalTestedUpTo.file &&
		finding &&
		typeof finding === 'object' &&
		finding.line === historicalTestedUpTo.line &&
		finding.column === historicalTestedUpTo.column &&
		finding.type === historicalTestedUpTo.type &&
		finding.code === historicalTestedUpTo.code &&
		finding.docs === historicalTestedUpTo.docs &&
		finding.message === historicalTestedUpTo.message
	);
}

const raw = fs.readFileSync(resultsPath, 'utf8');
const lines = raw.split(/\r?\n/);
const output = [];
let currentFile = null;
let historicalCount = 0;

for (const line of lines) {
	if (line.startsWith('FILE: ')) {
		currentFile = line.slice('FILE: '.length);
		output.push(line);
		continue;
	}

	if (!currentFile || !line.trim().startsWith('[')) {
		output.push(line);
		continue;
	}

	let findings;
	try {
		findings = JSON.parse(line);
	} catch {
		output.push(line);
		continue;
	}

	if (!Array.isArray(findings)) {
		output.push(line);
		continue;
	}

	let changed = false;
	const adjusted = findings.map((finding) => {
		if (
			finding?.code !== historicalTestedUpTo.code ||
			currentFile !== historicalTestedUpTo.file
		) {
			return finding;
		}

		if (
			!isHistoricalTestedUpTo(currentFile, finding) ||
			!sourceMatchesHistoricalRelease(currentFile)
		) {
			console.error(
				`Unexpected historical Tested up to finding for ${currentFile}.`
			);
			process.exit(1);
		}

		historicalCount += 1;
		if (historicalCount > 1) {
			console.error(
				`Expected at most one historical v2.3.0 Tested up to finding but found ${historicalCount}.`
			);
			process.exit(1);
		}

		changed = true;
		return {
			...finding,
			type: 'WARNING',
			message: `[Accepted historical v2.3.0 Tested up to drift] ${finding.message}`,
		};
	});

	output.push(changed ? JSON.stringify(adjusted) : line);
}

process.stdout.write(output.join('\n'));
