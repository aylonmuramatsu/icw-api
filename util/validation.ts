// framework/util/validation.ts

/**
 * ✨ Enum de códigos de erro de validação
 */
export enum VALIDATION_ERROR {
  ERR_FIELD = 'ERR_FIELD',
  ERR_UNKNOWN = 'ERR_UNKNOWN',
}

/**
 * ✨ Classe de mensagem de validação
 */
class ValidationMessage {
  public code: string;
  public message: string;
  public field: string | null;

  constructor(code: string, message: string, field: string | null = null) {
    this.code = code;
    this.message = message;
    this.field = field;
  }
}

/**
 * ✨ Classe de validação
 * Permite adicionar mensagens de erro e verificar se é válido
 * 
 * Exemplo de uso:
 * 
 * const validation = new Validation();
 * validation.add('ERR_FIELD', 'Campo obrigatório');
 * validation.add('email', 'ERR_FIELD', 'E-mail inválido');
 * 
 * if (!validation.isValid()) {
 *   throw validation;
 * }
 */
export class Validation {
  public messages: ValidationMessage[] = [];

  /**
   * ✨ Adiciona mensagem de validação
   * 
   * Formas de uso:
   * - add(message) - mensagem simples
   * - add(code, message) - com código
   * - add(field, code, message) - com campo específico
   */
  add(...args: any): void {
    let validation_message: ValidationMessage | null = null;

    // Caso 1: add(message) - mensagem simples
    if (args.length === 1) {
      validation_message = new ValidationMessage(
        VALIDATION_ERROR.ERR_UNKNOWN,
        args[0],
        null,
      );
    }

    // Caso 2: add(code, message) - com código
    if (args.length === 2) {
      const code = (args[0] as VALIDATION_ERROR) || VALIDATION_ERROR.ERR_UNKNOWN;
      const message = args[1];
      if (!!code && !!message) {
        validation_message = new ValidationMessage(code, message, null);
      }
    }

    // Caso 3: add(field, code, message) - com campo específico
    if (args.length === 3) {
      const field = args[0];
      const code = (args[1] as VALIDATION_ERROR) || VALIDATION_ERROR.ERR_UNKNOWN;
      const message = args[2];
      if (!!field && !!code && !!message) {
        validation_message = new ValidationMessage(code, message, field);
      }
    }

    if (validation_message) {
      this.messages.push(validation_message);
    }
  }

  /**
   * ✨ Verifica se a validação é válida (sem erros)
   */
  isValid(): boolean {
    return this.messages.length === 0;
  }

  /**
   * ✨ Retorna JSON das mensagens
   */
  getJSON(): string {
    return JSON.stringify(this.messages);
  }

  /**
   * ✨ Retorna mensagens formatadas como objeto
   * Útil para retornar erros de validação na API
   * 
   * Retorna: { campo: mensagem } ou { mensagem } se não tiver campo
   */
  getFormatted(): Record<string, string> {
    const formatted: Record<string, string> = {};
    
    this.messages.forEach((msg) => {
      if (msg.field) {
        formatted[msg.field] = msg.message;
      } else {
        formatted['_error'] = msg.message;
      }
    });
    
    return formatted;
  }

  /**
   * ✨ Retorna apenas as mensagens como array de strings
   */
  getMessages(): string[] {
    return this.messages.map((msg) => msg.message);
  }
}