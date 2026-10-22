import { request } from '../../api/client';
import { Page } from '../products/api';

export type PurchaseInput = {
  supplierId?: string;
  items: { variantId: string; quantity: number; unitPrice: number }[];
};

export type Purchase = {
  id: string;
  businessId: string;
  supplierId: string | null;
  status: string;
  total: string; // le serveur renvoie les montants en texte
  createdAt: string;
};

// La clé empêche qu'un même achat soit enregistré deux fois
export const receivePurchase = (input: PurchaseInput, idempotencyKey: string) =>
  request<Purchase>('/api/v1/purchases/receive', {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
  export type PurchaseItem = {
  id: string;
  purchaseId: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
};

export type PurchaseDetail = Purchase & { items: PurchaseItem[] };

export const listPurchases = (page: number) =>
  request<Page<Purchase>>('/api/v1/purchases', {
    query: { page, pageSize: 20 },
  });

export const getPurchase = (id: string) =>
  request<PurchaseDetail>(`/api/v1/purchases/${id}`);