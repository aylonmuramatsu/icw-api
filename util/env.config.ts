/**
 * @insightcreativewebs/api
 *
 * Config tipado — autocomplete via EnvVars (declarada no index do pacote)
 */

import chalk from "chalk";
import CliTable3 from "cli-table3";
import dotenv from "dotenv";
import { AppException } from "./app-exception";
import type { EnvSchema } from "./env-builder";

export type { EnvSchema } from "./env-builder";

/**
 * Classe genérica de config.
 * O export público `Config` é tipado como `EnvConfig<EnvVars>` no index.ts
 * para que module augmentation funcione.
 */
export class EnvConfig<TEnv extends Record<string, any> = Record<string, any>> {
  private config: Record<string, any> = {};
  private loaded = false;
  private schema?: EnvSchema;

  setSchema(schema: EnvSchema): this {
    this.schema = schema;
    return this;
  }

  private ensureLoaded(): void {
    if (!this.loaded) {
      this.load();
    }
  }

  load(): void {
    if (this.loaded) return;

    if (!this.schema) {
      dotenv.config();
      this.loaded = true;
      return;
    }

    dotenv.config();

    const errors: string[] = [];
    const warnings: string[] = [];

    Object.entries(this.schema).forEach(([key, rules]) => {
      const value = process.env[key];

      if (rules.required === true && !value) {
        errors.push(`❌ ${key} é obrigatório`);
        return;
      }

      if (!value && rules.default !== undefined) {
        this.config[key] = rules.default;
        warnings.push(`⚠️  ${key} usando valor padrão: ${rules.default}`);
        return;
      }

      if (!value) return;

      let transformed: any = value;

      if (rules.type === "number") {
        transformed = Number(value);
        if (isNaN(transformed)) {
          errors.push(`❌ ${key} deve ser um número`);
          return;
        }
      } else if (rules.type === "boolean") {
        transformed = value === "true";
      } else if (rules.values && Array.isArray(rules.values)) {
        if (!(rules.values as string[]).includes(value)) {
          errors.push(
            `❌ ${key} deve ser um de: ${(rules.values as string[]).join(", ")}`,
          );
          return;
        }
      }

      this.config[key] = transformed;
    });

    if (warnings.length > 0) {
      console.log("\n⚠️  Avisos:\n");
      warnings.forEach((w) => console.log(`  ${w}`));
    }

    if (errors.length > 0) {
      console.error("\n❌ Erros:\n");
      errors.forEach((e) => console.error(`  ${e}`));
      throw new AppException("Configuração inválida", 500);
    }

    this.loaded = true;
    console.log("✅ Configurações carregadas");
  }

  /**
   * Autocomplete pelas chaves de TEnv.
   * Sem overload `string` — ele impede o IntelliSense de sugerir literais.
   * Internamente use `new EnvConfig()` (TEnv = Record<string, any>).
   * No app, use `EnvConfig<EnvVars>` / cast tipado.
   */
  get<K extends keyof TEnv & string>(key: K): TEnv[K] {
    this.ensureLoaded();

    if (this.schema && key in this.config) {
      return this.config[key] as TEnv[K];
    }

    return process.env[key] as TEnv[K];
  }

  getAll(): Partial<TEnv> {
    this.ensureLoaded();
    return { ...this.config } as Partial<TEnv>;
  }

  keys(): string[] {
    if (!this.schema) return Object.keys(this.config);
    return Object.keys(this.schema);
  }

  displayTable(): void {
    if (!this.schema) {
      console.log(chalk.yellow("⚠️  Nenhum schema de configuração definido"));
      return;
    }

    this.ensureLoaded();

    console.log(chalk.bold.cyan("\n⚙️  Configurações de Ambiente:\n"));

    const groups: Record<string, Array<[string, any]>> = {};

    Object.entries(this.schema).forEach(([key, config]) => {
      const group = config.group || "Outros";
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push([key, config]);
    });

    Object.entries(groups).forEach(([groupName, entries]) => {
      console.log(chalk.bold.yellow(`\n📦 ${groupName}\n`));

      const table = new CliTable3({
        head: [
          chalk.white.bold("Variável"),
          chalk.white.bold("Valor"),
          chalk.white.bold("Tipo"),
          chalk.white.bold("Status"),
        ],
        colWidths: [30, 35, 12, 20],
        style: {
          head: [],
          border: ["gray"],
        },
      });

      entries.forEach(([key, config]) => {
        const value = this.config[key];

        let displayValue: string;
        if (!value && value !== 0 && value !== false) {
          displayValue = chalk.gray("(vazio)");
        } else if (config.secure === true) {
          displayValue = chalk.gray("🔒 ****** (oculto)");
        } else if (typeof value === "string" && value.length > 30) {
          displayValue = chalk.cyan(value.substring(0, 27) + "...");
        } else {
          displayValue = chalk.cyan(String(value));
        }

        const typeDisplay = config.type
          ? chalk.blue(config.type)
          : chalk.gray("string");

        let status: string;
        if (config.required && (value === undefined || value === "")) {
          status = chalk.red("❌ Ausente");
        } else if (config.default !== undefined && value === config.default) {
          status = chalk.yellow("⚠️  Padrão");
        } else if (value !== undefined && value !== "") {
          status = chalk.green("✅ OK");
        } else {
          status = chalk.gray("- Opcional");
        }

        table.push([chalk.white(key), displayValue, typeDisplay, status]);
      });

      console.log(table.toString());
    });

    const total = Object.keys(this.schema).length;
    const configured = Object.values(this.config).filter(
      (v) => v !== undefined && v !== "",
    ).length;
    const required = Object.entries(this.schema).filter(
      ([_, config]) => config.required === true,
    ).length;
    const secure = Object.entries(this.schema).filter(
      ([_, config]) => config.secure === true,
    ).length;

    console.log(chalk.bold.cyan("\n📊 Resumo:\n"));
    console.log(`  Total de variáveis: ${chalk.white(total)}`);
    console.log(`  Configuradas: ${chalk.green(configured)}`);
    console.log(`  Obrigatórias: ${chalk.yellow(required)}`);
    console.log(`  Sensíveis: ${chalk.red(secure)} 🔒`);
    console.log("");
  }
}

/** Singleton interno (sem tipagem EnvVars — usada pelo core da framework) */
export const Config = new EnvConfig();
