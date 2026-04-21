import { existsSync, readFileSync } from 'node:fs';

interface RequiredReference {
  file: string;
  needles: string[];
}

const requiredFiles = [
  'AGENTS.md',
  'ARCHITECTURE.md',
  'SKILL.md',
  'backend_openapi.json',
  'docs/PLANS.md',
  'docs/QUALITY_SCORE.md',
  'docs/RELIABILITY.md',
  'docs/SECURITY.md',
  'docs/PRODUCT_SENSE.md',
  'docs/DESIGN.md',
  'docs/FRONTEND.md',
  'docs/design-docs/index.md',
  'docs/design-docs/core-beliefs.md',
  'docs/design-docs/harness-architecture.md',
  'docs/design-docs/review-loop-and-autonomy.md',
  'docs/product-specs/index.md',
  'docs/product-specs/agent-harness-contract.md',
  'docs/product-specs/backend-api-contract.md',
  'docs/references/index.md',
  'docs/exec-plans/active/README.md',
  'docs/exec-plans/completed/README.md',
  'docs/exec-plans/tech-debt-tracker.md',
  'docs/generated/README.md',
  'docs/generated/backend-openapi-summary.json',
  'docs/generated/eslint-baseline.json',
];

const requiredReferences: RequiredReference[] = [
  {
    file: 'AGENTS.md',
    needles: [
      'ARCHITECTURE.md',
      'docs/design-docs/index.md',
      'docs/product-specs/index.md',
      'docs/references/index.md',
      'docs/FRONTEND.md',
      'backend_openapi.json',
      'bun run check',
    ],
  },
  {
    file: 'ARCHITECTURE.md',
    needles: ['backend_openapi.json', 'docs/generated/', 'bun run check'],
  },
  {
    file: 'docs/FRONTEND.md',
    needles: [
      '<script setup lang="ts">',
      'Tailwind CSS v4',
      'backend_openapi.json',
      'No `v-html`',
      'No Options API',
      'No new `any`',
    ],
  },
  {
    file: 'docs/PLANS.md',
    needles: [
      'docs/exec-plans/active/',
      'docs/exec-plans/completed/',
      'docs/exec-plans/tech-debt-tracker.md',
    ],
  },
  {
    file: 'docs/product-specs/agent-harness-contract.md',
    needles: [
      'docs/generated/eslint-baseline.json',
      'bun run check:eslint-baseline',
      'bun run check:agent-rules',
    ],
  },
  {
    file: 'docs/product-specs/backend-api-contract.md',
    needles: ['backend_openapi.json', 'docs/generated/backend-openapi-summary.json'],
  },
];

const failures: string[] = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    failures.push(`Missing required harness file: ${file}`);
  }
}

for (const reference of requiredReferences) {
  if (!existsSync(reference.file)) {
    continue;
  }

  const contents = readFileSync(reference.file, 'utf8');
  for (const needle of reference.needles) {
    if (!contents.includes(needle)) {
      failures.push(`Required reference "${needle}" missing in ${reference.file}`);
    }
  }
}

if (existsSync('AGENTS.md')) {
  const agentLines = readFileSync('AGENTS.md', 'utf8').trimEnd().split('\n').length;
  if (agentLines > 140) {
    failures.push(`AGENTS.md should stay map-first and short; found ${agentLines} lines`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Harness documentation checks passed.');
