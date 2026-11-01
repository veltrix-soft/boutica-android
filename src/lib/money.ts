import { default as Decimal } from 'decimal.js';

// L'API renvoie les montants en chaînes ("12500.00")
export const toDecimal = (v: string | number | null | undefined) =>
  v === null || v === undefined || v === '' ? null : new Decimal(v);

export function formatMoney(
  v: string | number | null | undefined,
  currency = 'XOF',
): string {
  const d = toDecimal(v);

  if (!d) return '—'; // valeur absente : on n'invente pas un 0

  const [int, dec] = d.toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return `${grouped}${dec === '00' ? '' : ',' + dec} ${currency}`;
}
// "12 500,50" -> Decimal, ou null si le montant est invalide
export function parseAmount(raw: string): Decimal | null {
  const t = raw.replace(/\s/g, '').replace(',', '.');

  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;

  return new Decimal(t);
}