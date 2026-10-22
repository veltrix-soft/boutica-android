import { request } from '../../api/client';
import { Page } from '../products/api';

export type ReturnCondition = 'RESTOCK' | 'DAMAGED';

export type ReturnInput = {
  saleId: string;
  reason?: string;
  items: { saleItemId: string; quantity: number; condition: ReturnCondition }[];
};

export type ReturnRow = {
  id: string;
  saleId: string;
  status: string;
  total: string; // texte, calculé par le serveur
  reason: string | null;
  createdAt: string;
};

export type ReturnItem = {
  id: string;
  returnId: string;
  saleItemId: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
  condition: string;
};

export type ReturnDetail = ReturnRow & { items: ReturnItem[] };

export const createReturn = (input: ReturnInput, idempotencyKey: string) =>
  request<ReturnRow>('/api/v1/returns', {
    method: 'POST',
    body: input,
    idempotencyKey,
  });

export const listReturns = (page: number, saleId?: string, pageSize = 20) =>
  request<Page<ReturnRow>>('/api/v1/returns', {
    query: saleId ? { page, pageSize, saleId } : { page, pageSize },
  });

export const getReturn = (id: string) =>
  request<ReturnDetail>(`/api/v1/returns/${id}`);