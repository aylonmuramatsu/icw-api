// framework/util/rules-common.ts
import { to_string } from './helper';

/**
 * ✨ Tipo de função de validação com propriedades opcionais
 */
type Rule = ((value: any, input?: any) => string | null) & {
  needsContext?: boolean;
  isOptional?: boolean;
  isDefault?: boolean;
  defaultValue?: any;
};

/**
 * ✨ Campo obrigatório
 */
export const required =
  (msg = 'Campo obrigatório'): Rule =>
  (v) =>
    !to_string(v, '') ? msg : null;

/**
 * ✨ Campo opcional - sempre válido
 */
export const optional = (): Rule => {
  const rule: any = (v: any) => null;
  rule.isOptional = true;
  return rule;
};

/**
 * ✨ Define valor default para campo
 */
export const default_value = <T = any>(value: T): Rule => {
  const rule: any = () => null;
  rule.isOptional = true;
  rule.isDefault = true;
  rule.defaultValue = value;
  return rule;
};

/**
 * ✨ Alias mais curto
 */
export const def = default_value;

/**
 * ✨ Valida apenas se o campo for informado (não vazio)
 */
export const optionalBut = (...rules: Rule[]): Rule => {
  return (value: any, input?: any) => {
    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (typeof value === 'string' && value.trim() === '');

    if (isEmpty) {
      return null; // Campo vazio = válido
    }

    // Campo foi informado, aplica todas as regras
    for (const rule of rules) {
      const error = rule.needsContext ? rule(value, input) : rule(value);
      if (error) {
        return error;
      }
    }

    return null;
  };
};

/**
 * ✨ Valida tamanho mínimo
 */
export const minLength =
  (len: number, msg?: string): Rule =>
  (v) =>
    v && v.length < len ? msg || `Mínimo ${len} caracteres` : null;

/**
 * ✨ Valida tamanho máximo
 */
export const maxLength =
  (len: number, msg?: string): Rule =>
  (v) =>
    v && v.length > len ? msg || `Máximo ${len} caracteres` : null;

/**
 * ✨ Valida e-mail
 */
export const email =
  (msg = 'E-mail inválido'): Rule =>
  (v) => {
    if (!v) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(v) ? msg : null;
  };

/**
 * ✨ Valida URL
 */
export const url =
  (msg = 'URL inválida'): Rule =>
  (v) => {
    if (!v) return null;
    try {
      new URL(v);
      return null;
    } catch {
      return msg;
    }
  };

/**
 * ✨ Valida número
 */
export const numeric =
  (msg = 'Deve ser numérico'): Rule =>
  (v) =>
    v && isNaN(Number(v)) ? msg : null;

/**
 * ✨ Valida valor mínimo
 */
export const min =
  (n: number, msg?: string): Rule =>
  (v) =>
    v !== undefined && v < n ? msg || `Mínimo: ${n}` : null;

/**
 * ✨ Valida valor máximo
 */
export const max =
  (n: number, msg?: string): Rule =>
  (v) =>
    v !== undefined && v > n ? msg || `Máximo: ${n}` : null;

/**
 * ✨ Valida array obrigatório
 */
export const array =
  (msg = 'Array obrigatório'): Rule =>
  (v) =>
    !Array.isArray(v) || !v.length ? msg : null;

/**
 * ✨ Campo obrigatório SE uma condição for verdadeira
 */
export const requiredIf = (
  condition: (input: any) => boolean,
  msg = 'Campo obrigatório',
): Rule => {
  const rule: any = (value: any, input: any) => {
    if (condition(input) && !to_string(value, '')) {
      return msg;
    }
    return null;
  };
  rule.needsContext = true;
  return rule;
};

/**
 * ✨ Campo obrigatório SE outro campo tiver um valor específico
 */
export const requiredWhen = (
  field: string,
  value: any | any[],
  msg = 'Campo obrigatório',
): Rule => {
  const rule: any = (fieldValue: any, input: any) => {
    const otherValue = input?.[field];
    const matches = Array.isArray(value)
      ? value.includes(otherValue)
      : otherValue === value;

    if (matches && !to_string(fieldValue, '')) {
      return msg;
    }
    return null;
  };
  rule.needsContext = true;
  return rule;
};

/**
 * ✨ Campo deve ser um dos valores permitidos
 */
export const requiredIn = <T = any>(
  allowedValues: T[],
  msg: string = 'Valor não permitido',
): Rule => {
  const rule: any = (value: any) => {
    if (!value && value !== 0 && value !== false) {
      return msg;
    }
    if (!allowedValues.includes(value)) {
      return msg;
    }
    return null;
  };
  return rule;
};

/**
 * ✨ Campo opcional, mas se informado deve ser um dos valores permitidos
 */
export const oneOf = <T = any>(
  allowedValues: T[],
  msg: string = 'Valor não permitido',
): Rule => {
  const rule: any = (value: any) => {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    if (!allowedValues.includes(value)) {
      return msg;
    }
    return null;
  };
  rule.isOptional = true;
  return rule;
};