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

// framework/util/logger.ts
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { Config } from './env.config';

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success' | 'http';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
  metadata?: Record<string, any>;
}

interface LogOptions {
  /**
   * Se true, persiste o log (memória/arquivo conforme config)
   */
  persist?: boolean;
  /**
   * Metadados adicionais para o log
   */
  metadata?: Record<string, any>;
}

/**
 * ✨ Configuração do Logger
 */
export interface LoggerConfig {
  /**
   * Se logging está habilitado (padrão: true)
   */
  enabled?: boolean;
  
  /**
   * Se debug mode está habilitado (padrão: false)
   */
  debugMode?: boolean;
  
  /**
   * Modo de persistência: 'none' | 'memory' | 'file' | 'both' (padrão: 'none')
   */
  persistMode?: 'none' | 'memory' | 'file' | 'both';
  
  /**
   * Número máximo de logs em memória (padrão: 100)
   */
  maxMemoryLogs?: number;
  
  /**
   * Diretório para salvar logs em arquivo (padrão: 'logs')
   */
  logDirectory?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxMemoryLogs: number;
  private logCounter = 0;
  private config: LoggerConfig;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      debugMode: config.debugMode ?? false,
      persistMode: config.persistMode ?? 'none',
      maxMemoryLogs: config.maxMemoryLogs ?? 100,
      logDirectory: config.logDirectory ?? 'logs',
    };
    
    this.maxMemoryLogs = this.config.maxMemoryLogs!;
  }

  /**
   * ✨ Atualiza configuração do logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.maxMemoryLogs !== undefined) {
      this.maxMemoryLogs = config.maxMemoryLogs;
    }
  }

  private isEnabled(): boolean {
    // ✨ Tenta pegar do Config, mas se não tiver, usa config local
    try {
      return Config.get('LOGGING') ?? this.config.enabled ?? true;
    } catch {
      return this.config.enabled ?? true;
    }
  }

  private isDebugEnabled(): boolean {
    // ✨ Tenta pegar do Config, mas se não tiver, usa config local
    try {
      return Config.get('DEBUG_MODE') ?? this.config.debugMode ?? false;
    } catch {
      return this.config.debugMode ?? false;
    }
  }

  private getPersistMode(): 'none' | 'memory' | 'file' | 'both' {
    // ✨ Tenta pegar do Config, mas se não tiver, usa config local
    try {
      return Config.get('LOG_PERSIST_MODE') ?? this.config.persistMode ?? 'none';
    } catch {
      return this.config.persistMode ?? 'none';
    }
  }

  /**
   * Método principal de log
   */
  private async log(
    level: LogLevel,
    options: LogOptions,
    ...args: any[]
  ): Promise<void> {
    // Debug só aparece se DEBUG_MODE estiver ativa
    if (level === 'debug' && !this.isDebugEnabled()) {
      return;
    }

    // Outros logs só aparecem se LOGGING estiver ativa
    if (!this.isEnabled()) {
      return;
    }

    const timestamp = new Date();
    const prefix = this.getPrefix(level, timestamp.toISOString());

    // Sempre mostra no console
    console.log(prefix, ...args);

    // Persiste se solicitado
    if (options.persist) {
      const entry: LogEntry = {
        id: this.generateId(),
        timestamp,
        level,
        message: args.map((arg) => this.stringify(arg)).join(' '),
        data: args.length === 1 && typeof args[0] === 'object' ? args[0] : args,
        metadata: options.metadata,
      };

      await this.persist(entry);
    }
  }

  private getPrefix(level: LogLevel, timestamp: string): string {
    const time = chalk.gray(`[${timestamp}]`);

    switch (level) {
      case 'info':
        return `${time} ${chalk.blue('ℹ INFO')}`;
      case 'warn':
        return `${time} ${chalk.yellow('⚠ WARN')}`;
      case 'error':
        return `${time} ${chalk.red('✖ ERROR')}`;
      case 'debug':
        return `${time} ${chalk.gray('⚙ DEBUG')}`;
      case 'success':
        return `${time} ${chalk.green('✓ SUCCESS')}`;
      case 'http':
        return `${time} ${chalk.magenta('↔ HTTP')}`;
      default:
        return `${time}`;
    }
  }

  /**
   * Persiste o log conforme configuração
   */
  private async persist(entry: LogEntry): Promise<void> {
    const mode = this.getPersistMode();

    if (mode === 'none') return;

    // Salva em memória
    if (mode === 'memory' || mode === 'both') {
      this.addToMemory(entry);
    }

    // Salva em arquivo
    if (mode === 'file' || mode === 'both') {
      await this.addToFile(entry);
    }
  }

  /**
   * Adiciona log à memória (circular buffer)
   */
  private addToMemory(entry: LogEntry): void {
    this.logs.push(entry);

    // Remove logs antigos se exceder o limite
    if (this.logs.length > this.maxMemoryLogs) {
      this.logs.shift();
    }
  }

  private generateId(): string {
    return `${Date.now()}-${++this.logCounter}`;
  }

  private stringify(arg: any): string {
    if (typeof arg === 'string') return arg;
    if (arg instanceof Error) return arg.message;
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }

  // ========== MÉTODOS PÚBLICOS ==========

  /**
   * Log informativo (azul)
   * @param persist Se true, salva o log
   */
  info(message: any, options: LogOptions = {}): void {
    this.log('info', options, message);
  }

  /**
   * Log de aviso (amarelo)
   * @param persist Se true, salva o log
   */
  warn(message: any, options: LogOptions = {}): void {
    this.log('warn', options, message);
  }

  /**
   * Log de erro (vermelho)
   * @param persist Se true, salva o log
   */
  error(message: any, options: LogOptions = {}): void {
    this.log('error', { ...options, persist: true }, message); // Erros sempre persistem
  }

  /**
   * Log de debug (cinza) - só aparece se DEBUG_MODE=true
   * @param persist Se true, salva o log
   */
  debug(message: any, options: LogOptions = {}): void {
    this.log('debug', options, message);
  }

  /**
   * Log de sucesso (verde)
   * @param persist Se true, salva o log
   */
  success(message: any, options: LogOptions = {}): void {
    this.log('success', options, message);
  }

  /**
   * Log de requisição HTTP (magenta)
   * Automaticamente persiste se persist mode estiver ativo
   */
  http(message: any, options: LogOptions = {}): void {
    this.log('http', { ...options, persist: true }, message);
  }

  /**
   * Grupo de logs com indentação
   */
  group(title: string, callback: () => void): void {
    if (!this.isEnabled()) return;

    console.log(chalk.bold.cyan(`\n┌─ ${title}`));
    callback();
    console.log(chalk.bold.cyan(`└─ Fim do grupo\n`));
  }

  /**
   * Log de tabela (útil para objetos)
   */
  table(data: any): void {
    if (!this.isEnabled()) return;
    console.table(data);
  }

  // ========== CONSULTA DE LOGS ==========

  /**
   * Retorna todos os logs em memória
   */
  getAll(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Filtra logs por nível
   */
  getByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * Retorna apenas erros
   */
  getErrors(): LogEntry[] {
    return this.getByLevel('error');
  }

  /**
   * Filtra logs por metadata
   */
  getByMetadata(key: string, value: any): LogEntry[] {
    return this.logs.filter(
      (log) => log.metadata && log.metadata[key] === value,
    );
  }

  /**
   * Busca logs por texto na mensagem
   */
  search(query: string): LogEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.logs.filter((log) =>
      log.message.toLowerCase().includes(lowerQuery),
    );
  }

  /**
   * Limpa logs em memória
   */
  clearMemory(): void {
    this.logs = [];
    console.log(chalk.gray('Logs em memória limpos'));
  }

  /**
   * Limpa arquivo de logs
   */
  async clearFile(): Promise<void> {
    try {
      const logFilePath = this.getLogFilePath();
      await fs.unlink(logFilePath);
      console.log(chalk.gray('Arquivo de logs limpo'));
    } catch (error) {
      // Arquivo não existe, tudo bem
    }
  }

  /**
   * Retorna estatísticas dos logs
   */
  getStats(): {
    total: number;
    byLevel: Record<string, number>;
    oldestLog?: Date;
    newestLog?: Date;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      oldestLog: this.logs[0]?.timestamp,
      newestLog: this.logs[this.logs.length - 1]?.timestamp,
    };

    this.logs.forEach((log) => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    });

    return stats;
  }

  private getLogFilePath(): string {
    // ✨ Usa timezone local ao invés de UTC
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;

    return path.join(process.cwd(), this.config.logDirectory!, `app-${date}.jsonl`);
  }

  private async addToFile(entry: LogEntry): Promise<void> {
    try {
      const logFilePath = this.getLogFilePath();
      const dir = path.dirname(logFilePath);
      await fs.mkdir(dir, { recursive: true });

      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(logFilePath, logLine);
    } catch (error) {
      console.error('Erro ao salvar log em arquivo:', error);
    }
  }
}

// ✨ Exporta singleton com configuração padrão
// Cada projeto pode configurar via logger.configure()
export const logger = new Logger();