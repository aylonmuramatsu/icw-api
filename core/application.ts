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

// framework/core/application.ts
import chalk from 'chalk';
import CliTable3 from 'cli-table3';
import express, { Express, NextFunction, Request, Response } from 'express';
import 'express-async-errors';
import helmet from 'helmet';
import http from 'http';
import path from 'path';

import cors_middleware from '../middlewares/cors.middleware';
import { ErrorException } from '../middlewares/error-exception.middleware';
import { configureTimezone } from '../util/date-helper';
import { Config, EnvSchema } from '../util/env.config';
import { ModuleDefinition, RouteBuilder, RouteDefinition } from '../util/router-builder';
import { RoutesManager } from '../util/router-manager';

// framework/core/application.ts
// ... imports existentes ...

// ✨ CORRIGIR linha 17:
import captureRequestMiddleware from '../middlewares/capture-request-middleware';

// ... resto do código ...
import { SocketManagerInterface } from '../util/socket.interface';
import { ApplicationContext, ApplicationContextProvider, DatabaseAdapter } from './application-context';

export interface MiddlewareConfig {
  /**
   * ✨ Error Middleware customizado (opcional)
   * Se não fornecido, usa o padrão do framework
   */
  errorMiddleware?: (err: any, req: Request, res: Response, next: NextFunction) => void;
  
  /**
   * ✨ Capture Request Middleware customizado (opcional)
   */
  captureRequestMiddleware?: (req: Request, res: Response, next: NextFunction) => void;
  
  /**
   * ✨ CORS Middleware customizado (opcional)
   */
  corsMiddleware?: (req: Request, res: Response, next: NextFunction) => void;
  
  /**
   * ✨ Middlewares adicionais globais
   */
  additionalMiddlewares?: Array<(req: Request, res: Response, next: NextFunction) => void>;
}

export interface ApplicationOptions {
  /**
   * ✨ Schema de variáveis de ambiente (opcional)
   * Se fornecido, valida e carrega as variáveis de ambiente
   */
  envSchema?: EnvSchema;
  
  /**
   * ✨ Porta do servidor (opcional)
   * Se não fornecido, usa PORT do env ou padrão 3000
   */
  port?: number;
  
  /**
   * ✨ Caminho para módulos (opcional)
   * Se não fornecido, usa 'src/modules'
   */
  modulesPath?: string;
  /**
   * ✨ SocketManager customizado (opcional)
   * Cada projeto cria sua própria classe de socket
   * 
   * Exemplo:
   * const app = new Application({
   *   useSocket: new MySocketManager()
   * });
   */
  useSocket?: SocketManagerInterface;

  /**
   * ✨ Timezone para datas (padrão: 'America/Sao_Paulo')
   * 
   * Exemplos:
   * - 'America/Sao_Paulo' (Brasil SP)
   * - 'UTC'
   * - 'America/New_York'
   * 
   * IMPORTANTE: Configure o mesmo timezone em dev e prod!
   */
    timezone?: string;
      /**
   * ✨ Plugins/Instâncias a serem registradas no Context
   * 
   * Exemplo:
   * 
   * const app = new Application({
   *   plugins: {
   *     storage: new MyStorageManager(),
   *     mailer: new MyMailerService(),
   *     cache: new RedisCache(),
   *   }
   * });
   */
  plugins?: Record<string, any>;
    /**
   * ✨ Auto-gera .env baseado no envSchema (padrão: true em development)
   * - Se true, gera .env com valores vazios (usuário preenche manualmente)
   * - Gera .env.example como referência completa
   * - Preserva valores existentes no .env
   */
  autoGenerateEnv?: boolean;
}

export class Application {
  private app: Express;
  private server: http.Server;
  private _socketManager?: SocketManagerInterface; // ✨ Qualquer implementação
  private _context!: ApplicationContext;
  private port: number;
  private modulesPath: string;
  private initializationError: Error | null = null;
  private _database?: DatabaseAdapter;
  private middlewareConfig?: MiddlewareConfig;
  private options: ApplicationOptions;
  private plugins: Map<string, any> = new Map();


