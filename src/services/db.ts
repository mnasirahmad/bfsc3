import {
  UserProfile,
  Account,
  SalesStaff,
  Territory,
  Product,
  CompanyProfileData,
  Voucher,
  Invoice,
  MySQLConfig,
  DatabaseStatus
} from '../types';

export const DEFAULT_COMPANY_PROFILE: CompanyProfileData = {
  companyName: 'BABA FAREED SEED CORPORATION',
  headOfficeAddress: '7-K.M MULTAN ROAD VEHARI',
  phone: '+92 300 3179077',
  mobile: '+92 300 3179077',
  email: 'info@babafareedseed.com',
  website: 'www.babafareedseed.com',
  ntn: '3179077-9',
  strn: '31-00-3179-077-11',
  logoUrl: '/assets/aistudio/images__8__3a2e714f.jfif',
  financialYear: '2026-2027',
  invoiceFooter: 'Certified Seeds verified under Punjab Seed Corporation & FSC&RD standards. Goods once sold will not be accepted without valid batch verification.',
  reportFooter: 'Computer generated official document. Baba Fareed Seed Corporation Vehari.'
};

export const DEFAULT_ADMIN_USER: UserProfile = {
  id: 'usr_admin_01',
  username: 'admin',
  fullName: 'System Administrator',
  email: 'admin@babafareedseed.com',
  mobile: '+92 300 3179077',
  password: 'admin123',
  role: 'ADMIN',
  active: true,
  permissions: {
    canManageUsers: true,
    canManageAccounts: true,
    canManageProducts: true,
    canManageStaff: true,
    canManageTerritories: true,
    canManageCompany: true,
    canCreateVouchers: true,
    canCreateInvoices: true,
    canViewReports: true,
    canEditDelete: true
  },
  createdAt: new Date().toISOString()
};

class DatabaseService {
  private useLocalStorage: boolean = true;
  private memoryStore: Record<string, any> = {};

  private getLocal<T>(key: string, defaultValue: T): T {
    if (!this.useLocalStorage) {
      return this.memoryStore[key] !== undefined ? this.memoryStore[key] : defaultValue;
    }
    try {
      const data = localStorage.getItem(`fareed_${key}`);
      if (!data) return defaultValue;
      return JSON.parse(data);
    } catch {
      return defaultValue;
    }
  }

