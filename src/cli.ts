#!/usr/bin/env node

import { stripTSFromFiles } from './strip-ts.js'

async function main(): Promise<void> {
	const globs = process.argv.slice(2)
	if (globs.length === 0) {
		console.error('Please provide file globs to process.')
		process.exit(1)
	}

	try {
		const outPaths = await stripTSFromFiles(globs)
		if (outPaths.length === 0) {
			console.warn('⚠️ No files matched the provided patterns.')
			return
		}
		for (const outPath of outPaths) {
			console.log(`✅ Output written: ${outPath}`)
		}
	} catch (err) {
		console.error('❌ Error:', err instanceof Error ? err.message : String(err))
	}
}

main()
