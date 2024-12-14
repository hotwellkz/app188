import { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CategoryCardType } from '../types';

const CACHE_KEY = 'categories_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

export const useCategoryCache = () => {
  const [categories, setCategories] = useState<CategoryCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Проверяем кэш при монтировании
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        setCategories(data);
        setLoading(false);
        return;
      }
    }

    // Если кэш устарел или отсутствует, загружаем данные
    const q = query(collection(db, 'categories'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const categoriesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CategoryCardType[];

        // Сохраняем в кэш
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: categoriesData,
          timestamp: Date.now()
        }));

        setCategories(categoriesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error in categories subscription:', error);
        setError('Ошибка при загрузке данных');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { categories, loading, error };
};