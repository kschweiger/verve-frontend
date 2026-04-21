import { spawnSync } from 'node:child_process';

interface Distribution {
  source: string[];
  test: string[];
  docs: string[];
  other: string[];
}

const result = spawnSync('git', ['ls-files', '--modified', '--others', '--exclude-standard'], {
  cwd: process.cwd(),
  encoding: 'utf8',
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  console.error(result.stderr);
  process.exit(result.status ?? 1);
}

const files = result.stdout
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .sort((left, right) => left.localeCompare(right));

const distribution: Distribution = {
  source: [],
  test: [],
  docs: [],
  other: [],
};

const isTestFile = (file: string): boolean =>
  /(^|\/)(__tests__|tests)\//.test(file) || /\.(spec|test)\.[jt]sx?$/.test(file);

const isDocFile = (file: string): boolean =>
  file.startsWith('docs/') ||
  ['AGENTS.md', 'ARCHITECTURE.md', 'SKILL.md', 'README.md', 'CHANGELOG.md'].includes(file);

const isSourceFile = (file: string): boolean =>
  file.startsWith('src/') ||
  file.startsWith('scripts/') ||
  file.startsWith('.github/') ||
  ['Makefile', 'package.json', 'eslint.config.ts', 'vite.config.ts', 'tsconfig.json'].includes(file);

for (const file of files) {
  if (isTestFile(file)) {
    distribution.test.push(file);
  } else if (isDocFile(file)) {
    distribution.docs.push(file);
  } else if (isSourceFile(file)) {
    distribution.source.push(file);
  } else {
    distribution.other.push(file);
  }
}

console.log('Diff distribution report');
console.log(`source code changes: ${distribution.source.length}`);
console.log(`test code changes: ${distribution.test.length}`);
console.log(`documentation changes: ${distribution.docs.length}`);
console.log(`other changes: ${distribution.other.length}`);

for (const [label, list] of Object.entries(distribution)) {
  if (list.length === 0) {
    continue;
  }

  console.log(`\n${label}:`);
  for (const file of list) {
    console.log(`- ${file}`);
  }
}
