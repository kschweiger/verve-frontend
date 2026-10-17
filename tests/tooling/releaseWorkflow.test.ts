import { afterEach, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Step = { name?: string; run?: string; uses?: string; with?: Record<string, string> };
type Job = { needs?: string | string[]; steps: Step[] };
const workflow = Bun.YAML.parse(await Bun.file('.github/workflows/release.yml').text()) as {
  jobs: Record<string, Job>;
};
const directories: string[] = [];
afterEach(() => {
  for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true });
});

test('both publication jobs depend on successful version, check, and test validation', () => {
  const validate = workflow.jobs.validate;
  expect(validate).toBeDefined();
  for (const name of ['create-release', 'build-push-docker']) {
    const needs = workflow.jobs[name]?.needs;
    expect(Array.isArray(needs) ? needs : [needs]).toContain('validate');
  }
  const commands = validate!.steps.map((step) => step.run ?? '');
  expect(commands.some((command) => command.includes('bun install --frozen-lockfile'))).toBe(true);
  expect(commands).toContain('bun run check');
  expect(commands).toContain('bun test');
});

test('prereleases cannot receive latest, major, or minor Docker aliases', () => {
  const metadata = workflow.jobs['build-push-docker']!.steps.find((step) =>
    step.uses?.startsWith('docker/metadata-action@')
  )!;
  expect(metadata.with?.flavor).toBe('latest=false');
  const aliases = metadata
    .with!.tags.split('\n')
    .filter((tag) => tag.includes('value=latest') || tag.includes('{{major}}'));
  expect(aliases).toHaveLength(3);
  for (const alias of aliases)
    expect(alias).toContain("enable=${{ !contains(github.ref_name, '-') }}");
});

test.each([
  ['0.14.0', '0.14.0', '0.14.0', true],
  ['v0.14.0', '0.14.0', '0.14.0', true],
  ['0.15.0-rc.1', '0.15.0-rc.1', '0.15.0-rc.1', true],
  ['0.15.0', '0.14.0', '0.14.0', false],
  ['0.14.0', '0.14.0', '0.13.0', false],
] as const)(
  'version guard accepts matching versions only (%s)',
  (tag, fileVersion, packageVersion, allowed) => {
    const job = workflow.jobs.validate ?? workflow.jobs['create-release']!;
    const guard = job.steps.find((step) => step.name === 'Verify Version Sync')!.run!;
    const directory = mkdtempSync(join(tmpdir(), 'verve-release-'));
    directories.push(directory);
    writeFileSync(join(directory, 'VERSION'), fileVersion);
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ version: packageVersion }));
    const result = spawnSync('bash', ['-e', '-c', guard], {
      cwd: directory,
      env: { ...process.env, GITHUB_REF_NAME: tag },
      encoding: 'utf8',
    });
    expect(result.error).toBeUndefined();
    expect(result.status === 0).toBe(allowed);
  }
);
