import fs from 'fs/promises';
import path from 'path';
import fg from 'fast-glob';
import esbuild from 'esbuild';
import * as ts from 'typescript';
import { parse as babelParse } from '@babel/parser';
import { parse as parseVue, compileScript } from '@vue/compiler-sfc';
import { preprocess } from 'svelte/compiler';
import sveltePreprocess from 'svelte-preprocess';

/**
 * Removes unused imports from JavaScript/TypeScript code
 * @param code - The code to process
 * @param isJSX - Whether the code contains JSX
 * @returns The code with unused imports removed
 */
async function removeUnusedImports(code: string, isJSX: boolean = false): Promise<string> {
	try {
		const [traverseModule, generateModule] = await Promise.all([
			import('@babel/traverse'),
			import('@babel/generator'),
		]);

		// Robustly extract traverse and generate functions
		let traverse: any = traverseModule;
		if (typeof traverseModule === 'object') {
			if (typeof (traverseModule as any)['default'] === 'function') {
				traverse = (traverseModule as any)['default'];
			} else if (
				typeof (traverseModule as any)['default'] === 'object' &&
				typeof (traverseModule as any)['default']['default'] === 'function'
			) {
				traverse = (traverseModule as any)['default']['default'];
			}
		}

		let generate: any = generateModule;
		if (typeof generateModule === 'object') {
			if (typeof (generateModule as any)['default'] === 'function') {
				generate = (generateModule as any)['default'];
			} else if (
				typeof (generateModule as any)['default'] === 'object' &&
				typeof (generateModule as any)['default']['default'] === 'function'
			) {
				generate = (generateModule as any)['default']['default'];
			}
		}

		if (typeof traverse !== 'function' || typeof generate !== 'function') {
			return code; // Return original code if Babel functions can't be resolved
		}

		const ast = babelParse(code, {
			sourceType: 'module',
			plugins: isJSX ? ['jsx'] : [],
		} as any);

		// Collect all identifiers used in the code, but skip import declarations
		const usedIdentifiers = new Set<string>();
		const jsxIdentifiers = new Set<string>();

		traverse(ast, {
			ImportDeclaration(path: any) {
				path.skip(); // Do not collect identifiers from import declarations
			},
			Identifier(path: any) {
				usedIdentifiers.add(path.node.name);
			},
			JSXIdentifier(path: any) {
				// Collect JSX identifiers separately to avoid treating them as React usage
				jsxIdentifiers.add(path.node.name);
			},
			JSXMemberExpression(path: any) {
				// Handle JSX namespaced components like React.Fragment
				if (path.node.object.type === 'JSXIdentifier') {
					usedIdentifiers.add(path.node.object.name);
				}
			},
		});

		// Remove unused imports
		traverse(ast, {
			ImportDeclaration(path: any) {
				const specifiers = path.node.specifiers || [];
				const usedSpecifiers: any[] = [];

				specifiers.forEach((specifier: any) => {
					if (specifier.type === 'ImportDefaultSpecifier') {
						// Check if default import is used (as identifier or JSX element)
						const isUsed = usedIdentifiers.has(specifier.local.name);
						const isUsedAsJSX = jsxIdentifiers.has(specifier.local.name);

						// Special case: if it's React and not used as an identifier, consider it unused
						if (specifier.local.name === 'React' && !isUsed) {
							// Don't add to usedSpecifiers - React import not needed for JSX
						} else if (isUsed || isUsedAsJSX) {
							usedSpecifiers.push(specifier);
						}
					} else if (specifier.type === 'ImportSpecifier') {
						// Check if named import is used (as identifier or JSX element)
						const isUsed = usedIdentifiers.has(specifier.local.name);
						const isUsedAsJSX = jsxIdentifiers.has(specifier.local.name);
						if (isUsed || isUsedAsJSX) {
							usedSpecifiers.push(specifier);
						}
					} else if (specifier.type === 'ImportNamespaceSpecifier') {
						// Check if namespace import is used
						const isUsed = usedIdentifiers.has(specifier.local.name);
						const isUsedAsJSX = jsxIdentifiers.has(specifier.local.name);
						if (isUsed || isUsedAsJSX) {
							usedSpecifiers.push(specifier);
						}
					}
				});

				if (usedSpecifiers.length === 0) {
					// Remove entire import if no specifiers are used
					path.remove();
				} else if (usedSpecifiers.length !== specifiers.length) {
					// Update import to only include used specifiers
					path.node.specifiers = usedSpecifiers;
				}
			},
		});

		const { code: processedCode } = generate(ast, { retainLines: true, comments: true });
		// Collapse multiple blank lines into a single blank line
		let cleanedCode = processedCode.replace(/\n{3,}/g, '\n\n');
		// Remove leading blank lines at the start of the file
		cleanedCode = cleanedCode.replace(/^\s*\n/, '');
		return cleanedCode;
	} catch (error) {
		// If there's an error processing imports, return the original code
		console.warn('Warning: Could not remove unused imports:', error);
		return code;
	}
}

