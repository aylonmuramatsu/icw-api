// framework/util/query-filter.ts

/**
 * ✨ Filtra input e retorna objeto where
 * 
 * Exemplo:
 * 
 * const where = filter(input, {
 *   name: (value) => ({ name: { [Op.like]: `%${value}%` } }),
 *   status: (value) => ({ status: value }),
 *   age: (value) => ({ age: { [Op.gte]: Number(value) } }),
 * });
 */
export function filter(
  input: Record<string, any>,
  filters: Record<string, (value: any, input: any) => any>,
  baseWhere: any = {},
): any {
  const where = { ...baseWhere };

  Object.entries(filters).forEach(([field, filterFn]) => {
    const value = input[field];
    
    // ✨ Só aplica se valor existe
    if (value !== undefined && value !== null && value !== '') {
      const result = filterFn(value, input);
      if (result) {
        Object.assign(where, result);
      }
    }
  });

  return where;
}

/**
 * ✨ Filtro condicional (baseado no input completo)
 * 
 * Exemplo:
 * 
 * const where = conditionalFilter(input, [
 *   (input) => input.is_admin ? { user_type: 'admin' } : null,
 *   (input) => input.only_today ? { date: today() } : null,
 * ]);
 */
export function conditionalFilter(
  input: Record<string, any>,
  conditions: Array<(input: any) => any>,
  baseWhere: any = {},
): any {
  const where = { ...baseWhere };

  conditions.forEach((conditionFn) => {
    const result = conditionFn(input);
    if (result) {
      Object.assign(where, result);
    }
  });

  return where;
}

/**
 * ✨ Combina filtros simples + condicionais
 * 
 * Exemplo:
 * 
 * const where = prepareFilter(input, {
 *   filters: {
 *     name: (value) => ({ name: { [Op.like]: `%${value}%` } }),
 *     status: (value) => ({ status: value }),
 *   },
 *   conditions: [
 *     (input) => input.is_admin ? { user_type: 'admin' } : null,
 *   ],
 *   baseWhere: { active: true },
 * });
 */
export function prepareFilter(
  input: Record<string, any>,
  options: {
    filters?: Record<string, (value: any, input: any) => any>;
    conditions?: Array<(input: any) => any>;
    baseWhere?: any;
  } = {},
): any {
  const { filters = {}, conditions = [], baseWhere = {} } = options;

  let where = filter(input, filters, baseWhere);
  where = conditionalFilter(input, conditions, where);

  return where;
}