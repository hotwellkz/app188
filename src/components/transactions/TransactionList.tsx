import React, { useMemo } from 'react';
import { GroupedTransactions } from '../../types/transaction';
import { TransactionItem } from './TransactionItem';
import { formatDateHeader } from '../../utils/dateUtils';
import { formatAmount } from '../../utils/formatUtils';
import { useVirtualization } from '../../hooks/useVirtualization';

interface TransactionListProps {
  transactions: GroupedTransactions;
  swipedTransactionId: string | null;
  onDelete: (transactionId: string) => void;
  onWaybillClick: (transactionId: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  swipedTransactionId,
  onDelete,
  onWaybillClick
}) => {
  const calculateDailyTotal = (dayTransactions: any[]) => {
    return dayTransactions.reduce((total, transaction) => {
      return total + Math.abs(transaction.amount);
    }, 0);
  };

  const flattenedTransactions = useMemo(() => {
    return Object.entries(transactions).flatMap(([date, dayTransactions]) => {
      const dailyTotal = calculateDailyTotal(dayTransactions);
      return [
        { type: 'header', date, total: dailyTotal },
        ...dayTransactions.map(t => ({ type: 'transaction', ...t })),
        { type: 'footer', total: dailyTotal }
      ];
    });
  }, [transactions]);

  const { 
    containerRef,
    visibleItems,
    totalHeight,
    startIndex,
    getItemStyle,
    onScroll
  } = useVirtualization(flattenedTransactions, {
    itemHeight: 100,
    containerHeight: window.innerHeight - 200,
    overscan: 5
  });

  return (
    <div 
      ref={containerRef}
      onScroll={onScroll}
      className="overflow-auto"
      style={{ height: '100%' }}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {visibleItems.map((item, index) => {
          const actualIndex = startIndex + index;
          const style = getItemStyle(actualIndex);

          if (item.type === 'header') {
            return (
              <div key={`header-${item.date}`} style={style} className="bg-gray-100 px-4 py-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-600">
                    {formatDateHeader(item.date)}
                  </h3>
                  <span className="text-sm font-medium text-gray-900">
                    {formatAmount(item.total)}
                  </span>
                </div>
              </div>
            );
          }

          if (item.type === 'transaction') {
            return (
              <div key={item.id} style={style}>
                <TransactionItem
                  transaction={item}
                  isSwipedOpen={swipedTransactionId === item.id}
                  onDelete={() => onDelete(item.id)}
                  onWaybillClick={() => onWaybillClick(item.id)}
                />
              </div>
            );
          }

          if (item.type === 'footer') {
            return (
              <div key={`footer-${actualIndex}`} style={style} className="bg-gray-50 px-4 py-2 border-t">
                <div className="flex justify-end">
                  <span className="text-sm font-medium text-gray-500">
                    Итого за день: {formatAmount(item.total)}
                  </span>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};