  private setLocal<T>(key: string, value: T): void {
    if (!this.useLocalStorage) {
      this.memoryStore[key] = value;
      return;
    }
    try {
      localStorage.setItem(`fareed_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  }

  public async getDatabaseStatus(): Promise<DatabaseStatus> {
    try {
      const res = await fetch('/api/database/status');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend status check failed, running locally:', e);
    }
    return {
      type: 'local',
      connected: false,
      message: 'Running on local browser storage'
    };
  }

  public async setMySQLConfig(config: MySQLConfig): Promise<{ success: boolean; message?: string; error?: string; isStackcp?: boolean; suggestedHost?: string; host?: string; port?: number }> {
    try {
      const res = await fetch('/api/database/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to connect to MySQL backend' };
    }
  }

  public async disconnectMySQL(): Promise<void> {
    try {
      await fetch('/api/database/disconnect', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  }

  public async getMySQLSchema(): Promise<string> {
    try {
      const res = await fetch('/api/database/schema');
      if (res.ok) {
        return await res.text();
      }
    } catch (e) {
      console.error(e);
    }
    return `-- Run in phpMyAdmin: CREATE DATABASE IF NOT EXISTS \`ac-bfsc-353033376d35\`;`;
  }

  public async getMySQLExportDataSql(): Promise<string> {
    try {
      const res = await fetch('/api/database/export-sql');
      if (res.ok) {
        return await res.text();
      }
    } catch (e) {
      console.error(e);
    }
    return await this.getMySQLSchema();
  }

  public detachLocalStorage() {
    this.useLocalStorage = false;
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith('fareed_')) {
        localStorage.removeItem(k);
      }
    });
    this.memoryStore = {};
  }

  public async clearAllData(): Promise<void> {
    try {
      await fetch('/api/database/clear-all', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith('fareed_')) {
        localStorage.removeItem(k);
      }
    });
    this.memoryStore = {};
  }

  // --- COMPANY PROFILE ---
  public async getCompanyProfile(): Promise<CompanyProfileData> {
    try {
      const res = await fetch('/api/company-profile');
      if (res.ok) {
        const data = await res.json();
        this.setLocal('company_profile', data);
        return data;
      }
    } catch (e) {
      console.warn('API fetch company_profile fallback:', e);
    }
    return this.getLocal<CompanyProfileData>('company_profile', DEFAULT_COMPANY_PROFILE);
  }

  public async saveCompanyProfile(profile: CompanyProfileData): Promise<void> {
    this.setLocal('company_profile', profile);
    try {
      await fetch('/api/company-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
    } catch (e) {
      console.error('API save company_profile error:', e);
    }
  }

  // --- USERS ---
  public async getUsers(): Promise<UserProfile[]> {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const list = await res.json();
        this.setLocal('users', list);
        return list;
      }
    } catch (e) {
      console.warn('API fetch users fallback:', e);
    }
    return this.getLocal<UserProfile[]>('users', [DEFAULT_ADMIN_USER]);
  }

  public async saveUser(user: UserProfile): Promise<void> {
    const list = await this.getUsers();
    const idx = list.findIndex(u => u.id === user.id);
    if (idx >= 0) list[idx] = user;
    else list.push(user);
    this.setLocal('users', list);
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
    } catch (e) {
      console.error('API save user error:', e);
    }
  }

  public async deleteUser(id: string): Promise<void> {
    const list = await this.getUsers();
    this.setLocal('users', list.filter(u => u.id !== id));
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  }

  // --- ACCOUNTS ---
  public async getAccounts(): Promise<Account[]> {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const list = await res.json();
        this.setLocal('accounts', list);
        return list;
      }
    } catch (e) {
      console.warn('API fetch accounts fallback:', e);
    }
    return this.getLocal<Account[]>('accounts', [
      { id: 'acc_1', code: 'ACC-10000', name: 'CASH IN HAND', accountType: 'Assets', openingBalance: 250000, openingBalanceType: 'Dr', active: true, createdAt: new Date().toISOString() },
      { id: 'acc_2', code: '1020', name: 'Habib Bank Limited (Vehari)', accountType: 'Assets', openingBalance: 950000, openingBalanceType: 'Dr', active: true, createdAt: new Date().toISOString() },
      { id: 'acc_3', code: '2010', name: 'Sundry Debtors / Seed Growers Receivable', accountType: 'Assets', openingBalance: 420000, openingBalanceType: 'Dr', active: true, createdAt: new Date().toISOString() },
      { id: 'acc_4', code: '3010', name: 'Seed Producers & Farms Payable', accountType: 'Liabilities', openingBalance: 180000, openingBalanceType: 'Cr', active: true, createdAt: new Date().toISOString() },
      { id: 'acc_5', code: '4010', name: 'Certified Seed Sales Revenue', accountType: 'Revenue', openingBalance: 0, openingBalanceType: 'Cr', active: true, createdAt: new Date().toISOString() },
      { id: 'acc_6', code: '5010', name: 'Seed Procurement & Processing Cost', accountType: 'Expenses', openingBalance: 0, openingBalanceType: 'Dr', active: true, createdAt: new Date().toISOString() }
    ]);
  }

  public async saveAccount(account: Account): Promise<void> {
    const list = await this.getAccounts();
    const dup = list.find(a => a.code === account.code && a.id !== account.id);
    if (dup) {
      throw new Error(`Account code "${account.code}" is already in use.`);
    }
    const idx = list.findIndex(a => a.id === account.id);
    if (idx >= 0) list[idx] = account;
    else list.push(account);
    this.setLocal('accounts', list);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save account');
      }
    } catch (e: any) {
      if (e.message && e.message.includes('Account code')) throw e;
      console.warn('API save account warning:', e);
    }
  }

  public async deleteAccount(id: string): Promise<void> {
    const list = await this.getAccounts();
    this.setLocal('accounts', list.filter(a => a.id !== id));
    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete account');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  // --- SALES STAFF ---
  public async getSalesStaff(): Promise<SalesStaff[]> {
    try {
      const res = await fetch('/api/sales-staff');
      if (res.ok) {
        const list = await res.json();
        this.setLocal('sales_staff', list);
        return list;
      }
    } catch (e) {
      console.warn('API fetch sales_staff fallback:', e);
    }
    return this.getLocal<SalesStaff[]>('sales_staff', []);
  }

  public async saveSalesStaff(staff: SalesStaff): Promise<void> {
    const list = await this.getSalesStaff();
    const idx = list.findIndex(s => s.id === staff.id);
    if (idx >= 0) list[idx] = staff;
    else list.push(staff);
    this.setLocal('sales_staff', list);
    try {
      await fetch('/api/sales-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staff)
      });
    } catch (e) {
      console.error(e);
    }
  }

  public async deleteSalesStaff(id: string): Promise<void> {
    const list = await this.getSalesStaff();
    this.setLocal('sales_staff', list.filter(s => s.id !== id));
    try {
      await fetch(`/api/sales-staff/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  }

  // --- TERRITORIES ---
  public async getTerritories(): Promise<Territory[]> {
    try {
      const res = await fetch('/api/territories');
      if (res.ok) {
        const list = await res.json();
        this.setLocal('territories', list);
        return list;
      }
    } catch (e) {
      console.warn('API fetch territories fallback:', e);
    }
    return this.getLocal<Territory[]>('territories', []);
  }

  public async saveTerritory(terr: Territory): Promise<void> {
    const list = await this.getTerritories();
    const idx = list.findIndex(t => t.id === terr.id);
    if (idx >= 0) list[idx] = terr;
    else list.push(terr);
    this.setLocal('territories', list);
    try {
      await fetch('/api/territories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(terr)
      });
    } catch (e) {
      console.error(e);
    }
  }

  public async deleteTerritory(id: string): Promise<void> {
    const list = await this.getTerritories();
    this.setLocal('territories', list.filter(t => t.id !== id));
    try {
      await fetch(`/api/territories/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  }

  // --- PRODUCTS ---
  public async getProducts(): Promise<Product[]> {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const list = await res.json();
        this.setLocal('products', list);
        return list;
      }
    } catch (e) {
      console.warn('API fetch products fallback:', e);
    }
    return this.getLocal<Product[]>('products', [
      { id: 'p_1', productCode: 'SD-WHT-01', productName: 'Wheat Seed Akbar Certified', category: 'Seeds', variety: 'Akbar-2019', unit: 'Bag', packSize: '50kg', purchaseRate: 4200, saleRate: 4800, openingStock: 500, openingStockRate: 4200, minimumStock: 50, active: true },
      { id: 'p_2', productCode: 'SD-COT-03', productName: 'Cotton Seed Bt-886 Hybrid', category: 'Seeds', variety: 'Bt-886', unit: 'Bag', packSize: '40kg', purchaseRate: 7500, saleRate: 8500, openingStock: 300, openingStockRate: 7500, minimumStock: 30, active: true },
      { id: 'p_3', productCode: 'SD-RIC-06', productName: 'Rice Seed Kainat 1121 Basmati', category: 'Seeds', variety: 'Kainat 1121', unit: 'Bag', packSize: '25kg', purchaseRate: 3800, saleRate: 4400, openingStock: 250, openingStockRate: 3800, minimumStock: 25, active: true }
    ]);
  }

  public async saveProduct(prod: Product): Promise<void> {
    const list = await this.getProducts();
    const idx = list.findIndex(p => p.id === prod.id);
    if (idx >= 0) list[idx] = prod;
    else list.push(prod);
    this.setLocal('products', list);
    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prod)
      });
    } catch (e) {
      console.error(e);
    }
  }

  public async deleteProduct(id: string): Promise<void> {
    const list = await this.getProducts();
    this.setLocal('products', list.filter(p => p.id !== id));
    try {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  }

  // --- VOUCHERS ---
  public async getVouchers(): Promise<Voucher[]> {
    try {
      const res = await fetch('/api/vouchers');
      if (res.ok) {
        const list = await res.json();
        this.setLocal('vouchers', list);
        return list;
      }
    } catch (e) {
      console.warn('API fetch vouchers fallback:', e);
    }
    return this.getLocal<Voucher[]>('vouchers', []);
  }

  public async saveVoucher(voucher: Voucher): Promise<void> {
    const list = await this.getVouchers();
    const idx = list.findIndex(v => v.id === voucher.id);
    if (idx >= 0) list[idx] = voucher;
    else list.unshift(voucher);
    this.setLocal('vouchers', list);
    try {
      await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voucher)
      });
    } catch (e) {
      console.error(e);
    }
  }

  public async deleteVoucher(id: string): Promise<void> {
    const list = await this.getVouchers();
    this.setLocal('vouchers', list.filter(v => v.id !== id));
    try {
      await fetch(`/api/vouchers/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  }

  // --- INVOICES ---
  public async getInvoices(): Promise<Invoice[]> {
    try {
      const res = await fetch('/api/invoices');
      if (res.ok) {
        const list = await res.json();
        this.setLocal('invoices', list);
        return list;
      }
    } catch (e) {
      console.warn('API fetch invoices fallback:', e);
    }
    return this.getLocal<Invoice[]>('invoices', []);
  }

  public async saveInvoice(invoice: Invoice): Promise<void> {
    const list = await this.getInvoices();
    const idx = list.findIndex(i => i.id === invoice.id);
    if (idx >= 0) list[idx] = invoice;
    else list.unshift(invoice);
    this.setLocal('invoices', list);
    try {
      await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      });
    } catch (e) {
      console.error(e);
    }
  }

  public async deleteInvoice(id: string): Promise<void> {
    const list = await this.getInvoices();
    this.setLocal('invoices', list.filter(i => i.id !== id));
    try {
      await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  }

  // --- DASHBOARD STATS ---
  public async getDashboardStats() {
    const accounts = await this.getAccounts();
    const products = await this.getProducts();
    const invoices = await this.getInvoices();
    const vouchers = await this.getVouchers();

    const salesInvoices = invoices.filter(i => i.invoiceType === 'SALES_CASH' || i.invoiceType === 'SALES_CREDIT');
    const purchaseInvoices = invoices.filter(i => i.invoiceType === 'PURCHASE_CASH' || i.invoiceType === 'PURCHASE_CREDIT');

    const totalSales = salesInvoices.reduce((acc, curr) => acc + curr.netTotal, 0);
    const totalPurchases = purchaseInvoices.reduce((acc, curr) => acc + curr.netTotal, 0);

    const cashReceipts = vouchers.filter(v => v.voucherType === 'CASH_RECEIPT').reduce((acc, curr) => acc + curr.totalAmount, 0);
    const cashPayments = vouchers.filter(v => v.voucherType === 'CASH_PAYMENT').reduce((acc, curr) => acc + curr.totalAmount, 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const todaysSales = salesInvoices.filter(i => i.date.startsWith(todayStr)).reduce((acc, curr) => acc + curr.netTotal, 0);
    const todaysPurchases = purchaseInvoices.filter(i => i.date.startsWith(todayStr)).reduce((acc, curr) => acc + curr.netTotal, 0);

    const cashAccount = accounts.find(a => a.name.toLowerCase().includes('cash') || a.code === '1010');
    let cashBalance = cashAccount ? (cashAccount.openingBalanceType === 'Dr' ? cashAccount.openingBalance : -cashAccount.openingBalance) : 0;
    cashBalance += cashReceipts - cashPayments;
    salesInvoices.filter(i => i.invoiceType === 'SALES_CASH').forEach(i => cashBalance += i.netTotal);
    purchaseInvoices.filter(i => i.invoiceType === 'PURCHASE_CASH').forEach(i => cashBalance -= i.netTotal);

    return {
      totalAccounts: accounts.length,
      totalProducts: products.length,
      totalSales,
      totalPurchases,
      cashReceipts,
      cashPayments,
      todaysSales,
      todaysPurchases,
      cashBalance,
      recentTransactions: [
        ...salesInvoices.map(i => ({ id: i.id, date: i.date, type: 'Sale Invoice', ref: i.invoiceNo, amount: i.netTotal })),
        ...purchaseInvoices.map(i => ({ id: i.id, date: i.date, type: 'Purchase Invoice', ref: i.invoiceNo, amount: i.netTotal })),
        ...vouchers.map(v => ({ id: v.id, date: v.date, type: v.voucherType.replace('_', ' '), ref: v.voucherNo, amount: v.totalAmount }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
    };
  }
}

export const db = new DatabaseService();
