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

// framework/util/router-builder.ts
import {
  Express,
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from 'express';
import { BaseController } from './base-controller';
import { ApiResponse } from './response-builder';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handler: Function;
  controller?: any;
  middlewares?: RequestHandler[];
}

export interface ModuleDefinition {
  prefix: string;
  middlewares?: RequestHandler[];
  routes: RouteDefinition[];
  // ✨ Metadata opcional
  name?: string; // Nome amigável
  description?: string; // Descrição do módulo
  tags?: string[]; // Para agrupamento (ex: ['public', 'appointment'])
}

export interface RoutesConfig {
  apiPrefix?: string;
  modules: ModuleDefinition[];
}

export class RouteBuilder {
  private app: Express;

  constructor(app: Express) {
    this.app = app;
  }
  
  private registerRoutes(
    moduleRouter: Router,
    routes: RouteDefinition[],
    controller: any,
  ): void {
    routes.forEach((route) => {
      const middlewares = route.middlewares || [];
      const method = route.method as keyof Router;

      // ✨ Wrapper que captura o retorno do handler
      const wrappedHandler = async (
        req: Request,
        res: Response,
        next: NextFunction,
      ) => {
        try {
          const result = await route.handler.call(controller, req, res, next);

          // Se já respondeu (res.headersSent), não faz nada
          if (res.headersSent) {
            return;
          }

          // Se retornou algo, formata e envia
          if (result !== undefined) {
            // ✨ Se é ApiResponse, formata no padrão AppResponse
            if (result instanceof ApiResponse) {
              return res.status(result.statusCode).json({
                success: true,
                message: result.message || null,
                data: result.data,
                error: null,
              });
            }

            // ✨ Se é objeto simples, formata também
            return res.json({
              success: true,
              message: null,
              data: result,
              error: null,
            });
          }
        } catch (error) {
          next(error);
        }
      };

      (moduleRouter[method] as any)(route.path, ...middlewares, wrappedHandler);
    });
  }

  build(config: RoutesConfig): void {
    const apiRouter = Router();
    const apiPrefix = config.apiPrefix || '/api';

    config.modules.forEach((module) => {
      const moduleRouter = Router({ mergeParams: true });

      if (module.middlewares && module.middlewares.length > 0) {
        const validMiddlewares = module.middlewares.filter((mw) => {
          if (typeof mw !== 'function') {
            console.error(
              `❌ Invalid middleware in module "${module.prefix}":`,
              mw,
            );
            return false;
          }
          return true;
        });

        if (validMiddlewares.length > 0) {
          moduleRouter.use(...validMiddlewares);
        }
      }

      // ✨ Extrai controller se existir (geralmente do primeiro route)
      const controller = module.routes[0]?.controller || null;

      // ✨ USA registerRoutes para registrar
      this.registerRoutes(moduleRouter, module.routes, controller);

      apiRouter.use(module.prefix, moduleRouter);
    });

    this.app.use(apiPrefix, apiRouter);
  }
}

export const route = (
  method: HttpMethod,
  path: string,
  handler: Function,
  middlewares?: RequestHandler[],
): RouteDefinition => ({
  method,
  path,
  handler,
  middlewares,
});

export function bindController<T extends object>(controller: T) {
  // ✨ Exclui 'route' dos métodos disponíveis
  type ControllerMethods = Exclude<keyof T, 'route'>;

  return {
    get: (
      path: string,
      handler: ControllerMethods,
      middlewares?: RequestHandler[],
    ): RouteDefinition => ({
      method: 'get',
      path,
      handler: controller[handler as keyof T] as Function,
      controller,
      middlewares,
    }),

    post: (
      path: string,
      handler: ControllerMethods,
      middlewares?: RequestHandler[],
    ): RouteDefinition => ({
      method: 'post',
      path,
      handler: controller[handler as keyof T] as Function,
      controller,
      middlewares,
    }),

    put: (
      path: string,
      handler: ControllerMethods,
      middlewares?: RequestHandler[],
    ): RouteDefinition => ({
      method: 'put',
      path,
      handler: controller[handler as keyof T] as Function,
      controller,
      middlewares,
    }),

    patch: (
      path: string,
      handler: ControllerMethods,
      middlewares?: RequestHandler[],
    ): RouteDefinition => ({
      method: 'patch',
      path,
      handler: controller[handler as keyof T] as Function,
      controller,
      middlewares,
    }),

    delete: (
      path: string,
      handler: ControllerMethods,
      middlewares?: RequestHandler[],
    ): RouteDefinition => ({
      method: 'delete',
      path,
      handler: controller[handler as keyof T] as Function,
      controller,
      middlewares,
    }),
  };
}

/**
 * ✨ BaseController - Vincula rotas automaticamente
 */
export { BaseController };

export function createModule<T extends BaseController>(
  prefix: string,
  ControllerClass: new () => T,
  middlewares?: RequestHandler[],
  metadata?: { name?: string; description?: string; tags?: string[] },
) {
  const controller = new ControllerClass();
  const route = bindController(controller);

  return {
    // ✅ Apenas o método routes (mais limpo e direto)
    routes: (
      buildFn: (
        route: ReturnType<typeof bindController<T>>,
      ) => RouteDefinition[],
    ): ModuleDefinition => ({
      prefix,
      middlewares,
      routes: buildFn(route),
      ...metadata, // ✨ Inclui metadata
    }),
  };
}