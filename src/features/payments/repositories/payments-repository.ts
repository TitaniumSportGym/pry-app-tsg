import {
  repositoryCache,
  type ReadOptions,
  type RepositoryCache,
} from '@/core/repository/repository-cache';
import { getMyPaymentHistory, getMyPayments } from '@/features/payments/api/payments-api';
import type { Payment } from '@/features/payments/models/payment';
import type { PaymentHistoryEntry } from '@/features/payments/models/payment-history';

/** Short: a pending payment can be approved by Mercado Pago at any moment. */
const PAYMENTS_TTL_MS = 60_000;

export const PAYMENT_KEYS = {
  all: 'payments',
  recent: 'payments:recent',
  history: 'payments:history',
} as const;

export interface PaymentsRepository {
  /** First page of payments, newest first (home's "último pago"). */
  getRecentPayments(options?: ReadOptions): Promise<Payment[]>;
  /** Every payment with the name of what was paid. */
  getHistory(options?: ReadOptions): Promise<PaymentHistoryEntry[]>;
  /** Call after a purchase: the next read goes to the server and open screens reload. */
  invalidate(): void;
}

export interface PaymentsDataSource {
  getMyPayments(): Promise<Payment[]>;
  getMyPaymentHistory(): Promise<PaymentHistoryEntry[]>;
}

const DEFAULT_DATA_SOURCE: PaymentsDataSource = { getMyPayments, getMyPaymentHistory };

export function createPaymentsRepository(
  dataSource: PaymentsDataSource = DEFAULT_DATA_SOURCE,
  cache: RepositoryCache = repositoryCache,
): PaymentsRepository {
  return {
    getRecentPayments: (options = {}) =>
      cache.read(PAYMENT_KEYS.recent, () => dataSource.getMyPayments(), {
        ...options,
        ttlMs: PAYMENTS_TTL_MS,
      }),
    getHistory: (options = {}) =>
      cache.read(PAYMENT_KEYS.history, () => dataSource.getMyPaymentHistory(), {
        ...options,
        ttlMs: PAYMENTS_TTL_MS,
      }),
    invalidate: () => cache.invalidate(PAYMENT_KEYS.all),
  };
}

export const paymentsRepository = createPaymentsRepository();
