// framework/middlewares/cors.middleware.ts
import type { NextFunction, Request, Response } from "express";

/**
 * ✨ Configuração do CORS Middleware
 */
export interface CorsConfig {
  /**
   * Origins permitidos (padrão: '*' - permite todos)
   * Pode ser string única ou array de strings
   * Quando '*' e allowCredentials=true, aceita qualquer origin
   */
  allowedOrigins?: string | string[];

  /**
   * Métodos permitidos (padrão: '*' - permite todos)
   * Pode ser '*' para permitir todos ou array específico
   */
  allowedMethods?: string | string[];

  /**
   * Headers permitidos (padrão: '*' - permite todos)
   * Pode ser '*' para permitir todos ou array específico
   * Quando '*', permite qualquer header incluindo customizados
   */
  allowedHeaders?: string | string[];

  /**
   * Se permite credenciais (padrão: false quando origin='*', true caso contrário)
   * Nota: quando allowCredentials=true, não pode usar origin='*' (limitação CORS)
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
 * Por padrão, permite tudo sem bloqueios (mais permissivo)
 */
export function createCorsMiddleware(config: CorsConfig = {}) {
  const {
    allowedOrigins = "*", // ✨ Padrão: permite todos
    allowedMethods = "*", // ✨ Padrão: permite todos os métodos
    allowedHeaders = "*", // ✨ Padrão: permite todos os headers (resolve problema de headers customizados)
    allowCredentials,
    exposedHeaders = [],
    maxAge = 86400,
    beforeResponse,
  } = config;

  // Normaliza origins para array
  const origins = Array.isArray(allowedOrigins)
    ? allowedOrigins
    : [allowedOrigins];

  // ✨ Determina allowCredentials baseado na configuração
  // Se não especificado, usa false quando origin='*' (limitação CORS)
  // Se especificado, usa o valor fornecido
  const credentials =
    allowCredentials !== undefined ? allowCredentials : !origins.includes("*");

  // Normaliza methods
  const methods =
    allowedMethods === "*" || Array.isArray(allowedMethods)
      ? allowedMethods
      : [allowedMethods];

  // Normaliza headers
  const headers =
    allowedHeaders === "*" || Array.isArray(allowedHeaders)
      ? allowedHeaders
      : [allowedHeaders];

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    // ✨ Lógica para origin
    const isWildcardOrigin = origins.includes("*");

    if (isWildcardOrigin) {
      if (credentials) {
        // ✨ Quando credentials=true e origin='*', aceita qualquer origin
        // (respeitando limitação CORS: não pode usar '*' literalmente)
        if (origin) {
          res.header("Access-Control-Allow-Origin", origin);
        }
      } else {
        // ✨ Quando credentials=false, pode usar '*' literalmente
        res.header("Access-Control-Allow-Origin", "*");
      }
    } else {
      // ✨ Lista específica de origins
      if (origin && origins.includes(origin)) {
        res.header("Access-Control-Allow-Origin", origin);
      }
    }

    // ✨ Methods
    if (methods === "*") {
      res.header("Access-Control-Allow-Methods", "*");
    } else {
      res.header("Access-Control-Allow-Methods", methods.join(", "));
    }

    // ✨ Headers - permite todos por padrão
    if (headers === "*") {
      res.header("Access-Control-Allow-Headers", "*");
    } else {
      res.header("Access-Control-Allow-Headers", headers.join(", "));
    }

    // ✨ Credentials (só adiciona se for true, pois false é o padrão)
    if (credentials) {
      res.header("Access-Control-Allow-Credentials", "true");
    }

    // ✨ Exposed headers
    if (exposedHeaders.length > 0) {
      res.header("Access-Control-Expose-Headers", exposedHeaders.join(", "));
    }

    // ✨ Max age
    if (maxAge) {
      res.header("Access-Control-Max-Age", String(maxAge));
    }

    // ✨ Hook beforeResponse
    beforeResponse?.(req, res);

    // ✨ Responde OPTIONS imediatamente
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  };
}

/**
 * ✨ CORS Middleware padrão (permite tudo sem bloqueios)
 * - Permite todos os origins
 * - Permite todos os métodos
 * - Permite todos os headers (incluindo customizados)
 * - Credentials desabilitado por padrão (compatível com origin='*')
 *
 * Pode ser substituído pelo usuário passando configuração customizada:
 *
 * @example
 * // Permite tudo (padrão)
 * createCorsMiddleware()
 *
 * @example
 * // Permite tudo com credentials
 * createCorsMiddleware({ allowCredentials: true })
 *
 * @example
 * // Configuração específica
 * createCorsMiddleware({
 *   allowedOrigins: ['https://example.com'],
 *   allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header'],
 *   allowCredentials: true
 * })
 */
export default createCorsMiddleware();
