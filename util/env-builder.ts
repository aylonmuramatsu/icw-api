// framework/util/env-builder.ts

/**
 * Tipos para definição de schema de variáveis de ambiente
 */
export type EnvType = "string" | "number" | "boolean" | "enum";

export interface EnvSchemaRule {
  type?: EnvType;
  required?: boolean;
  default?: any;
  values?: readonly string[];
  description?: string;
  group?: string;
  /** Se true, oculta valor nos logs */
  secure?: boolean;
}

export type EnvSchema = Record<string, EnvSchemaRule>;

/**
 * Infere o tipo TypeScript de uma regra individual
 */
export type InferEnvValue<R extends EnvSchemaRule> = R extends {
  type: "number";
}
  ? number
  : R extends { type: "boolean" }
    ? boolean
    : R extends { type: "enum"; values: readonly (infer V)[] }
      ? V
      : R extends { values: readonly (infer V)[] }
        ? V
        : string;

/**
 * Infere o mapa de tipos a partir do schema
 */
export type InferEnvSchema<T extends EnvSchema> = {
  [K in keyof T]: InferEnvValue<T[K]>;
};

/**
 * Helper para definir schema preservando literais (`const` type param).
 * Use `as const` em `values` ou confie no const type parameter do TS 5+.
 */
export function defineEnv<const T extends EnvSchema>(schema: T): T {
  return schema;
}
