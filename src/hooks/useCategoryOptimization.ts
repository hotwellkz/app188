import { useState, useCallback, useEffect } from 'react';
import { CategoryCardType } from '../types';

interface CategoryOptimizationOptions {
  categories: CategoryCardType[];
  onCategoryClick?: (category: CategoryCardType) => void;
}

export const useCategoryOptimization = ({
  categories,
  onCategoryClick
}: CategoryOptimizationOptions) => {
  const [visibleCategories, setVisibleCategories] = useState<CategoryCardType[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Оптимизированная фильтрация категорий
  useEffect(() => {
    if (!isInitialized) {
      // При первой загрузке показываем все категории
      setVisibleCategories(categories);
      setIsInitialized(true);
    } else {
      // При обновлениях применяем плавную анимацию
      requestAnimationFrame(() => {
        setVisibleCategories(categories);
      });
    }
  }, [categories, isInitialized]);

  // Оптимизированный обработчик клика
  const handleCategoryClick = useCallback((category: CategoryCardType) => {
    // Предварительная загрузка данных категории
    const cacheKey = `category_${category.id}`;
    localStorage.setItem(cacheKey, JSON.stringify({
      data: category,
      timestamp: Date.now()
    }));

    onCategoryClick?.(category);
  }, [onCategoryClick]);

  // Оптимизация отображения сумм
  const formatCategoryAmount = useCallback((amount: string) => {
    const numericAmount = parseFloat(amount.replace(/[^\d.-]/g, ''));
    if (Math.abs(numericAmount) >= 1000000) {
      return `${(numericAmount / 1000000).toFixed(1)}M ₸`;
    }
    if (Math.abs(numericAmount) >= 1000) {
      return `${Math.round(numericAmount / 1000)}k ₸`;
    }
    return `${Math.round(numericAmount)} ₸`;
  }, []);

  return {
    visibleCategories,
    handleCategoryClick,
    formatCategoryAmount
  };
};