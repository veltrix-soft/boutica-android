import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../../config';
import { getToken } from '../../auth/tokenStorage';

export type ReportKind =
  | 'sales-excel'
  | 'sales-pdf'
  | 'inventory-excel'
  | 'inventory-pdf';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PDF = 'application/pdf';

const KINDS: Record<
  ReportKind,
  { path: string; mime: string; ext: string; name: string; period: boolean }
> = {
  'sales-excel': { path: '/api/v1/reports/sales/excel', mime: XLSX, ext: 'xlsx', name: 'ventes', period: true },
  'sales-pdf': { path: '/api/v1/reports/sales/pdf', mime: PDF, ext: 'pdf', name: 'rapport-ventes', period: true },
  'inventory-excel': { path: '/api/v1/reports/inventory/excel', mime: XLSX, ext: 'xlsx', name: 'inventaire', period: false },
  'inventory-pdf': { path: '/api/v1/reports/inventory/pdf', mime: PDF, ext: 'pdf', name: 'etat-stocks', period: false },
};

export async function downloadAndShare(
  kind: ReportKind,
  period?: { from: string; to: string },
): Promise<void> {
  const cfg = KINDS[kind];
  const token = await getToken();
  if (!token) throw new Error('Session expirée. Reconnectez-vous.');

  const query =
    cfg.period && period
      ? `?from=${encodeURIComponent(period.from)}&to=${encodeURIComponent(period.to)}`
      : '';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000); // le serveur peut être lent à se réveiller
  let response;
  try {
    response = await fetch(`${API_URL}${cfg.path}${query}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
  } catch {
    throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401) throw new Error('Session expirée. Reconnectez-vous.');
  if (!response.ok) {
    throw new Error(`Le serveur n'a pas pu générer le rapport (erreur ${response.status}).`);
  }

  const day = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `${cfg.name}-${day}.${cfg.ext}`);
  if (file.exists) file.delete();
  file.write(await response.bytes());

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: cfg.mime,
    dialogTitle: 'Partager le rapport',
  });
}