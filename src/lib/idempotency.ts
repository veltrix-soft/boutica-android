import * as Crypto from 'expo-crypto';

// Une clé par tentative de soumission d'un formulaire, réutilisée si on réessaie
export const newIdempotencyKey = () => Crypto.randomUUID();