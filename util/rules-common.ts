// framework/util/rules-common.ts

import { dateHelper } from "./date-helper";
import { to_string } from "./helper";

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
  (msg = "Campo obrigatório"): Rule =>
  (v) =>
    !to_string(v, "") ? msg : null;

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
      value === "" ||
      (typeof value === "string" && value.trim() === "");

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
  (msg = "E-mail inválido"): Rule =>
  (v) => {
    if (!v) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(v) ? msg : null;
  };

/**
 * ✨ Valida URL
 */
export const url =
  (msg = "URL inválida"): Rule =>
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
  (msg = "Deve ser numérico"): Rule =>
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
  (msg = "Array obrigatório"): Rule =>
  (v) =>
    !Array.isArray(v) || !v.length ? msg : null;

/**
 * ✨ Campo obrigatório SE uma condição for verdadeira
 */
export const requiredIf = (
  condition: (input: any) => boolean,
  msg = "Campo obrigatório"
): Rule => {
  const rule: any = (value: any, input: any) => {
    if (condition(input) && !to_string(value, "")) {
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
  msg = "Campo obrigatório"
): Rule => {
  const rule: any = (fieldValue: any, input: any) => {
    const otherValue = input?.[field];
    const matches = Array.isArray(value)
      ? value.includes(otherValue)
      : otherValue === value;

    if (matches && !to_string(fieldValue, "")) {
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
  msg: string = "Valor não permitido"
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
  msg: string = "Valor não permitido"
): Rule => {
  const rule: any = (value: any) => {
    if (value === undefined || value === null || value === "") {
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

/**
 * ✨ Alias mais descritivo para optionalBut
 */
export const validateIfPresent = optionalBut;

/**
 * ✨ Campo proibido SE uma condição for verdadeira
 */
export const forbiddenIf = (
  condition: (input: any) => boolean,
  msg = "Campo não permitido neste contexto"
): Rule => {
  const rule: any = (value: any, input: any) => {
    if (condition(input) && to_string(value, "")) {
      return msg;
    }
    return null;
  };
  rule.needsContext = true;
  return rule;
};

/**
 * ✨ Valida apenas se outra condição for verdadeira
 */
export const validateIf = (
  condition: (input: any) => boolean,
  ...rules: Rule[]
): Rule => {
  const rule: any = (value: any, input: any) => {
    if (!condition(input)) {
      return null;
    }
    for (const r of rules) {
      const error = r.needsContext ? r(value, input) : r(value);
      if (error) return error;
    }
    return null;
  };
  rule.needsContext = true;
  return rule;
};

/**
 * ✨ Valida tamanho mínimo de array
 */
export const minItems =
  (len: number, msg?: string): Rule =>
  (v) => {
    if (v === undefined || v === null || v === "") return null;
    if (!Array.isArray(v)) return "Deve ser um array";
    return v.length < len
      ? msg || `Mínimo de ${len} item${len > 1 ? "ns" : ""}`
      : null;
  };

/**
 * ✨ Valida tamanho máximo de array
 */
export const maxItems =
  (len: number, msg?: string): Rule =>
  (v) => {
    if (v === undefined || v === null || v === "") return null;
    if (!Array.isArray(v)) return "Deve ser um array";
    return v.length > len
      ? msg || `Máximo de ${len} item${len > 1 ? "ns" : ""}`
      : null;
  };

/**
 * ✨ Valida que o array não está vazio (alias mais semântico)
 */
export const notEmptyArray =
  (msg = "Deve conter pelo menos um item"): Rule =>
  (v) => {
    if (v === undefined || v === null || v === "") return null;
    if (!Array.isArray(v)) return "Deve ser um array";
    return v.length === 0 ? msg : null;
  };

/**
 * ✨ Valida tamanho exato do array
 */
export const exactItems =
  (len: number, msg?: string): Rule =>
  (v) => {
    if (v === undefined || v === null || v === "") return null;
    if (!Array.isArray(v)) return "Deve ser um array";
    return v.length !== len
      ? msg || `Deve conter exatamente ${len} item${len > 1 ? "ns" : ""}`
      : null;
  };

/**
 * ✨ Valida range de tamanho do array
 */
export const betweenItems =
  (min: number, max: number, msg?: string): Rule =>
  (v) => {
    if (v === undefined || v === null || v === "") return null;
    if (!Array.isArray(v)) return "Deve ser um array";
    if (v.length < min || v.length > max) {
      return msg || `Deve conter entre ${min} e ${max} itens`;
    }
    return null;
  };

/**
 * ✨ Valida que é um array obrigatório e não vazio
 */
export const requiredArray =
  (msg = "Campo obrigatório"): Rule =>
  (v) => {
    if (v === undefined || v === null) return msg;
    if (!Array.isArray(v)) return "Deve ser um array";
    if (v.length === 0) return msg;
    return null;
  };

/**
 * Valida se é uma data válida (YYYY-MM-DD)
 */
export const dateValid =
  (msg = "Data inválida"): Rule =>
  (v) => {
    if (!v) return null;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(v)) return msg;
    if (!dateHelper.isValid(v)) return msg;
    return null;
  };

/**
 * Valida se a data não é passado
 */
export const dateFuture =
  (msg = "Data deve ser futura"): Rule =>
  (v) => {
    if (!v) return null;
    if (!dateHelper.isValid(v)) return "Data inválida";
    if (dateHelper.isBefore(v, dateHelper.now())) return msg;
    return null;
  };

/**
 * Valida se a data não é futuro (aceita hoje e passado)
 */
export const datePast =
  (msg = "Data deve ser passada"): Rule =>
  (v) => {
    if (!v) return null;
    if (!dateHelper.isValid(v)) return "Data inválida";
    if (dateHelper.isAfter(v, dateHelper.now())) return msg;
    return null;
  };

/**
 * Valida se o horário é válido (HH:mm)
 */
export const timeValid =
  (msg = "Horário inválido (use HH:mm)"): Rule =>
  (v) => {
    if (!v) return null;
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(v)) return msg;
    return null;
  };

/**
 * Valida se datetime combinado é futuro
 */
export const datetimeFuture = (
  dateField: string,
  timeField: string,
  msg = "Data/hora deve ser futura"
): Rule => {
  const rule: Rule = (v, input) => {
    if (!input) return null;
    const date = input[dateField];
    const time = input[timeField];

    if (!date || !time) return null;

    const combined = dateHelper.combine(date, time);
    if (dateHelper.isBefore(combined, dateHelper.now())) return msg;
    return null;
  };
  rule.needsContext = true;
  return rule;
};

/**
 * Valida se uma data é maior que outra
 */
export const dateAfter = (
  otherField: string,
  msg = "Data deve ser posterior"
): Rule => {
  const rule: Rule = (v, input) => {
    if (!v || !input) return null;
    const otherValue = input[otherField];
    if (!otherValue) return null;

    if (dateHelper.isBefore(v, otherValue)) return msg;
    return null;
  };
  rule.needsContext = true;
  return rule;
};

/**
 * ✨ Valida se é um arquivo válido do multer
 */
export const file = (
  options: {
    maxSize?: number;
    allowedMimes?: string[];
    msg?: string;
  } = {}
): Rule => {
  const { maxSize, allowedMimes, msg } = options;

  const rule: any = (value: any) => {
    if (!value || typeof value !== "object") {
      return msg || "Arquivo inválido";
    }

    if (
      !value.fieldname &&
      !value.originalname &&
      !value.buffer &&
      !value.path
    ) {
      return msg || "Arquivo inválido";
    }

    if (maxSize && value.size && value.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      return msg || `Arquivo muito grande. Máximo: ${maxSizeMB}MB`;
    }

    if (allowedMimes && allowedMimes.length > 0) {
      if (!value.mimetype || !allowedMimes.includes(value.mimetype)) {
        const allowedTypes = allowedMimes
          .map((m) => m.split("/")[1])
          .join(", ");
        return (
          msg || `Tipo de arquivo não permitido. Permitidos: ${allowedTypes}`
        );
      }
    }

    return null;
  };

  return rule;
};

/**
 * ✨ Valida se é uma imagem válida (alias para file com MIME types de imagem)
 */
export const image = (
  options: {
    maxSize?: number;
    msg?: string;
  } = {}
): Rule => {
  return file({
    ...options,
    allowedMimes: [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ],
  });
};
