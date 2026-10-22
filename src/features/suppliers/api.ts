import { request } from '../../api/client';
import { Page } from '../products/api';

export type Supplier = {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
};

export const listSuppliers = (page: number) =>
  request<Page<Supplier>>('/api/v1/suppliers', {
    query: { page, pageSize: 20 },
  });

export const createSupplier = (input: { name: string; phone?: string }) =>
  request<Supplier>('/api/v1/suppliers', { method: 'POST', body: input });
// Sert au choix du fournisseur dans un achat (100 premiers fournisseurs)
export const listSupplierOptions = () =>
  request<Page<Supplier>>('/api/v1/suppliers', {
    query: { page: 1, pageSize: 100 },
  });