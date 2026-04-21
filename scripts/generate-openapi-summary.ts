import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

interface OperationSummary {
  method: string;
  operationId: string | null;
  summary: string | null;
  tags: string[];
}

interface PathSummary {
  path: string;
  methods: OperationSummary[];
}

interface OpenApiSummary {
  schemaVersion: 1;
  source: string;
  sourceSha256: string;
  openapi: string | null;
  info: {
    title: string | null;
    version: string | null;
  };
  pathCount: number;
  schemaCount: number;
  paths: PathSummary[];
  schemas: string[];
}

const sourcePath = 'backend_openapi.json';
const outputPath = 'docs/generated/backend-openapi-summary.json';
const httpMethods = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const readJsonObject = (path: string): Record<string, unknown> => {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  if (!isRecord(parsed)) {
    throw new Error(`${path} must contain a JSON object`);
  }

  return parsed;
};

const buildSummary = (): OpenApiSummary => {
  if (!existsSync(sourcePath)) {
    throw new Error(`Missing required OpenAPI file: ${sourcePath}`);
  }

  const sourceText = readFileSync(sourcePath, 'utf8');
  const openapi = readJsonObject(sourcePath);
  const info = asRecord(openapi.info);
  const pathsObject = asRecord(openapi.paths);
  const schemasObject = asRecord(asRecord(openapi.components).schemas);

  const paths: PathSummary[] = Object.entries(pathsObject)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, pathValue]) => {
      const pathItem = asRecord(pathValue);
      const methods = httpMethods
        .filter((method) => isRecord(pathItem[method]))
        .map((method) => {
          const operation = asRecord(pathItem[method]);
          return {
            method,
            operationId: asString(operation.operationId),
            summary: asString(operation.summary),
            tags: asStringArray(operation.tags),
          };
        });

      return { path, methods };
    });

  const schemas = Object.keys(schemasObject).sort((left, right) => left.localeCompare(right));

  return {
    schemaVersion: 1,
    source: sourcePath,
    sourceSha256: createHash('sha256').update(sourceText).digest('hex'),
    openapi: asString(openapi.openapi),
    info: {
      title: asString(info.title),
      version: asString(info.version),
    },
    pathCount: paths.length,
    schemaCount: schemas.length,
    paths,
    schemas,
  };
};

const serialize = (summary: OpenApiSummary): string => `${JSON.stringify(summary, null, 2)}\n`;

const expected = serialize(buildSummary());

if (process.argv.includes('--check')) {
  if (!existsSync(outputPath)) {
    console.error(`Missing generated OpenAPI summary: ${outputPath}`);
    process.exit(1);
  }

  const actual = readFileSync(outputPath, 'utf8');
  if (actual !== expected) {
    console.error(
      `${outputPath} is stale. Run "bun run generate:api-summary" after changing ${sourcePath}.`
    );
    process.exit(1);
  }

  console.log('OpenAPI summary is fresh.');
} else {
  writeFileSync(outputPath, expected);
  console.log(`Wrote ${outputPath}.`);
}
