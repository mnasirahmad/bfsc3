export type DiscountType = 'PERCENT' | 'UNIT' | 'FIXED' | 'PERCENT_AMOUNT';
export type Role = 'ADMIN' | 'USER';

export interface UserPermissions {
  canManageUsers: boolean;
  canManageAccounts: boolean;
  canManageProducts: boolean;
  canManageStaff: boolean;
  canManageTerritories: boolean;
  canManageCompany: boolean;
  canCreateVouchers: boolean;
  canCreateInvoices: boolean;
  canViewReports: boolean;
  canEditDelete: boolean;
}

export interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  mobile: string;
  password?: string;
  role: Role;
  active: boolean;
  permissions: UserPermissions;
  createdAt: string;
}

export type AccountType = 'Assets' | 'Liabilities' | 'Equity' | 'Revenue' | 'Expenses' | 'Cash/Banks' | 'General Ledgers';

export interface Account {
  id: string;
  code: string;
  name: string;
  parentAccount?: string;
  accountType: AccountType;
  salesStaff?: string;
  phone?: string;
  openingBalance: number;
  openingBalanceType: 'Dr' | 'Cr';
  description?: string;
  active: boolean;
  createdAt: string;
}

export interface SalesStaff {
  id: string;
  staffCode: string;
  staffName: string;
  fatherName: string;
  mobile: string;
  whatsapp: string;
  address: string;
  city: string;
  territory: string;
  joiningDate: string;
  status: 'Active' | 'Inactive';
  remarks?: string;
}

export interface Territory {
  id: string;
  territoryCode: string;
  territoryName: string;
  city: string;
  district: string;
  description?: string;
  status: 'Active' | 'Inactive';
}

export interface Product {
  id: string;
  productCode: string;
  productName: string;
  category: string;
  variety: string;
  unit: string;
  packSize: string;
  purchaseRate: number;
  saleRate: number;
  openingStock: number;
  openingStockRate: number;
  minimumStock: number;
  description?: string;
  active: boolean;
  createdAt?: string;
}

export interface CompanyProfileData {
  companyName: string;
  headOfficeAddress: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  ntn: string;
  strn: string;
  logoUrl?: string;
  financialYear: string;
  invoiceFooter: string;
  reportFooter: string;
}

export type VoucherType = 'CASH_PAYMENT' | 'CASH_RECEIPT' | 'JOURNAL';

export interface VoucherLine {
  accountId: string;
  accountName: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface Voucher {
  id: string;
  voucherNo: string;
  voucherType: VoucherType;
  date: string;
  salesStaff?: string;
  lines: VoucherLine[];
  totalAmount: number;
  narration: string;
  createdBy: string;
  createdAt: string;
}

export type InvoiceType =
  | 'SALES_CASH'
  | 'SALES_CREDIT'
  | 'PURCHASE_CASH'
  | 'PURCHASE_CREDIT'
  | 'SALES_MAUND'
  | 'PURCHASE_MAUND'
  | 'SALES_RETURN'
  | 'PURCHASE_RETURN'
  | 'PRODUCTION';

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  rate: number;
  discountType: DiscountType;
  discount: number;
  discountAmount?: number;
  amount: number;
  packSize?: string;
  scheme?: string;
  lotNo?: string;
  gstPercent?: number;
  gstAmount?: number;
  // Production fields
  quantityOut?: number;
  quantityIn?: number;
  description?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  invoiceType: InvoiceType;
  date: string;
  accountName: string; // Customer or Supplier Account ID/Name
  salesStaff?: string;
  territory?: string;
  originalInvoiceNo?: string;
  reason?: string;
  items: InvoiceItem[];
  grossTotal: number;
  discountTotal: number;
  netTotal: number;
  remarks?: string;
  createdBy: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  voucherNo: string;
  accountId: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  balanceType: 'Dr' | 'Cr';
}

export interface ProductLedgerEntry {
  id: string;
  date: string;
  referenceNo: string;
  productId: string;
  productName: string;
  transactionType: 'Opening Stock' | 'Purchase' | 'Purchase Return' | 'Sale' | 'Sales Return' | 'Stock Adjustment';
  inQty: number;
  outQty: number;
  rate: number;
  balanceQty: number;
}

export interface MySQLConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  ssl?: boolean;
}

export interface DatabaseStatus {
  type: 'mysql' | 'local';
  connected: boolean;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  outboundIp?: string;
  message?: string;
  isLocalhostRefused?: boolean;
  isStackcp?: boolean;
  suggestedHost?: string;
}
