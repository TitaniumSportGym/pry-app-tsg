import { router, useIsFocused } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { getMyProductOrders, type MyProductOrder } from '@/features/cart/api/my-product-orders-api';

export function useMyProductOrders() {
  const focused = useIsFocused();
  const [orders, setOrders] = useState<MyProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => { setRefreshing(true); setVersion((value) => value + 1); }, []);
  useEffect(() => {
    if (!focused) return;
    let cancelled = false;
    getMyProductOrders().then((result) => {
      if (cancelled) return;
      setOrders(result);
      setErrorMessage(null);
    }).catch(() => {
      if (!cancelled) setErrorMessage('No pudimos consultar tus pedidos. Inténtalo de nuevo.');
    }).finally(() => {
      if (!cancelled) {
        setLoading(false);
        setRefreshing(false);
      }
    });
    return () => { cancelled = true; };
  }, [focused, version]);

  return {
    orders,
    loading,
    refreshing,
    errorMessage,
    refresh,
    goBack() { if (router.canGoBack()) router.back(); else router.replace('/account'); },
    openStore() { router.push('/store'); },
  };
}
