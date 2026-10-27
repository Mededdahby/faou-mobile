import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

function toDate(value: string | number | Date) {
  return value instanceof Date ? value : new Date(value);
}

/** Format cents as French MAD: 1 250,00 MAD */
export function formatMoney(cents = 0) {
  const value = Math.round(cents) / 100;
  const [integer, decimals] = value.toFixed(2).split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped},${decimals} MAD`;
}

export function formatDate(value: string | number | Date) {
  return format(toDate(value), "dd/MM/yyyy", { locale: fr });
}

export function formatDateTime(value: string | number | Date) {
  return format(toDate(value), "dd/MM/yyyy à HH:mm", { locale: fr });
}

export function timeAgo(value: string | number | Date) {
  return formatDistanceToNow(toDate(value), { addSuffix: true, locale: fr });
}
