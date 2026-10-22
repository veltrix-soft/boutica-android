// "2026-10-20T15:42:00.000Z" -> "20/10/2026 16:42" (heure de ton téléphone)
export function formatDateTime(iso: string): string {
  const d = new Date(iso);

  if (isNaN(d.getTime())) return '—';

  const p = (n: number) => String(n).padStart(2, '0');

  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function saleStatusLabel(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'Terminée';

    case 'CANCELLED':
      return 'Annulée';

    case 'DRAFT':
      return 'Brouillon';

    default:
      return status;
  }
}
export function purchaseStatusLabel(status: string): string {
  switch (status) {
    case 'RECEIVED': return 'Reçu';
    case 'CANCELLED': return 'Annulé';
    case 'DRAFT': return 'Brouillon';
    default: return status;
  }
}
export function returnStatusLabel(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'Terminé';
    case 'CANCELLED': return 'Annulé';
    default: return status;
  }
}

export function returnConditionLabel(condition: string): string {
  switch (condition) {
    case 'RESTOCK': return 'Remis en stock';
    case 'DAMAGED': return 'Endommagé';
    default: return condition;
  }
}