/**
 * Strips TypeScript from a single file and writes the output to outDir.
 * @param filePath - Path to the file to process.
 * @param outDir - Output directory.
 * @param forceStrip - Force processing even if lang doesn't equal "ts" (for Vue files).
 * @returns The output file path.
 */
export async function stripTSFromFile(
	filePath: string,
	outDir: string = 'output',
	forceStrip: boolean = false
): Promise<string | null> {
	const ext = path.extname(filePath);
	const fileName = path.basename(filePath);
	const fileContent = await fs.readFile(filePath, 'utf-8');

	if (ext === '.ts' || ext === '.tsx') {
		// console.log(`Processing TypeScript file with Babel: ${filePath}`);
		try {
			// Use dynamic imports that work better with TypeScript compilation
			const [traverseModule, generateModule] = await Promise.all([
				import('@babel/traverse'),
				import('@babel/generator'),
			]);

			// Robustly extract traverse and generate functions
			let traverse: any = traverseModule;
			if (typeof traverseModule === 'object') {
				if (typeof (traverseModule as any)['default'] === 'function') {
					traverse = (traverseModule as any)['default'];
				} else if (
					typeof (traverseModule as any)['default'] === 'object' &&
					typeof (traverseModule as any)['default']['default'] === 'function'
				) {
					traverse = (traverseModule as any)['default']['default'];
				}
			}
			if (typeof traverse !== 'function') {
				console.error(
					'Could not resolve traverse function. TraverseModule:',
					traverseModule,
					'Type:',
					typeof traverse
				);
				throw new Error('Babel traverse is not a function');
			}

			let generate: any = generateModule;
			if (typeof generateModule === 'object') {
				if (typeof (generateModule as any)['default'] === 'function') {
					generate = (generateModule as any)['default'];
				} else if (
					typeof (generateModule as any)['default'] === 'object' &&
					typeof (generateModule as any)['default']['default'] === 'function'
				) {
					generate = (generateModule as any)['default']['default'];
				}
			}
			if (typeof generate !== 'function') {
				console.error(
					'Could not resolve generate function. GenerateModule:',
					generateModule,
					'Type:',
					typeof generate
				);
				throw new Error('Babel generate is not a function');
			}

			const isTSX = ext === '.tsx';
			const ast = babelParse(fileContent, {
				sourceType: 'module',
				plugins: ['typescript', 'jsx'],
			} as any);

			traverse(ast, {
				TSTypeAnnotation(path: any) {
					path.remove();
				},
				TSInterfaceDeclaration(path: any) {
					path.remove();
				},
				TSTypeAliasDeclaration(path: any) {
					path.remove();
				},
				TSTypeParameterInstantiation(path: any) {
					// Remove generic type parameters like <number> in useState<number>(5)
					path.remove();
				},
				TSAsExpression(path: any) {
					// Remove "as" casts, keep the expression
					path.replaceWith(path.node.expression);
				},
				TSNonNullExpression(path: any) {
					// Remove non-null assertions ("!")
					path.replaceWith(path.node.expression);
				},
			});

			const { code } = generate(ast, { retainLines: true, comments: true });

			// Remove unused imports after TypeScript stripping
			let processedCode = await removeUnusedImports(code, isTSX);
			// Collapse multiple blank lines into a single blank line
			processedCode = processedCode.replace(/\n{3,}/g, '\n\n');
			// Remove leading blank lines at the start of the file
			processedCode = processedCode.replace(/^\s*\n/, '');

			const outExt = ext === '.ts' ? '.js' : '.jsx';
			const outPath = path.join(outDir, fileName.replace(ext, outExt));
			await fs.mkdir(path.dirname(outPath), { recursive: true });
			await fs.writeFile(outPath, processedCode, 'utf-8');
			// console.log(`Babel TypeScript processing completed for ${filePath}`);
			return outPath;
		} catch (error) {
			console.error(`Error processing TypeScript file ${filePath}:`, error);
			throw error;
		}
	} else if (ext === '.vue') {
		const sfc = parseVue(fileContent);
		const hasTs = sfc.descriptor.script?.lang === 'ts' || sfc.descriptor.scriptSetup?.lang === 'ts';

		if (!hasTs && !forceStrip) {
			return null;
		}

		// console.log(`Processing Vue file with TypeScript: ${filePath}`);
		try {
			// Use Babel to strip TypeScript from the script content
			const [traverseModule, generateModule] = await Promise.all([
				import('@babel/traverse'),
				import('@babel/generator'),
			]);

			// Robustly extract traverse and generate functions
			let traverse: any = traverseModule;
			if (typeof traverseModule === 'object') {
				if (typeof (traverseModule as any)['default'] === 'function') {
					traverse = (traverseModule as any)['default'];
				} else if (
					typeof (traverseModule as any)['default'] === 'object' &&
					typeof (traverseModule as any)['default']['default'] === 'function'
				) {
					traverse = (traverseModule as any)['default']['default'];
				}
			}
			if (typeof traverse !== 'function') {
				throw new Error('Babel traverse is not a function');
			}

			let generate: any = generateModule;
			if (typeof generateModule === 'object') {
				if (typeof (generateModule as any)['default'] === 'function') {
					generate = (generateModule as any)['default'];
				} else if (
					typeof (generateModule as any)['default'] === 'object' &&
					typeof (generateModule as any)['default']['default'] === 'function'
				) {
					generate = (generateModule as any)['default']['default'];
				}
			}
			if (typeof generate !== 'function') {
				throw new Error('Babel generate is not a function');
			}

			// Process the script content with Babel
			const scriptContent = sfc.descriptor.script?.content || '';
			const ast = babelParse(scriptContent, {
				sourceType: 'module',
				plugins: ['typescript'],
			} as any);

			traverse(ast, {
				TSTypeAnnotation(path: any) {
					path.remove();
				},
				TSInterfaceDeclaration(path: any) {
					path.remove();
				},
				TSTypeAliasDeclaration(path: any) {
					path.remove();
				},
				TSAsExpression(path: any) {
					// Remove "as" casts, keep the expression
					path.replaceWith(path.node.expression);
				},
				TSNonNullExpression(path: any) {
					// Remove non-null assertions ("!")
					path.replaceWith(path.node.expression);
				},
			});

			const { code: processedScript } = generate(ast, { retainLines: true, comments: true });

			// Remove unused imports from the script content
			const cleanedScript = await removeUnusedImports(processedScript, false);

			// Replace the script content in the Vue file
			const replaced = fileContent
				.replace(/<script[^>]*lang="ts"[^>]*>/, '<script>')
				.replace(/<script setup[^>]*lang="ts"[^>]*>/, '<script setup>')
				.replace(/<script[^>]*>[^]*?<\/script>/, `<script>\n${cleanedScript}\n</script>`);

			const outPath = path.join(outDir, fileName);
			await fs.mkdir(path.dirname(outPath), { recursive: true });
			await fs.writeFile(outPath, replaced, 'utf-8');
			// console.log(`Vue TypeScript processing completed for ${filePath}`);
			return outPath;
		} catch (error) {
			console.error(`Error processing Vue file ${filePath}:`, error);
			throw error;
		}
	} else if (ext === '.svelte') {
		const processed = await preprocess(fileContent, sveltePreprocess({ typescript: true }), { filename: filePath });
		let replaced = processed.code.replace(/<script[^>]*lang="ts"[^>]*>/, '<script>');

		// Extract and process script content for unused imports
		const scriptMatch = replaced.match(/<script>([\s\S]*?)<\/script>/);
		if (scriptMatch) {
			const scriptContent = scriptMatch[1];
			const cleanedScript = await removeUnusedImports(scriptContent, false);
			replaced = replaced.replace(/<script>[\s\S]*?<\/script>/, `<script>\n${cleanedScript}\n</script>`);
		}

		const outPath = path.join(outDir, fileName);
		await fs.mkdir(path.dirname(outPath), { recursive: true });
		await fs.writeFile(outPath, replaced, 'utf-8');
		return outPath;
	} else {
		throw new Error(`Unsupported file type: ${filePath}`);
	}
}

