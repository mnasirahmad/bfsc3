import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  MapPin,
  Package,
  Building,
  Receipt,
  FileText,
  FileSpreadsheet,
  BarChart3,
  ShieldUser,
  ShoppingBag,
  RotateCcw,
  Factory,
  Database,
  Calendar
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'accounts'
  | 'staff'
  | 'territories'
  | 'products'
  | 'company'
  | 'cpv'
  | 'crv'
  | 'jv'
  | 'sales_inv'
  | 'purchase_inv'
  | 'sales_ret'
  | 'purchase_ret'
  | 'ledger'
  | 'product_ledger'
  | 'trial_balance'
  | 'sundry_debtors'
  | 'sales_report'
  | 'purchase_report'
  | 'sales_summary'
  | 'purchase_summary'
  | 'daily_transaction_report'
  | 'mysql_database'
  | 'users';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isAdmin: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isAdmin }) => {
  const [isHovered, setIsHovered] = useState(false);

  const menuGroups = [
    {
      title: 'Main',
      items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }]
    },
    {
      title: 'Masters & Setup',
      items: [
        { id: 'accounts', label: 'Chart of Accounts', icon: BookOpen },
        { id: 'products', label: 'Product & Seed Profile', icon: Package },
        { id: 'staff', label: 'Sales Staff Profile', icon: Users },
        { id: 'territories', label: 'Territory Profile', icon: MapPin },
        { id: 'company', label: 'Company Profile', icon: Building }
      ]
    },
    {
      title: 'Vouchers',
      items: [
        { id: 'cpv', label: 'Cash Payment Voucher', icon: Receipt },
        { id: 'crv', label: 'Cash Receipt Voucher', icon: Receipt },
        { id: 'jv', label: 'Journal Voucher', icon: FileSpreadsheet }
      ]
    },
    {
      title: 'Invoices & Returns',
      items: [
        { id: 'sales_inv', label: 'Sales Invoice', icon: ShoppingBag },
        { id: 'purchase_inv', label: 'Purchase Invoice', icon: ShoppingBag },
        { id: 'sales_ret', label: 'Sales Return', icon: RotateCcw },
        { id: 'purchase_ret', label: 'Purchase Return', icon: RotateCcw }
      ]
    },
    {
      title: 'Ledgers & Reports',
      items: [
        { id: 'ledger', label: 'Account Ledger', icon: FileText },
        { id: 'product_ledger', label: 'Product Stock Ledger', icon: Package },
        { id: 'trial_balance', label: 'Trial Balance', icon: BarChart3 },
        { id: 'sundry_debtors', label: 'Sundry Debtors List', icon: Users },
        { id: 'daily_transaction_report', label: 'Daily Transaction Report', icon: Calendar },
        { id: 'sales_report', label: 'Sales Report', icon: BarChart3 },
        { id: 'purchase_report', label: 'Purchase Report', icon: BarChart3 },
        { id: 'sales_summary', label: 'Sales Summary', icon: BarChart3 },
        { id: 'purchase_summary', label: 'Purchases Summary', icon: BarChart3 }
      ]
    },
    ...(isAdmin
      ? [
          {
            title: 'Administration',
            items: [
              { id: 'mysql_database', label: 'MySQL Database & Backup', icon: Database },
              { id: 'users', label: 'User Management', icon: ShieldUser }
            ]
          }
        ]
      : [])
  ];

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`bg-white/95 backdrop-blur-md border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto transition-all duration-300 z-20 shadow-lg ${
        isHovered ? 'w-64' : 'w-16'
      }`}
    >
      <div className="p-3 space-y-5">
        {menuGroups.map((group, idx) => (
          <div key={idx}>
            {isHovered && (
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 mb-1.5 px-3">
                {group.title}
              </p>
            )}
            <nav className="space-y-1">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as ActiveTab)}
                    title={!isHovered ? item.label : undefined}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md shadow-emerald-500/20'
                        : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-900'
                    } ${!isHovered ? 'justify-center px-0' : ''}`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-700'}`} />
                    {isHovered && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
      {isHovered && (
        <div className="mt-auto p-4 border-t border-gray-100 bg-emerald-50/50">
          <p className="text-xs text-gray-900 font-black">Baba Fareed Seed Corp</p>
          <p className="text-[10px] text-gray-600 mt-0.5 font-medium">7-K.M Multan Road Vehari</p>
          <p className="text-[10px] text-emerald-700 font-bold mt-0.5">+92 300 3179077</p>
        </div>
      )}
    </aside>
  );
};
