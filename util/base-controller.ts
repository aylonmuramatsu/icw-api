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

// framework/util/base-controller.ts
import { ApplicationContextProvider } from '../core/application-context';
import { bindController } from './router-builder';

/**
 * ✨ Base Controller - Todas as classes controller herdam desta
 * Fornece acesso ao Context e sistema de rotas
 */
export abstract class BaseController {
  /**
   * ✨ Context da aplicação (acessível em todos os controllers)
   */
  protected get context() {
    return ApplicationContextProvider.getContext();
  }
  
  /**
   * ✨ Sistema de rotas (bind automático)
   */
  public readonly route: ReturnType<typeof bindController>;

  constructor() {
    this.route = bindController(this);
  }
}