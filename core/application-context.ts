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

// framework/core/application-context.ts
import { Server as HttpServer } from 'http';

import { Config } from '../util/env.config';
import { logger } from '../util/logger';
import { SocketManagerInterface } from '../util/socket.interface';

/**
 * ✨ Interface para abstração do banco de dados
 * Permite usar qualquer ORM (Sequelize, TypeORM, Prisma, etc)
 */
export interface DatabaseAdapter {
  // Métodos básicos que o framework precisa
  sync?(): Promise<void>;
  close?(): Promise<void>;
  [key: string]: any; // Permite qualquer propriedade adicional
}

/**
 * ✨ Application Context - Compartilhado entre todas as classes
 * Similar ao Nullstack, permite acesso global ao estado da aplicação
 * 
 * Desacoplado de ORMs específicos - use DatabaseAdapter para abstrair
 */
export class ApplicationContext {
  // Core Services
  public readonly database?: DatabaseAdapter; // ✨ Abstração, não Sequelize direto
  public readonly config: typeof Config;
  public readonly logger: typeof logger;
  
  // HTTP & WebSocket
  public readonly httpServer?: HttpServer;
  public readonly socketManager?: SocketManagerInterface; // ✨ Interface genérica
  
  // Application State
  public readonly startedAt: Date;
  public readonly environment: string;

  // ✨ NOVO: Plugins/Instâncias registradas
  private _plugins: Map<string, any> = new Map();
  
  // Custom State (pode ser estendido por projetos)
  private _state: Record<string, any> = {};
  
  constructor(options: {
    database?: DatabaseAdapter; // ✨ Abstração genérica
    httpServer?: HttpServer;
    socketManager?: SocketManagerInterface; // ✨ Interface genérica
    plugins?: Map<string, any>; // ✨ Plugins registrados
  }) {
    this.database = options.database;
    this.httpServer = options.httpServer;
    this.socketManager = options.socketManager;
    this.config = Config;
    this.logger = logger;
    this.startedAt = new Date();
    this.environment = Config.get('NODE_ENV');

     // ✨ Carrega plugins se fornecidos
     if (options.plugins) {
      this._plugins = options.plugins;
    }
  }
  /**
   * ✨ Registra um plugin/instância
   */
  registerPlugin<T = any>(name: string, instance: T): void {
    this._plugins.set(name, instance);
  }
  
  /**
   * ✨ Obtém um plugin/instância
   */
  getPlugin<T = any>(name: string): T | undefined {
    return this._plugins.get(name) as T;
  }
  
  /**
   * ✨ Verifica se um plugin está registrado
   */
  hasPlugin(name: string): boolean {
    return this._plugins.has(name);
  }
  
  /**
   * ✨ Obtém todos os plugins
   */
  getPlugins(): Map<string, any> {
    return new Map(this._plugins);
  }
  
  /**
   * ✨ Define um valor no state
   */
  setState<T = any>(key: string, value: T): void {
    this._state[key] = value;
  }
  
  /**
   * ✨ Obtém um valor do state
   */
  getState<T = any>(key: string): T | undefined {
    return this._state[key] as T;
  }
  
  /**
   * ✨ Obtém todo o state
   */
  getStateAll(): Record<string, any> {
    return { ...this._state };
  }
  
  /**
   * ✨ Limpa o state
   */
  clearState(): void {
    this._state = {};
  }
}

/**
 * ✨ Singleton global do Context
 */
let globalContext: ApplicationContext | null = null;

export const ApplicationContextProvider = {
  /**
   * ✨ Inicializa o context (chamado no start da aplicação)
   */
  initialize(context: ApplicationContext): void {
    if (globalContext) {
      throw new Error('ApplicationContext já foi inicializado');
    }
    globalContext = context;
  },
  
  /**
   * ✨ Obtém o context atual
   */
  getContext(): ApplicationContext {
    if (!globalContext) {
      throw new Error('ApplicationContext não foi inicializado. Chame ApplicationContextProvider.initialize() primeiro.');
    }
    return globalContext;
  },
  
  /**
   * ✨ Verifica se o context foi inicializado
   */
  isInitialized(): boolean {
    return globalContext !== null;
  },
  
  /**
   * ✨ Reseta o context (útil para testes)
   */
  reset(): void {
    globalContext = null;
  }
};

// ✨ Exporta helper para acesso direto
export const getContext = () => ApplicationContextProvider.getContext();