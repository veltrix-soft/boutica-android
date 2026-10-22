import { request } from '../../api/client';
import { Page } from '../products/api';

export type Expense = {
  id: string;
  businessId: string;
  category: string;
  description: string | null;
  amount: string; // le serveur renvoie les montants en texte
  createdAt: string;
};

export const listExpenses = (page: number) =>
  request<Page<Expense>>('/api/v1/expenses', {
    query: { page, pageSize: 20 },
  });

export const createExpense = (input: {
  category: string;
  amount: number;
  description?: string;
}) => request<Expense>('/api/v1/expenses', { method: 'POST', body: input });