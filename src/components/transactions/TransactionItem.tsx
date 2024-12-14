import React, { memo, useCallback } from 'react';
import { ArrowUpRight, ArrowDownRight, FileText } from 'lucide-react';
import { Transaction } from '../../types/transaction';
import { formatTime } from '../../utils/dateUtils';
import { formatAmount } from '../../utils/formatUtils';

interface TransactionItemProps {
  transaction: Transaction;
  onDelete: () => void;
  onWaybillClick: () => void;
  isSwipedOpen: boolean;
}

export const TransactionItem = memo<TransactionItemProps>(({
  transaction,
  onDelete,
  onWaybillClick,
  isSwipedOpen
}) => {
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  }, [onDelete]);

  const handleWaybillClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onWaybillClick();
  }, [onWaybillClick]);

  return (
    <div className={`relative overflow-hidden ${
      transaction.isSalary ? 'bg-emerald-50' :
      transaction.isCashless ? 'bg-purple-50' :
      'bg-white'
    }`}>
      <div
        className={`absolute inset-y-0 right-0 w-16 bg-red-500 flex items-center justify-center 
        transition-opacity duration-200 ${isSwipedOpen ? 'opacity-100' : 'opacity-0'}`}
      >
        <button
          onClick={handleDelete}
          className="w-full h-full flex items-center justify-center"
        >
          <Trash2 className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className={`p-4 transition-transform ${
        isSwipedOpen ? '-translate-x-16' : 'translate-x-0'
      }`}>
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              {transaction.type === 'income' ? (
                <ArrowUpRight className={`w-5 h-5 ${
                  transaction.isSalary ? 'text-emerald-600' :
                  transaction.isCashless ? 'text-purple-600' :
                  'text-emerald-500'
                }`} />
              ) : (
                <ArrowDownRight className={`w-5 h-5 ${
                  transaction.isSalary ? 'text-emerald-600' :
                  transaction.isCashless ? 'text-purple-600' :
                  'text-red-500'
                }`} />
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900">{transaction.fromUser}</div>
              <div className="text-sm text-gray-500">{transaction.toUser}</div>
              {transaction.waybillNumber && (
                <button
                  onClick={handleWaybillClick}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <FileText className="w-4 h-4" />
                  Накладная №{transaction.waybillNumber}
                </button>
              )}
              <div className="text-xs text-gray-400 mt-1">
                {formatTime(transaction.date)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`font-medium ${
              transaction.isSalary ? 'text-emerald-600' :
              transaction.isCashless ? 'text-purple-600' :
              transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {transaction.type === 'income' ? '+' : '-'} {formatAmount(transaction.amount)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {transaction.description}
            </div>
            <div className="flex gap-1 mt-1 justify-end">
              {transaction.isSalary && (
                <div className="text-xs text-emerald-600 font-medium px-1.5 py-0.5 bg-emerald-50 rounded">
                  ЗП
                </div>
              )}
              {transaction.isCashless && (
                <div className="text-xs text-purple-600 font-medium px-1.5 py-0.5 bg-purple-50 rounded">
                  Безнал
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Оптимизация ре-рендеринга
  return (
    prevProps.transaction.id === nextProps.transaction.id &&
    prevProps.isSwipedOpen === nextProps.isSwipedOpen &&
    prevProps.transaction.amount === nextProps.transaction.amount
  );
});

TransactionItem.displayName = 'TransactionItem';