  constructor(options: ApplicationOptions = {}) {
    this.options = options;
    const { envSchema, autoGenerateEnv, port, modulesPath, useSocket, timezone, plugins } = options;

    // ✨ Auto-gera .env se envSchema fornecido
    if (envSchema) {
      // ✨ Determina se deve auto-gerar
      // Padrão: true (sempre gera, exceto se explicitamente false)
      const shouldAutoGenerate = autoGenerateEnv !== false;
      
      if (shouldAutoGenerate) {
        this.generateEnvFiles(envSchema);
      }
      
      Config.setSchema(envSchema);
      Config.load();
    } else {
      Config.load();
    }

    // ✨ Configura timezone PRIMEIRO (antes de qualquer coisa)
    if (timezone) {
      configureTimezone(timezone);
      console.log(`🌍 Timezone configurado: ${timezone}`);
    } else {
      // ✨ Tenta pegar do Config, senão usa padrão
      try {
        const tz = Config.get('TIMEZONE');
        if (tz) {
          configureTimezone(tz);
          console.log(`🌍 Timezone configurado via env: ${tz}`);
        }
      } catch {
        // Se não tiver TIMEZONE no config, usa padrão (já configurado)
        console.log(`🌍 Timezone padrão: America/Sao_Paulo`);
      }
    }

    // ✨ Registra plugins PRIMEIRO (antes de tudo)
    if (plugins) {
      Object.entries(plugins).forEach(([name, instance]) => {
        this.plugins.set(name, instance);
        console.log(`🔌 Plugin registrado: ${name}`);
      });
    }
    
    // ✨ Define porta (do options, env ou padrão)
    this.port = port || Config.get('PORT') || 3000;
    this.modulesPath = modulesPath || 'src/modules';
    
        // ✨ Armazena socket se fornecido
    if (useSocket) {
      this._socketManager = useSocket;
    }
    
    this.app = express();
    this.server = http.createServer(this.app);
  }

  /**
   * ✨ Registra um plugin após a criação (mas antes do start)
   */
  registerPlugin<T = any>(name: string, instance: T): this {
    this.plugins.set(name, instance);
    console.log(`🔌 Plugin registrado: ${name}`);
    return this;
  }

  /**
   * ✨ Registra múltiplos plugins
   */
  registerPlugins(plugins: Record<string, any>): this {
    Object.entries(plugins).forEach(([name, instance]) => {
      this.plugins.set(name, instance);
      console.log(`🔌 Plugin registrado: ${name}`);
    });
    return this;
  }


  /**
   * ✨ Getter público para SocketManager
   * Permite acesso direto: app.socket.emit(), app.socket.on(), etc.
   */
  public get socket(): SocketManagerInterface | undefined {
    return this._socketManager;
  }

  

  /**
   * ✨ Configura o banco de dados (abstração genérica)
   * Cada projeto implementa seu próprio adapter
   */
  setDatabase(database: DatabaseAdapter): this {
    this._database = database;
    return this;
  }

  /**
   * ✨ Configura middlewares customizados
   */
  configureMiddlewares(config: MiddlewareConfig): this {
    this.middlewareConfig = config;
    return this;
  }

  /**
   * ✨ Getter público para Context
   */
  public get context(): ApplicationContext {
    return this._context;
  }

  /**
   * ✨ Getter público para SocketManager
   */
  public get socketManager(): SocketManagerInterface | any {
    return this._socketManager;
  }

