import fs from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';
import esbuild from 'esbuild';
import { parse as parseVue, compileScript } from '@vue/compiler-sfc';
import { preprocess } from 'svelte/compiler';
import sveltePreprocess from 'svelte-preprocess';

/**
 * Strips TypeScript from a single file and writes the output to outDir.
 * @param {string} filePath - Path to the file to process.
 * @param {string} [outDir='output'] - Output directory.
 * @returns {Promise<string>} - The output file path.
 */
export async function stripTSFromFile(filePath, outDir = 'output') {
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
		return outPath;
	}

	else if (ext === '.vue') {
		const sfc = parseVue(fileContent);
		const hasTs = sfc.descriptor.script?.lang === 'ts' || sfc.descriptor.scriptSetup?.lang === 'ts';

		if (!hasTs) {
			return null;
		}

		const script = compileScript(sfc.descriptor, { id: 'noop', inlineTemplate: true });
		const replaced = fileContent
			.replace(/<script[^>]*lang="ts"[^>]*>/, '<script>')
			.replace(/<script setup[^>]*lang="ts"[^>]*>/, '<script setup>')
			.replace(/<script[^>]*setup[^>]*>[^]*?<\/script>/, `<script setup>\n${script.content}\n<\/script>`);

		const outPath = path.join(outDir, fileName);
		await fs.mkdir(path.dirname(outPath), { recursive: true });
		await fs.writeFile(outPath, replaced, 'utf-8');
		return outPath;
	}

	else if (ext === '.svelte') {
		const processed = await preprocess(fileContent, sveltePreprocess({ typescript: true }), { filename: filePath });
		const replaced = processed.code.replace(/<script[^>]*lang="ts"[^>]*>/, '<script>');

		const outPath = path.join(outDir, fileName);
		await fs.mkdir(path.dirname(outPath), { recursive: true });
		await fs.writeFile(outPath, replaced, 'utf-8');
		return outPath;
	}

	else {
		throw new Error(`Unsupported file type: ${filePath}`);
	}
}

/**
 * Strips TypeScript from multiple files matching the provided globs or file paths.
 * @param {string[]} globs - Array of file globs or paths.
 * @param {string} [outDir='dist'] - Output directory.
 * @returns {Promise<string[]>} - Array of output file paths.
 */
export async function stripTSFromFiles(globs, outDir = 'output') {
	const files = await fg(globs, { onlyFiles: true });
	if (files.length === 0) {
		return [];
	}
	const results = [];
	for (const file of files) {
		try {
			const outPath = await stripTSFromFile(file, outDir);
			if (outPath) results.push(outPath);
		} catch (err) {
			// Optionally, collect errors or rethrow
			// For now, just skip errored files
		}
	}
	return results;
}
