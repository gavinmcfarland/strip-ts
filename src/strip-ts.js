import fs from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';
import { parse as babelParse } from '@babel/parser';
import esbuild from 'esbuild';
import * as ts from 'typescript';
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

	console.log(`Processing ${filePath} with extension ${ext}`);

	if (ext === '.ts' || ext === '.tsx') {
		console.log(`Processing TypeScript file with Babel: ${filePath}`);
		try {
			const traverseModule = await import('@babel/traverse');
			const traverse = traverseModule.default.default;
			const isTSX = ext === '.tsx';
			const ast = babelParse(fileContent, {
				sourceType: 'module',
				plugins: [isTSX ? 'tsx' : 'typescript', 'jsx'],
			});

			traverse(ast, {
				TSTypeAnnotation(path) {
					path.remove();
				},
				TSInterfaceDeclaration(path) {
					path.remove();
				},
				TSTypeAliasDeclaration(path) {
					path.remove();
				},
				TSAsExpression(path) {
					// Remove "as" casts, keep the expression
					path.replaceWith(path.node.expression);
				},
				TSNonNullExpression(path) {
					// Remove non-null assertions ("!")
					path.replaceWith(path.node.expression);
				},
			});

			const generateModule = await import('@babel/generator');
			const generate = generateModule.default.default;
			const { code } = generate(ast, { retainLines: true, comments: true });
			const outExt = ext === '.ts' ? '.js' : '.jsx';
			const outPath = path.join(outDir, fileName.replace(ext, outExt));
			await fs.mkdir(path.dirname(outPath), { recursive: true });
			await fs.writeFile(outPath, code, 'utf-8');
			console.log(`Babel TypeScript processing completed for ${filePath}`);
			return outPath;
		} catch (error) {
			console.error(`Error processing TypeScript file ${filePath}:`, error);
			throw error;
		}
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
