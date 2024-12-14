import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaction } from '../types/transaction';

const CACHE_PREFIX = 'transactions_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут
const BATCH_SIZE = 30;

export const useTransactionCache = (categoryId: string | null) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  // Загрузка начальных данных
  useEffect(() => {
    if (!categoryId) return;

    const loadInitialData = async () => {
      try {
        // Проверяем кэш
        const cacheKey = `${CACHE_PREFIX}${categoryId}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setTransactions(data);
            setLoading(false);
            return;
          }
        }

        // Загружаем свежие данные
        const q = query(
          collection(db, 'transactions'),
          where('categoryId', '==', categoryId),
          orderBy('date', 'desc'),
          limit(BATCH_SIZE)
        );

        const snapshot = await getDocs(q);
        const docs = snapshot.docs;
        
        if (docs.length < BATCH_SIZE) {
          setHasMore(false);
        }

        if (docs.length > 0) {
          setLastDoc(docs[docs.length - 1]);
        }

        const transactionsData = docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];

        // Сохраняем в кэш
        localStorage.setItem(cacheKey, JSON.stringify({
          data: transactionsData,
          timestamp: Date.now()
        }));

        setTransactions(transactionsData);
      } catch (error) {
        console.error('Error loading transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [categoryId]);

  // Загрузка следующей партии данных
  const loadMore = useCallback(async () => {
    if (!categoryId || !hasMore || !lastDoc) return;

    try {
      const q = query(
        collection(db, 'transactions'),
        where('categoryId', '==', categoryId),
        orderBy('date', 'desc'),
        startAfter(lastDoc),
        limit(BATCH_SIZE)
      );

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;

      if (docs.length < BATCH_SIZE) {
        setHasMore(false);
      }

      if (docs.length > 0) {
        setLastDoc(docs[docs.length - 1]);
        
        const newTransactions = docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];

        setTransactions(prev => [...prev, ...newTransactions]);
      }
    } catch (error) {
      console.error('Error loading more transactions:', error);
    }
  }, [categoryId, hasMore, lastDoc]);

  // Очистка кэша
  const clearCache = useCallback((categoryId: string) => {
    const cacheKey = `${CACHE_PREFIX}${categoryId}`;
    localStorage.removeItem(cacheKey);
  }, []);

  return {
    transactions,
    loading,
    hasMore,
    loadMore,
    clearCache
  };
};