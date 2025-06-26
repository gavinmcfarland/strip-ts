import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { stripTSFromFiles, stripTSFromFile } from '../src/strip-ts';

describe('stripTSFromFiles', () => {
	const testOutputDir = 'test-output';
	const testFilesDir = 'tests/test-files';

	beforeEach(async () => {
		// Clean up test output directory
		try {
			await fs.rm(testOutputDir, { recursive: true, force: true });
		} catch (error) {
			// Directory doesn't exist, that's fine
		}
	});

	afterEach(async () => {
		// Clean up test output directory
		try {
			await fs.rm(testOutputDir, { recursive: true, force: true });
		} catch (error) {
			// Ignore cleanup errors
		}
	});

	describe('TypeScript React (.tsx) files', () => {
		it('should strip TypeScript annotations from .tsx files', async () => {
			const result = await stripTSFromFiles([`${testFilesDir}/*.tsx`], testOutputDir);

			expect(result).toHaveLength(1);
			expect(result[0]).toContain('Button.jsx');

			const outputContent = await fs.readFile(result[0], 'utf-8');

			// Should remove TypeScript annotations
			expect(outputContent).not.toContain(': React.ReactNode');
			expect(outputContent).not.toContain(': React.CSSProperties');
			expect(outputContent).not.toContain(': React.MouseEvent<');
			expect(outputContent).not.toContain('as React.MouseEvent<');

			// Should keep JSX and functionality
			expect(outputContent).toContain("import React from 'react'");
			expect(outputContent).toContain('<button');
			expect(outputContent).toContain('<a');
			expect(outputContent).toContain('onClick={handleClick}');
		});

		it('should preserve formatting and newlines', async () => {
			const result = await stripTSFromFiles([`${testFilesDir}/*.tsx`], testOutputDir);
			const outputContent = await fs.readFile(result[0], 'utf-8');

			// Should have proper indentation and structure
			expect(outputContent).toContain('function Button(props)');
			expect(outputContent).toContain("display: 'block'");
			expect(outputContent).toContain('const buttonStyle = {');
		});
	});

	describe('Vue (.vue) files', () => {
		it('should strip TypeScript annotations from .vue files', async () => {
			const result = await stripTSFromFiles([`${testFilesDir}/*.vue`], testOutputDir);

			expect(result).toHaveLength(1);
			expect(result[0]).toContain('Button.vue');

			const outputContent = await fs.readFile(result[0], 'utf-8');

			// Should remove lang="ts" from script tag
			expect(outputContent).toContain('<script>');
			expect(outputContent).not.toContain('<script lang="ts">');

			// Should remove TypeScript annotations
			expect(outputContent).not.toContain(': MouseEvent): void');
			expect(outputContent).not.toContain(': Record<string, string>');
			expect(outputContent).not.toContain('as (event: MouseEvent) => void');

			// Should keep Vue functionality
			expect(outputContent).toContain('export default {');
			expect(outputContent).toContain('<template>');
			expect(outputContent).toContain('<style scoped>');
			expect(outputContent).toContain('handleClick(event)');
		});

		it('should preserve template and styles', async () => {
			const result = await stripTSFromFiles([`${testFilesDir}/*.vue`], testOutputDir);
			const outputContent = await fs.readFile(result[0], 'utf-8');

			// Should keep template structure
			expect(outputContent).toContain('v-if="href"');
			expect(outputContent).toContain('v-else');
			expect(outputContent).toContain('<slot />');

			// Should keep styles
			expect(outputContent).toContain('.button {');
			expect(outputContent).toContain('font-family: inherit;');
		});
	});

	describe('Svelte (.svelte) files', () => {
		it('should strip TypeScript annotations from .svelte files', async () => {
			const result = await stripTSFromFiles([`${testFilesDir}/*.svelte`], testOutputDir);

			expect(result).toHaveLength(1);
			expect(result[0]).toContain('Button.svelte');

			const outputContent = await fs.readFile(result[0], 'utf-8');

			// Should remove lang="ts" from script tag
			expect(outputContent).toContain('<script>');
			expect(outputContent).not.toContain('<script lang="ts">');

			// Should remove TypeScript annotations
			expect(outputContent).not.toContain(': string | undefined');
			expect(outputContent).not.toContain(': Record<string, string>');
			expect(outputContent).not.toContain(': void');

			// Should keep Svelte functionality
			expect(outputContent).toContain('export let href');
			expect(outputContent).toContain('{#if href}');
			expect(outputContent).toContain('{:else}');
			expect(outputContent).toContain('{/if}');
			expect(outputContent).toContain('<style>');
		});

		it('should preserve Svelte syntax and reactivity', async () => {
			const result = await stripTSFromFiles([`${testFilesDir}/*.svelte`], testOutputDir);
			const outputContent = await fs.readFile(result[0], 'utf-8');

			// Should keep reactive statements (type annotation might be transformed)
			expect(outputContent).toContain('$: buttonStyle');
			expect(outputContent).toContain('on:click={handleClick}');
			expect(outputContent).toContain('class="button button-{variant}"');
		});
	});

	describe('Multiple file types', () => {
		it('should process multiple file types in one call', async () => {
			const result = await stripTSFromFiles(
				[`${testFilesDir}/*.tsx`, `${testFilesDir}/*.vue`, `${testFilesDir}/*.svelte`],
				testOutputDir
			);

			expect(result).toHaveLength(3);
			expect(result.some((path) => path.includes('Button.jsx'))).toBe(true);
			expect(result.some((path) => path.includes('Button.vue'))).toBe(true);
			expect(result.some((path) => path.includes('Button.svelte'))).toBe(true);
		});
	});

	describe('Error handling', () => {
		it('should handle non-existent files gracefully', async () => {
			const result = await stripTSFromFiles(['non-existent-file.ts'], testOutputDir);
			expect(result).toHaveLength(0);
		});

		it('should handle unsupported file types', async () => {
			// Create a test file with unsupported extension
			const unsupportedFile = path.join(testFilesDir, 'test.txt');
			await fs.writeFile(unsupportedFile, 'This is a text file');

			await expect(stripTSFromFile(unsupportedFile, testOutputDir)).rejects.toThrow('Unsupported file type');

			// Clean up
			await fs.unlink(unsupportedFile);
		});
	});

	describe('stripTSFromFile', () => {
		it('should process single files correctly', async () => {
			const result = await stripTSFromFile(`${testFilesDir}/Button.tsx`, testOutputDir);

			expect(result).toBeTruthy();
			expect(result).toContain('Button.jsx');

			const outputContent = await fs.readFile(result!, 'utf-8');
			expect(outputContent).not.toContain(': React.ReactNode');
			expect(outputContent).toContain("import React from 'react'");
		});

		it('should return null for files without TypeScript', async () => {
			// Create a Vue file without TypeScript
			const noTsFile = path.join(testFilesDir, 'NoTS.vue');
			await fs.writeFile(noTsFile, '<script>export default {}</script>');

			const result = await stripTSFromFile(noTsFile, testOutputDir);
			expect(result).toBeNull();

			// Clean up
			await fs.unlink(noTsFile);
		});
	});
});
