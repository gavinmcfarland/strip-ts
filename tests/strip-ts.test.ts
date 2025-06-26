import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { stripTSFromFiles, stripTSFromFile, stripTSFromString } from '../src/strip-ts';

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

	describe('stripTSFromString', () => {
		describe('TypeScript (.ts) strings', () => {
			it('should strip TypeScript annotations from .ts strings', async () => {
				const tsCode = `
interface User {
	name: string;
	age: number;
}

function greet(user: User): string {
	return \`Hello, \${user.name}! You are \${user.age} years old.\`;
}

const user: User = { name: 'John', age: 30 };
const message: string = greet(user);
`;

				const result = await stripTSFromString(tsCode, 'ts');

				// Should remove TypeScript annotations
				expect(result).not.toContain('interface User');
				expect(result).not.toContain(': User');
				expect(result).not.toContain(': string');
				expect(result).not.toContain(': number');

				// Should keep functionality
				expect(result).toContain('function greet(user)');
				expect(result).toContain('return `Hello, ${user.name}! You are ${user.age} years old.`');
				expect(result).toContain("const user = { name: 'John', age: 30 }");
				expect(result).toContain('const message = greet(user)');
			});

			it('should handle type assertions and non-null assertions', async () => {
				const tsCode = `
const element = document.getElementById('app') as HTMLElement;
const value = input.value!;
const data = response.data as UserData;
`;

				const result = await stripTSFromString(tsCode, 'ts');

				// Should remove type assertions and non-null assertions
				expect(result).not.toContain('as HTMLElement');
				expect(result).not.toContain('as UserData');
				expect(result).not.toContain('!');

				// Should keep expressions
				expect(result).toContain("const element = document.getElementById('app')");
				expect(result).toContain('const value = input.value');
				expect(result).toContain('const data = response.data');
			});
		});

		describe('TypeScript React (.tsx) strings', () => {
			it('should strip TypeScript annotations from .tsx strings', async () => {
				const tsxCode = `
import React from 'react';

interface ButtonProps {
	children: React.ReactNode;
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	style?: React.CSSProperties;
}

function Button({ children, onClick, style }: ButtonProps): JSX.Element {
	const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
		if (onClick) {
			onClick(event);
		}
	};

	return (
		<button onClick={handleClick} style={style}>
			{children}
		</button>
	);
}

export default Button;
`;

				const result = await stripTSFromString(tsxCode, 'tsx');

				// Should remove TypeScript annotations
				expect(result).not.toContain('interface ButtonProps');
				expect(result).not.toContain(': React.ReactNode');
				expect(result).not.toContain(': React.MouseEvent<');
				expect(result).not.toContain(': React.CSSProperties');
				expect(result).not.toContain(': JSX.Element');
				expect(result).not.toContain(': void');

				// Should keep JSX and functionality
				expect(result).toContain("import React from 'react'");
				expect(result).toContain('function Button({ children, onClick, style })');
				expect(result).toContain('<button onClick={handleClick} style={style}>');
				expect(result).toContain('{children}');
				expect(result).toContain('export default Button');
			});
		});

		describe('Vue (.vue) strings', () => {
			it('should strip TypeScript annotations from .vue strings', async () => {
				const vueCode = `
<template>
	<button v-if="href" :href="href" class="button button-{variant}">
		<slot />
	</button>
	<button v-else class="button button-{variant}" @click="handleClick">
		<slot />
	</button>
</template>

<script lang="ts">
interface ButtonProps {
	href?: string;
	variant?: string;
}

export default {
	props: {
		href: {
			type: String as () => string,
			required: false
		},
		variant: {
			type: String as () => string,
			default: 'primary'
		}
	},
	methods: {
		handleClick(event: MouseEvent): void {
			this.$emit('click', event);
		}
	}
};
</script>

<style scoped>
.button {
	font-family: inherit;
}
</style>
`;

				const result = await stripTSFromString(vueCode, 'vue');

				// Should remove lang="ts" from script tag
				expect(result).toContain('<script>');
				expect(result).not.toContain('<script lang="ts">');

				// Should remove TypeScript annotations
				expect(result).not.toContain('interface ButtonProps');
				expect(result).not.toContain(': string');
				expect(result).not.toContain(': MouseEvent');
				expect(result).not.toContain(': void');
				expect(result).not.toContain('as () => string');

				// Should keep Vue functionality
				expect(result).toContain('<template>');
				expect(result).toContain('v-if="href"');
				expect(result).toContain('v-else');
				expect(result).toContain('<slot />');
				expect(result).toContain('export default {');
				expect(result).toContain('handleClick(event)');
				expect(result).toContain('<style scoped>');
			});

			it('should return original content for Vue strings without TypeScript', async () => {
				const vueCode = `
<template>
	<button>Click me</button>
</template>

<script>
export default {
	methods: {
		handleClick() {
			console.log('clicked');
		}
	}
};
</script>
`;

				const result = await stripTSFromString(vueCode, 'vue');

				// Should return original content unchanged
				expect(result).toBe(vueCode);
			});
		});

		describe('Svelte (.svelte) strings', () => {
			it('should strip TypeScript annotations from .svelte strings', async () => {
				const svelteCode = `
<script lang="ts">
	export let href: string | undefined = undefined;
	export let variant: string = 'primary';

	$: buttonStyle: Record<string, string> = {
		display: 'block',
		padding: '10px 20px'
	};

	function handleClick(event: MouseEvent): void {
		console.log('Button clicked', event);
	}
</script>

{#if href}
	<a {href} class="button button-{variant}" style={buttonStyle}>
		<slot />
	</a>
{:else}
	<button class="button button-{variant}" style={buttonStyle} on:click={handleClick}>
		<slot />
	</button>
{/if}

<style>
	.button {
		font-family: inherit;
	}
</style>
`;

				const result = await stripTSFromString(svelteCode, 'svelte');

				// Should remove lang="ts" from script tag
				expect(result).toContain('<script>');
				expect(result).not.toContain('<script lang="ts">');

				// Should remove TypeScript annotations
				expect(result).not.toContain(': string | undefined');
				expect(result).not.toContain(': string');
				expect(result).not.toContain(': Record<string, string>');
				expect(result).not.toContain(': void');

				// Should keep Svelte functionality
				expect(result).toContain('export let href');
				expect(result).toContain('export let variant');
				expect(result).toContain('$: buttonStyle');
				expect(result).toContain('function handleClick(event)');
				expect(result).toContain('{#if href}');
				expect(result).toContain('{:else}');
				expect(result).toContain('{/if}');
				expect(result).toContain('<style>');
			});
		});

		describe('Error handling', () => {
			it('should throw error for unsupported file types', async () => {
				const invalidCode = 'console.log("test");';

				await expect(stripTSFromString(invalidCode, 'txt' as any)).rejects.toThrow('Unsupported file type');
			});

			it('should handle malformed TypeScript code gracefully', async () => {
				const malformedCode = `
interface User {
	name: string;
	age: number;

function greet(user: User) {
	return \`Hello \${user.name}\`;
}
`;

				// This should throw a parsing error, which is expected
				await expect(stripTSFromString(malformedCode, 'ts')).rejects.toThrow();
			});
		});
	});
});
