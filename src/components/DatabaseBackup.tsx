import React, { useState, useEffect } from 'react';
import { UserProfile, DatabaseStatus } from '../types';
import { db } from '../services/db';
import { Database, Download, Upload, ShieldCheck, AlertTriangle, FileJson, HardDrive, CheckCircle2, Terminal } from 'lucide-react';

interface DatabaseBackupProps {
  currentUser: UserProfile;
  onOpenMySQLModal: () => void;
}

export const DatabaseBackupComponent: React.FC<DatabaseBackupProps> = ({ currentUser, onOpenMySQLModal }) => {
  const [stats, setStats] = useState({
    accounts: 0,
    products: 0,
    staff: 0,
    territories: 0,
    vouchers: 0,
    invoices: 0,
    users: 0
  });
  const [dbStatus, setDbStatus] = useState<DatabaseStatus>({ type: 'local', connected: false });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);

  useEffect(() => {
    loadStats();
    checkDb();
  }, []);

  const loadStats = async () => {
    try {
      const accounts = await db.getAccounts();
      const products = await db.getProducts();
      const staff = await db.getSalesStaff();
      const territories = await db.getTerritories();
      const vouchers = await db.getVouchers();
      const invoices = await db.getInvoices();
      const users = await db.getUsers();
      setStats({
        accounts: accounts.length,
        products: products.length,
        staff: staff.length,
        territories: territories.length,
        vouchers: vouchers.length,
        invoices: invoices.length,
        users: users.length
      });
    } catch (e) {
      console.error('Error loading stats:', e);
    }
  };

  const checkDb = async () => {
    const s = await db.getDatabaseStatus();
    setDbStatus(s);
  };

  const handleDownloadBackup = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const accounts = await db.getAccounts();
      const products = await db.getProducts();
      const staff = await db.getSalesStaff();
      const territories = await db.getTerritories();
      const companyProfile = await db.getCompanyProfile();
      const vouchers = await db.getVouchers();
      const invoices = await db.getInvoices();
      const users = await db.getUsers();

      const backupData = {
        version: '1.0',
        appName: 'Baba Fareed Seed Corporation ERP',
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser.username,
        data: {
          accounts,
          products,
          staff,
          territories,
          companyProfile,
          vouchers,
          invoices,
          users
        }
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute('download', `baba_fareed_seed_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setMessage({ type: 'success', text: 'Database backup downloaded successfully to your local drive!' });
    } catch (e: any) {
      setMessage({ type: 'error', text: `Failed to generate backup: ${e.message || e}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSqlSchema = async () => {
    const sql = await db.getMySQLSchema();
    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'baba_fareed_seed_mysql_schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage({ type: 'success', text: 'MySQL Schema SQL script downloaded successfully!' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRestoreFile(e.target.files[0]);
      setShowConfirmRestore(true);
      setMessage(null);
    }
  };

  const handleExecuteRestore = async () => {
    if (!restoreFile) return;
    try {
      setLoading(true);
      setMessage(null);
      const fileText = await restoreFile.text();
      const parsed = JSON.parse(fileText);
      const payload = parsed.data || parsed;
      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid backup file structure.');
      }

      const { accounts, products, staff, territories, companyProfile, vouchers, invoices, users } = payload;
      let restoredCounts = { accounts: 0, products: 0, staff: 0, territories: 0, vouchers: 0, invoices: 0, users: 0 };

      if (companyProfile) await db.saveCompanyProfile(companyProfile);
      if (Array.isArray(accounts)) {
        for (const acc of accounts) { await db.saveAccount(acc); restoredCounts.accounts++; }
      }
      if (Array.isArray(products)) {
        for (const prod of products) { await db.saveProduct(prod); restoredCounts.products++; }
      }
      if (Array.isArray(staff)) {
        for (const st of staff) { await db.saveSalesStaff(st); restoredCounts.staff++; }
      }
      if (Array.isArray(territories)) {
        for (const terr of territories) { await db.saveTerritory(terr); restoredCounts.territories++; }
      }
      if (Array.isArray(vouchers)) {
        for (const v of vouchers) { await db.saveVoucher(v); restoredCounts.vouchers++; }
      }
      if (Array.isArray(invoices)) {
        for (const inv of invoices) { await db.saveInvoice(inv); restoredCounts.invoices++; }
      }
      if (Array.isArray(users)) {
        for (const u of users) { await db.saveUser(u); restoredCounts.users++; }
      }

      await loadStats();
      setMessage({ type: 'success', text: 'Database restored successfully from backup file!' });
      setShowConfirmRestore(false);
      setRestoreFile(null);
    } catch (e: any) {
      setMessage({ type: 'error', text: `Failed to restore database: ${e.message || e}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
        <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shadow-inner">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-950">Database & Backup Management</h2>
              <p className="text-sm text-gray-500">MySQL backend status, JSON database snapshot, and local disk restoration</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onOpenMySQLModal}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>Configure MySQL Server</span>
            </button>
            <button
              onClick={handleDownloadSqlSchema}
              className="flex items-center space-x-1.5 bg-gray-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer shadow-md"
            >
              <Terminal className="w-4 h-4 text-emerald-300" />
              <span>Download MySQL .sql</span>
            </button>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${dbStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="font-bold text-gray-900">
              Active Engine: {dbStatus.connected ? `MySQL Server (${dbStatus.host}:${dbStatus.port})` : 'Local High-Speed Storage'}
            </span>
          </div>
          <span className="text-gray-500 font-mono">{dbStatus.message}</span>
        </div>

        {message && (
          <div
            className={`mt-4 p-4 rounded-2xl flex items-center space-x-3 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
            )}
            <span className="text-sm font-semibold">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="bg-gradient-to-br from-emerald-50/70 to-white rounded-2xl p-6 border border-emerald-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-emerald-900 font-bold text-lg mb-2">
                <Download className="w-5 h-5 text-emerald-700" />
                <h3>Export Database Backup</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Export all company records including Chart of Accounts, Products, Sales Staff, Territories, Company Profile,
                Vouchers, Invoices, and Users into a portable JSON backup file saved directly to your local drive.
              </p>
            </div>
            <button
              onClick={handleDownloadBackup}
              disabled={loading}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <HardDrive className="w-5 h-5" />
              <span>{loading ? 'Generating Backup...' : 'Download Backup File (.json)'}</span>
            </button>
          </div>

          <div className="bg-gradient-to-br from-amber-50/70 to-white rounded-2xl p-6 border border-amber-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-lg mb-2">
                <Upload className="w-5 h-5 text-amber-700" />
                <h3>Restore Database</h3>
              </div>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Restore your application database from a previously saved local JSON backup file. This will restore all
                accounts, vouchers, invoices, and catalog entries into the system.
              </p>
            </div>
            <div>
              <label className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer">
                <FileJson className="w-5 h-5" />
                <span>Select Backup File from Drive</span>
                <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>Current Database Statistics</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Accounts</p>
            <p className="text-2xl font-black text-gray-900 mt-1 font-mono">{stats.accounts}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Products</p>
            <p className="text-2xl font-black text-gray-900 mt-1 font-mono">{stats.products}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Invoices</p>
            <p className="text-2xl font-black text-gray-900 mt-1 font-mono">{stats.invoices}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Vouchers</p>
            <p className="text-2xl font-black text-gray-900 mt-1 font-mono">{stats.vouchers}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Sales Staff</p>
            <p className="text-2xl font-black text-gray-900 mt-1 font-mono">{stats.staff}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Territories</p>
            <p className="text-2xl font-black text-gray-900 mt-1 font-mono">{stats.territories}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Users</p>
            <p className="text-2xl font-black text-gray-900 mt-1 font-mono">{stats.users}</p>
          </div>
        </div>
      </div>

      {showConfirmRestore && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-emerald-500/20">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900">Confirm Database Restoration</h3>
            <p className="text-sm text-gray-600 text-center">
              You selected <span className="font-semibold text-gray-900">{restoreFile?.name}</span>. Restoring this backup
              will merge and update records in your database. Do you want to proceed?
            </p>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => {
                  setShowConfirmRestore(false);
                  setRestoreFile(null);
                }}
                disabled={loading}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRestore}
                disabled={loading}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                {loading ? 'Restoring...' : 'Yes, Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
