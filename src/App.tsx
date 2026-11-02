/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserProfile, CompanyProfileData } from './types';
import { db, DEFAULT_COMPANY_PROFILE } from './services/db';
import { Login } from './components/Login';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ChartOfAccounts } from './components/ChartOfAccounts';
import { SalesStaffComponent } from './components/SalesStaff';
import { TerritoryComponent } from './components/Territory';
import { ProductProfileComponent } from './components/ProductProfile';
import { CompanyProfileComponent } from './components/CompanyProfile';
import { VouchersComponent } from './components/Vouchers';
import { InvoicesComponent } from './components/Invoices';
import { LedgersComponent } from './components/Ledgers';
import { ReportsComponent } from './components/Reports';
import { TrialBalanceComponent } from './components/TrialBalance';
import { SundryDebtorsComponent } from './components/SundryDebtors';
import { DailyTransactionReportComponent } from './components/DailyTransactionReport';
import { UserManagement } from './components/UserManagement';
import { DatabaseBackupComponent } from './components/DatabaseBackup';
import { MySQLSetupModal } from './components/MySQLSetupModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('fareed_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [companyProfile, setCompanyProfile] = useState<CompanyProfileData>(DEFAULT_COMPANY_PROFILE);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [navTarget, setNavTarget] = useState<{ tab: ActiveTab; ref?: string } | null>(null);
  const [isMySQLModalOpen, setIsMySQLModalOpen] = useState(false);
  const [dbConnected, setDbConnected] = useState<boolean>(true);
  const [dbStatusMessage, setDbStatusMessage] = useState<string>('');

  useEffect(() => {
    checkConnection();
    loadCompanyProfile();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    try {
      const status = await db.getDatabaseStatus();
      setDbConnected(status.connected);
      setDbStatusMessage(status.message || '');
    } catch (e: any) {
      setDbConnected(false);
      setDbStatusMessage(e?.message || 'Backend database not connected');
    }
  };

  const loadCompanyProfile = async () => {
    try {
      const profile = await db.getCompanyProfile();
      setCompanyProfile(profile);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem('fareed_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('fareed_current_user');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-900 to-indigo-950 text-white">
        <Login onLoginSuccess={handleLoginSuccess} onOpenMySQLModal={() => setIsMySQLModalOpen(true)} />
        <MySQLSetupModal
          isOpen={isMySQLModalOpen}
          onClose={() => setIsMySQLModalOpen(false)}
          onConfigured={loadCompanyProfile}
        />
      </div>
    );
  }

  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-950 flex flex-col font-sans text-gray-900">
      <Navbar
        currentUser={currentUser}
        companyProfile={companyProfile}
        onLogout={handleLogout}
        onOpenMySQLModal={() => setIsMySQLModalOpen(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} />
        <main className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-gray-50/95 to-emerald-50/40">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <Dashboard
                onNavigate={(tab, ref) => {
                  setActiveTab(tab as ActiveTab);
                  if (ref) setNavTarget({ tab: tab as ActiveTab, ref });
                }}
              />
            )}
            {activeTab === 'accounts' && <ChartOfAccounts currentUser={currentUser} />}
            {activeTab === 'staff' && <SalesStaffComponent currentUser={currentUser} />}
            {activeTab === 'territories' && <TerritoryComponent currentUser={currentUser} />}
            {activeTab === 'products' && <ProductProfileComponent currentUser={currentUser} />}
            {activeTab === 'company' && (
              <CompanyProfileComponent currentUser={currentUser} onProfileUpdated={setCompanyProfile} />
            )}
            {activeTab === 'cpv' && <VouchersComponent currentUser={currentUser} defaultType="CASH_PAYMENT" />}
            {activeTab === 'crv' && <VouchersComponent currentUser={currentUser} defaultType="CASH_RECEIPT" />}
            {activeTab === 'jv' && <VouchersComponent currentUser={currentUser} defaultType="JOURNAL" />}
            {activeTab === 'sales_inv' && (
              <InvoicesComponent
                currentUser={currentUser}
                defaultType="SALES_CREDIT"
                initialInvoiceNo={navTarget?.tab === 'sales_inv' ? navTarget.ref : undefined}
              />
            )}
            {activeTab === 'purchase_inv' && (
              <InvoicesComponent
                currentUser={currentUser}
                defaultType="PURCHASE_CREDIT"
                initialInvoiceNo={navTarget?.tab === 'purchase_inv' ? navTarget.ref : undefined}
              />
            )}
            {activeTab === 'sales_ret' && (
              <InvoicesComponent
                currentUser={currentUser}
                defaultType="SALES_RETURN"
                initialInvoiceNo={navTarget?.tab === 'sales_ret' ? navTarget.ref : undefined}
              />
            )}
            {activeTab === 'purchase_ret' && (
              <InvoicesComponent
                currentUser={currentUser}
                defaultType="PURCHASE_RETURN"
                initialInvoiceNo={navTarget?.tab === 'purchase_ret' ? navTarget.ref : undefined}
              />
            )}
            {activeTab === 'ledger' && <LedgersComponent />}
            {activeTab === 'product_ledger' && <LedgersComponent />}
            {activeTab === 'trial_balance' && <TrialBalanceComponent />}
            {activeTab === 'sundry_debtors' && <SundryDebtorsComponent />}
            {activeTab === 'daily_transaction_report' && <DailyTransactionReportComponent />}
            {activeTab === 'sales_report' && <ReportsComponent defaultReport="sales" />}
            {activeTab === 'purchase_report' && <ReportsComponent defaultReport="purchase" />}
            {activeTab === 'sales_summary' && <ReportsComponent defaultReport="summary" />}
            {activeTab === 'purchase_summary' && <ReportsComponent defaultReport="purchase-summary" />}
            {activeTab === 'mysql_database' && isAdmin && (
              <DatabaseBackupComponent currentUser={currentUser} onOpenMySQLModal={() => setIsMySQLModalOpen(true)} />
            )}
            {activeTab === 'users' && isAdmin && <UserManagement currentUser={currentUser} />}
          </div>
        </main>
      </div>
      <MySQLSetupModal
        isOpen={isMySQLModalOpen}
        onClose={() => setIsMySQLModalOpen(false)}
        onConfigured={loadCompanyProfile}
      />
    </div>
  );
}
