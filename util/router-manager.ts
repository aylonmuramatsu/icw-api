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

// framework/util/router-manager.ts
import { RequestHandler } from 'express';
import fs from 'fs';
import path from 'path';
import { ModuleDefinition } from './router-builder';

type ModuleExport = ModuleDefinition | ModuleDefinition[];

class RoutesManagerClass {
  private modules: ModuleDefinition[] = [];
  public apiPrefix = '/api';

  /**
   * Registra módulos manualmente
   */
  register(moduleExport: ModuleExport, middlewares?: RequestHandler[]): void {
    if (Array.isArray(moduleExport)) {
      moduleExport.forEach((mod) => {
        this.modules.push(this.applyMiddlewares(mod, middlewares));
      });
    } else {
      this.modules.push(this.applyMiddlewares(moduleExport, middlewares));
    }
  }

  /**
   * ✨ Carrega automaticamente todos os arquivos *.module.ts em /modules
   */
  async autoLoad(
    modulesPath: string = path.join(__dirname, '../../src/modules'),
  ): Promise<void> {
    const errors: Array<{ file: string; error: any }> = [];

    // ✨ Detecta se está rodando com tsx (desenvolvimento)
    const isDevelopment = process.env.NODE_ENV !== 'production' || 
      process.argv.some(arg => arg.includes('tsx') || arg.includes('ts-node'));

    const loadModulesFromDir = async (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recursivamente procura em subdiretórios
          await loadModulesFromDir(fullPath);
        } else if (
          entry.name.endsWith('.module.ts') ||
          entry.name.endsWith('.module.js')
        ) {
          try {
            // ✨ Em desenvolvimento, usa extensão .ts explicitamente
            let importPath = fullPath;
            if (entry.name.endsWith('.module.ts') && isDevelopment) {
              // Usa file:// URL com extensão .ts para tsx resolver corretamente
              importPath = `file://${fullPath}`;
            }
            
            const moduleExport = await import(importPath);

            // Procura exports nomeados que sejam ModuleDefinition
            for (const [key, value] of Object.entries(moduleExport)) {
              if (this.isModuleDefinition(value)) {
                console.log(`✅ Auto-registrado: ${key} (${fullPath})`);
                this.register(value as ModuleExport);
              }
            }
          } catch (error) {
            // ✨ Coleta erro ao invés de apenas logar
            const relativePath = path.relative(process.cwd(), fullPath);
            errors.push({ file: relativePath, error });
            console.error(`❌ Erro ao carregar ${fullPath}:`, error);
          }
        }
      }
    };

    await loadModulesFromDir(modulesPath);

    // ✨ Se houver erros, lança exceção
    if (errors.length > 0) {
      const errorMessages = errors
        .map((e) => {
          const errorMsg = e.error?.message || String(e.error);
          return `  - ${e.file}: ${errorMsg}`;
        })
        .join('\n');
      throw new Error(
        `Falha ao carregar ${errors.length} módulo(s):\n${errorMessages}`,
      );
    }
  }

  /**
   * Verifica se é um ModuleDefinition válido
   */
  private isModuleDefinition(obj: any): boolean {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.prefix === 'string' &&
      Array.isArray(obj.routes)
    );
  }

  private applyMiddlewares(
    module: ModuleDefinition,
    middlewares?: RequestHandler[],
  ): ModuleDefinition {
    if (!middlewares || middlewares.length === 0) {
      return module;
    }

    return {
      ...module,
      middlewares: [...(module.middlewares || []), ...middlewares],
    };
  }

  getModules(): ModuleDefinition[] {
    return this.modules;
  }
}

export const RoutesManager = new RoutesManagerClass();