  /**
   * Configura middlewares globais
   */
  private setupMiddlewares(): void {
    this.app.set('trust proxy', true);
    this.app.use(helmet());
    this.app.use(express.json({ limit: '300kb' }));
    this.app.use(express.urlencoded({ extended: false }));
    
    // ✨ Usa middleware customizado ou padrão
    const captureRequest = this.middlewareConfig?.captureRequestMiddleware 
      || captureRequestMiddleware;
    this.app.use(captureRequest);
    
    const cors = this.middlewareConfig?.corsMiddleware 
      || cors_middleware;
    this.app.use(cors);
    
    // ✨ Middlewares adicionais
    if (this.middlewareConfig?.additionalMiddlewares) {
      this.middlewareConfig.additionalMiddlewares.forEach(mw => {
        this.app.use(mw);
      });
    }

    // ✨ Middleware de health check em caso de erro de inicialização
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      if (this.initializationError) {
        return res.status(503).json({
          success: false,
          message: 'Service Unavailable',
          data: {
            status: 'error',
            error: 'Aplicação não inicializada corretamente',
          },
          error: null,
        });
      }
      next();
    });
  }

  /**
   * Carrega módulos e loga cada um
   */
  private async loadModules(): Promise<void> {
    console.log('📂 Carregando módulos...');
    await RoutesManager.autoLoad(path.join(process.cwd(), this.modulesPath));
    const modules = RoutesManager.getModules();
    console.log(`✅ ${modules.length} módulos carregados com sucesso\n`);
  }

  /**
   * Registra todas as rotas
   */
  private setupRoutes(): void {
    new RouteBuilder(this.app).build({
      apiPrefix: RoutesManager.apiPrefix,
      modules: RoutesManager.getModules(),
    });

    // ✨ Usa error middleware customizado ou padrão
    const errorHandler = this.middlewareConfig?.errorMiddleware 
      || ErrorException;
    this.app.use(errorHandler);
  }

  /**
   * Inicializa Socket.IO (se fornecido)
   */
  private setupSocket(): void {
    if (this._socketManager) {
      // ✨ Chama initialize passando o server
      this._socketManager.initialize(this.server);
      console.log('✅ Socket inicializado');
    }
  }

  /**
   * Conecta ao banco de dados (usando adapter genérico)
   */
  private async connectDatabase(): Promise<void> {
    if (!this._database) {
      console.log('⚠️  Nenhum banco de dados configurado (opcional)');
      return;
    }

    // ✨ Usa adapter genérico - cada projeto implementa seu próprio
    if (this._database.sync) {
      await this._database.sync();
    }
    
    const dbName = Config.get('DB_NAME') || 'database';
    console.log(`✅ Banco de dados conectado: ${dbName}`);
  }

  /**
   * Inicia o servidor
   */
  private async startServer(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`🚀 Server running on http://localhost:${this.port}`);
        resolve();
      });
    });
  }

  /**
   * ✨ Inicializa toda a aplicação
   */
  public async start(): Promise<void> {
    try {
      // 1. Exibe configs (se schema foi definido)
      if (Config['schema']) {
        Config.displayTable();
        console.log('');
      }

      // 2. Conecta ao banco PRIMEIRO (se configurado)
      if (this._database) {
        console.log('💾 Conectando ao banco de dados...');
        await this.connectDatabase();
        console.log('');
      }

      // 3. ✨ Inicializa Socket (se fornecido)
      if (this._socketManager) {
        console.log('📡 Inicializando Socket...');
        this.setupSocket();
        console.log('');
      }

      // 4. ✨ Inicializa ApplicationContext
      console.log('🔧 Inicializando Application Context...');
      this._context = new ApplicationContext({
        database: this._database,
        httpServer: this.server,
        socketManager: this._socketManager,
        plugins: this.plugins, // ✨ Passa plugins
      });
      
      // ✨ Registra o context globalmente
      ApplicationContextProvider.initialize(this._context);
      console.log('✅ Application Context inicializado\n');

      if (this.plugins.size > 0) {
        console.log(`   🔌 ${this.plugins.size} plugin(s) disponível(is)\n`);
      } else {
        console.log('');
      }

      // 5. Faz autoload de módulos
      await this.loadModules();

      // 6. Configura middlewares
      this.setupMiddlewares();

      // 7. Registra rotas
      this.setupRoutes();

      // 8. Inicia servidor
      console.log('🚀 Iniciando servidor...');
      await this.startServer();
      console.log('');

      // 9. Resumo
      const modules = RoutesManager.getModules();
      const totalRoutes = modules.reduce((acc, m) => acc + m.routes.length, 0);
      console.log(chalk.bold.green('✅ Inicialização concluída com sucesso:'));
      if (this._database) {
        console.log(chalk.white(`   💾 Banco de dados conectado`));
      }
      console.log(chalk.white(`   📡 Socket.IO initialized`));
      console.log(chalk.white(`   🚀 Server running on http://localhost:${this.port}`));
      console.log(chalk.white(`   📦 ${modules.length} módulos carregados`));
      console.log(chalk.white(`   🛣️  ${totalRoutes} rotas registradas\n`));

      this.displayLoadedRoutes();
      console.log('✅ Aplicação iniciada com sucesso!\n');
    } catch (error) {
      this.initializationError = error as Error;
      
      if (!this.app._router) {
        this.setupMiddlewares();
      }

      this.app.use('*', (req: Request, res: Response) => {
        return res.status(503).json({
          success: false,
          message: 'Service Unavailable',
          data: {
            status: 'error',
            error: 'Aplicação não inicializada corretamente',
          },
          error: null,
        });
      });

      try {
        await this.startServer();
      } catch (serverError) {
        console.error(chalk.red('❌ Erro ao iniciar servidor:'), serverError);
        process.exit(1);
      }

      console.error(chalk.red('\n❌ Erro ao iniciar aplicação:'));
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
        if (error.stack) {
          console.error(chalk.gray(error.stack));
        }
      } else {
        console.error(chalk.red(String(error)));
      }
      console.log(chalk.yellow('\n⚠️  Aplicação em modo de erro. Todas as rotas retornarão health check (503).\n'));
    }
  }

  /**
   * Para a aplicação gracefully
   */
  public async stop(): Promise<void> {
    console.log('🛑 Encerrando aplicação...');

    // ✨ Fecha socket se tiver método close
    if (this._socketManager?.close) {
      await this._socketManager.close();
    }
    
    // ✨ Fecha banco se tiver método close
    if (this._database?.close) {
      await this._database.close();
    }
    
    this.server.close(() => {
      console.log('✅ Aplicação encerrada');
    });
  }

  /**
   * ✨ Exibe todas as rotas carregadas em tabela colorida
   */
  private displayLoadedRoutes(): void {
    console.log(chalk.bold.cyan('\n📋 Rotas carregadas:\n'));

    const modules = RoutesManager.getModules();
    const apiPrefix = RoutesManager.apiPrefix;

    interface RouteRow {
      category: string;
      moduleName: string;
      moduleDesc: string;
      method: string;
      fullUrl: string;
      handler: string;
    }

    const allRoutes: RouteRow[] = [];

    modules.forEach((module) => {
      const category = this.getModuleCategory(module);
      const moduleName = module.name || this.extractModuleName(module.prefix);
      const moduleDesc = module.description || '-';

      module.routes.forEach((route: RouteDefinition) => {
        const method = route.method.toUpperCase();
        const fullUrl = `${apiPrefix}${module.prefix}${route.path === '/' ? '' : route.path}`;
        const handler = route.handler.name || 'anonymous';

        allRoutes.push({
          category,
          moduleName,
          moduleDesc,
          method,
          fullUrl,
          handler,
        });
      });
    });

    allRoutes.sort((a, b) => a.fullUrl.localeCompare(b.fullUrl));

    const table = new CliTable3({
      head: [
        chalk.white.bold('#'),
        chalk.white.bold('Grupo'),
        chalk.white.bold('Título'),
        chalk.white.bold('Descrição'),
        chalk.white.bold('Method'),
        chalk.white.bold('URL'),
        chalk.white.bold('Handler'),
      ],
      colWidths: [5, 15, 25, 25, 10, 50, 25],
      style: {
        head: [],
        border: ['gray'],
      },
    });

    allRoutes.forEach((route, index) => {
      const methodColor =
        (
          {
            GET: chalk.green,
            POST: chalk.blue,
            PUT: chalk.yellow,
            PATCH: chalk.magenta,
            DELETE: chalk.red,
          } as Record<string, typeof chalk.green>
        )[route.method] || chalk.white;

      table.push([
        chalk.gray(index + 1),
        chalk.magenta(route.category),
        chalk.yellow(route.moduleName),
        chalk.gray(route.moduleDesc),
        methodColor.bold(route.method),
        chalk.cyan(route.fullUrl),
        chalk.white(route.handler),
      ]);
    });

    console.log(table.toString());

    const totalRoutes = modules.reduce((acc, m) => acc + m.routes.length, 0);
    console.log(
      chalk.bold.green(`\n✅ Total: `) +
        chalk.white(`${modules.length} módulos | ${totalRoutes} rotas\n`),
    );
  }

  private extractModuleName(prefix: string): string {
    const parts = prefix.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    return lastPart
      .replace(/^:/, '')
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getModuleCategory(module: ModuleDefinition): string {
    if (module.tags?.includes('public') || module.prefix.includes('/public')) {
      return 'Public';
    } else if (module.tags?.includes('admin') || module.prefix.includes('/admin')) {
      return 'Admin';
    } else if (module.tags?.includes('auth') || module.prefix.includes('authentication')) {
      return 'Authentication';
    } else {
      return 'Other';
    }
  }
  /**
 * ✨ Gera arquivos .env e .env.example automaticamente
 */
private generateEnvFiles(envSchema: EnvSchema): void {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  const envExists = fs.existsSync(envPath);
  
  // ✨ Lê valores existentes do .env (para preservar)
  let existingEnv: Record<string, string> = {};
  if (envExists) {
    try {
      const existingContent = fs.readFileSync(envPath, 'utf8');
      existingContent.split('\n').forEach((line: string) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key) {
            existingEnv[key.trim()] = valueParts.join('=').trim();
          }
        }
      });
    } catch {
      // Ignora erros
    }
  }

  // ✨ Define quais campos podem ter default preenchido automaticamente
  const safeDefaults = ['PORT', 'NODE_ENV', 'TIMEZONE']; // Apenas não-sensíveis
  
  // Gera .env (com valores vazios, exceto defaults seguros)
  let envContent = '# ============================================\n';
  envContent += '# Arquivo de configuração de ambiente\n';
  envContent += '# ⚠️  PREENCHA OS VALORES MANUALMENTE\n';
  envContent += '# Gerado automaticamente do envSchema\n';
  envContent += `# Data: ${new Date().toISOString()}\n`;
  envContent += '# ============================================\n\n';

  // Gera .env.example (referência completa)
  let exampleContent = '# ============================================\n';
  exampleContent += '# Arquivo de referência - NÃO contém valores reais\n';
  exampleContent += '# Use como guia para preencher o .env\n';
  exampleContent += '# Gerado automaticamente do envSchema\n';
  exampleContent += `# Data: ${new Date().toISOString()}\n`;
  exampleContent += '# ============================================\n\n';

  // Agrupa por grupo
  const groups: Record<string, string[]> = {};
  Object.entries(envSchema).forEach(([key, config]) => {
    const group = config.group || 'Outros';
    if (!groups[group]) groups[group] = [];
    groups[group].push(key);
  });

  // ✨ Armazena valores gerados para verificação posterior
  const generatedValues: Record<string, string> = {};

  // Gera ambos os arquivos por grupo
  Object.entries(groups).forEach(([groupName, keys]) => {
    envContent += `# ========== ${groupName} ==========\n`;
    exampleContent += `# ========== ${groupName} ==========\n`;

    keys.forEach((key) => {
      const config = envSchema[key];
      
      // ✨ Para .env: Preserva existente OU usa default apenas se for seguro
      let envValue: string;
      if (existingEnv[key] !== undefined) {
        // Preserva valor existente
        envValue = existingEnv[key];
      } else if (config.secure || !safeDefaults.includes(key)) {
        // ✨ Campos sensíveis ou não-seguros: deixa vazio
        envValue = '';
      } else if (config.default !== undefined) {
        // ✨ Apenas defaults seguros são preenchidos
        envValue = String(config.default);
      } else {
        envValue = '';
      }

      // ✨ Armazena valor gerado
      generatedValues[key] = envValue;

      // ✨ Para .env.example: sempre vazio (apenas referência)
      const exampleValue = '';

      // Monta comentários
      const comments: string[] = [];
      if (config.description) comments.push(config.description);
      if (config.type) comments.push(`Tipo: ${config.type}`);
      if (config.values && Array.isArray(config.values)) {
        comments.push(`Valores: ${config.values.join(' | ')}`);
      }
      if (config.default !== undefined) {
        comments.push(`Default: ${config.default}`);
      }
      if (config.required === true) {
        comments.push('⚠️ OBRIGATÓRIO');
      }
      if (config.secure === true) {
        comments.push('🔒 SENSÍVEL - Preencha manualmente');
      }

      const comment = comments.length > 0 ? ` # ${comments.join(' | ')}` : '';
      const preserved = existingEnv[key] !== undefined ? ' # (preservado)' : '';
      const needsFill = envValue === '' && config.required ? ' ⚠️ PREENCHER' : '';
      
      // .env
      envContent += `${key}=${envValue}${comment}${preserved}${needsFill}\n`;
      
      // .env.example
      exampleContent += `${key}=${comment}\n`;
    });

    envContent += '\n';
    exampleContent += '\n';
  });

  // Footer
  const total = Object.keys(envSchema).length;
  const required = Object.values(envSchema).filter((c) => c.required).length;
  const secure = Object.values(envSchema).filter((c) => c.secure).length;

  envContent += `# Total: ${total} variáveis`;
  if (required > 0) envContent += ` | ${required} obrigatórias ⚠️`;
  if (secure > 0) envContent += ` | ${secure} sensíveis 🔒`;
  envContent += '\n';
  envContent += '# ⚠️  IMPORTANTE: Preencha os valores manualmente antes de usar!\n';

  exampleContent += `# Total: ${total} variáveis`;
  if (required > 0) exampleContent += ` | ${required} obrigatórias`;
  if (secure > 0) exampleContent += ` | ${secure} sensíveis 🔒`;
  exampleContent += '\n';

  // Escreve arquivos
  fs.writeFileSync(envPath, envContent);
  fs.writeFileSync(envExamplePath, exampleContent);
  
  if (!envExists) {
    console.log('✨ Arquivo .env gerado (valores vazios - preencha manualmente)');
    console.log('✨ Arquivo .env.example gerado como referência');
  } else {
    const newVars = Object.keys(envSchema).filter(k => !existingEnv[k]);
    if (newVars.length > 0) {
      console.log(`✨ Arquivo .env atualizado (${newVars.length} novas variáveis adicionadas)`);
    }
  }
  
  // ✨ Avisa sobre campos obrigatórios vazios (CORRIGIDO)
  const emptyRequired = Object.entries(envSchema)
    .filter(([key, config]) => {
      const hasValue = existingEnv[key] !== undefined || generatedValues[key] !== '';
      return config.required && !hasValue;
    })
    .map(([key]) => key);
  
  if (emptyRequired.length > 0) {
    console.log(`⚠️  Atenção: ${emptyRequired.length} variável(is) obrigatória(s) precisa(m) ser preenchida(s):`);
    emptyRequired.forEach(key => console.log(`   - ${key}`));
  }
}
}