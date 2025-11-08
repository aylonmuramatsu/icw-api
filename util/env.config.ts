/**
 * @insightcreativewebs/api
 * 
 * Framework Node.js para APIs REST com TypeScript
 * 
 * @copyright 2025 Insight Creative Webs
 * @license MIT
 * @author Aylon Muramatsu <aylon.muramatsu@gmail.com>
 * @see https://github.com/aylonmuramatsu/icw-api-boilerplate
 * @see https://www.npmjs.com/package/@insightcreativewebs/api
 */

// framework/util/env.config.ts
import chalk from 'chalk';
import CliTable3 from 'cli-table3';
import dotenv from 'dotenv';
import { AppException } from './app-exception';

/**
 * ✨ Schema de variáveis de ambiente
 * Cada projeto define seu próprio schema
 * 
 * Exemplo de uso no projeto:
 * 
 * import { defineEnv, InferEnvSchema } from '../framework/util/env-builder';
 * 
 * export const envSchema = defineEnv({
 *   PORT: {
 *     type: 'number',
 *     default: 3000,
 *     description: 'Porta do servidor',
 *     group: 'Servidor',
 *   },
 *   DB_HOST: {
 *     type: 'string',
 *     required: true,
 *     description: 'Host do banco de dados',
 *     group: 'Database',
 *   },
 * });
 * 
 * export type Env = InferEnvSchema<typeof envSchema>;
 */
export type EnvSchema = Record<string, {
  type?: 'string' | 'number' | 'boolean' | 'enum';
  required?: boolean;
  default?: any;
  values?: readonly string[];
  description?: string;
  group?: string;
  secure?: boolean;
}>;

export type EnvKey = string;

/**
 * ✨ Classe para gerenciar configurações de ambiente
 * Desacoplada - cada projeto define seu schema
 */
class EnvConfig {
  private config: Record<string, any> = {};
  private loaded = false;
  private schema?: EnvSchema;

  /**
   * ✨ Define o schema de variáveis de ambiente
   * Deve ser chamado antes de load()
   */
  setSchema(schema: EnvSchema): this {
    this.schema = schema;
    return this;
  }

  /**
   * ✨ Carrega automaticamente se ainda não foi carregado
   */
  private ensureLoaded(): void {
    if (!this.loaded) {
      this.load();
    }
  }

  /**
   * ✨ Carrega e valida configurações
   */
  load(): void {
    if (this.loaded) return;

    if (!this.schema) {
      // ✨ Se não tem schema, apenas carrega .env sem validação
      dotenv.config();
      this.loaded = true;
      return;
    }

    dotenv.config();

    const errors: string[] = [];
    const warnings: string[] = [];

    (Object.entries(this.schema) as [EnvKey, any][]).forEach(([key, rules]) => {
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

      if (rules.type === 'number') {
        transformed = Number(value);
        if (isNaN(transformed)) {
          errors.push(`❌ ${key} deve ser um número`);
          return;
        }
      } else if (rules.type === 'boolean') {
        transformed = value === 'true';
      } else if (rules.values && Array.isArray(rules.values)) {
        if (!(rules.values as string[]).includes(value)) {
          errors.push(
            `❌ ${key} deve ser um de: ${(rules.values as string[]).join(', ')}`,
          );
          return;
        }
      }

      this.config[key] = transformed;
    });

    if (warnings.length > 0) {
      console.log('\n⚠️  Avisos:\n');
      warnings.forEach((w) => console.log(`  ${w}`));
    }

    if (errors.length > 0) {
      console.error('\n❌ Erros:\n');
      errors.forEach((e) => console.error(`  ${e}`));
      throw new AppException('Configuração inválida', 500);
    }

    this.loaded = true;
    console.log('✅ Configurações carregadas');
  }

  /**
   * ✨ Obtém valor de configuração
   */
  get<K extends EnvKey>(key: K): any {
    this.ensureLoaded();

    // Se tem schema, retorna do config validado
    if (this.schema && key in this.config) {
      return this.config[key];
    }

    // Caso contrário, retorna direto do process.env
    return process.env[key];
  }

  /**
   * ✨ Exibe configurações em tabela colorida (se schema definido)
   */
  displayTable(): void {
    if (!this.schema) {
      console.log(chalk.yellow('⚠️  Nenhum schema de configuração definido'));
      return;
    }

    this.ensureLoaded();

    console.log(chalk.bold.cyan('\n⚙️  Configurações de Ambiente:\n'));

    const groups: Record<string, Array<[string, any]>> = {};

    (Object.entries(this.schema) as [EnvKey, any][]).forEach(([key, config]) => {
      const group = config.group || 'Outros';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push([key, config]);
    });

    Object.entries(groups).forEach(([groupName, entries]) => {
      console.log(chalk.bold.yellow(`\n📦 ${groupName}\n`));

      const table = new CliTable3({
        head: [
          chalk.white.bold('Variável'),
          chalk.white.bold('Valor'),
          chalk.white.bold('Tipo'),
          chalk.white.bold('Status'),
        ],
        colWidths: [30, 35, 12, 20],
        style: {
          head: [],
          border: ['gray'],
        },
      });

      entries.forEach(([key, config]) => {
        const value = this.config[key as EnvKey];

        // ✨ Formata valor (oculta se secure: true)
        let displayValue: string;
        if (!value) {
          displayValue = chalk.gray('(vazio)');
        } else if (config.secure === true) {
          displayValue = chalk.gray('🔒 ****** (oculto)');
        } else if (typeof value === 'string' && value.length > 30) {
          displayValue = chalk.cyan(value.substring(0, 27) + '...');
        } else {
          displayValue = chalk.cyan(String(value));
        }

        // Tipo
        const typeDisplay = config.type
          ? chalk.blue(config.type)
          : chalk.gray('string');

        // Status
        let status: string;
        if (config.required && !value) {
          status = chalk.red('❌ Ausente');
        } else if (config.default !== undefined && value === config.default) {
          status = chalk.yellow('⚠️  Padrão');
        } else if (value) {
          status = chalk.green('✅ OK');
        } else {
          status = chalk.gray('- Opcional');
        }

        table.push([chalk.white(key), displayValue, typeDisplay, status]);
      });

      console.log(table.toString());
    });

    // Resumo
    const total = Object.keys(this.schema).length;
    const configured = Object.values(this.config).filter(
      (v) => v !== undefined && v !== '',
    ).length;
    const required = (Object.entries(this.schema) as [EnvKey, any][]).filter(
      ([_, config]) => config.required === true,
    ).length;
    const secure = (Object.entries(this.schema) as [EnvKey, any][]).filter(
      ([_, config]) => config.secure === true,
    ).length;

    console.log(chalk.bold.cyan('\n📊 Resumo:\n'));
    console.log(`  Total de variáveis: ${chalk.white(total)}`);
    console.log(`  Configuradas: ${chalk.green(configured)}`);
    console.log(`  Obrigatórias: ${chalk.yellow(required)}`);
    console.log(`  Sensíveis: ${chalk.red(secure)} 🔒`);
    console.log('');
  }
}

export const Config = new EnvConfig();