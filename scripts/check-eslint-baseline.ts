import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { relative } from 'node:path';

interface EslintMessage {
  ruleId: string | null;
  severity: number;
  message: string;
  line: number;
  column: number;
}

interface EslintResult {
  filePath: string;
  messages: EslintMessage[];
}

interface BaselineIssue {
  filePath: string;
  line: number;
  column: number;
  severity: number;
  ruleId: string;
  message: string;
}

interface BaselineFile {
  schemaVersion: 1;
  command: string;
  issueCount: number;
  issues: BaselineIssue[];
}

const baselinePath = 'docs/generated/eslint-baseline.json';
const eslintCommand = 'bunx eslint . --format json';
const shouldUpdate = process.argv.includes('--update');

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isEslintMessage = (value: unknown): value is EslintMessage => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (typeof value.ruleId === 'string' || value.ruleId === null) &&
    typeof value.severity === 'number' &&
    typeof value.message === 'string' &&
    typeof value.line === 'number' &&
    typeof value.column === 'number'
  );
};

const isEslintResult = (value: unknown): value is EslintResult => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.filePath === 'string' &&
    Array.isArray(value.messages) &&
    value.messages.every(isEslintMessage)
  );
};

const parseEslintOutput = (stdout: string): EslintResult[] => {
  const parsed = JSON.parse(stdout) as unknown;
  if (!Array.isArray(parsed) || !parsed.every(isEslintResult)) {
    throw new Error('ESLint JSON output did not match the expected shape.');
  }

  return parsed;
};

const collectIssues = (): BaselineIssue[] => {
  const result = spawnSync('bunx', ['eslint', '.', '--format', 'json'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  if (!result.stdout.trim()) {
    if (result.status === 0) {
      return [];
    }

    throw new Error(result.stderr || 'ESLint failed without JSON output.');
  }

  const eslintResults = parseEslintOutput(result.stdout);
  return eslintResults
    .flatMap((fileResult) =>
      fileResult.messages.map((message) => ({
        filePath: relative(process.cwd(), fileResult.filePath),
        line: message.line,
        column: message.column,
        severity: message.severity,
        ruleId: message.ruleId ?? 'unknown',
        message: message.message,
      }))
    )
    .sort((left, right) =>
      `${left.filePath}:${left.line}:${left.column}:${left.ruleId}`.localeCompare(
        `${right.filePath}:${right.line}:${right.column}:${right.ruleId}`
      )
    );
};

const buildBaseline = (): BaselineFile => {
  const issues = collectIssues();
  return {
    schemaVersion: 1,
    command: eslintCommand,
    issueCount: issues.length,
    issues,
  };
};

const serialize = (baseline: BaselineFile): string => `${JSON.stringify(baseline, null, 2)}\n`;

const baseline = buildBaseline();
const expected = serialize(baseline);

if (shouldUpdate) {
  writeFileSync(baselinePath, expected);
  console.log(`Wrote ${baselinePath} with ${baseline.issueCount} ESLint issues.`);
} else {
  if (!existsSync(baselinePath)) {
    console.error(`Missing ESLint baseline: ${baselinePath}`);
    process.exit(1);
  }

  const actual = readFileSync(baselinePath, 'utf8');
  if (actual !== expected) {
    console.error(
      `${baselinePath} does not match current ESLint output. Fix new issues or run "bun run generate:eslint-baseline" after intentional cleanup.`
    );
    process.exit(1);
  }

  console.log(`ESLint baseline matches ${baseline.issueCount} frozen issues.`);
}
