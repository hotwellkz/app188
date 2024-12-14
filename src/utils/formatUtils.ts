export const formatAmount = (amount: number): string => {
  if (typeof amount !== 'number') return '0 ₸';
  return Math.round(amount).toLocaleString('ru-RU') + ' ₸';
};

// Очистка кэша при необходимости
export const clearFormatCache = () => {
  // No longer needed since we're not caching
};