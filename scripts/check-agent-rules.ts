import { readdirSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

interface Rule {
  id: string;
  pattern: RegExp;
  message: string;
}

const rules: Rule[] = [
  {
    id: 'vue-no-v-html',
    pattern: /\bv-html\b/,
    message: 'Do not use v-html without explicit security approval.',
  },
  {
    id: 'vue-no-options-data',
    pattern: /^\s*data\s*\(/m,
    message: 'Use Composition API refs/reactive state instead of Options API data().',
  },
  {
    id: 'vue-no-options-methods',
    pattern: /^\s*methods\s*:/m,
    message: 'Use Composition API functions instead of Options API methods.',
  },
  {
    id: 'vue-no-options-computed',
    pattern: /^\s*computed\s*:/m,
    message: 'Use Composition API computed() instead of Options API computed objects.',
  },
  {
    id: 'ts-no-commonjs-require',
    pattern: /\brequire\s*\(/,
    message: 'Use ESM imports instead of CommonJS require().',
  },
  {
    id: 'ts-no-this-in-scripts',
    pattern: /\bthis\./,
    message: 'Do not use this in scripts; use Composition API bindings.',
  },
  {
    id: 'tailwind-v4-grow',
    pattern: /\bflex-grow\b/,
    message: 'Use Tailwind v4 grow instead of flex-grow.',
  },
  {
    id: 'tailwind-no-old-lightblue',
    pattern: /\blightBlue\b|\blight-blue\b/,
    message: 'Use current Tailwind color names such as sky instead of lightBlue.',
  },
];

const sourceExtensions = new Set(['.ts', '.vue']);

const listSourceFiles = (directory: string): string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(path));
    } else if (entry.isFile() && sourceExtensions.has(extname(entry.name))) {
      files.push(path);
    }
  }

  return files;
};

const lineAndColumn = (contents: string, index: number): { line: number; column: number } => {
  const prefix = contents.slice(0, index);
  const lines = prefix.split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
};

const failures: string[] = [];

for (const file of listSourceFiles(resolve(process.cwd(), 'src')).sort()) {
  const contents = readFileSync(file, 'utf8');
  for (const rule of rules) {
    const match = rule.pattern.exec(contents);
    if (!match || match.index === undefined) {
      continue;
    }

    const location = lineAndColumn(contents, match.index);
    failures.push(`${file}:${location.line}:${location.column} ${rule.id} ${rule.message}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Agent source rule checks passed.');
