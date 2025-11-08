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

// framework/index.ts
/**
 * ✨ Framework Core - Re-export de tudo
 * 
 * Facilita imports:
 * 
 * import { Application, BaseController, ok } from '../framework';
 * 
 * Ao invés de:
 * import { Application } from '../framework/core/application';
 * import { BaseController } from '../framework/util/base-controller';
 * import { ok } from '../framework/util/response-builder';
 */

// ========== CORE ==========
export { Application } from './core/application';
export type { ApplicationOptions, MiddlewareConfig } from './core/application';

export {
  ApplicationContext,
  ApplicationContextProvider,
  getContext
} from './core/application-context';
export type { DatabaseAdapter } from './core/application-context';

// ========== BASE CLASSES ==========
export { BaseController } from './util/base-controller';
export { BaseService } from './util/base-service';
export type { ServiceConfig, TransactionAdapter } from './util/base-service';

// ========== ROUTER ==========
export {
  bindController, createModule,
  route, RouteBuilder
} from './util/router-builder';
export type {
  ModuleDefinition, RouteDefinition, RoutesConfig
} from './util/router-builder';

export { RoutesManager } from './util/router-manager';

// ========== RESPONSE ==========
export {
  accepted, ApiResponse, created, noContent, ok
} from './util/response-builder';

export { AppResponse } from './util/app-response';

// ========== EXCEPTION ==========
export { AppException } from './util/app-exception';

// ========== VALIDATION ==========
export { Validation, VALIDATION_ERROR } from './util/validation';

// ✨ Adicionar se não tiver:
export {
  array, def, default_value, email, max, maxLength, min, minLength, numeric, oneOf, optional, optionalBut, required, requiredIf, requiredIn, requiredWhen, url
} from './util/rules-common';
export { InputOf, schema } from './util/validation-helper';

export * from './util/rules-common';

// ========== HELPERS ==========
export * from './util/helper';

export {
  configureTimezone, dateHelper, dayjs
} from './util/date-helper';

export { conditionalFilter, filter, prepareFilter } from './util/query-filter';

// ========== LOGGER ==========
export { logger } from './util/logger';
export type { LogEntry, LoggerConfig } from './util/logger';

// ========== CONFIG ==========
export { Config } from './util/env.config';
export type { EnvSchema } from './util/env.config';

export { defineEnv, InferEnvSchema } from './util/env-builder';

// ========== MIDDLEWARES ==========
export { createErrorMiddleware, ErrorException, errorHandlerRegistry } from './middlewares/error-exception.middleware';
export type { ErrorHandler, ErrorMiddlewareConfig } from './middlewares/error-exception.middleware';

export {
  default as captureRequestMiddleware, createCaptureRequestMiddleware
} from './middlewares/capture-request-middleware';
export type { CaptureRequestConfig, RequestCaptureHook } from './middlewares/capture-request-middleware';

export {
  default as corsMiddleware, createCorsMiddleware
} from './middlewares/cors.middleware';
export type { CorsConfig } from './middlewares/cors.middleware';

// ========== SOCKET ==========
export type { SocketManagerInterface } from './util/socket.interface';
