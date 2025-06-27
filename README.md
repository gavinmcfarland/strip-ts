# strip-ts

A TypeScript utility that strips TypeScript annotations from `.ts`, `.tsx`, `.vue`, and `.svelte` files while preserving formatting and functionality.

## Features

-   **Multi-format support**: Processes TypeScript, React TSX, Vue, and Svelte files
-   **Format preservation**: Maintains original code formatting and structure
-   **Type annotation removal**: Strips interfaces, type aliases, type annotations, and type assertions
-   **Framework-aware**: Handles framework-specific syntax (JSX, Vue SFC, Svelte)
-   **Programmatic API**: Use as a library or CLI tool
-   **Comprehensive testing**: Full test coverage with Vitest

## Installation

```bash
npm install strip-ts
```

## Usage

### CLI

```bash
# Process a single file
npx strip-ts src/components/Button.tsx

# Process multiple files with glob patterns
npx strip-ts "src/**/*.tsx" "src/**/*.vue"

# Force processing of Vue files even without lang="ts"
npx strip-ts --force-strip "src/**/*.vue"

# Specify output directory
npx strip-ts "src/**/*.ts" --out-dir dist
```

### Programmatic API

```typescript
import { stripTSFromFile, stripTSFromFiles } from 'strip-ts';

// Process a single file
const outputPath = await stripTSFromFile('src/components/Button.tsx', 'output');
console.log(`Processed file: ${outputPath}`);

// Process multiple files
const outputPaths = await stripTSFromFiles(['src/**/*.tsx', 'src/**/*.vue', 'src/**/*.svelte'], 'output');
console.log(`Processed ${outputPaths.length} files`);

// Force processing of Vue files even without lang="ts"
const forceOutputPaths = await stripTSFromFiles(['src/**/*.vue'], 'output', true);
console.log(`Force processed ${forceOutputPaths.length} files`);
```

## Supported File Types

### TypeScript (.ts, .tsx)

-   Removes type annotations, interfaces, and type aliases
-   Preserves JSX syntax and React components
-   Converts `.tsx` files to `.jsx` output

**Input:**

```typescript
interface ButtonProps {
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const Button: React.FC<ButtonProps> = ({ children, onClick }) => {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
    };

    return <button onClick={handleClick}>{children}</button>;
};
```

**Output:**

```javascript
const Button = ({ children, onClick }) => {
    const handleClick = (event) => {
        onClick?.(event);
    };

    return <button onClick={handleClick}>{children}</button>;
};
```

### Vue (.vue)

-   Removes TypeScript from `<script lang="ts">` sections
-   Preserves template and style sections
-   Removes `lang="ts"` attribute from script tags
-   **Note**: By default, only processes files with `lang="ts"`. Use `--force-strip` flag or `forceStrip` parameter to process files without this attribute

**Input:**

```vue
<script lang="ts">
interface Props {
    message: string;
}

export default {
    props: {
        message: { type: String, required: true },
    },
    methods: {
        handleClick(event: MouseEvent): void {
            console.log(this.message);
        },
    },
};
</script>

<template>
    <button @click="handleClick">{{ message }}</button>
</template>
```

**Output:**

```vue
<script>
export default {
    props: {
        message: { type: String, required: true },
    },
    methods: {
        handleClick(event) {
            console.log(this.message);
        },
    },
};
</script>

<template>
    <button @click="handleClick">{{ message }}</button>
</template>
```

### Svelte (.svelte)

-   Removes TypeScript from `<script lang="ts">` sections
-   Preserves Svelte-specific syntax and reactivity
-   Removes `lang="ts"` attribute from script tags

**Input:**

```svelte
<script lang="ts">
  interface Props {
    count: number;
  }

  export let count: number;

  function increment(): void {
    count += 1;
  }
</script>

<button on:click={increment}>Count: {count}</button>
```

**Output:**

```svelte
<script>
  export let count;

  function increment() {
    count += 1;
  }
</script>

<button on:click={increment}>Count: {count}</button>
```

## API Reference

### `stripTSFromFile(filePath: string, outDir?: string, forceStrip?: boolean): Promise<string | null>`

Processes a single file and returns the output file path.

**Parameters:**

-   `filePath` (string): Path to the input file
-   `outDir` (string, optional): Output directory (default: 'output')
-   `forceStrip` (boolean, optional): Force processing even if lang doesn't equal "ts" (for Vue files) (default: false)

**Returns:**

-   `Promise<string | null>`: Path to the output file, or `null` if no processing was needed

**Throws:**

-   `Error`: For unsupported file types or processing errors

### `stripTSFromFiles(globs: string[], outDir?: string, forceStrip?: boolean): Promise<string[]>`

Processes multiple files using glob patterns and returns array of output file paths.

**Parameters:**

-   `globs` (string[]): Array of glob patterns to match files
-   `outDir` (string, optional): Output directory (default: 'output')
-   `forceStrip` (boolean, optional): Force processing even if lang doesn't equal "ts" (for Vue files) (default: false)

**Returns:**

-   `Promise<string[]>`: Array of output file paths

### `stripTSFromString(content: string, fileType: 'ts' | 'tsx' | 'vue' | 'svelte', forceStrip?: boolean): Promise<string>`

Strips TypeScript from a string and returns the JavaScript equivalent.

**Parameters:**

-   `content` (string): The TypeScript content as a string
-   `fileType` ('ts' | 'tsx' | 'vue' | 'svelte'): The type of file
-   `forceStrip` (boolean, optional): Force processing even if lang doesn't equal "ts" (for Vue files) (default: false)

**Returns:**

-   `Promise<string>`: The JavaScript content as a string

## Development

### Setup

```bash
git clone <repository>
cd strip-ts
npm install
```

### Scripts

```bash
# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests once
npm run test:run
```

### Testing

The project uses Vitest for testing with comprehensive coverage:

-   TypeScript React component processing
-   Vue component processing
-   Svelte component processing
-   Error handling scenarios
-   Multiple file type processing

Run tests with:

```bash
npm run test:run
```

## How It Works

The tool uses different strategies for each file type:

1. **TypeScript/TSX**: Uses Babel parser with TypeScript and JSX plugins to parse and transform the AST
2. **Vue**: Uses Vue SFC compiler to parse the file, then Babel to process the script content
3. **Svelte**: Uses Svelte preprocessor to handle TypeScript, then regex to clean up script tags

All transformations preserve:

-   Code formatting and indentation
-   Comments
-   Functionality and logic
-   Framework-specific syntax

## License

MIT
