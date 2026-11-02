import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Account, AccountType, SalesStaff, UserProfile } from '../types';
import { BookOpen, Plus, Search, Edit, Trash2, X } from 'lucide-react';

export const ChartOfAccounts: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [staffList, setStaffList] = useState<SalesStaff[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [parentAccount, setParentAccount] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('Assets');
  const [salesStaff, setSalesStaff] = useState('');
  const [phone, setPhone] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [openingBalanceType, setOpeningBalanceType] = useState<'Dr' | 'Cr'>('Dr');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const list = await db.getAccounts();
      const staff = await db.getSalesStaff();
      setAccounts(Array.isArray(list) ? list : []);
      setStaffList(Array.isArray(staff) ? staff : []);
    } catch (e) {
      console.error('Error loading accounts:', e);
      setAccounts([]);
      setStaffList([]);
    }
  };

  const handleOpenModal = (acc?: Account) => {
    if (acc) {
      setEditingAccount(acc);
      setCode(acc.code);
      setName(acc.name);
      setParentAccount(acc.parentAccount || '');
      setAccountType(acc.accountType);
      setSalesStaff(acc.salesStaff || '');
      setPhone(acc.phone || '');
      setOpeningBalance(acc.openingBalance);
      setOpeningBalanceType(acc.openingBalanceType);
      setDescription(acc.description || '');
      setActive(acc.active);
    } else {
      setEditingAccount(null);
      // Auto-generate account code
      const existingCodes = accounts.map(a => a.code);
      let maxNum = 1000;
      existingCodes.forEach(codeStr => {
        const digits = codeStr.replace(/\D/g, '');
        if (digits) {
          const num = parseInt(digits, 10);
          if (!isNaN(num) && num > maxNum && num < 90000) {
            maxNum = num;
          }
        }
      });
      const nextNum = maxNum + 1;
      setCode(String(nextNum));
      setName('');
      setParentAccount('');
      setAccountType('Assets');
      setSalesStaff('');
      setPhone('');
      setOpeningBalance(0);
      setOpeningBalanceType('Dr');
      setDescription('');
      setActive(true);
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAccount: Account = {
      id: editingAccount ? editingAccount.id : `acc_${Date.now()}`,
      code: code.trim(),
      name: name.trim(),
      parentAccount: parentAccount || undefined,
      accountType,
      salesStaff: (accountType === 'Expenses' || accountType === 'Revenue' || accountType === 'Cash/Banks') ? undefined : (salesStaff || undefined),
      phone: phone || undefined,
      openingBalance: Number(openingBalance),
      openingBalanceType,
      description: description || undefined,
      active,
      createdAt: editingAccount ? editingAccount.createdAt : new Date().toISOString()
    };
    try {
      await db.saveAccount(newAccount);
      setShowModal(false);
      loadAccounts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (currentUser.role !== 'ADMIN') {
      alert('Normal users are not allowed to delete accounts.');
      return;
    }
    if (confirm('Are you sure you want to delete this account?')) {
      try {
        await db.deleteAccount(id);
        loadAccounts();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const filteredAccounts = accounts.filter(
    a =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.accountType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Chart of Accounts</h2>
          <p className="text-sm text-gray-500">Manage hierarchical ledger accounts across assets, liabilities, equity, revenue, expenses, and cash/banks</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Account</span>
        </button>
      </div>

      <div className="flex items-center space-x-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by account code, name, or type..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-gray-300 focus:border-emerald-600 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-bold uppercase text-gray-500 bg-gray-50/80">
              <th className="py-3.5 px-4">Code</th>
              <th className="py-3.5 px-4">Account Name</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Parent Account</th>
              <th className="py-3.5 px-4 text-right">Opening Balance</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  No accounts found. Click "Add Account" to create one.
                </td>
              </tr>
            ) : (
              filteredAccounts.map(acc => (
                <tr key={acc.id} className="hover:bg-emerald-50/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">{acc.code}</td>
                  <td className="py-3.5 px-4 font-bold text-gray-900">{acc.name}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {acc.accountType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">{acc.parentAccount || 'Primary Head'}</td>
                  <td className="py-3.5 px-4 text-right font-bold font-mono text-gray-900">
                    {acc.openingBalance.toLocaleString()} {acc.openingBalanceType}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                        acc.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {acc.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {(currentUser.role === 'ADMIN' || !editingAccount) && (
                      <button
                        onClick={() => handleOpenModal(acc)}
                        className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                        title="Edit Account"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/20">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingAccount ? 'Edit Account' : 'Add New Account'}</h3>
              <button onClick={() => setShowModal(false)} className="text-emerald-200 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Account Code (Auto)</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono font-bold bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Account Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Account Type</label>
                  <select
                    value={accountType}
                    onChange={e => {
                      const val = e.target.value as AccountType;
                      setAccountType(val);
                      if (val === 'Expenses' || val === 'Revenue' || val === 'Cash/Banks') {
                        setSalesStaff('');
                      }
                    }}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden bg-white font-semibold"
                  >
                    <option value="Assets">Assets</option>
                    <option value="Liabilities">Liabilities</option>
                    <option value="Equity">Equity</option>
                    <option value="Revenue">Revenue</option>
                    <option value="Expenses">Expenses</option>
                    <option value="Cash/Banks">Cash/Banks</option>
                    <option value="General Ledgers">General Ledgers</option>
                  </select>
                </div>
                {!(accountType === 'Expenses' || accountType === 'Revenue' || accountType === 'Cash/Banks') && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Sales Staff</label>
                    <select
                      value={salesStaff}
                      onChange={e => setSalesStaff(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden bg-white"
                    >
                      <option value="">Select Sales Staff (Optional)...</option>
                      {staffList.map(s => (
                        <option key={s.id} value={s.staffName}>
                          {s.staffCode} - {s.staffName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Phone / Mobile</label>
                <input
                  type="text"
                  placeholder="e.g. +92 300 3179077"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Opening Balance</label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingBalance}
                    onChange={e => setOpeningBalance(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Balance Type</label>
                  <select
                    value={openingBalanceType}
                    onChange={e => setOpeningBalanceType(e.target.value as 'Dr' | 'Cr')}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden bg-white font-bold"
                  >
                    <option value="Dr">Debit (Dr)</option>
                    <option value="Cr">Credit (Cr)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Description / Remarks</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md cursor-pointer"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
