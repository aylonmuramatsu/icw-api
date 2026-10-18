// framework/util/helper.ts

/**
 * ✨ Converte valor para string, ou retorna default se vazio/nulo/undefined
 */
export function to_string(
  value: any,
  defaultValue: string | null = null,
): string | null {
  if (value === undefined || value === null || value === '')
    return defaultValue ?? null;
  return String(value);
}

/**
 * ✨ Converte valor para number, ou retorna default se vazio/nulo/undefined
 */
export function to_number(
  value: any,
  defaultValue: number | null = null,
): number | null {
  if (value === undefined || value === null || value === '')
    return defaultValue ?? null;
  const num = Number(value);
  return isNaN(num) ? (defaultValue ?? null) : num;
}

/**
 * ✨ Converte valor para boolean, ou retorna default se vazio/nulo/undefined
 */
export function to_boolean(
  value: any,
  defaultValue: boolean | null = null,
): boolean | null {
  if (value === undefined || value === null || value === '')
    return defaultValue ?? null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return Boolean(value);
}

/**
 * ✨ Converte valor para string no formato YYYY-MM-DD, ou retorna default se inválido
 */
export function to_date(
  value: any,
  defaultValue: string | null = null,
): string | null {
  if (!value) return defaultValue ?? null;
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return defaultValue ?? null;
    return date.toISOString().split('T')[0];
  } catch {
    return defaultValue ?? null;
  }
}

/**
 * ✨ Converte valor para string no formato YYYY-MM-DD HH:mm:ss, ou retorna default se inválido
 */
export function to_datetime(
  value: any,
  defaultValue: string | null = null,
): string | null {
  if (!value) return defaultValue ?? null;
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return defaultValue ?? null;
    return date.toISOString().replace('T', ' ').split('.')[0];
  } catch {
    return defaultValue ?? null;
  }
}

/**
 * ✨ Formata número como moeda
 */
export function to_money(
  value: number,
  {
    currency = 'BRL',
    locale = 'pt-BR',
    showSymbol = true,
  }: { currency?: string; locale?: string; showSymbol?: boolean } = {},
): string {
  if (typeof value !== 'number' || isNaN(value)) return '';
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };
  let formatted = value.toLocaleString(locale, options);
  if (!showSymbol) {
    formatted = formatted
      .replace(new RegExp(`^\\s*[^\\d\\s]+\\s*|\\s*[^\\d\\s]+\\s*$`, 'g'), '')
      .trim();
  }
  return formatted;
}