import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const expectedMessage =
	'Tested up to: 7.0 < 7.1. The "Tested up to" value in your plugin is not set to the current version of WordPress. This means your plugin will not show up in searches, as we require plugins to be compatible and documented as tested up to the most recent version of WordPress.';
const expectedDocs =
	'https://developer.wordpress.org/plugins/wordpress-org/how-your-readme-txt-works/#readme-header-information';

function parseBlocks(rawResults) {
	const normalized = rawResults.replace(/\r\n/g, '\n').trim();
	if (!normalized) {
		return [];
	}

	return normalized.split(/\n\n(?=FILE: )/).map((block) => {
		const newline = block.indexOf('\n');
		if (newline < 0 || !block.startsWith('FILE: ')) {
			throw new Error('Unexpected Plugin Check result block.');
		}

		const file = block.slice('FILE: '.length, newline);
		const findings = JSON.parse(block.slice(newline + 1));
		if (!Array.isArray(findings)) {
			throw new Error(
				`Plugin Check findings are not an array for ${file}.`
			);
		}

		return { file, findings };
	});
}

function isHistoricalTestedUpToFinding(file, finding) {
	return (
		file === 'readme.txt' &&
		finding?.line === 0 &&
		finding?.column === 0 &&
		finding?.type === 'ERROR' &&
		finding?.code === 'outdated_tested_upto_header' &&
		finding?.message === expectedMessage &&
		finding?.docs === expectedDocs
	);
}

export function filterHistoricalTestedUpTo(rawResults, readme) {
	const testedUpToLines = readme
		.replace(/\r\n/g, '\n')
		.split('\n')
		.filter((line) => line.trim() === 'Tested up to: 7.0');
	if (testedUpToLines.length !== 1) {
		throw new Error(
			'Historical readme must contain exactly one Tested up to: 7.0 line.'
		);
	}

	let waived = 0;
	const filteredBlocks = [];
	for (const block of parseBlocks(rawResults)) {
		const findings = block.findings.filter((finding) => {
			if (!isHistoricalTestedUpToFinding(block.file, finding)) {
				return true;
			}
			waived += 1;
			return false;
		});

		if (findings.length > 0) {
			filteredBlocks.push(
				`FILE: ${block.file}\n${JSON.stringify(findings)}`
			);
		}
	}

	if (waived !== 1) {
		throw new Error(
			`Expected exactly one historical Tested up to finding; found ${waived}.`
		);
	}

	return `${filteredBlocks.join('\n\n')}\n`;
}

async function main() {
	const [rawPath, filteredPath, readmePath] = process.argv.slice(2);
	if (!rawPath || !filteredPath || !readmePath) {
		throw new Error(
			'Usage: node filter-v230-plugin-check-results.mjs RAW FILTERED README'
		);
	}

	const [rawResults, readme] = await Promise.all([
		readFile(rawPath, 'utf8'),
		readFile(readmePath, 'utf8'),
	]);
	const filtered = filterHistoricalTestedUpTo(rawResults, readme);
	await writeFile(filteredPath, filtered, 'utf8');
	console.log('Accepted exactly one historical Tested up to: 7.0 drift.');
}

const invokedDirectly =
	process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
	await main();
}
