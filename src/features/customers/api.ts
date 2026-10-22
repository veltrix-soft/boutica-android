import { request } from '../../api/client';
import { Page } from '../products/api';

export type Customer = {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  createdAt: string;
};

export const listCustomers = (page: number) =>
  request<Page<Customer>>('/api/v1/customers', {
    query: { page, pageSize: 20 },
  });

export const getCustomer = (id: string) =>
  request<Customer>(`/api/v1/customers/${id}`);

export const createCustomer = (input: { name: string; phone?: string }) =>
  request<Customer>('/api/v1/customers', { method: 'POST', body: input });
// Sert au choix du client dans une vente (100 premiers clients)
export const listCustomerOptions = () =>
  request<Page<Customer>>('/api/v1/customers', {
    query: { page: 1, pageSize: 100 },
  });
  