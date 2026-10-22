
import { request } from '../../api/client';
import { Page, Variant } from '../products/api';

export type SaleInput = {
  customerId?: string;
  discount?: number;
  items: {
    variantId: string;
    quantity: number;
  }[];
};

export type Sale = {
  id: string;
  businessId: string;
  customerId: string | null;
  subtotal: string; // Le serveur renvoie les montants en texte
  discount: string;
  total: string;
  status: string;
};

export const searchVariants = (search: string) =>
  request<Page<Variant>>('/api/v1/variants', {
    query: {
      search,
      page: 1,
      pageSize: 20,
    },
  });

// La clé empêche qu'une même vente soit enregistrée deux fois
export const createSale = (
  input: SaleInput,
  idempotencyKey: string,
) =>
  request<Sale>('/api/v1/sales', {
    method: 'POST',
    body: input,
    idempotencyKey,
  });
  export type SaleRow = Sale & {
  createdAt: string;
};

export type SaleItem = {
  id: string;
  saleId: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
  costAtSale: string | null;
};

export type SaleDetail = SaleRow & {
  items: SaleItem[];
};

export const listSales = (page: number, customerId?: string) =>
  request<Page<SaleRow>>('/api/v1/sales', {
    query: { page, pageSize: 20, customerId },
  });
  

export const getSale = (id: string) =>
  request<SaleDetail>(`/api/v1/sales/${id}`);

// Sert à retrouver le nom des articles d'une vente (100 premiers articles)
export const listAllVariants = () =>
  request<Page<Variant>>('/api/v1/variants', {
    query: {
      page: 1,
      pageSize: 100,
    },
  });
