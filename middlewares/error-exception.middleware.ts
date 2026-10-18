// framework/middlewares/error-exception.middleware.ts
import { NextFunction, Request, Response } from 'express';
import { AppException } from '../util/app-exception';
import { AppResponse } from '../util/app-response';
import { Validation } from '../util/validation';

/**
 * ✨ Interface para Error Handler customizado
 * Permite que cada projeto registre seus próprios handlers
 */
export interface ErrorHandler {
  /**
   * Verifica se este handler pode tratar o erro
   */
  canHandle(error: any): boolean;
  
  /**
   * Trata o erro e retorna a resposta
   */
  handle(error: any, req: Request, res: Response): void;
}

/**
 * ✨ Registry de Error Handlers
 * Permite registrar handlers customizados
 */
class ErrorHandlerRegistry {
  private handlers: ErrorHandler[] = [];
  
  /**
   * ✨ Registra um handler customizado
   * Handlers são executados na ordem de registro
   */
  register(handler: ErrorHandler): void {
    this.handlers.push(handler);
  }
  
  /**
   * ✨ Registra múltiplos handlers
   */
  registerMany(handlers: ErrorHandler[]): void {
    this.handlers.push(...handlers);
  }
  
  /**
   * ✨ Limpa todos os handlers (útil para testes)
   */
  clear(): void {
    this.handlers = [];
  }
  
  /**
   * ✨ Tenta tratar o erro com os handlers registrados
   */
  handle(error: any, req: Request, res: Response): boolean {
    for (const handler of this.handlers) {
      if (handler.canHandle(error)) {
        handler.handle(error, req, res);
        return true; // Erro tratado
      }
    }
    return false; // Nenhum handler tratou
  }
  
  /**
   * ✨ Obtém todos os handlers
   */
  getHandlers(): ErrorHandler[] {
    return [...this.handlers];
  }
}

// ✨ Singleton global
export const errorHandlerRegistry = new ErrorHandlerRegistry();

/**
 * ✨ Handlers padrão do framework (podem ser desabilitados)
 */
const defaultHandlers: ErrorHandler[] = [  
  // Handler para Validation customizado
  {
    canHandle: (error) => error instanceof Validation,
    handle: (error: Validation, req, res) => {
      return AppResponse(res, 400, false, null, 'Erro de validação', error.messages);
    },
  },
  
  // Handler para AppException
  {
    canHandle: (error) => error instanceof AppException,
    handle: (error: AppException, req, res) => {
      return AppResponse(res, error.statusCode, false, null, error.message, error.message);
    },
  },
  
  // Handler para JSON parse errors
  {
    canHandle: (error) => error.type === 'entity.parse.failed',
    handle: (error, req, res) => {
      return AppResponse(res, 400, false, null, 'Verifique se o JSON está correto', error.message);
    },
  },
  
  // Handler genérico (sempre por último)
  {
    canHandle: () => true, // Sempre pode tratar
    handle: (error, req, res) => {
      const message = error?.message || 'Erro interno do servidor';
      return AppResponse(res, 500, false, null, 'Erro interno do servidor', message);
    },
  },
];

/**
 * ✨ Configuração do Error Middleware
 */
export interface ErrorMiddlewareConfig {
  /**
   * Se deve usar handlers padrão do framework (padrão: true)
   */
  useDefaultHandlers?: boolean;
  
  /**
   * Handlers customizados adicionais
   */
  customHandlers?: ErrorHandler[];
  
  /**
   * Se deve expor stack trace em desenvolvimento (padrão: false)
   */
  exposeStackTrace?: boolean;
}

/**
 * ✨ Factory para criar Error Middleware configurável
 */
export function createErrorMiddleware(config: ErrorMiddlewareConfig = {}) {
  const {
    useDefaultHandlers = true,
    customHandlers = [],
    exposeStackTrace = false,
  } = config;
  
  // Registra handlers padrão se habilitado
  if (useDefaultHandlers) {
    errorHandlerRegistry.registerMany(defaultHandlers);
  }
  
  // Registra handlers customizados
  if (customHandlers.length > 0) {
    errorHandlerRegistry.registerMany(customHandlers);
  }
  
  // Retorna o middleware
  return async (err: any, req: Request, res: Response, next: NextFunction) => {
    // Tenta tratar com handlers registrados
    const handled = errorHandlerRegistry.handle(err, req, res);
    
    if (!handled) {
      // Se nenhum handler tratou, usa fallback
      const message = exposeStackTrace && err?.stack 
        ? err.stack 
        : (err?.message || 'Erro interno do servidor');
      
      return AppResponse(res, 500, false, null, 'Erro interno do servidor', message);
    }
  };
}

/**
 * ✨ Error Middleware padrão (usa configuração padrão)
 * Pode ser substituído pelo usuário
 */
export const ErrorException = createErrorMiddleware();