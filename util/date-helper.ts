// framework/util/date-helper.ts
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// ✨ Configura plugins essenciais
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * ✨ Configuração global de timezone
 */
let globalTimezone: string = 'America/Sao_Paulo';

/**
 * ✨ Configura o timezone
 */
function configureTimezone(timezone: string): void {
  globalTimezone = timezone;
}

/**
 * ✨ Helper de datas - API simples e direta
 */
export const dateHelper = {
  /**
   * ✨ Agora (no timezone configurado)
   */
  now() {
    return dayjs().tz(globalTimezone);
  },

  /**
   * ✨ Parse de data (aceita string, Date, ou dayjs)
   */
  parse(date?: string | Date | dayjs.Dayjs) {
    if (!date) return dayjs().tz(globalTimezone);
    return dayjs(date).tz(globalTimezone);
  },

  /**
   * ✨ Formata data
   */
  format(date: string | Date | dayjs.Dayjs, pattern = 'YYYY-MM-DD') {
    return this.parse(date).format(pattern);
  },

  /**
   * ✨ Para salvar no banco (converte para UTC)
   */
  toDB(date: string | Date | dayjs.Dayjs): Date {
    return this.parse(date).utc().toDate();
  },

  /**
   * ✨ Do banco (converte de UTC para timezone local)
   */
  fromDB(date: Date | string): dayjs.Dayjs {
    return dayjs(date).tz(globalTimezone);
  },

  /**
   * ✨ Valida se é data válida
   */
  isValid(date: any): boolean {
    return dayjs(date).isValid();
  },

  /**
   * ✨ Comparações simples
   */
  isBefore(date1: any, date2: any): boolean {
    return this.parse(date1).isBefore(this.parse(date2));
  },

  isAfter(date1: any, date2: any): boolean {
    return this.parse(date1).isAfter(this.parse(date2));
  },

  isToday(date: any): boolean {
    return this.parse(date).isSame(this.now(), 'day');
  },

  /**
   * ✨ Operações comuns
   */
  addDays(date: any, days: number) {
    return this.parse(date).add(days, 'day');
  },

  addHours(date: any, hours: number) {
    return this.parse(date).add(hours, 'hour');
  },

  startOfDay(date?: any) {
    return this.parse(date).startOf('day');
  },

  endOfDay(date?: any) {
    return this.parse(date).endOf('day');
  },

  /**
   * ✨ Formatações úteis
   */
  toDate(date?: any): string {
    return this.format(date, 'YYYY-MM-DD');
  },

  toDateTime(date?: any): string {
    return this.format(date, 'YYYY-MM-DD HH:mm:ss');
  },

  toBrazilian(date?: any): string {
    return this.format(date, 'DD/MM/YYYY');
  },
};

// ✨ Exporta dayjs caso precise usar diretamente
export { configureTimezone, dayjs };
