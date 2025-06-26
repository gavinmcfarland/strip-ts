/**
 * Strips TypeScript from a single file and writes the output to outDir.
 * @param filePath - Path to the file to process.
 * @param outDir - Output directory.
 * @returns The output file path.
 */
export declare function stripTSFromFile(filePath: string, outDir?: string): Promise<string | null>;
/**
 * Strips TypeScript from multiple files matching the provided globs or file paths.
 * @param globs - Array of file globs or paths.
 * @param outDir - Output directory.
 * @returns Array of output file paths.
 */
export declare function stripTSFromFiles(globs: string[], outDir?: string): Promise<string[]>;
//# sourceMappingURL=strip-ts.d.ts.map