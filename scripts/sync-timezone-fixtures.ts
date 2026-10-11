import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixtures = join(root, 'tests/fixtures/timezones');
const checksumFile = join(root, 'tests/fixtures/timezones.sha256');
const args = process.argv.slice(2);
const preCommit = args.includes('--pre-commit');
if (args.some((arg) => arg !== '--pre-commit')) {
  throw new Error('Usage: bun run scripts/sync-timezone-fixtures.ts [--pre-commit]');
}
const baseUrl = 'https://raw.githubusercontent.com/kschweiger/verve-backend/main/tests/resources';

async function download(filename: string): Promise<Response> {
  const response = await fetch(`${baseUrl}/${filename}`, {
    signal: AbortSignal.timeout(30_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Downloading ${filename} failed: HTTP ${response.status}`);
  return response;
}

async function sync(): Promise<boolean> {
  const checksum = (await (await download('timezones.sha256')).text()).trim();
  if (!/^[a-f0-9]{64}$/.test(checksum)) throw new Error('Invalid backend fixture SHA-256.');
  let savedChecksum = '';
  try {
    savedChecksum = (await readFile(checksumFile, 'utf8')).trim();
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
  if (savedChecksum === checksum) {
    console.log('Timezone fixtures match the backend checksum.');
    return false;
  }

  const archive = Buffer.from(await (await download('timezones.zip')).arrayBuffer());
  const temporary = await mkdtemp(join(tmpdir(), 'verve-timezones-'));
  const staged = await mkdtemp(join(dirname(fixtures), '.timezones-'));
  const backup = `${fixtures}.backup-${randomUUID()}`;
  let backedUp = false;
  let installed = false;
  try {
    const zipPath = join(temporary, 'timezones.zip');
    await writeFile(zipPath, archive);
    const entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
      .trim().split('\n').filter((entry) => entry !== 'timezones/');
    if (!entries.length || new Set(entries).size !== entries.length ||
        entries.some((entry) => !/^timezones\/[a-zA-Z0-9_-]+\.(md|json|gpx)$/.test(entry)) ||
        !entries.includes('timezones/cases.json') || !entries.includes('timezones/README.md')) {
      throw new Error('Unexpected fixture ZIP contents; local fixtures were not changed.');
    }
    // Read individual files instead of extracting paths or links supplied by the archive.
    for (const entry of entries) {
      await writeFile(join(staged, entry.slice('timezones/'.length)),
        execFileSync('unzip', ['-p', zipPath, entry], { maxBuffer: 10 * 1024 * 1024 }));
    }
    await rename(fixtures, backup);
    backedUp = true;
    await rename(staged, fixtures);
    installed = true;
    await writeFile(checksumFile, `${checksum}\n`);
  } catch (error) {
    if (installed) await rm(fixtures, { recursive: true, force: true });
    if (backedUp) await rename(backup, fixtures);
    throw error;
  } finally {
    await rm(staged, { recursive: true, force: true });
    await rm(temporary, { recursive: true, force: true });
  }
  await rm(backup, { recursive: true, force: true });
  console.log('Updated timezone fixtures and saved SHA-256. Review the changes and run the affected tests.');
  return true;
}

try {
  if (await sync() && preCommit) {
    console.error('Backend fixtures changed. Review and stage tests/fixtures/timezones and tests/fixtures/timezones.sha256, then retry the commit.');
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Timezone fixture sync failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
