import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

const ignoredDirectories = new Set([
  '.git',
  '.venv',
  'coverage',
  'dist',
  'dist-ssr',
  'node_modules',
]);

const markdownLinkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;

const isExternalTarget = (target: string): boolean =>
  /^(https?:|mailto:|tel:|data:)/.test(target);

const stripOptionalTitle = (target: string): string => {
  const trimmed = target.trim();
  if (trimmed.startsWith('<') && trimmed.includes('>')) {
    return trimmed.slice(1, trimmed.indexOf('>'));
  }

  const quoteIndex = trimmed.search(/\s["']/);
  if (quoteIndex === -1) {
    return trimmed;
  }

  return trimmed.slice(0, quoteIndex);
};

const listMarkdownFiles = (directory: string): string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) {
      continue;
    }

    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(path));
    } else if (entry.isFile() && extname(entry.name) === '.md') {
      files.push(path);
    }
  }

  return files;
};

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const slugifyHeading = (heading: string): string =>
  heading
    .trim()
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');

const collectHeadingSlugs = (file: string): Set<string> => {
  const slugs = new Set<string>();
  const contents = readFileSync(file, 'utf8');

  for (const line of contents.split('\n')) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line);
    if (match) {
      slugs.add(slugifyHeading(match[2]));
    }
  }

  return slugs;
};

const failures: string[] = [];
const markdownFiles = listMarkdownFiles(process.cwd()).sort();

for (const file of markdownFiles) {
  const contents = readFileSync(file, 'utf8');

  for (const match of contents.matchAll(markdownLinkPattern)) {
    const originalTarget = stripOptionalTitle(match[1]);
    if (isExternalTarget(originalTarget)) {
      continue;
    }

    const [rawPath = '', rawFragment] = originalTarget.split('#');
    const decodedPath = safeDecode(rawPath);
    const resolvedPath = decodedPath === '' ? file : resolve(dirname(file), decodedPath);

    if (!existsSync(resolvedPath)) {
      failures.push(`${file}: broken Markdown link target ${originalTarget}`);
      continue;
    }

    if (rawFragment && statSync(resolvedPath).isFile() && extname(resolvedPath) === '.md') {
      const headings = collectHeadingSlugs(resolvedPath);
      const fragment = safeDecode(rawFragment).toLowerCase();
      if (!headings.has(fragment)) {
        failures.push(`${file}: missing Markdown heading fragment ${originalTarget}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Markdown link checks passed for ${markdownFiles.length} files.`);
