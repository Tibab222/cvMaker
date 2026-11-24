import { ToolError } from './types';

type Raw = Record<string, unknown>;

/** Checked reads of tool arguments: clients do not always respect the input schema. */
export class Args {
  private readonly raw: Raw;

  constructor(raw: unknown) {
    this.raw = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Raw) : {};
  }

  has(name: string): boolean {
    return this.raw[name] !== undefined && this.raw[name] !== null;
  }

  string(name: string, options: { required: true; max?: number }): string;
  string(name: string, options?: { required?: false; max?: number }): string | undefined;
  string(name: string, options: { required?: boolean; max?: number } = {}): string | undefined {
    const value = this.raw[name];
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
      if (options.required) throw new ToolError(`"${name}" is required.`);
      return undefined;
    }
    if (typeof value !== 'string') throw new ToolError(`"${name}" must be a string.`);
    const text = value.trim();
    if (options.max && text.length > options.max) throw new ToolError(`"${name}" is too long (max ${options.max} characters).`);
    return text;
  }

  number(name: string, options: { min?: number; max?: number; fallback: number }): number;
  number(name: string, options?: { min?: number; max?: number }): number | undefined;
  number(name: string, options: { min?: number; max?: number; fallback?: number } = {}): number | undefined {
    const value = this.raw[name];
    if (value === undefined || value === null || value === '') return options.fallback;
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) throw new ToolError(`"${name}" must be a number.`);
    // clamped rather than refused: "limit: 500" means "as many as you can"
    return Math.min(options.max ?? Infinity, Math.max(options.min ?? -Infinity, number));
  }

  boolean(name: string): boolean | undefined {
    const value = this.raw[name];
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new ToolError(`"${name}" must be true or false.`);
  }

  oneOf<T extends string>(name: string, values: readonly T[], fallback: T): T;
  oneOf<T extends string>(name: string, values: readonly T[]): T | undefined;
  oneOf<T extends string>(name: string, values: readonly T[], fallback?: T): T | undefined {
    const value = this.string(name);
    if (value === undefined) return fallback;
    const match = values.find((candidate) => candidate.toLowerCase() === value.toLowerCase());
    if (!match) throw new ToolError(`"${name}" must be one of: ${values.join(', ')}.`);
    return match;
  }

  strings(name: string, options: { max?: number; itemMax?: number } = {}): string[] {
    const value = this.raw[name];
    if (value === undefined || value === null) return [];
    const list = Array.isArray(value) ? value : [value];
    const items = list.map((item) => {
      if (typeof item !== 'string') throw new ToolError(`"${name}" must be a list of strings.`);
      const text = item.trim();
      if (options.itemMax && text.length > options.itemMax) throw new ToolError(`An item of "${name}" is too long (max ${options.itemMax} characters).`);
      return text;
    }).filter(Boolean);
    if (options.max && items.length > options.max) throw new ToolError(`"${name}" has too many items (max ${options.max}).`);
    return items;
  }

  oneOfList<T extends string>(name: string, values: readonly T[]): T[] {
    return this.strings(name).map((value) => {
      const match = values.find((candidate) => candidate.toLowerCase() === value.toLowerCase());
      if (!match) throw new ToolError(`"${name}" items must be among: ${values.join(', ')}.`);
      return match;
    });
  }

  object(name: string): Args | undefined {
    const value = this.raw[name];
    if (value === undefined || value === null) return undefined;
    if (typeof value !== 'object' || Array.isArray(value)) throw new ToolError(`"${name}" must be an object.`);
    return new Args(value);
  }

  objects(name: string, options: { max?: number } = {}): Args[] {
    const value = this.raw[name];
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) throw new ToolError(`"${name}" must be a list.`);
    if (options.max && value.length > options.max) throw new ToolError(`"${name}" has too many items (max ${options.max}).`);
    return value.map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ToolError(`"${name}" must be a list of objects.`);
      return new Args(item);
    });
  }

  entries(name: string): [string, unknown][] {
    const value = this.raw[name];
    if (value === undefined || value === null) return [];
    if (typeof value !== 'object' || Array.isArray(value)) throw new ToolError(`"${name}" must be an object.`);
    return Object.entries(value as Raw);
  }
}
