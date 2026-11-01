import { describe, expect, it } from '@jest/globals';
import { default as Decimal } from 'decimal.js';
import { formatMoney, parseAmount, toDecimal } from './money';

describe('formatMoney', () => {
  it('sépare les milliers et cache les centimes à zéro', () => {
    expect(formatMoney('12500.00')).toBe('12 500 XOF');
    expect(formatMoney('1234567.00')).toBe('1 234 567 XOF');
  });
  it('garde les centimes quand il y en a', () => {
    expect(formatMoney('12500.50')).toBe('12 500,50 XOF');
  });
  it('affiche zéro correctement', () => {
    expect(formatMoney('0')).toBe('0 XOF');
  });
  it('gère un montant négatif (bénéfice négatif)', () => {
    expect(formatMoney('-5000.00')).toBe('-5 000 XOF');
  });
  it("affiche un tiret quand la valeur est absente, jamais un faux zéro", () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney('')).toBe('—');
  });
  it('accepte une autre devise', () => {
    expect(formatMoney('1000', 'EUR')).toBe('1 000 EUR');
  });
});

describe('toDecimal', () => {
  it('renvoie null pour une valeur absente', () => {
    expect(toDecimal(null)).toBeNull();
  });
  it('calcule sans erreur de virgule', () => {
    const sum = (toDecimal('0.1') as Decimal).plus(toDecimal('0.2') as Decimal);
    expect(sum.toString()).toBe('0.3');
  });
});

describe('parseAmount', () => {
  it('lit les montants valides, avec espaces et virgule', () => {
    expect(parseAmount('500')?.toFixed(2)).toBe('500.00');
    expect(parseAmount('12 500,50')?.toFixed(2)).toBe('12500.50');
    expect(parseAmount('15000.5')?.toFixed(2)).toBe('15000.50');
  });
  it('refuse les montants invalides', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('12.345')).toBeNull(); // 3 décimales
  });
});