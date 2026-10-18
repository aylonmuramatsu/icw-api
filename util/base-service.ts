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

// framework/util/base-service.ts
import { ApplicationContextProvider } from '../core/application-context';

/**
 * ✨ Interface para transações (abstração genérica)
 * Cada ORM pode implementar sua própria transação
 */
export interface TransactionAdapter {
  commit?(): Promise<void>;
  rollback?(): Promise<void>;
  [key: string]: any; // Permite qualquer propriedade adicional
}

/**
 * ✨ Configuração do service
 */
export interface ServiceConfig {
  /** Se deve lançar exceção (padrão: true) */
  throwOnError?: boolean;

  /** Transação ativa (abstração genérica) */
  transaction?: TransactionAdapter;

  /** Contexto adicional para operações específicas */
  context?: Record<string, any>;
}

/**
 * ✨ Classe base para todos os services
 * 
 * Princípios:
 * - Simplicidade: Controller -> Service -> Rules
 * - Desacoplado: Não depende de ORM específico
 * - Context: Acesso global ao estado da aplicação
 */
export abstract class BaseService {
  protected throwOnError: boolean = true;
  protected transaction?: TransactionAdapter; // ✨ Abstração genérica
  protected context: Record<string, any> = {};

  /**
   * ✨ Application Context (acessível em todos os services)
   */
  protected get appContext() {
    return ApplicationContextProvider.getContext();
  }

  /**
   * ✨ Configura o service
   */
  configure(config: ServiceConfig): this {
    if (config.throwOnError !== undefined) {
      this.throwOnError = config.throwOnError;
    }
    if (config.transaction !== undefined) {
      this.transaction = config.transaction;
    }
    if (config.context !== undefined) {
      this.context = { ...this.context, ...config.context };
    }
    return this;
  }

  /**
   * ✨ Cria uma nova instância sem exceções (com Proxy transparente)
   */
  silent(): this {
    return this.createProxy({ throwOnError: false });
  }

  /**
   * ✨ Cria uma nova instância com transação
   */
  withTransaction(transaction: TransactionAdapter): this {
    return this.createProxy({ transaction });
  }

  /**
   * ✨ Adiciona contexto personalizado
   */
  withContext(context: Record<string, any>): this {
    return this.createProxy({ context: { ...this.context, ...context } });
  }

  /**
   * ✨ Cria um Proxy que intercepta automaticamente exceções
   */
  private createProxy(config: Partial<ServiceConfig>): this {
    // Clone a instância
    const instance = Object.create(Object.getPrototypeOf(this));
    Object.assign(instance, this);

    // Aplica as configurações
    if (config.throwOnError !== undefined) {
      instance.throwOnError = config.throwOnError;
    }
    if (config.transaction !== undefined) {
      instance.transaction = config.transaction;
    }
    if (config.context !== undefined) {
      instance.context = { ...this.context, ...config.context };
    }

    // ✨ Sempre cria Proxy para interceptar métodos
    return new Proxy(instance, {
      get(target, prop, receiver) {
        const original = Reflect.get(target, prop, receiver);

        // Se não é uma função, retorna direto
        if (typeof original !== 'function') {
          return original;
        }

        // Ignora métodos internos/privados
        if (typeof prop === 'string' && prop.startsWith('_')) {
          return original;
        }

        // ✨ Wrap função para capturar erros automaticamente
        return function (...args: any[]) {
          try {
            const result = original.apply(target, args);

            // Se é Promise (método async), captura erros
            if (result && typeof result.then === 'function') {
              return result.catch((error: any) => {
                // ✅ Se throwOnError = false, retorna null
                if (!target.throwOnError) {
                  return null;
                }
                // ✅ Se throwOnError = true, re-lança o erro
                throw error;
              });
            }

            return result;
          } catch (error) {
            // ✅ Captura erros síncronos também
            if (!target.throwOnError) {
              return null;
            }
            throw error;
          }
        };
      },
    });
  }
}