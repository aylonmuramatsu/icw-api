// framework/middlewares/capture-request.middleware.ts
import { NextFunction, Request, Response } from 'express';
import { Config } from '../util/env.config';
import { logger } from '../util/logger';

/**
 * ✨ Hook para customizar captura de request
 */
export interface RequestCaptureHook {
  /**
   * Chamado antes de processar a requisição
   */
  beforeRequest?(req: Request, res: Response): void;
  
  /**
   * Chamado após processar a requisição
   */
  afterRequest?(req: Request, res: Response, duration: number, statusCode: number): void;
  
  /**
   * Determina se deve logar esta requisição
   */
  shouldLog?(req: Request, res: Response, statusCode: number): boolean;
  
  /**
   * Customiza os dados do log
   */
  formatLogData?(req: Request, res: Response, duration: number, statusCode: number): any;
}

/**
 * ✨ Configuração do Capture Request Middleware
 */
export interface CaptureRequestConfig {
  /**
   * Nível mínimo de log (padrão: 'all')
   */
  logLevel?: 'all' | 'success' | 'warn' | 'error' | 'none';
  
  /**
   * Hooks para customização
   */
  hooks?: RequestCaptureHook;
  
  /**
   * Se deve usar logger do framework (padrão: true)
   */
  useLogger?: boolean;
}

/**
 * ✨ Factory para criar Capture Request Middleware configurável
 */
export function createCaptureRequestMiddleware(config: CaptureRequestConfig = {}) {
  const {
    logLevel = Config.get('LOG_REQUEST_LEVEL') || 'all',
    hooks,
    useLogger = true,
  } = config;
  
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // ✨ Hook beforeRequest
    hooks?.beforeRequest?.(req, res);
    
    // Loga request se configurado
    if (logLevel !== 'none') {
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;
        
        // ✨ Hook shouldLog (permite customização)
        const shouldLog = hooks?.shouldLog 
          ? hooks.shouldLog(req, res, statusCode)
          : (() => {
              if (logLevel === 'all') return true;
              if (logLevel === 'success' && statusCode < 400) return true;
              if (logLevel === 'warn' && statusCode >= 400 && statusCode < 500) return true;
              if (logLevel === 'error' && statusCode >= 500) return true;
              return false;
            })();
        
        if (shouldLog) {
          // ✨ Hook formatLogData (permite customizar dados do log)
          const logData = hooks?.formatLogData
            ? hooks.formatLogData(req, res, duration, statusCode)
            : {
                method: req.method,
                url: req.url,
                statusCode,
                duration: `${duration}ms`,
                ip: req.ip,
              };
          
          if (useLogger) {
            logger.http(logData, { persist: true });
          }
          
          // ✨ Hook afterRequest
          hooks?.afterRequest?.(req, res, duration, statusCode);
        }
      });
    }
    
    next();
  };
}

/**
 * ✨ Capture Request Middleware padrão
 * Pode ser substituído pelo usuário
 */
export default createCaptureRequestMiddleware();