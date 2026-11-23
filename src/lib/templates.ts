import type { TemplateField } from '../types';

export function fillTemplate(body: string, fields: TemplateField[], values: Record<string, string>): string {
  const labels = new Map(fields.map((f) => [f.key, f.label]));
  return body.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_m, key: string) => {
    const v = values[key];
    if (v != null && v.trim() !== '') return v;
    return `[${labels.get(key) ?? key}]`;
  });
}
