import { request } from '../../api/client';

export type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  status: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Page<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
};

export const listProducts = (page: number) =>
  request<Page<Product>>('/api/v1/products', {
    query: { page, pageSize: 20 },
  });
  export type NewProduct = {
  name: string;
  description?: string;
  category?: string;
  brand?: string;
};

export const createProduct = (input: NewProduct) =>
  request<Product>('/api/v1/products', {
    method: 'POST',
    body: input,
  });
  export type Variant = {
  id: string;
  productId: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  purchasePrice: string; // Le serveur renvoie les montants en texte
  sellingPrice: string;
  quantity: number;
};

export const getProduct = (id: string) =>
  request<Product>(`/api/v1/products/${id}`);

export const listVariants = (productId: string, page: number) =>
  request<Page<Variant>>(
    `/api/v1/products/${productId}/variants`,
    {
      query: { page, pageSize: 20 },
    },
  );
  export type NewVariant = {
  sku: string;
  name: string;
  purchasePrice: number;
  sellingPrice: number;
};

export const addVariant = (productId: string, input: NewVariant) =>
  request<Variant>(`/api/v1/products/${productId}/variants`, {
    method: 'POST',
    body: input,
  });
  export type Stock = {
  variantId: string;
  businessId: string;
  quantity: number;
};

export const getStock = (variantId: string) =>
  request<Stock>(`/api/v1/inventory/${variantId}`);

// quantity = le NOUVEAU stock total (pas une variation)
export const adjustStock = (
  variantId: string,
  input: { quantity: number; note?: string },
) =>
  request<Stock>(
    `/api/v1/inventory/${variantId}/adjust`,
    {
      method: 'POST',
      body: input,
    },
  );
