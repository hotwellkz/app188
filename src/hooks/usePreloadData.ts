import { useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const PRELOAD_BATCH_SIZE = 10;

export const usePreloadData = () => {
  useEffect(() => {
    const preloadCategories = async () => {
      try {
        // Предварительно загружаем только основные категории
        const q = query(
          collection(db, 'categories'),
          where('row', 'in', [1, 2]), // Только клиенты и сотрудники
          limit(PRELOAD_BATCH_SIZE)
        );
        
        await getDocs(q);
      } catch (error) {
        console.error('Error preloading categories:', error);
      }
    };

    // Запускаем предварительную загрузку после монтирования
    preloadCategories();
  }, []);
};