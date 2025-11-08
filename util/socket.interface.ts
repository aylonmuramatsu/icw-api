// framework/util/socket.interface.ts

import { Server as HttpServer } from 'http';

/**
 * ✨ Interface base para SocketManager (opcional)
 * Cada projeto pode criar sua própria implementação
 * 
 * Exemplo:
 * 
 * class MySocketManager implements SocketManagerInterface {
 *   constructor(server: HttpServer) {
 *     // Inicializa seu socket aqui
 *   }
 *   
 *   emit(event: string, data: any) {
 *     // Sua implementação
 *   }
 * }
 */
export interface SocketManagerInterface {
  /**
   * ✨ Inicializa o socket (chamado pelo Application)
   */
  initialize(server: HttpServer): void;
  
  /**
   * ✨ Limpa recursos (chamado no stop)
   */
  close?(): void | Promise<void>;
  
  /**
   * ✨ Permite qualquer método adicional
   * Cada projeto implementa os métodos que precisa
   */
  [key: string]: any;
}