/**
 * Strips TypeScript from multiple files matching the provided globs or file paths.
 * @param globs - Array of file globs or paths.
 * @param outDir - Output directory.
 * @param forceStrip - Force processing even if lang doesn't equal "ts" (for Vue files).
 * @returns Array of output file paths.
 */
export async function stripTSFromFiles(
	globs: string[],
	outDir: string = 'output',
	forceStrip: boolean = false
): Promise<string[]> {
	const files = await fg(globs, { onlyFiles: true });
	if (files.length === 0) {
		return [];
	}
	const results: string[] = [];
	for (const file of files) {
		try {
			const outPath = await stripTSFromFile(file, outDir, forceStrip);
			if (outPath) results.push(outPath);
		} catch (err) {
			// Optionally, collect errors or rethrow
			// For now, just skip errored files
		}
	}
	return results;
}

/**
 * Strips TypeScript from a string and returns the JavaScript equivalent.
 * @param content - The TypeScript content as a string.
 * @param fileType - The type of file ('ts', 'tsx', 'vue', 'svelte').
 * @param forceStrip - Force processing even if lang doesn't equal "ts" (for Vue files).
 * @returns The JavaScript content as a string.
 */
export async function stripTSFromString(
	content: string,
	fileType: 'ts' | 'tsx' | 'vue' | 'svelte',
	forceStrip: boolean = false
): Promise<string> {
	if (fileType === 'ts' || fileType === 'tsx') {
		// console.log(`Processing TypeScript string with Babel: ${fileType}`);
		try {
			// Use dynamic imports that work better with TypeScript compilation
			const [traverseModule, generateModule] = await Promise.all([
				import('@babel/traverse'),
				import('@babel/generator'),
			]);

			// Robustly extract traverse and generate functions
			let traverse: any = traverseModule;
			if (typeof traverseModule === 'object') {
				if (typeof (traverseModule as any)['default'] === 'function') {
					traverse = (traverseModule as any)['default'];
				} else if (
					typeof (traverseModule as any)['default'] === 'object' &&
					typeof (traverseModule as any)['default']['default'] === 'function'
				) {
					traverse = (traverseModule as any)['default']['default'];
				}
			}
			if (typeof traverse !== 'function') {
				console.error(
					'Could not resolve traverse function. TraverseModule:',
					traverseModule,
					'Type:',
					typeof traverse
				);
				throw new Error('Babel traverse is not a function');
			}

			let generate: any = generateModule;
			if (typeof generateModule === 'object') {
				if (typeof (generateModule as any)['default'] === 'function') {
					generate = (generateModule as any)['default'];
				} else if (
					typeof (generateModule as any)['default'] === 'object' &&
					typeof (generateModule as any)['default']['default'] === 'function'
				) {
					generate = (generateModule as any)['default']['default'];
				}
			}
			if (typeof generate !== 'function') {
				console.error(
					'Could not resolve generate function. GenerateModule:',
					generateModule,
					'Type:',
					typeof generate
				);
				throw new Error('Babel generate is not a function');
			}

			const isTSX = fileType === 'tsx';
			const ast = babelParse(content, {
				sourceType: 'module',
				plugins: ['typescript', 'jsx'],
			} as any);

			traverse(ast, {
				TSTypeAnnotation(path: any) {
					path.remove();
				},
				TSInterfaceDeclaration(path: any) {
					path.remove();
				},
				TSTypeAliasDeclaration(path: any) {
					path.remove();
				},
				TSTypeParameterInstantiation(path: any) {
					// Remove generic type parameters like <number> in useState<number>(5)
					path.remove();
				},
				TSAsExpression(path: any) {
					// Remove "as" casts, keep the expression
					path.replaceWith(path.node.expression);
				},
				TSNonNullExpression(path: any) {
					// Remove non-null assertions ("!")
					path.replaceWith(path.node.expression);
				},
			});

			const { code } = generate(ast, { retainLines: true, comments: true });

			// Remove unused imports after TypeScript stripping
			let processedCode = await removeUnusedImports(code, isTSX);
			// Collapse multiple blank lines into a single blank line
			processedCode = processedCode.replace(/\n{3,}/g, '\n\n');
			// Remove leading blank lines at the start of the file
			processedCode = processedCode.replace(/^\s*\n/, '');
			// console.log(`Babel TypeScript processing completed for ${fileType}`);
			return processedCode;
		} catch (error) {
			console.error(`Error processing TypeScript string (${fileType}):`, error);
			throw error;
		}
	} else if (fileType === 'vue') {
		const sfc = parseVue(content);
		const hasTs = sfc.descriptor.script?.lang === 'ts' || sfc.descriptor.scriptSetup?.lang === 'ts';

		if (!hasTs && !forceStrip) {
			return content; // Return original content if no TypeScript
		}

		// console.log(`Processing Vue string with TypeScript`);
		try {
			// Use Babel to strip TypeScript from the script content
			const [traverseModule, generateModule] = await Promise.all([
				import('@babel/traverse'),
				import('@babel/generator'),
			]);

			// Robustly extract traverse and generate functions
			let traverse: any = traverseModule;
			if (typeof traverseModule === 'object') {
				if (typeof (traverseModule as any)['default'] === 'function') {
					traverse = (traverseModule as any)['default'];
				} else if (
					typeof (traverseModule as any)['default'] === 'object' &&
					typeof (traverseModule as any)['default']['default'] === 'function'
				) {
					traverse = (traverseModule as any)['default']['default'];
				}
			}
			if (typeof traverse !== 'function') {
				throw new Error('Babel traverse is not a function');
			}

			let generate: any = generateModule;
			if (typeof generateModule === 'object') {
				if (typeof (generateModule as any)['default'] === 'function') {
					generate = (generateModule as any)['default'];
				} else if (
					typeof (generateModule as any)['default'] === 'object' &&
					typeof (generateModule as any)['default']['default'] === 'function'
				) {
					generate = (generateModule as any)['default']['default'];
				}
			}
			if (typeof generate !== 'function') {
				throw new Error('Babel generate is not a function');
			}

			// Process the script content with Babel
			const scriptContent = sfc.descriptor.script?.content || '';
			const ast = babelParse(scriptContent, {
				sourceType: 'module',
				plugins: ['typescript'],
			} as any);

			traverse(ast, {
				TSTypeAnnotation(path: any) {
					path.remove();
				},
				TSInterfaceDeclaration(path: any) {
					path.remove();
				},
				TSTypeAliasDeclaration(path: any) {
					path.remove();
				},
				TSAsExpression(path: any) {
					// Remove "as" casts, keep the expression
					path.replaceWith(path.node.expression);
				},
				TSNonNullExpression(path: any) {
					// Remove non-null assertions ("!")
					path.replaceWith(path.node.expression);
				},
			});

			const { code: processedScript } = generate(ast, { retainLines: true, comments: true });

			// Remove unused imports from the script content
			const cleanedScript = await removeUnusedImports(processedScript, false);

			// Replace the script content in the Vue string
			const replaced = content
				.replace(/<script[^>]*lang="ts"[^>]*>/, '<script>')
				.replace(/<script setup[^>]*lang="ts"[^>]*>/, '<script setup>')
				.replace(/<script[^>]*>[^]*?<\/script>/, `<script>\n${cleanedScript}\n</script>`);

			// console.log(`Vue TypeScript processing completed`);
			return replaced;
		} catch (error) {
			console.error(`Error processing Vue string:`, error);
			throw error;
		}
	} else if (fileType === 'svelte') {
		const processed = await preprocess(content, sveltePreprocess({ typescript: true }), {
			filename: 'temp.svelte',
		});
		let replaced = processed.code.replace(/<script[^>]*lang="ts"[^>]*>/, '<script>');

		// Extract and process script content for unused imports
		const scriptMatch = replaced.match(/<script>([\s\S]*?)<\/script>/);
		if (scriptMatch) {
			const scriptContent = scriptMatch[1];
			const cleanedScript = await removeUnusedImports(scriptContent, false);
			replaced = replaced.replace(/<script>[\s\S]*?<\/script>/, `<script>\n${cleanedScript}\n</script>`);
		}

		return replaced;
	} else {
		throw new Error(`Unsupported file type: ${fileType}`);
	}
}
