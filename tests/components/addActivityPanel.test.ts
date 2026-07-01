import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(
  resolve(import.meta.dir, '../../src/components/dashboard/AddActivityPanel.vue'),
  'utf8'
);

function classAttributeBefore(fragment: string): string {
  const index = source.indexOf(fragment);
  expect(index).toBeGreaterThanOrEqual(0);

  const classStart = source.lastIndexOf('class="', index);
  expect(classStart).toBeGreaterThanOrEqual(0);

  const valueStart = classStart + 'class="'.length;
  const valueEnd = source.indexOf('"', valueStart);
  expect(valueEnd).toBeGreaterThan(valueStart);

  return source.slice(valueStart, valueEnd);
}

describe('AddActivityPanel layout', () => {
  test('keeps the add activity drawer at viewport height with the form in the scrollable region', () => {
    const drawerClasses = classAttributeBefore('role="dialog"');
    const contentClasses = classAttributeBefore('<UploadActivityWidget embedded />');

    expect(drawerClasses.split(/\s+/)).toEqual(
      expect.arrayContaining(['h-dvh', 'flex', 'flex-col', 'overflow-hidden'])
    );
    expect(contentClasses.split(/\s+/)).toEqual(
      expect.arrayContaining(['grow', 'min-h-0', 'overflow-y-auto'])
    );
  });
});
