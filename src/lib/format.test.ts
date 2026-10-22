import {
  formatDateTime,
  saleStatusLabel,
  purchaseStatusLabel,
  returnStatusLabel,
  returnConditionLabel,
} from './format';

describe('formatDateTime', () => {
  it('formate une date valide en JJ/MM/AAAA HH:MM', () => {
    expect(formatDateTime('2026-10-20T15:42:00.000Z')).toMatch(
      /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/,
    );
  });
  it('affiche un tiret si la date est invalide', () => {
    expect(formatDateTime('pas une date')).toBe('—');
  });
});

describe('libellés de statuts', () => {
  it('traduit les statuts de vente', () => {
    expect(saleStatusLabel('COMPLETED')).toBe('Terminée');
    expect(saleStatusLabel('CANCELLED')).toBe('Annulée');
    expect(saleStatusLabel('DRAFT')).toBe('Brouillon');
  });
  it('traduit les statuts d’achat', () => {
    expect(purchaseStatusLabel('RECEIVED')).toBe('Reçu');
  });
  it('traduit les retours', () => {
    expect(returnStatusLabel('COMPLETED')).toBe('Terminé');
    expect(returnConditionLabel('RESTOCK')).toBe('Remis en stock');
    expect(returnConditionLabel('DAMAGED')).toBe('Endommagé');
  });
  it('laisse un statut inconnu tel quel', () => {
    expect(saleStatusLabel('INCONNU')).toBe('INCONNU');
  });
});