// framework/util/date-helper.ts
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

// ✨ Configura plugins do dayjs
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(customParseFormat);

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
  parse(dateString?: string | Date | dayjs.Dayjs, format?: string) {
    if (!dateString) return dayjs().tz(globalTimezone);
    if (format) {
      return dayjs.tz(dateString, format, globalTimezone);
    }
    return dayjs(dateString).tz(globalTimezone);
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

  /**
   * ✨ Formata para data (YYYY-MM-DD) - ideal para DATEONLY
   */
  toDateOnly(date?: Date | string | dayjs.Dayjs): string {
    return this.format(date || this.now(), 'YYYY-MM-DD');
  },

  /**
   * ✨ Formata para horário (HH:mm)
   */
  toTimeOnly(date?: Date | string | dayjs.Dayjs): string {
    return this.format(date || this.now(), 'HH:mm');
  },

  /**
   * ✨ Formata para timestamp ISO
   */
  toISO(date?: Date | string | dayjs.Dayjs): string {
    return dayjs(date).toISOString();
  },

  /**
   * ✨ Formata datetime para exibição brasileira (dd/MM/yyyy HH:mm)
   */
  toBrazilianDateTime(date: Date | string | dayjs.Dayjs): string {
    return this.format(date, 'DD/MM/YYYY HH:mm');
  },

  /**
   * ✨ Combina data + hora em um dayjs object
   */
  combine(date: string, time: string): dayjs.Dayjs {
    return this.parse(`${date} ${time}`, 'YYYY-MM-DD HH:mm');
  },

  /**
   * ✨ Adiciona minutos
   */
  addMinutes(date: Date | string | dayjs.Dayjs, minutes: number) {
    return this.parse(date).add(minutes, 'minute');
  },

  /**
   * ✨ Subtrai dias
   */
  subtractDays(date: Date | string | dayjs.Dayjs, days: number) {
    return this.parse(date).subtract(days, 'day');
  },

  /**
   * ✨ Início do mês
   */
  startOfMonth(date?: Date | string | dayjs.Dayjs) {
    return this.parse(date).startOf('month');
  },

  /**
   * ✨ Fim do mês
   */
  endOfMonth(date?: Date | string | dayjs.Dayjs) {
    return this.parse(date).endOf('month');
  },

  /**
   * ✨ Verifica se uma data é passado
   */
  isPast(date: Date | string | dayjs.Dayjs): boolean {
    return dayjs(date).isBefore(this.now());
  },

  /**
   * ✨ Verifica se uma data é futuro
   */
  isFuture(date: Date | string | dayjs.Dayjs): boolean {
    return dayjs(date).isAfter(this.now());
  },

  /**
   * ✨ Diferença em dias entre duas datas
   */
  diffInDays(
    date1: Date | string | dayjs.Dayjs,
    date2: Date | string | dayjs.Dayjs,
  ): number {
    return Math.abs(dayjs(date1).diff(dayjs(date2), 'day'));
  },

  /**
   * ✨ Diferença em horas
   */
  diffInHours(
    date1: Date | string | dayjs.Dayjs,
    date2: Date | string | dayjs.Dayjs,
  ): number {
    return Math.abs(dayjs(date1).diff(dayjs(date2), 'hour'));
  },

  /**
   * ✨ Diferença em minutos
   */
  diffInMinutes(
    date1: Date | string | dayjs.Dayjs,
    date2: Date | string | dayjs.Dayjs,
  ): number {
    return Math.abs(dayjs(date1).diff(dayjs(date2), 'minute'));
  },

  /**
   * ✨ Retorna array de datas entre duas datas
   */
  getDatesBetween(startDate: Date | string, endDate: Date | string): string[] {
    const dates: string[] = [];
    let current = dayjs(startDate);
    const end = dayjs(endDate);

    while (current.isSameOrBefore(end, 'day')) {
      dates.push(this.toDateOnly(current));
      current = current.add(1, 'day');
    }

    return dates;
  },

  /**
   * ✨ Retorna o dia da semana (0 = domingo, 6 = sábado)
   */
  getDayOfWeek(date: Date | string | dayjs.Dayjs): number {
    return dayjs(date).day();
  },

  /**
   * ✨ Converte para Date nativo (útil para Sequelize)
   */
  toNativeDate(date: Date | string | dayjs.Dayjs): Date {
    return dayjs(date).toDate();
  },
};

// ✨ Exporta dayjs caso precise usar diretamente
export { configureTimezone, dayjs };
