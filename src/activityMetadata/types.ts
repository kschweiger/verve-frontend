export type ActivityMetadataKind = 'swimming';

export interface ActivityMetadataDefinition<TData> {
  target: string;
  kind: ActivityMetadataKind;
  parse(raw: Record<string, unknown>): TData | null;
}

export interface ParsedActivityMetadata<TData = unknown> {
  target: string;
  kind: ActivityMetadataKind;
  data: TData;
}
