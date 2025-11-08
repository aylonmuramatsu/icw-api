// framework/util/env-builder.ts

/**
 * ✨ Tipos para definição de schema de variáveis de ambiente
 */
export type EnvType = 'string' | 'number' | 'boolean' | 'enum';

export interface EnvSchemaRule {
  type?: EnvType;
  required?: boolean;
  default?: any;
  values?: readonly string[];
  description?: string;
  group?: string;
  secure?: boolean; // Se true, oculta valor nos logs
}

export type EnvSchema = Record<string, EnvSchemaRule>;

/**
 * ✨ Helper para definir schema de forma type-safe
 */
export function defineEnv<T extends EnvSchema>(schema: T): T {
  return schema;
}

/**
 * ✨ Infere o tipo TypeScript do schema
 */
export type InferEnvSchema<T extends EnvSchema> = {
  [K in keyof T]: T[K] extends { type: 'number' }
    ? number
    : T[K] extends { type: 'boolean' }
    ? boolean
    : T[K] extends { type: 'enum'; values: readonly (infer V)[] }
    ? V
    : string;
};