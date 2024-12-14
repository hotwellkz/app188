import { useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction } from '../types/transaction';

const CACHE_PREFIX = 'transactions_';
const CACHE_DURATION = 2 * 60 * 1000; // 2 минуты для более частого обновления
const BATCH_SIZE = 30; // Уменьшаем размер загружаемой партии для быстрой загрузки

export const useTransactionPreloader = () => {
  const preloadTransactions = useCallback(async (categoryId: string) => {
    // Проверяем кэш
    const cacheKey = `${CACHE_PREFIX}${categoryId}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return; // Используем кэшированные данные
      }
    }

    try {
      // Загружаем первые 30 транзакций
      const q = query(
        collection(db, 'transactions'),
        where('categoryId', '==', categoryId),
        orderBy('date', 'desc'),
        limit(BATCH_SIZE)
      );

      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];

      // Сохраняем в кэш
      localStorage.setItem(cacheKey, JSON.stringify({
        data: transactions,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error preloading transactions:', error);
    }
  }, []);

  const clearCache = useCallback((categoryId: string) => {
    const cacheKey = `${CACHE_PREFIX}${categoryId}`;
    localStorage.removeItem(cacheKey);
  }, []);

  return { preloadTransactions, clearCache };
};