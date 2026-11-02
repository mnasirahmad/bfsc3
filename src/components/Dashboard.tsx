import React, { useEffect, useState } from 'react';
import { db } from '../services/db';
import { formatDate } from '../utils/dateUtils';
import {
  BookOpen,
  Package,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Clock,
  Building2,
  Phone,
  Sparkles
} from 'lucide-react';

interface DashboardProps {
  onNavigate?: (tab: string, ref?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>({
    totalAccounts: 0,
    totalProducts: 0,
    totalSales: 0,
    totalPurchases: 0,
    cashReceipts: 0,
    cashPayments: 0,
    todaysSales: 0,
    todaysPurchases: 0,
    cashBalance: 0,
    recentTransactions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await db.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-emerald-300 flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-semibold text-sm tracking-wide">Loading Baba Fareed Seed Corporation ERP...</p>
      </div>
    );
  }

  const kpiCards = [
    { title: 'Current Cash Balance', value: `PKR ${stats.cashBalance.toLocaleString()}`, icon: Wallet, color: 'bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-500/30' },
    { title: "Today's Sales", value: `PKR ${stats.todaysSales.toLocaleString()}`, icon: TrendingUp, color: 'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-cyan-500/30' },
    { title: "Today's Purchases", value: `PKR ${stats.todaysPurchases.toLocaleString()}`, icon: TrendingDown, color: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30' },
    { title: 'Total Sales', value: `PKR ${stats.totalSales.toLocaleString()}`, icon: ArrowUpRight, color: 'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/30' },
    { title: 'Total Purchases', value: `PKR ${stats.totalPurchases.toLocaleString()}`, icon: ArrowDownLeft, color: 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/30' },
    { title: 'Cash Receipts', value: `PKR ${stats.cashReceipts.toLocaleString()}`, icon: DollarSign, color: 'bg-gradient-to-br from-emerald-400 to-green-600 shadow-emerald-400/30' },
    { title: 'Cash Payments', value: `PKR ${stats.cashPayments.toLocaleString()}`, icon: DollarSign, color: 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/30' },
    { title: 'Chart of Accounts', value: stats.totalAccounts, icon: BookOpen, color: 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/30' },
    { title: 'Products & Varieties', value: stats.totalProducts, icon: Package, color: 'bg-gradient-to-br from-cyan-400 to-teal-600 shadow-cyan-400/30' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner with Lighting Colorful Styling */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-indigo-950 rounded-2xl p-6 text-white shadow-2xl border border-emerald-500/30 flex items-center justify-between flex-wrap gap-4 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -left-10 -top-10 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center space-x-4 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/90 backdrop-blur-md flex items-center justify-center p-1.5 shadow-xl border-2 border-emerald-400">
            <img src="/logoittehad.png" alt="Baba Fareed Seed Corporation" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest">Enterprise ERP System</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-wide uppercase text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-teal-200">
              BABA FAREED SEED CORPORATION
            </h2>
            <div className="flex items-center space-x-4 text-xs text-emerald-200 mt-1 flex-wrap gap-y-1">
              <span className="flex items-center space-x-1 bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-700/50">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>7-K.M MULTAN ROAD VEHARI</span>
              </span>
              <span className="flex items-center space-x-1 bg-emerald-900/60 px-2.5 py-1 rounded-lg border border-emerald-700/50">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>+92 300 3179077</span>
              </span>
            </div>
          </div>
        </div>
        <div className="text-right text-xs bg-emerald-900/80 backdrop-blur-md px-5 py-2.5 rounded-xl border border-emerald-600/40 shadow-lg relative z-10">
          <p className="text-emerald-300 uppercase font-semibold text-[10px]">Financial Year</p>
          <p className="text-sm font-black text-white">2026 - 2027</p>
        </div>
      </div>

      {/* KPI Cards Grid with Colorful Lighting */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-gray-100 shadow-lg hover:shadow-xl transition-all flex items-center justify-between group hover:-translate-y-0.5 duration-200"
            >
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{card.title}</p>
                <p className="text-xl sm:text-2xl font-black text-gray-900 mt-1 tracking-tight">{card.value}</p>
              </div>
              <div className={`w-14 h-14 rounded-2xl ${card.color} text-white flex items-center justify-center shadow-lg shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon className="w-7 h-7" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-emerald-700" />
            <h3 className="text-lg font-bold text-gray-900">Recent Transactions & Activity</h3>
          </div>
          <span className="text-xs text-gray-500 font-medium">Click on any reference number to view details</span>
        </div>
        {stats.recentTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="font-medium">No transactions recorded yet.</p>
            <p className="text-xs text-gray-400 mt-1">Add sales invoices, purchase invoices, or cash vouchers to see entries here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500 bg-gray-50">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Reference No</th>
                  <th className="py-3 px-4 text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {stats.recentTransactions.map((tx: any, idx: number) => {
                  let targetTab = 'sales_inv';
                  if (tx.type === 'Sale Invoice') targetTab = 'sales_inv';
                  else if (tx.type === 'Purchase Invoice') targetTab = 'purchase_inv';
                  else if (tx.type === 'CASH PAYMENT') targetTab = 'cpv';
                  else if (tx.type === 'CASH RECEIPT') targetTab = 'crv';
                  else if (tx.type === 'JOURNAL') targetTab = 'jv';
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-emerald-50/60 cursor-pointer transition-colors"
                      onClick={() => onNavigate && onNavigate(targetTab, tx.ref)}
                      title="Click to open this transaction"
                    >
                      <td className="py-3.5 px-4 text-gray-600 font-mono text-xs">{formatDate(tx.date)}</td>
                      <td className="py-3.5 px-4 font-semibold text-gray-800">
                        <span className="inline-flex px-2.5 py-1 text-xs rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-emerald-700 font-mono font-bold underline hover:text-emerald-900">
                        {tx.ref}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-gray-900 font-mono">
                        {tx.amount.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
