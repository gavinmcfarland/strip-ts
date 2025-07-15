# strip-ts

A TypeScript to JavaScript converter that strips TypeScript annotations while preserving functionality. Supports TypeScript (.ts/.tsx), Vue (.vue), and Svelte (.svelte) files.

## Features

-   Strips TypeScript type annotations, interfaces, and type aliases
-   Removes unused imports automatically
-   Preserves code formatting and comments
-   Supports React JSX/TSX files
-   Supports Vue Single File Components
-   Supports Svelte components
-   Handles type assertions and non-null assertions
-   Processes multiple files using glob patterns

## Installation

```bash
npm install strip-ts
```

## Usage

### Programmatic API

The main function `stripTS` accepts file globs and options:

```typescript
import { stripTS } from 'strip-ts';

// Process a single file
const result = await stripTS('src/components/Button.tsx', { outDir: 'dist' });

// Process multiple files with glob patterns
const results = await stripTS(['src/**/*.tsx', 'src/**/*.vue'], {
    outDir: 'dist',
    forceStrip: false,
    removeUnusedImports: true,
});

// Process all TypeScript files in a directory
const allResults = await stripTS('src/**/*.{ts,tsx,vue,svelte}', { outDir: 'dist' });
```

### Options

```typescript
interface StripTSOptions {
    /** Output directory for processed files (default: 'output') */
    outDir?: string;
    /** Force processing even if lang doesn't equal "ts" (for Vue files) (default: false) */
    forceStrip?: boolean;
    /** Remove unused imports after TypeScript stripping (default: true) */
    removeUnusedImports?: boolean;
}
```

### String Processing

For processing TypeScript content as strings:

```typescript
import { stripTSFromString } from 'strip-ts';

// Process a TypeScript string
const jsCode = await stripTSFromString(tsCode, 'tsx');

// Process a Vue string with options
const vueCode = await stripTSFromString(vueString, 'vue', {
    forceStrip: true,
    removeUnusedImports: false,
});
```

### CLI Usage

```bash
# Process single file
npx strip-ts src/components/Button.tsx

# Process multiple files with globs
npx strip-ts "src/**/*.tsx" "src/**/*.vue"

# Force strip TypeScript from Vue files without lang="ts"
npx strip-ts --force-strip "src/**/*.vue"
```

## Examples

### TypeScript React Component

**Input (Button.tsx):**

```tsx
import React from 'react';

interface ButtonProps {
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    variant?: 'primary' | 'secondary';
}

function Button({ children, onClick, variant = 'primary' }: ButtonProps) {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
    };

    return (
        <button className={`button button-${variant}`} onClick={handleClick}>
            {children}
        </button>
    );
}

export default Button;
```

**Output (Button.jsx):**

```jsx
function Button({ children, onClick, variant = 'primary' }) {
    const handleClick = (event) => {
        onClick?.(event);
    };

    return (
        <button className={`button button-${variant}`} onClick={handleClick}>
            {children}
        </button>
    );
}

export default Button;
```

### Vue Component

**Input (Button.vue):**

```vue
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
            required: false,
        },
        variant: {
            type: String as () => string,
            default: 'primary',
        },
    },
    methods: {
        handleClick(event: MouseEvent): void {
            this.$emit('click', event);
        },
    },
};
</script>
```

**Output (Button.vue):**

```vue
<template>
    <button v-if="!href" class="button" @click="handleClick">
        <slot />
    </button>
    <a v-else :href="href" class="button">
        <slot />
    </a>
</template>

<script>
export default {
    props: {
        href: {
            type: String,
            required: false,
        },
        variant: {
            type: String,
            default: 'primary',
        },
    },
    methods: {
        handleClick(event) {
            this.$emit('click', event);
        },
    },
};
</script>
```

## What Gets Removed

-   Type annotations (`: string`, `: number`, etc.)
-   Interface declarations (`interface User { ... }`)
-   Type aliases (`type Status = 'loading' | 'success'`)
-   Generic type parameters (`useState<number>(0)`)
-   Type assertions (`value as string`)
-   Non-null assertions (`value!`)
-   Unused imports (when `removeUnusedImports` is true)

## What Gets Preserved

-   Function and variable declarations
-   JSX/TSX syntax
-   Vue template and style sections
-   Svelte syntax and reactivity
-   Comments and formatting
-   Used imports
-   Runtime functionality
