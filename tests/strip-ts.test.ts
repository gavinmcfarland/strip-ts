import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { stripTSFromFiles, stripTSFromFile, stripTSFromString } from '../src/strip-ts';

describe('stripTSFromFiles', () => {
	const testOutputDir = 'test-output';
	const testFilesDir = 'tests/test-files';

	// beforeEach(async () => {
	// 	// Clean up test output directory
	// 	try {
	// 		await fs.rm(testOutputDir, { recursive: true, force: true });
	// 	} catch (error) {
	// 		// Directory doesn't exist, that's fine
	// 	}
	// });

	// afterEach(async () => {
	// 	// Clean up test output directory
	// 	try {
	// 		await fs.rm(testOutputDir, { recursive: true, force: true });
	// 	} catch (error) {
	// 		// Ignore cleanup errors
	// 	}
	// });

	describe('TypeScript React (.tsx) files', () => {
		it('should strip TypeScript annotations from .tsx files', async () => {
			const result = await stripTSFromFiles([`${testFilesDir}/*.tsx`], testOutputDir);

			expect(result).toHaveLength(2);
			expect(result.some((path) => path.includes('Button.jsx'))).toBe(true);
			expect(result.some((path) => path.includes('App.jsx'))).toBe(true);

			// Check Button.jsx
			const buttonFile = result.find((path) => path.includes('Button.jsx'));
			const buttonContent = await fs.readFile(buttonFile!, 'utf-8');

			// Should remove TypeScript annotations
			expect(buttonContent).not.toContain(': React.ReactNode');
			expect(buttonContent).not.toContain(': React.CSSProperties');
			expect(buttonContent).not.toContain(': React.MouseEvent<');
			expect(buttonContent).not.toContain('as React.MouseEvent<');

			// Should keep JSX and functionality (React import removed since unused)
			expect(buttonContent).not.toContain("import React from 'react'");
			expect(buttonContent).toContain('<button');
			expect(buttonContent).toContain('<a');
			expect(buttonContent).toContain('onClick={handleClick}');

			// Check App.jsx
			const appFile = result.find((path) => path.includes('App.jsx'));
			const appContent = await fs.readFile(appFile!, 'utf-8');

			// Should remove some TypeScript annotations
			expect(appContent).not.toContain(': React.FC');
			expect(appContent).not.toContain('as const');

			// Should keep JSX and functionality (React import removed since unused)
			expect(appContent).toContain('import { useState, useEffect } from "react"');
			expect(appContent).toContain('const App = () => {');
			expect(appContent).toContain('useState');
			expect(appContent).toContain('useEffect(() => {');
			expect(appContent).toContain('window.addEventListener');
		});

		it('should preserve formatting and newlines', async () => {
			const result = await stripTSFromFiles([`${testFilesDir}/*.tsx`], testOutputDir);

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

		it('should handle complex React components with hooks and event handlers', async () => {
			const result = await stripTSFromFile(`${testFilesDir}/App.tsx`, testOutputDir);

			expect(result).toBeTruthy();
			expect(result).toContain('App.jsx');

			const outputContent = await fs.readFile(result!, 'utf-8');

			// Should remove some TypeScript annotations
			expect(outputContent).not.toContain(': React.FC');
			expect(outputContent).not.toContain('as const');

			// Should keep React functionality
			expect(outputContent).toContain('useState');
			expect(outputContent).toContain('useEffect(() => {');
			expect(outputContent).toContain('window.addEventListener');
			expect(outputContent).toContain('window.removeEventListener');
			expect(outputContent).toContain('window.parent.postMessage');
			expect(outputContent).toContain('onClick={() => createRectangles(rectCount)}');
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

		it('should return null for files without TypeScript', async () => {
			// Create a Vue file without TypeScript
			const noTsFile = path.join(testFilesDir, 'NoTS.vue');
			await fs.writeFile(noTsFile, '<script>export default {}</script>');

			const result = await stripTSFromFile(noTsFile, testOutputDir);
			expect(result).toBeNull();

			// Clean up
			await fs.unlink(noTsFile);
		});

		it('should process Vue files without lang="ts" when forceStrip is true', async () => {
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

			const result = await stripTSFromFile(vueWithTsFile, testOutputDir, true);
			expect(result).toBeTruthy();
			expect(result).toContain('VueWithTS.vue');

			const outputContent = await fs.readFile(result!, 'utf-8');
			// Should remove TypeScript annotations
			expect(outputContent).not.toContain('interface ButtonProps');
			expect(outputContent).not.toContain(': MouseEvent');
			expect(outputContent).not.toContain(': void');
			// Should keep functionality
			expect(outputContent).toContain('handleClick(event)');
			expect(outputContent).toContain('this.$emit');

			// Clean up
			await fs.unlink(vueWithTsFile);
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

			expect(result).toHaveLength(4);
			expect(result.some((path) => path.includes('Button.jsx'))).toBe(true);
			expect(result.some((path) => path.includes('App.jsx'))).toBe(true);
			expect(result.some((path) => path.includes('Button.vue'))).toBe(true);
			expect(result.some((path) => path.includes('Button.svelte'))).toBe(true);
		});

		it('should process Vue files without lang="ts" when forceStrip is true', async () => {
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

			const result = await stripTSFromFiles([`${testFilesDir}/VueWithTS.vue`], testOutputDir, true);
			expect(result).toHaveLength(1);
			expect(result[0]).toContain('VueWithTS.vue');

			const outputContent = await fs.readFile(result[0], 'utf-8');
			// Should remove TypeScript annotations
			expect(outputContent).not.toContain('interface ButtonProps');
			expect(outputContent).not.toContain(': MouseEvent');
			expect(outputContent).not.toContain(': void');
			// Should keep functionality
			expect(outputContent).toContain('handleClick(event)');
			expect(outputContent).toContain('this.$emit');

			// Clean up
			await fs.unlink(vueWithTsFile);
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
			expect(outputContent).not.toContain("import React from 'react'");
		});

		it('should process App.tsx file correctly', async () => {
			const result = await stripTSFromFile(`${testFilesDir}/App.tsx`, testOutputDir);

			expect(result).toBeTruthy();
			expect(result).toContain('App.jsx');

			const outputContent = await fs.readFile(result!, 'utf-8');

			// Should remove TypeScript annotations
			expect(outputContent).not.toContain(': React.FC');
			expect(outputContent).not.toContain(': number');
			expect(outputContent).not.toContain(': string');
			expect(outputContent).not.toContain(': MessageEvent');
			expect(outputContent).not.toContain('as const');

			// Should keep React functionality (React import removed since unused)
			expect(outputContent).toContain('import { useState, useEffect } from "react"');
			expect(outputContent).toContain('const App = () => {');
			expect(outputContent).toContain('useState');
			expect(outputContent).toContain('useEffect(() => {');
			expect(outputContent).toContain('window.addEventListener');
			expect(outputContent).toContain('window.removeEventListener');
			expect(outputContent).toContain('window.parent.postMessage');
			expect(outputContent).toContain('onClick={() => createRectangles(rectCount)}');
			expect(outputContent).toContain('{nodeCount} nodes selected');
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

		it('should process Vue files without lang="ts" when forceStrip is true', async () => {
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

			const result = await stripTSFromFile(vueWithTsFile, testOutputDir, true);
			expect(result).toBeTruthy();
			expect(result).toContain('VueWithTS.vue');

			const outputContent = await fs.readFile(result!, 'utf-8');
			// Should remove TypeScript annotations
			expect(outputContent).not.toContain('interface ButtonProps');
			expect(outputContent).not.toContain(': MouseEvent');
			expect(outputContent).not.toContain(': void');
			// Should keep functionality
			expect(outputContent).toContain('handleClick(event)');
			expect(outputContent).toContain('this.$emit');

			// Clean up
			await fs.unlink(vueWithTsFile);
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

				// Should keep JSX and functionality (React import removed since unused)
				expect(result).not.toContain("import React from 'react'");
				expect(result).toContain('function Button({ children, onClick, style })');
				expect(result).toContain('<button onClick={handleClick} style={style}>');
				expect(result).toContain('{children}');
				expect(result).toContain('export default Button');
			});

			it('should strip TypeScript annotations from complex React component strings', async () => {
				const appCode = `
import React, { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import Icon from "./components/Icon";
import Input from "./components/Input";
import Button from "./components/Button";

const App: React.FC = () => {
	const [rectCount, setRectCount] = useState<number>(5);
	const [nodeCount, setNodeCount] = useState<number>(0);

	const styles = {
		container: {
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			height: "100%",
			width: "100%",
			flexDirection: "column" as const,
		},
		banner: {
			display: "flex",
			alignItems: "center",
			gap: "18px",
			marginBottom: "16px",
		},
		nodeCount: {
			fontSize: "11px",
		},
		field: {
			display: "flex",
			gap: "var(--spacer-2)",
			height: "var(--spacer-5)",
			alignItems: "center",
		},
		createRectanglesInput: {
			width: "40px",
		},
	};

	const createRectangles = (count: number) => {
		window.parent.postMessage(
			{
				pluginMessage: {
					type: "CREATE_RECTANGLES",
					count,
				},
			},
			"*",
		);
	};

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data.pluginMessage;
			if (message?.type === "POST_NODE_COUNT") {
				setNodeCount(message.count);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, []);

	return (
		<div style={styles.container}>
			<div style={styles.banner}>
				<Icon svg="plugma" size={38} />
				<Icon svg="plus" size={24} />
				<img src={reactLogo} width="44" height="44" alt="Svelte logo" />
			</div>

			<div style={styles.field}>
				<Input
					type="number"
					value={rectCount.toString()}
					onChange={(value: string) => setRectCount(Number(value))}
				/>
				<Button
					onClick={() => createRectangles(rectCount)}
					href={undefined}
					target={undefined}
					style={styles.createRectanglesInput}
				>
					Create Rectangles
				</Button>
			</div>
			<div style={styles.nodeCount}>
				<span>{nodeCount} nodes selected</span>
			</div>
		</div>
	);
};

export default App;
`;

				const result = await stripTSFromString(appCode, 'tsx');

				// Should remove some TypeScript annotations
				expect(result).not.toContain(': React.FC');
				expect(result).not.toContain('as const');

				// Should keep React functionality (React import removed since unused)
				expect(result).toContain('import { useState, useEffect } from "react"');
				expect(result).toContain('const App = () => {');
				expect(result).toContain('useState');
				expect(result).toContain('useEffect(() => {');
				expect(result).toContain('window.addEventListener');
				expect(result).toContain('window.removeEventListener');
				expect(result).toContain('window.parent.postMessage');
				expect(result).toContain('onClick={() => createRectangles(rectCount)}');
				expect(result).toContain('{nodeCount} nodes selected');
				expect(result).toContain('export default App');
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

				const result = await stripTSFromString(vueCode, 'vue', true);

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
});
