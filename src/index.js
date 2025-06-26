#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';
import esbuild from 'esbuild';
import { parse as parseVue, compileScript } from '@vue/compiler-sfc';
import { preprocess } from 'svelte/compiler';
import sveltePreprocess from 'svelte-preprocess';

async function stripTSFromFile(filePath, outDir = 'dist') {
	const ext = path.extname(filePath);
	const fileName = path.basename(filePath);
	const fileContent = await fs.readFile(filePath, 'utf-8');

	if (ext === '.ts' || ext === '.tsx') {
		const result = await esbuild.transform(fileContent, {
			loader: ext.slice(1),
			sourcemap: false,
			target: 'esnext',
		});

		const outExt = ext === '.ts' ? '.js' : '.jsx';
		const outPath = path.join(outDir, fileName.replace(ext, outExt));
		await fs.mkdir(path.dirname(outPath), { recursive: true });
		await fs.writeFile(outPath, result.code, 'utf-8');
		console.log(`✅ Stripped TypeScript from ${filePath}`);
	}

	else if (ext === '.vue') {
		const sfc = parseVue(fileContent);
		const hasTs = sfc.descriptor.script?.lang === 'ts' || sfc.descriptor.scriptSetup?.lang === 'ts';

		if (!hasTs) {
			console.log(`ℹ️ No TypeScript in ${filePath}`);
			return;
		}

		const script = compileScript(sfc.descriptor, { id: 'noop', inlineTemplate: true });
		const replaced = fileContent
			.replace(/<script[^>]*lang="ts"[^>]*>/, '<script>')
			.replace(/<script setup[^>]*lang="ts"[^>]*>/, '<script setup>')
			.replace(/<script[^>]*setup[^>]*>[^]*?<\/script>/, `<script setup>\n${script.content}\n</script>`);

		const outPath = path.join(outDir, fileName);
		await fs.mkdir(path.dirname(outPath), { recursive: true });
		await fs.writeFile(outPath, replaced, 'utf-8');
		console.log(`✅ Stripped TypeScript from ${filePath}`);
	}

	else if (ext === '.svelte') {
		const processed = await preprocess(fileContent, sveltePreprocess({ typescript: true }), { filename: filePath });
		const replaced = processed.code.replace(/<script[^>]*lang="ts"[^>]*>/, '<script>');

		const outPath = path.join(outDir, fileName);
		await fs.mkdir(path.dirname(outPath), { recursive: true });
		await fs.writeFile(outPath, replaced, 'utf-8');
		console.log(`✅ Stripped TypeScript from ${filePath}`);
	}

	else {
		console.warn(`❌ Unsupported file type: ${filePath}`);
	}
}

async function main() {
	const globs = process.argv.slice(2);
	if (globs.length === 0) {
		console.error('Please provide file globs to process.');
		process.exit(1);
	}

	const files = await fg(globs, { onlyFiles: true });
	if (files.length === 0) {
		console.warn('⚠️ No files matched the provided patterns.');
		return;
	}

	for (const file of files) {
		try {
			await stripTSFromFile(file);
		} catch (err) {
			console.error(`❌ Error processing ${file}:`, err.message);
		}
	}
}

main();
