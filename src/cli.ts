#!/usr/bin/env node

import { stripTSFromFiles } from './strip-ts.js';

async function main(): Promise<void> {
	const args = process.argv.slice(2);

	// Parse command line arguments
	const forceStrip = args.includes('--force-strip');
	const globs = args.filter((arg) => !arg.startsWith('--'));

	if (globs.length === 0) {
		console.error('Please provide file globs to process.');
		console.error('Usage: strip-ts [--force-strip] <glob1> [glob2] ...');
		process.exit(1);
	}

	try {
		const outPaths = await stripTSFromFiles(globs, 'output', forceStrip);
		if (outPaths.length === 0) {
			console.warn('⚠️ No files matched the provided patterns.');
			return;
		}
		for (const outPath of outPaths) {
			console.log(`✅ Output written: ${outPath}`);
		}
	} catch (err) {
		console.error('❌ Error:', err instanceof Error ? err.message : String(err));
	}
}

main();
