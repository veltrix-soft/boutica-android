export type ApiErrorKind =
  | 'network' | 'timeout' | 'unauthorized'
  | 'validation' | 'conflict' | 'server' | 'unknown';

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

export function userMessage(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Une erreur inattendue est survenue.';
  switch (e.kind) {
    case 'network':
      return 'Pas de connexion. Vérifiez votre réseau.';
    case 'timeout':
      return 'Le serveur met trop de temps à répondre. Réessayez.';
    case 'unauthorized':
      return 'Session expirée. Reconnectez-vous.';
    case 'server':
      return `Erreur du serveur (code ${e.status ?? '?'}). Réessayez plus tard.`;
    default:
      return e.message;
  }
}