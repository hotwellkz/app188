import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Trash2, FileText, Calendar, Filter } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatTime } from '../utils/dateUtils';
import { formatAmount } from '../utils/formatUtils';
import { useSwipeable } from 'react-swipeable';
import { showErrorNotification, showSuccessNotification } from '../utils/notifications';
import { PasswordPrompt } from '../components/PasswordPrompt';
import { ExpenseWaybill } from '../components/warehouse/ExpenseWaybill';
import { IncomeWaybill } from '../components/warehouse/IncomeWaybill';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Transaction {
  id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description: string;
  date: any;
  type: 'income' | 'expense';
  categoryId: string;
  isSalary?: boolean;
  isCashless?: boolean;
  waybillNumber?: string;
  waybillData?: any;
}

export const TransactionHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryTitle, setCategoryTitle] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [swipedTransactionId, setSwipedTransactionId] = useState<string | null>(null);
  const [showWaybill, setShowWaybill] = useState(false);
  const [isHistoryPasswordPromptOpen, setIsHistoryPasswordPromptOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [transactionType, setTransactionType] = useState<'all' | 'income' | 'expense'>('all');
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalSalary, setTotalSalary] = useState(0);
  const [totalWarehouse, setTotalWarehouse] = useState(0);

  const handlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      const element = eventData.event.target as HTMLElement;
      const transactionElement = element.closest('[data-transaction-id]');
      if (transactionElement) {
        const transactionId = transactionElement.getAttribute('data-transaction-id');
        if (transactionId) {
          setSwipedTransactionId(transactionId === swipedTransactionId ? null : transactionId);
        }
      }
    },
    onSwipedRight: () => {
      setSwipedTransactionId(null);
    },
    trackMouse: true,
    delta: 10
  });
  
  const calculateTotals = useCallback((transactionsList: Transaction[]) => {
    const totals = transactionsList.reduce(
      (acc, transaction) => {
        const amount = Math.abs(transaction.amount);
        
        // Calculate salary total
        if (transaction.isSalary) {
          acc.salary += amount;
        }
        
        // Calculate warehouse total (transactions with waybillNumber)
        if (transaction.waybillNumber) {
          acc.warehouse += amount;
        }

        // Calculate regular income/expense totals
        if (transaction.type === 'income') {
          acc.income += amount;
        } else {
          acc.expense += amount;
        }
        return acc;
      },
      { income: 0, expense: 0, salary: 0, warehouse: 0 }
    );
    setTotalIncome(totals.income);
    setTotalExpense(totals.expense);
    setTotalSalary(totals.salary);
    setTotalWarehouse(totals.warehouse);
  }, []);

  useEffect(() => {
    if (!categoryId) return;

    const q = query(
      collection(db, 'transactions'),
      where('categoryId', '==', categoryId),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Transaction[];
      
      calculateTotals(transactionsData);
      
      if (transactionsData.length > 0) {
        setCategoryTitle(transactionsData[0].fromUser);
        // Check if this is the salary category
        if (transactionsData[0].fromUser === 'ЗП Сот.') {
          setIsHistoryPasswordPromptOpen(true);
        }
      }
      
      setTransactions(transactionsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [categoryId]);

  const handleDelete = async (isAuthenticated: boolean) => {
    if (!isAuthenticated || !selectedTransaction) {
      setShowPasswordPrompt(false);
      setSelectedTransaction(null);
      return;
    }

    try {
      const batch = writeBatch(db);
      
      // Delete the transaction
      const transactionRef = doc(db, 'transactions', selectedTransaction.id);
      batch.delete(transactionRef);

      // Find and delete the related transaction
      const relatedTransactionsQuery = query(
        collection(db, 'transactions'),
        where('relatedTransactionId', '==', selectedTransaction.id)
      );
      
      const relatedTransactionsSnapshot = await getDocs(relatedTransactionsQuery);
      relatedTransactionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      showSuccessNotification('Операция успешно удалена');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showErrorNotification('Ошибка при удалении операции');
    } finally {
      setShowPasswordPrompt(false);
      setSelectedTransaction(null);
      setSwipedTransactionId(null);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (transactionType === 'all') return true;
    return transaction.type === transactionType;
  });

  const handleDeleteClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowPasswordPrompt(true);
  };

  const handleWaybillClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowWaybill(true);
  };

  if (isHistoryPasswordPromptOpen) {
    return (
      <PasswordPrompt
        isOpen={true}
        onClose={() => navigate(-1)}
        onSuccess={() => setIsHistoryPasswordPromptOpen(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Шапка */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => navigate(-1)} className="mr-4">
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                {categoryTitle}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">История операций</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMonthPicker(true)}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
              >
                <Calendar className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-full hover:bg-gray-100"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Фильтры */}
        {showFilters && (
          <div className="border-t px-4 py-3 bg-gray-50">
            <div className="flex gap-2">
              <button
                onClick={() => setTransactionType('all')}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  transactionType === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 border'
                }`}
              >
                Все
              </button>
              <button
                onClick={() => setTransactionType('income')}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  transactionType === 'income'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white text-gray-600 border'
                }`}
              >
                Приходы
              </button>
              <button
                onClick={() => setTransactionType('expense')}
                className={`px-3 py-1.5 rounded-full text-sm ${
                  transactionType === 'expense'
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-gray-600 border'
                }`}
              >
                Расходы
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Статистика */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="space-y-4">
            {/* Зарплата и склад */}
            <div className="grid grid-cols-2 gap-4">
              {totalSalary > 0 && (
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-emerald-600 mb-1">Зарплата</p>
                  <p className="text-lg sm:text-xl font-semibold text-emerald-700">
                    {formatAmount(totalSalary)}
                  </p>
                </div>
              )}
              {totalWarehouse > 0 && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600 mb-1">Склад</p>
                  <p className="text-lg sm:text-xl font-semibold text-blue-700">
                    {formatAmount(totalWarehouse)}
                  </p>
                </div>
              )}
            </div>
            
            {/* Общие приходы и расходы */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50/50 rounded-lg p-3">
                <p className="text-xs text-emerald-600 mb-1">Приходы</p>
                <p className="text-lg sm:text-xl font-semibold text-emerald-700">
                  +{formatAmount(totalIncome)}
                </p>
              </div>
              <div className="bg-red-50/50 rounded-lg p-3">
                <p className="text-xs text-red-600 mb-1">Расходы</p>
                <p className="text-lg sm:text-xl font-semibold text-red-700">
                  -{formatAmount(totalExpense)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Список транзакций */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
        <div className="space-y-4" {...handlers}>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">История операций пуста</h3>
              <p className="text-gray-500">Здесь будут отображаться все операции</p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                data-transaction-id={transaction.id}
                className={`relative overflow-hidden rounded-lg ${
                  transaction.isSalary ? 'bg-emerald-50' :
                  transaction.isCashless ? 'bg-purple-50' :
                  transaction.waybillNumber ? 'bg-blue-50' :
                  'bg-white'
                }`}
              >
                <div
                  className={`absolute inset-y-0 right-0 w-16 bg-red-500 flex items-center justify-center transition-opacity duration-200 ${
                    swipedTransactionId === transaction.id ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <button
                    onClick={() => handleDeleteClick(transaction)}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>

                <div
                  className={`p-4 transition-transform ${
                    swipedTransactionId === transaction.id ? '-translate-x-16' : 'translate-x-0'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {transaction.type === 'income' ? (
                          <ArrowUpRight className={`w-5 h-5 ${
                            transaction.isSalary ? 'text-emerald-600' :
                            transaction.isCashless ? 'text-purple-600' :
                            transaction.waybillNumber ? 'text-blue-600' :
                            'text-emerald-500'
                          }`} />
                        ) : (
                          <ArrowDownRight className={`w-5 h-5 ${
                            transaction.isSalary ? 'text-emerald-600' :
                            transaction.isCashless ? 'text-purple-600' :
                            transaction.waybillNumber ? 'text-blue-600' :
                            'text-red-500'
                          }`} />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm sm:text-base">
                          {transaction.fromUser}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">
                          {transaction.toUser}
                        </div>
                        {transaction.waybillNumber && (
                          <button
                            onClick={() => handleWaybillClick(transaction)}
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
                        transaction.waybillNumber ? 'text-blue-600' :
                        transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'} {formatAmount(transaction.amount)}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 mt-1">
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
            ))
          )}
        </div>
      </div>
      
      {/* Модальное окно выбора месяца */}
      {showMonthPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Выберите месяц</h2>
              <button onClick={() => setShowMonthPicker(false)} className="text-gray-500">
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>
            
            <div className="text-center mb-4">
              <div className="text-lg font-medium">
                {format(selectedMonth, 'LLLL yyyy', { locale: ru })}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }, (_, i) => {
                const date = new Date();
                date.setMonth(i);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedMonth(date);
                      setShowMonthPicker(false);
                    }}
                    className={`p-2 rounded-lg text-sm ${
                      selectedMonth.getMonth() === i
                        ? 'bg-emerald-500 text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {format(date, 'LLLL', { locale: ru })}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showPasswordPrompt && (
        <PasswordPrompt
          isOpen={showPasswordPrompt}
          onClose={() => {
            setShowPasswordPrompt(false);
            setSelectedTransaction(null);
          }}
          onSuccess={() => handleDelete(true)}
        />
      )}

      {showWaybill && selectedTransaction?.waybillData && (
        selectedTransaction.type === 'expense' ? (
          <ExpenseWaybill
            isOpen={showWaybill}
            onClose={() => {
              setShowWaybill(false);
              setSelectedTransaction(null);
            }}
            data={selectedTransaction.waybillData}
          />
        ) : (
          <IncomeWaybill
            isOpen={showWaybill}
            onClose={() => {
              setShowWaybill(false);
              setSelectedTransaction(null);
            }}
            data={selectedTransaction.waybillData}
          />
        )
      )}
    </div>
  );
};