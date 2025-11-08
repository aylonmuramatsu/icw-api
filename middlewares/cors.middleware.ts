// framework/middlewares/cors.middleware.ts
import { NextFunction, Request, Response } from 'express';

/**
 * ✨ Configuração do CORS Middleware
 */
export interface CorsConfig {
  /**
   * Origins permitidos (padrão: '*' - permite todos)
   * Pode ser string única ou array de strings
   */
  allowedOrigins?: string | string[];
  
  /**
   * Métodos permitidos (padrão: todos comuns)
   */
  allowedMethods?: string[];
  
  /**
   * Headers permitidos (padrão: headers comuns)
   */
  allowedHeaders?: string[];
  
  /**
   * Se permite credenciais (padrão: true)
   */
  allowCredentials?: boolean;
  
  /**
   * Headers expostos
   */
  exposedHeaders?: string[];
  
  /**
   * Max age do preflight (padrão: 86400 = 24h)
   */
  maxAge?: number;
  
  /**
   * Hook para customizar headers antes de enviar
   */
  beforeResponse?: (req: Request, res: Response) => void;
}

/**
 * ✨ Factory para criar CORS Middleware configurável
 */
export function createCorsMiddleware(config: CorsConfig = {}) {
  const {
    allowedOrigins = '*', // ✨ Padrão: permite todos (mais flexível)
    allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders = [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
    ],
    allowCredentials = true,
    exposedHeaders = [],
    maxAge = 86400,
    beforeResponse,
  } = config;
  
  // Normaliza origins para array
  const origins = Array.isArray(allowedOrigins) 
    ? allowedOrigins 
    : [allowedOrigins];
  
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    
    // ✨ Verifica se origin está permitida
    const isOriginAllowed = origins.includes('*') || 
      (origin && origins.includes(origin));
    
    if (isOriginAllowed && origin) {
      res.header('Access-Control-Allow-Origin', origin);
    } else if (origins.includes('*')) {
      res.header('Access-Control-Allow-Origin', '*');
    }
    
    res.header('Access-Control-Allow-Methods', allowedMethods.join(', '));
    res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    res.header('Access-Control-Allow-Credentials', String(allowCredentials));
    
    if (exposedHeaders.length > 0) {
      res.header('Access-Control-Expose-Headers', exposedHeaders.join(', '));
    }
    
    if (maxAge) {
      res.header('Access-Control-Max-Age', String(maxAge));
    }
    
    // ✨ Hook beforeResponse
    beforeResponse?.(req, res);
    
    // ✨ Responde OPTIONS imediatamente
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    
    next();
  };
}

/**
 * ✨ CORS Middleware padrão (permite todos os origins)
 * Pode ser substituído pelo usuário
 */
export default createCorsMiddleware();