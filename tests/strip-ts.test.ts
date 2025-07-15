import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { stripTSFromString, stripTS } from '../src/strip-ts';

describe('stripTS (unified API)', () => {
	const testOutputDir = 'test-output';
	const testFilesDir = 'tests/test-files';

	describe('Single file processing', () => {
		it('should process a single file with string input', async () => {
			const result = await stripTS(`${testFilesDir}/Button.tsx`, { outDir: testOutputDir });

			expect(result).toHaveLength(1);
			expect(result[0]).toContain('Button.jsx');

			const outputContent = await fs.readFile(result[0], 'utf-8');
			expect(outputContent).not.toContain(': React.ReactNode');
			expect(outputContent).toContain('function Button(props)');
		});

		it('should process a single file with array input', async () => {
			const result = await stripTS([`${testFilesDir}/Button.tsx`], { outDir: testOutputDir });

			expect(result).toHaveLength(1);
			expect(result[0]).toContain('Button.jsx');
		});
	});

	describe('Multiple files processing', () => {
		it('should process multiple files with glob patterns', async () => {
			const result = await stripTS([`${testFilesDir}/*.tsx`, `${testFilesDir}/*.vue`], { outDir: testOutputDir });

			expect(result.length).toBeGreaterThan(1);
			expect(result.some((path) => path.includes('Button.jsx'))).toBe(true);
			expect(result.some((path) => path.includes('App.jsx'))).toBe(true);
			expect(result.some((path) => path.includes('Button.vue'))).toBe(true);
		});

		it('should handle mixed file types', async () => {
			const result = await stripTS(`${testFilesDir}/*.{tsx,vue,svelte}`, { outDir: testOutputDir });

			expect(result.length).toBeGreaterThan(1);
		});

		it('should preserve formatting and newlines', async () => {
			const result = await stripTS([`${testFilesDir}/*.tsx`], { outDir: testOutputDir });

			// Check Button.jsx formatting
			const buttonFile = result.find((path) => path.includes('Button.jsx'));
			const buttonContent = await fs.readFile(buttonFile!, 'utf-8');

			// Should have proper indentation and structure
			expect(buttonContent).toContain('function Button(props)');
			expect(buttonContent).toContain("display: 'block'");
			expect(buttonContent).toContain('const buttonStyle = {');

			// Check App.jsx formatting
			const appFile = result.find((path) => path.includes('App.jsx'));
			const appContent = await fs.readFile(appFile!, 'utf-8');

			// Should have proper indentation and structure
			expect(appContent).toContain('const App = () => {');
			expect(appContent).toContain('const [rectCount, setRectCount] = useState');
			expect(appContent).toContain('const styles = {');
			expect(appContent).toContain('container: {');
		});
	});

	describe('Options handling', () => {
		it('should respect outDir option', async () => {
			const customOutDir = 'custom-output';
			const result = await stripTS(`${testFilesDir}/Button.tsx`, { outDir: customOutDir });

			expect(result[0]).toContain(customOutDir);
		});

		it('should respect forceStrip option for Vue files', async () => {
			// Create a Vue file with TypeScript annotations but no lang="ts"
			const vueWithTsFile = path.join(testFilesDir, 'VueWithTS.vue');
			await fs.writeFile(
				vueWithTsFile,
				`
<template>
	<button @click="handleClick">Click me</button>
</template>

<script>
interface ButtonProps {
	onClick?: (event: MouseEvent) => void;
}

export default {
	methods: {
		handleClick(event: MouseEvent): void {
			this.$emit('click', event);
		}
	}
};
</script>
`
			);

			const result = await stripTS(vueWithTsFile, { outDir: testOutputDir, forceStrip: true });
			expect(result).toHaveLength(1);

			const outputContent = await fs.readFile(result[0], 'utf-8');
			expect(outputContent).not.toContain('interface ButtonProps');
			expect(outputContent).not.toContain(': MouseEvent');

			// Clean up
			await fs.unlink(vueWithTsFile);
		});

		it('should respect removeUnusedImports option', async () => {
			const result = await stripTS(`${testFilesDir}/Button.tsx`, {
				outDir: testOutputDir,
				removeUnusedImports: false,
			});

			const outputContent = await fs.readFile(result[0], 'utf-8');
			// With removeUnusedImports: false, React import should be preserved
			expect(outputContent).toContain("import React from 'react'");
		});
	});

	describe('Error handling', () => {
		it('should handle non-existent files gracefully', async () => {
			const result = await stripTS('non-existent-file.ts', { outDir: testOutputDir });
			expect(result).toHaveLength(0);
		});

		it('should continue processing other files when one fails', async () => {
			// Create a malformed file
			const malformedFile = path.join(testFilesDir, 'malformed.ts');
			await fs.writeFile(malformedFile, 'interface User { name: string; function greet() {');

			const result = await stripTS([`${testFilesDir}/Button.tsx`, malformedFile], { outDir: testOutputDir });

			// Should still process the valid file
			expect(result.length).toBeGreaterThan(0);
			expect(result.some((path) => path.includes('Button.jsx'))).toBe(true);

			// Clean up
			await fs.unlink(malformedFile);
		});

		it('should handle unsupported file types', async () => {
			const unsupportedFile = path.join(testFilesDir, 'test.txt');
			await fs.writeFile(unsupportedFile, 'This is a text file');

			const result = await stripTS(unsupportedFile, { outDir: testOutputDir });
			expect(result).toHaveLength(0);

			// Clean up
			await fs.unlink(unsupportedFile);
		});
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
	return \`Hello \${user.name}, you are \${user.age} years old\`;
}

const user: User = {
	name: 'John',
	age: 30
};

const message: string = greet(user);
console.log(message);
`;

			const result = await stripTSFromString(tsCode, 'ts');

			// Should remove TypeScript annotations
			expect(result).not.toContain('interface User');
			expect(result).not.toContain(': User');
			expect(result).not.toContain(': string');
			expect(result).not.toContain(': number');

			// Should keep functionality
			expect(result).toContain('function greet(user)');
			expect(result).toContain('return `Hello ${user.name}, you are ${user.age} years old`');
			expect(result).toContain('const user = {');
			expect(result).toContain('const message = greet(user)');
		});

		it('should handle type assertions and non-null assertions', async () => {
			const tsCode = `
const value: any = 'hello';
const length: number = (value as string).length;
const element: HTMLElement = document.getElementById('app')!;
`;

			const result = await stripTSFromString(tsCode, 'ts');

			// Should remove type annotations and assertions
			expect(result).not.toContain(': any');
			expect(result).not.toContain(': number');
			expect(result).not.toContain(': HTMLElement');
			expect(result).not.toContain('as string');
			expect(result).not.toContain('!');

			// Should keep expressions
			expect(result).toContain('const value =');
			expect(result).toContain('const length = value.length');
			expect(result).toContain('const element = document.getElementById');
		});
	});

	describe('TypeScript React (.tsx) strings', () => {
		it('should strip TypeScript annotations from .tsx strings', async () => {
			const tsxCode = `
import React from 'react';

interface ButtonProps {
	children: React.ReactNode;
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary' }) => {
	const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		onClick?.(event);
	};

	return (
		<button
			className={\`button button-\${variant}\`}
			onClick={handleClick}
		>
			{children}
		</button>
	);
};

export default Button;
`;

			const result = await stripTSFromString(tsxCode, 'tsx');

			// Should remove TypeScript annotations
			expect(result).not.toContain('interface ButtonProps');
			expect(result).not.toContain(': React.FC<ButtonProps>');
			expect(result).not.toContain(': React.ReactNode');
			expect(result).not.toContain(': React.MouseEvent<HTMLButtonElement>');
			expect(result).not.toContain("| 'primary' | 'secondary'");

			// Should keep JSX and functionality
			expect(result).toContain("const Button = ({ children, onClick, variant = 'primary' }) => {");
			expect(result).toContain('const handleClick = (event) => {');
			expect(result).toContain('<button');
			expect(result).toContain('className={`button button-${variant}`}');
		});
	});

	describe('Vue (.vue) strings', () => {
		it('should strip TypeScript annotations from .vue strings', async () => {
			const vueCode = `
<template>
	<button v-if="!href" class="button" @click="handleClick">
		<slot />
	</button>
	<a v-else :href="href" class="button">
		<slot />
	</a>
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
			expect(result).toContain('v-if="!href"');
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

		it('should process Vue strings without lang="ts" when forceStrip is true', async () => {
			const vueCode = `
<template>
	<button @click="handleClick">Click me</button>
</template>

<script>
interface ButtonProps {
	onClick?: (event: MouseEvent) => void;
}

export default {
	methods: {
		handleClick(event: MouseEvent): void {
			this.$emit('click', event);
		}
	}
};
</script>
`;

			const result = await stripTSFromString(vueCode, 'vue', { forceStrip: true });

			// Should remove TypeScript annotations
			expect(result).not.toContain('interface ButtonProps');
			expect(result).not.toContain(': MouseEvent');
			expect(result).not.toContain(': void');
			// Should keep functionality
			expect(result).toContain('handleClick(event)');
			expect(result).toContain('this.$emit');
			expect(result).toContain('<template>');
			expect(result).toContain('<script>');
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
