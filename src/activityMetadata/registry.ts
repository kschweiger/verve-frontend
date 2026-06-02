import { parseSwimmingMetadata } from './swimming';
import type { SwimmingMetaData } from './swimming';
import type { ActivityMetadataDefinition, ParsedActivityMetadata } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const swimmingDefinition: ActivityMetadataDefinition<SwimmingMetaData> = {
  target: 'SwimmingMetaData',
  kind: 'swimming',
  parse: parseSwimmingMetadata,
};

const definitions: ActivityMetadataDefinition<unknown>[] = [swimmingDefinition];

export const parseActivityMetadata = (raw: unknown): ParsedActivityMetadata | null => {
  if (!isRecord(raw) || typeof raw.target !== 'string') return null;

  const definition = definitions.find((item) => item.target === raw.target);
  if (!definition) return null;

  const data = definition.parse(raw);
  if (data === null) return null;

  return {
    target: definition.target,
    kind: definition.kind,
    data,
  };
};
