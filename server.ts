import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const customDnsLookup = (hostname: string, options: any, callback: any) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname === 'sdb-67.hosting.stackcp.net' || hostname === 'mysql.gb.stackcp.com') {
    return callback(null, '45.8.227.98', 4);
  }
  return dns.lookup(hostname, options, callback);
};

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const DEFAULT_COMPANY_PROFILE = {
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

const DEFAULT_ADMIN = {
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

const DEFAULT_ACCOUNTS = [
  { id: 'acc_1', code: 'ACC-10000', name: 'CASH IN HAND', accountType: 'Assets', openingBalance: 250000, openingBalanceType: 'Dr', active: true, createdAt: new Date().toISOString() },
  { id: 'acc_2', code: '1020', name: 'Habib Bank Limited (Vehari Branch)', accountType: 'Assets', openingBalance: 950000, openingBalanceType: 'Dr', active: true, createdAt: new Date().toISOString() },
  { id: 'acc_3', code: '2010', name: 'Sundry Debtors / Seed Growers Receivable', accountType: 'Assets', openingBalance: 420000, openingBalanceType: 'Dr', active: true, createdAt: new Date().toISOString() },
  { id: 'acc_4', code: '3010', name: 'Seed Producers & Farms Payable', accountType: 'Liabilities', openingBalance: 180000, openingBalanceType: 'Cr', active: true, createdAt: new Date().toISOString() },
  { id: 'acc_5', code: '4010', name: 'Certified Seed Sales Revenue', accountType: 'Revenue', openingBalance: 0, openingBalanceType: 'Cr', active: true, createdAt: new Date().toISOString() },
  { id: 'acc_6', code: '5010', name: 'Seed Procurement & Processing Cost', accountType: 'Expenses', openingBalance: 0, openingBalanceType: 'Dr', active: true, createdAt: new Date().toISOString() }
];

const DATA_FILE = path.resolve(process.cwd(), 'database_storage.json');

interface MemoryStore {
  companyProfile: typeof DEFAULT_COMPANY_PROFILE;
  users: any[];
  accounts: any[];
  salesStaff: any[];
  territories: any[];
  products: any[];
  vouchers: any[];
  invoices: any[];
  mysqlConfig?: {
    host: string;
    port: number;
    user: string;
    password?: string;
    database: string;
    ssl?: boolean;
  };
}

let store: MemoryStore = {
  companyProfile: DEFAULT_COMPANY_PROFILE,
  users: [DEFAULT_ADMIN],
  accounts: DEFAULT_ACCOUNTS,
  salesStaff: [],
  territories: [],
  products: [],
  vouchers: [],
  invoices: []
};

try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    store = { ...store, ...parsed };
    if (!store.companyProfile || !store.companyProfile.companyName) {
      store.companyProfile = DEFAULT_COMPANY_PROFILE;
    }
  }
} catch (e) {
  console.warn('Could not read existing local store:', e);
}

function saveLocalStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write local store:', e);
  }
}

let mysqlPool: mysql.Pool | null = null;
let mysqlConnected = false;
let mysqlErrorMessage = '';

const MYSQL_SCHEMA_SQL = `-- ========================================================
-- BABA FAREED SEED CORPORATION - MYSQL RELATIONAL SCHEMA
-- Address: 7-K.M MULTAN ROAD VEHARI | Phone: +92 300 3179077
-- ========================================================
CREATE DATABASE IF NOT EXISTS \`ac-bfsc-353033376d35\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`ac-bfsc-353033376d35\`;

CREATE TABLE IF NOT EXISTS company_profile (
  id VARCHAR(50) PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  head_office_address TEXT,
  phone VARCHAR(100),
  mobile VARCHAR(100),
  email VARCHAR(100),
  website VARCHAR(100),
  ntn VARCHAR(100),
  strn VARCHAR(100),
  logo_url LONGTEXT,
  financial_year VARCHAR(50),
  invoice_footer TEXT,
  report_footer TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(150),
  mobile VARCHAR(100),
  password VARCHAR(255) NOT NULL DEFAULT 'admin123',
  role VARCHAR(50) NOT NULL DEFAULT 'USER',
  active TINYINT(1) NOT NULL DEFAULT 1,
  permissions JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(50) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  parent_account VARCHAR(255),
  account_type VARCHAR(100) NOT NULL,
  sales_staff VARCHAR(255),
  phone VARCHAR(100),
  opening_balance DECIMAL(15,2) DEFAULT 0.00,
  opening_balance_type VARCHAR(10) DEFAULT 'Dr',
  description TEXT,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sales_staff (
  id VARCHAR(50) PRIMARY KEY,
  staff_code VARCHAR(50) UNIQUE NOT NULL,
  staff_name VARCHAR(255) NOT NULL,
  father_name VARCHAR(255),
  mobile VARCHAR(100),
  whatsapp VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  territory VARCHAR(150),
  joining_date DATE,
  status VARCHAR(50) DEFAULT 'Active',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS territories (
  id VARCHAR(50) PRIMARY KEY,
  territory_code VARCHAR(50) UNIQUE NOT NULL,
  territory_name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  district VARCHAR(100),
  description TEXT,
  status VARCHAR(50) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(50) PRIMARY KEY,
  product_code VARCHAR(50) UNIQUE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  variety VARCHAR(100),
  unit VARCHAR(50),
  pack_size VARCHAR(50),
  purchase_rate DECIMAL(15,2) DEFAULT 0.00,
  sale_rate DECIMAL(15,2) DEFAULT 0.00,
  opening_stock DECIMAL(15,2) DEFAULT 0.00,
  opening_stock_rate DECIMAL(15,2) DEFAULT 0.00,
  minimum_stock DECIMAL(15,2) DEFAULT 0.00,
  description TEXT,
  active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS vouchers (
  id VARCHAR(50) PRIMARY KEY,
  voucher_no VARCHAR(100) UNIQUE NOT NULL,
  voucher_type VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  sales_staff VARCHAR(255),
  \`lines\` LONGTEXT NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  narration TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(50) PRIMARY KEY,
  invoice_no VARCHAR(100) UNIQUE NOT NULL,
  invoice_type VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  sales_staff VARCHAR(255),
  territory VARCHAR(150),
  original_invoice_no VARCHAR(100),
  reason TEXT,
  \`items\` LONGTEXT NOT NULL,
  gross_total DECIMAL(15,2) NOT NULL,
  discount_total DECIMAL(15,2) NOT NULL,
  net_total DECIMAL(15,2) NOT NULL,
  remarks TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

async function initMySQL(config?: { host: string; port: number; user: string; password?: string; database: string; ssl?: boolean }) {
  let host = (config?.host || process.env.MYSQL_HOST || 'mysql.gb.stackcp.com').trim();
  const port = Number(config?.port || process.env.MYSQL_PORT || 45504);
  const user = (config?.user || process.env.MYSQL_USER || 'nasir-945e').trim();
  const password = config?.password !== undefined ? config.password : (process.env.MYSQL_PASSWORD || 'r55{|CPnP-!a');
  const database = (config?.database || process.env.MYSQL_DATABASE || 'ac-bfsc-353033376d35').trim();

  if (!host || !user || !database) {
    mysqlConnected = false;
    return false;
  }

  const candidateHosts = [host];
  if (host === 'mysql.gb.stackcp.com') {
    candidateHosts.push('45.8.227.98');
  }

  let lastError: any = null;
  let successfulHost = host;
  let successfulPort = port;

  for (const currentHost of candidateHosts) {
    try {
      if (mysqlPool) {
        await mysqlPool.end().catch(() => {});
        mysqlPool = null;
      }
      let pool: mysql.Pool;
      try {
        pool = mysql.createPool({
          host: currentHost,
          port,
          user,
          password,
          database,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          connectTimeout: 8000,
          ssl: config?.ssl ? { rejectUnauthorized: false } : undefined,
          lookup: customDnsLookup
        } as any);
        const conn = await pool.getConnection();
        conn.release();
      } catch (connErr: any) {
        if (connErr.code === 'ER_BAD_DB_ERROR' || (connErr.message && connErr.message.includes('Unknown database'))) {
          const rootPool = mysql.createPool({
            host: currentHost,
            port,
            user,
            password,
            waitForConnections: true,
            connectionLimit: 2,
            connectTimeout: 8000,
            ssl: config?.ssl ? { rejectUnauthorized: false } : undefined,
            lookup: customDnsLookup
          } as any);
          const rootConn = await rootPool.getConnection();
          await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
          rootConn.release();
          await rootPool.end().catch(() => {});

          pool = mysql.createPool({
            host: currentHost,
            port,
            user,
            password,
            database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            connectTimeout: 8000,
            ssl: config?.ssl ? { rejectUnauthorized: false } : undefined,
            lookup: customDnsLookup
          } as any);
          const conn2 = await pool.getConnection();
          conn2.release();
        } else {
          throw connErr;
        }
      }

      // Verify/Create tables
      await pool.query(`
        CREATE TABLE IF NOT EXISTS company_profile (
          id VARCHAR(50) PRIMARY KEY,
          company_name VARCHAR(255) NOT NULL,
          head_office_address TEXT,
          phone VARCHAR(100),
          mobile VARCHAR(100),
          email VARCHAR(100),
          website VARCHAR(100),
          ntn VARCHAR(100),
          strn VARCHAR(100),
          logo_url LONGTEXT,
          financial_year VARCHAR(50),
          invoice_footer TEXT,
          report_footer TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(50) PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          email VARCHAR(150),
          mobile VARCHAR(100),
          password VARCHAR(255) NOT NULL DEFAULT 'admin123',
          role VARCHAR(50) NOT NULL DEFAULT 'USER',
          active TINYINT(1) NOT NULL DEFAULT 1,
          permissions JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          id VARCHAR(50) PRIMARY KEY,
          code VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          parent_account VARCHAR(255),
          account_type VARCHAR(100) NOT NULL,
          sales_staff VARCHAR(255),
          phone VARCHAR(100),
          opening_balance DECIMAL(15,2) DEFAULT 0.00,
          opening_balance_type VARCHAR(10) DEFAULT 'Dr',
          description TEXT,
          active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sales_staff (
          id VARCHAR(50) PRIMARY KEY,
          staff_code VARCHAR(50) UNIQUE NOT NULL,
          staff_name VARCHAR(255) NOT NULL,
          father_name VARCHAR(255),
          mobile VARCHAR(100),
          whatsapp VARCHAR(100),
          address TEXT,
          city VARCHAR(100),
          territory VARCHAR(150),
          joining_date DATE,
          status VARCHAR(50) DEFAULT 'Active',
          remarks TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS territories (
          id VARCHAR(50) PRIMARY KEY,
          territory_code VARCHAR(50) UNIQUE NOT NULL,
          territory_name VARCHAR(255) NOT NULL,
          city VARCHAR(100),
          district VARCHAR(100),
          description TEXT,
          status VARCHAR(50) DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id VARCHAR(50) PRIMARY KEY,
          product_code VARCHAR(50) UNIQUE NOT NULL,
          product_name VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          variety VARCHAR(100),
          unit VARCHAR(50),
          pack_size VARCHAR(50),
          purchase_rate DECIMAL(15,2) DEFAULT 0.00,
          sale_rate DECIMAL(15,2) DEFAULT 0.00,
          opening_stock DECIMAL(15,2) DEFAULT 0.00,
          opening_stock_rate DECIMAL(15,2) DEFAULT 0.00,
          minimum_stock DECIMAL(15,2) DEFAULT 0.00,
          description TEXT,
          active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS vouchers (
          id VARCHAR(50) PRIMARY KEY,
          voucher_no VARCHAR(100) UNIQUE NOT NULL,
          voucher_type VARCHAR(50) NOT NULL,
          date DATE NOT NULL,
          sales_staff VARCHAR(255),
          \`lines\` LONGTEXT NOT NULL,
          total_amount DECIMAL(15,2) NOT NULL,
          narration TEXT,
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id VARCHAR(50) PRIMARY KEY,
          invoice_no VARCHAR(100) UNIQUE NOT NULL,
          invoice_type VARCHAR(50) NOT NULL,
          date DATE NOT NULL,
          account_name VARCHAR(255) NOT NULL,
          sales_staff VARCHAR(255),
          territory VARCHAR(150),
          original_invoice_no VARCHAR(100),
          reason TEXT,
          \`items\` LONGTEXT NOT NULL,
          gross_total DECIMAL(15,2) NOT NULL,
          discount_total DECIMAL(15,2) NOT NULL,
          net_total DECIMAL(15,2) NOT NULL,
          remarks TEXT,
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      mysqlPool = pool;
      mysqlConnected = true;
      mysqlErrorMessage = '';
      successfulHost = currentHost;
      store.mysqlConfig = { host: successfulHost, port, user, password, database, ssl: Boolean(config?.ssl) };
      saveLocalStore();
      console.log(`Connected to MySQL database "${database}" on ${currentHost}:${port}`);
      return true;
    } catch (err: any) {
      lastError = err;
      if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        break;
      }
    }
  }

  mysqlConnected = false;
  mysqlErrorMessage = lastError?.message || 'Failed to connect to MySQL';
  console.warn('MySQL initialization notice:', mysqlErrorMessage);
  return false;
}

let outboundServerIp = '34.96.48.119';
(async () => {
  try {
    const res = await fetch('https://api.ipify.org');
    if (res.ok) {
      outboundServerIp = (await res.text()).trim();
    }
  } catch {}
})();

const defaultDbConfig = {
  host: process.env.MYSQL_HOST || 'mysql.gb.stackcp.com',
  port: Number(process.env.MYSQL_PORT || 45504),
  user: process.env.MYSQL_USER || 'nasir-945e',
  password: process.env.MYSQL_PASSWORD || 'r55{|CPnP-!a',
  database: process.env.MYSQL_DATABASE || 'ac-bfsc-353033376d35'
};

initMySQL(store.mysqlConfig || defaultDbConfig);

// API Routes
app.get('/api/database/status', (req: Request, res: Response) => {
  const currentHost = store.mysqlConfig?.host || process.env.MYSQL_HOST || 'mysql.gb.stackcp.com';
  const currentPort = store.mysqlConfig?.port || Number(process.env.MYSQL_PORT || 45504);
  const currentUser = store.mysqlConfig?.user || process.env.MYSQL_USER || 'nasir-945e';
  const currentDatabase = store.mysqlConfig?.database || process.env.MYSQL_DATABASE || 'ac-bfsc-353033376d35';

  res.json({
    type: mysqlConnected ? 'mysql' : 'local',
    connected: mysqlConnected,
    host: currentHost,
    port: currentPort,
    database: currentDatabase,
    user: currentUser,
    outboundIp: outboundServerIp,
    message: mysqlErrorMessage || (mysqlConnected ? `Connected to MySQL (${currentDatabase} @ ${currentHost}:${currentPort})` : `MySQL configured. Whitelist % in StackCP Remote MySQL Access if needed.`),
    isStackcp: currentHost.toLowerCase().includes('stackcp'),
    suggestedHost: currentHost
  });
});

app.post('/api/database/config', async (req: Request, res: Response) => {
  const { host, port, user, password, database, ssl } = req.body;
  if (!host || !user || !database) {
    return res.status(400).json({ success: false, error: 'Host, user, and database name are required.' });
  }
  const cleanHost = String(host).trim();
  const cleanPort = Number(port || 45504);

  const success = await initMySQL({
    host: cleanHost,
    port: cleanPort,
    user: String(user).trim(),
    password: password || '',
    database: String(database).trim(),
    ssl: Boolean(ssl)
  });

  if (success) {
    store.mysqlConfig = { host: cleanHost, port: cleanPort, user: String(user).trim(), password: password || '', database: String(database).trim(), ssl: Boolean(ssl) };
    saveLocalStore();
    return res.json({ success: true, message: 'MySQL connected successfully and schema initialized!' });
  } else {
    return res.status(400).json({
      success: false,
      error: mysqlErrorMessage,
      isStackcp: cleanHost.toLowerCase().includes('stackcp'),
      suggestedHost: cleanHost,
      host: cleanHost,
      port: cleanPort
    });
  }
});

app.post('/api/database/disconnect', async (req: Request, res: Response) => {
  if (mysqlPool) {
    await mysqlPool.end().catch(() => {});
    mysqlPool = null;
  }
  mysqlConnected = false;
  store.mysqlConfig = undefined;
  saveLocalStore();
  res.json({ success: true, message: 'Disconnected from MySQL. Switched to local storage.' });
});

app.get('/api/database/schema', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(MYSQL_SCHEMA_SQL);
});

app.get('/api/database/export-sql', (req: Request, res: Response) => {
  const dbName = 'ac-bfsc-353033376d35';
  const now = new Date().toISOString();
  const escapeSql = (val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return val ? '1' : '0';
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  let sql = `-- ============================================================
-- BABA FAREED SEED CORPORATION - phpMyAdmin SQL Dump & Restore
-- Database: \`${dbName}\`
-- Export Date: ${now}
-- ============================================================
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS \`${dbName}\`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE \`${dbName}\`;

${MYSQL_SCHEMA_SQL}
`;
  res.setHeader('Content-Type', 'text/plain');
  res.send(sql);
});

app.post('/api/database/clear-all', async (req: Request, res: Response) => {
  store.accounts = [];
  store.salesStaff = [];
  store.territories = [];
  store.products = [];
  store.vouchers = [];
  store.invoices = [];
  saveLocalStore();
  if (mysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query('DELETE FROM invoices');
      await mysqlPool.query('DELETE FROM vouchers');
      await mysqlPool.query('DELETE FROM products');
      await mysqlPool.query('DELETE FROM sales_staff');
      await mysqlPool.query('DELETE FROM territories');
      await mysqlPool.query('DELETE FROM accounts');
    } catch (e) {
      console.error('MySQL clear-all error:', e);
    }
  }
  res.json({ success: true, message: 'All transactions and records cleared.' });
});

// Company Profile API
app.get('/api/company-profile', async (req: Request, res: Response) => {
  if (mysqlConnected && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query<any[]>('SELECT * FROM company_profile WHERE id = ?', ['default']);
      if (rows && rows.length > 0) {
        const r = rows[0];
        return res.json({
          companyName: r.company_name,
          headOfficeAddress: r.head_office_address,
          phone: r.phone,
          mobile: r.mobile,
          email: r.email,
          website: r.website,
          ntn: r.ntn,
          strn: r.strn,
          logoUrl: r.logo_url || '/logoittehad.png',
          financialYear: r.financial_year,
          invoiceFooter: r.invoice_footer,
          reportFooter: r.report_footer
        });
      }
    } catch (e) {
      console.warn('MySQL read error (company_profile):', e);
    }
  }
  res.json(store.companyProfile);
});

app.post('/api/company-profile', async (req: Request, res: Response) => {
  const profile = req.body;
  store.companyProfile = { ...DEFAULT_COMPANY_PROFILE, ...profile };
  saveLocalStore();
  if (mysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query(`
        INSERT INTO company_profile (id, company_name, head_office_address, phone, mobile, email, website, ntn, strn, logo_url, financial_year, invoice_footer, report_footer)
        VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          company_name=VALUES(company_name),
          head_office_address=VALUES(head_office_address),
          phone=VALUES(phone),
          mobile=VALUES(mobile),
          email=VALUES(email),
          website=VALUES(website),
          ntn=VALUES(ntn),
          strn=VALUES(strn),
          logo_url=VALUES(logo_url),
          financial_year=VALUES(financial_year),
          invoice_footer=VALUES(invoice_footer),
          report_footer=VALUES(report_footer)
      `, [
        profile.companyName,
        profile.headOfficeAddress,
        profile.phone,
        profile.mobile,
        profile.email,
        profile.website,
        profile.ntn,
        profile.strn,
        profile.logoUrl || '/logoittehad.png',
        profile.financialYear,
        profile.invoiceFooter,
        profile.reportFooter
      ]);
    } catch (e) {
      console.error('MySQL write error (company_profile):', e);
    }
  }
  res.json({ success: true, profile: store.companyProfile });
});

// Users API
app.get('/api/users', async (req: Request, res: Response) => {
  if (mysqlConnected && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query<any[]>('SELECT * FROM users ORDER BY created_at ASC');
      if (rows && rows.length > 0) {
        return res.json(rows.map(r => ({
          id: r.id,
          username: r.username,
          fullName: r.full_name,
          email: r.email,
          mobile: r.mobile,
          password: r.password,
          role: r.role,
          active: Boolean(r.active),
          permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : r.permissions,
          createdAt: r.created_at
        })));
      }
    } catch (e) {
      console.warn('MySQL read error (users):', e);
    }
  }
  res.json(store.users);
});

app.post('/api/users', async (req: Request, res: Response) => {
  const user = req.body;
  const idx = store.users.findIndex(u => u.id === user.id);
  if (idx >= 0) {
    if (!user.password && store.users[idx].password) {
      user.password = store.users[idx].password;
    }
    store.users[idx] = user;
  } else {
    if (!user.password) user.password = 'admin123';
    store.users.push(user);
  }
  saveLocalStore();
  if (mysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query(`
        INSERT INTO users (id, username, full_name, email, mobile, password, role, active, permissions, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          username=VALUES(username),
          full_name=VALUES(full_name),
          email=VALUES(email),
          mobile=VALUES(mobile),
          password=VALUES(password),
          role=VALUES(role),
          active=VALUES(active),
          permissions=VALUES(permissions)
      `, [
        user.id,
        user.username,
        user.fullName,
        user.email,
        user.mobile,
        user.password || 'admin123',
        user.role,
        user.active ? 1 : 0,
        JSON.stringify(user.permissions),
        user.createdAt || new Date()
      ]);
    } catch (e) {
      console.error('MySQL write error (users):', e);
    }
  }
  res.json({ success: true, user });
});

app.delete('/api/users/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  store.users = store.users.filter(u => u.id !== id);
  saveLocalStore();
  if (mysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query('DELETE FROM users WHERE id = ?', [id]);
    } catch (e) {
      console.error('MySQL delete error (users):', e);
    }
  }
  res.json({ success: true });
});

// Accounts API
app.get('/api/accounts', async (req: Request, res: Response) => {
  if (mysqlConnected && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query<any[]>('SELECT * FROM accounts ORDER BY code ASC');
      if (rows && rows.length > 0) {
        return res.json(rows.map(r => ({
          id: r.id,
          code: r.code,
          name: r.name,
          parentAccount: r.parent_account,
          accountType: r.account_type,
          salesStaff: r.sales_staff,
          phone: r.phone,
          openingBalance: Number(r.opening_balance || 0),
          openingBalanceType: r.opening_balance_type || 'Dr',
          description: r.description,
          active: Boolean(r.active),
          createdAt: r.created_at
        })));
      }
    } catch (e) {
      console.warn('MySQL read error (accounts):', e);
    }
  }
  res.json(store.accounts);
});

app.post('/api/accounts', async (req: Request, res: Response) => {
  const account = req.body;
  const duplicate = store.accounts.find(a => a.code === account.code && a.id !== account.id);
  if (duplicate) {
    return res.status(400).json({ error: `Account code "${account.code}" is already in use.` });
  }
  const idx = store.accounts.findIndex(a => a.id === account.id);
  if (idx >= 0) {
    store.accounts[idx] = account;
  } else {
    store.accounts.push(account);
  }
  saveLocalStore();
  if (mysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query(`
        INSERT INTO accounts (id, code, name, parent_account, account_type, sales_staff, phone, opening_balance, opening_balance_type, description, active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          code=VALUES(code),
          name=VALUES(name),
          parent_account=VALUES(parent_account),
          account_type=VALUES(account_type),
          sales_staff=VALUES(sales_staff),
          phone=VALUES(phone),
          opening_balance=VALUES(opening_balance),
          opening_balance_type=VALUES(opening_balance_type),
          description=VALUES(description),
          active=VALUES(active)
      `, [
        account.id,
        account.code,
        account.name,
        account.parentAccount || null,
        account.accountType,
        account.salesStaff || null,
        account.phone || null,
        account.openingBalance || 0,
        account.openingBalanceType || 'Dr',
        account.description || null,
        account.active ? 1 : 0,
        account.createdAt || new Date()
      ]);
    } catch (e: any) {
      console.error('MySQL write error (accounts):', e);
    }
  }
  res.json({ success: true, account });
});

app.delete('/api/accounts/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  store.accounts = store.accounts.filter(a => a.id !== id);
  saveLocalStore();
  if (mysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query('DELETE FROM accounts WHERE id = ?', [id]);
    } catch (e) {
      console.error('MySQL delete error (accounts):', e);
    }
  }
  res.json({ success: true });
});

// Sales Staff API
app.get('/api/sales-staff', async (req: Request, res: Response) => {
  if (mysqlConnected && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query<any[]>('SELECT * FROM sales_staff ORDER BY staff_name ASC');
      if (rows && rows.length > 0) {
        return res.json(rows.map(r => ({
          id: r.id,
          staffCode: r.staff_code,
          staffName: r.staff_name,
          fatherName: r.father_name,
          mobile: r.mobile,
          whatsapp: r.whatsapp,
          address: r.address,
          city: r.city,
          territory: r.territory,
          joiningDate: r.joining_date ? new Date(r.joining_date).toISOString().split('T')[0] : '',
          status: r.status,
          remarks: r.remarks
        })));
      }
    } catch (e) {
      console.warn('MySQL read error (sales_staff):', e);
    }
  }
  res.json(store.salesStaff);
});

app.post('/api/sales-staff', async (req: Request, res: Response) => {
  const staff = req.body;
  const idx = store.salesStaff.findIndex(s => s.id === staff.id);
  if (idx >= 0) store.salesStaff[idx] = staff;
  else store.salesStaff.push(staff);
  saveLocalStore();
  if (mysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query(`
        INSERT INTO sales_staff (id, staff_code, staff_name, father_name, mobile, whatsapp, address, city, territory, joining_date, status, remarks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          staff_code=VALUES(staff_code),
          staff_name=VALUES(staff_name),
          father_name=VALUES(father_name),
          mobile=VALUES(mobile),
          whatsapp=VALUES(whatsapp),
          address=VALUES(address),
          city=VALUES(city),
          territory=VALUES(territory),
          joining_date=VALUES(joining_date),
          status=VALUES(status),
          remarks=VALUES(remarks)
      `, [
        staff.id,
        staff.staffCode,
        staff.staffName,
        staff.fatherName || null,
        staff.mobile,
        staff.whatsapp || null,
        staff.address || null,
        staff.city || null,
        staff.territory || null,
        staff.joiningDate || null,
        staff.status || 'Active',
        staff.remarks || null
      ]);
    } catch (e) {
      console.error('MySQL write error (sales_staff):', e);
    }
  }
  res.json({ success: true, staff });
});

app.delete('/api/sales-staff/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  store.salesStaff = store.salesStaff.filter(s => s.id !== id);
  saveLocalStore();
  if (mysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query('DELETE FROM sales_staff WHERE id = ?', [id]);
    } catch (e) {
      console.error('MySQL delete error (sales_staff):', e);
    }
  }
  res.json({ success: true });
});

// Territories API
app.get('/api/territories', async (req: Request, res: Response) => {
  if (mysqlConnected && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query<any[]>('SELECT * FROM territories ORDER BY territory_name ASC');
      if (rows && rows.length > 0) {
        return res.json(rows.map(r => ({
          id: r.id,
          territoryCode: r.territory_code,
          territoryName: r.territory_name,
          city: r.city,
          district: r.district,
          description: r.description,
          status: r.status
        })));
      }
    } catch (e) {
      console.warn('MySQL read error (territories):', e);
    }
  }
  res.json(store.territories);
});

app.post('/api/territories', async (req: Request, res: Response) => {
  const terr = req.body;
  const idx = store.territories.findIndex(t => t.id === terr.id);
  if (idx >= 0) store.territories[idx] = terr;
  else store.territories.push(terr);
  saveLocalStore();
  if (mysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query(`
        INSERT INTO territories (id, territory_code, territory_name, city, district, description, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          territory_code=VALUES(territory_code),
          territory_name=VALUES(territory_name),
          city=VALUES(city),
          district=VALUES(district),
          description=VALUES(description),
          status=VALUES(status)
      `, [
        terr.id,
        terr.territoryCode,
        terr.territoryName,
        terr.city || null,
        terr.district || null,
        terr.description || null,
        terr.status || 'Active'
      ]);
    } catch (e) {
      console.error('MySQL write error (territories):', e);
    }
  }
  res.json({ success: true, territory: terr });
});

app.delete('/api/territories/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  store.territories = store.territories.filter(t => t.id !== id);
  saveLocalStore();
  if (mysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query('DELETE FROM territories WHERE id = ?', [id]);
    } catch (e) {
      console.error('MySQL delete error (territories):', e);
    }
  }
  res.json({ success: true });
});

// Products API
app.get('/api/products', async (req: Request, res: Response) => {
  if (mysqlConnected && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query<any[]>('SELECT * FROM products ORDER BY product_name ASC');
      if (rows && rows.length > 0) {
        return res.json(rows.map(r => ({
          id: r.id,
          productCode: r.product_code,
          productName: r.product_name,
          category: r.category,
          variety: r.variety,
          unit: r.unit,
          packSize: r.pack_size,
          purchaseRate: Number(r.purchase_rate || 0),
          saleRate: Number(r.sale_rate || 0),
          openingStock: Number(r.opening_stock || 0),
          openingStockRate: Number(r.opening_stock_rate || 0),
          minimumStock: Number(r.minimum_stock || 0),
          description: r.description,
          active: Boolean(r.active)
        })));
      }
    } catch (e) {
      console.warn('MySQL read error (products):', e);
    }
  }
  res.json(store.products);
});

app.post('/api/products', async (req: Request, res: Response) => {
  const product = req.body;
  const idx = store.products.findIndex(p => p.id === product.id);
  if (idx >= 0) store.products[idx] = product;
  else store.products.push(product);
  saveLocalStore();
  if (mysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query(`
        INSERT INTO products (id, product_code, product_name, category, variety, unit, pack_size, purchase_rate, sale_rate, opening_stock, opening_stock_rate, minimum_stock, description, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          product_code=VALUES(product_code),
          product_name=VALUES(product_name),
          category=VALUES(category),
          variety=VALUES(variety),
          unit=VALUES(unit),
          pack_size=VALUES(pack_size),
          purchase_rate=VALUES(purchase_rate),
          sale_rate=VALUES(sale_rate),
          opening_stock=VALUES(opening_stock),
          opening_stock_rate=VALUES(opening_stock_rate),
          minimum_stock=VALUES(minimum_stock),
          description=VALUES(description),
          active=VALUES(active)
      `, [
        product.id,
        product.productCode,
        product.productName,
        product.category || null,
        product.variety || null,
        product.unit || null,
        product.packSize || null,
        product.purchaseRate || 0,
        product.saleRate || 0,
        product.openingStock || 0,
        product.openingStockRate || 0,
        product.minimumStock || 0,
        product.description || null,
        product.active ? 1 : 0
      ]);
    } catch (e) {
      console.error('MySQL write error (products):', e);
    }
  }
  res.json({ success: true, product });
});

app.delete('/api/products/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  store.products = store.products.filter(p => p.id !== id);
  saveLocalStore();
  if (mysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query('DELETE FROM products WHERE id = ?', [id]);
    } catch (e) {
      console.error('MySQL delete error (products):', e);
    }
  }
  res.json({ success: true });
});

// Vouchers API
app.get('/api/vouchers', async (req: Request, res: Response) => {
  if (mysqlConnected && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query<any[]>('SELECT * FROM \`vouchers\` ORDER BY \`date\` DESC, \`created_at\` DESC');
      return res.json(rows.map(r => ({
        id: r.id,
        voucherNo: r.voucher_no,
        voucherType: r.voucher_type,
        date: r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0]) : '',
        salesStaff: r.sales_staff,
        lines: typeof r.lines === 'string' ? JSON.parse(r.lines || '[]') : (r.lines || []),
        totalAmount: Number(r.total_amount || 0),
        narration: r.narration,
        createdBy: r.created_by,
        createdAt: r.created_at
      })));
    } catch (e) {
      console.warn('MySQL read error (vouchers):', e);
    }
  }
  res.json(store.vouchers);
});

app.post('/api/vouchers', async (req: Request, res: Response) => {
  const voucher = req.body;
  const idx = store.vouchers.findIndex(v => v.id === voucher.id);
  if (idx >= 0) store.vouchers[idx] = voucher;
  else store.vouchers.push(voucher);
  saveLocalStore();

  let mysqlSaved = false;
  let mysqlError = null;
  if (mysqlConnected && mysqlPool) {
    try {
      const formattedDate = voucher.date ? String(voucher.date).split('T')[0] : new Date().toISOString().split('T')[0];
      const linesJson = typeof voucher.lines === 'string' ? voucher.lines : JSON.stringify(voucher.lines || []);
      const createdAtDate = voucher.createdAt ? new Date(voucher.createdAt) : new Date();

      await mysqlPool.query(`
        INSERT INTO \`vouchers\` (\`id\`, \`voucher_no\`, \`voucher_type\`, \`date\`, \`sales_staff\`, \`lines\`, \`total_amount\`, \`narration\`, \`created_by\`, \`created_at\`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`voucher_no\`=VALUES(\`voucher_no\`),
          \`voucher_type\`=VALUES(\`voucher_type\`),
          \`date\`=VALUES(\`date\`),
          \`sales_staff\`=VALUES(\`sales_staff\`),
          \`lines\`=VALUES(\`lines\`),
          \`total_amount\`=VALUES(\`total_amount\`),
          \`narration\`=VALUES(\`narration\`),
          \`created_by\`=VALUES(\`created_by\`)
      `, [
        voucher.id,
        voucher.voucherNo,
        voucher.voucherType,
        formattedDate,
        voucher.salesStaff || null,
        linesJson,
        Number(voucher.totalAmount || 0),
        voucher.narration || null,
        voucher.createdBy || 'System',
        createdAtDate
      ]);
      mysqlSaved = true;
    } catch (e: any) {
      mysqlError = e.message;
      console.error('MySQL write error (vouchers):', e);
    }
  }
  res.json({ success: true, voucher, mysqlSaved, mysqlError });
});

app.delete('/api/vouchers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  store.vouchers = store.vouchers.filter(v => v.id !== id);
  saveLocalStore();
  if (mysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query('DELETE FROM \`vouchers\` WHERE \`id\` = ?', [id]);
    } catch (e) {
      console.error('MySQL delete error (vouchers):', e);
    }
  }
  res.json({ success: true });
});

// Invoices API
app.get('/api/invoices', async (req: Request, res: Response) => {
  if (mysqlConnected && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query<any[]>('SELECT * FROM \`invoices\` ORDER BY \`date\` DESC, \`created_at\` DESC');
      return res.json(rows.map(r => ({
        id: r.id,
        invoiceNo: r.invoice_no,
        invoiceType: r.invoice_type,
        date: r.date ? (typeof r.date === 'string' ? r.date.split('T')[0] : new Date(r.date).toISOString().split('T')[0]) : '',
        accountName: r.account_name,
        salesStaff: r.sales_staff,
        territory: r.territory,
        originalInvoiceNo: r.original_invoice_no,
        reason: r.reason,
        items: typeof r.items === 'string' ? JSON.parse(r.items || '[]') : (r.items || []),
        grossTotal: Number(r.gross_total || 0),
        discountTotal: Number(r.discount_total || 0),
        netTotal: Number(r.net_total || 0),
        remarks: r.remarks,
        createdBy: r.created_by,
        createdAt: r.created_at
      })));
    } catch (e) {
      console.warn('MySQL read error (invoices):', e);
    }
  }
  res.json(store.invoices);
});

app.post('/api/invoices', async (req: Request, res: Response) => {
  const invoice = req.body;
  const idx = store.invoices.findIndex(i => i.id === invoice.id);
  if (idx >= 0) store.invoices[idx] = invoice;
  else store.invoices.push(invoice);
  saveLocalStore();

  let mysqlSaved = false;
  let mysqlError = null;
  if (mysqlConnected && mysqlPool) {
    try {
      const formattedDate = invoice.date ? String(invoice.date).split('T')[0] : new Date().toISOString().split('T')[0];
      const itemsJson = typeof invoice.items === 'string' ? invoice.items : JSON.stringify(invoice.items || []);
      const createdAtDate = invoice.createdAt ? new Date(invoice.createdAt) : new Date();

      await mysqlPool.query(`
        INSERT INTO \`invoices\` (\`id\`, \`invoice_no\`, \`invoice_type\`, \`date\`, \`account_name\`, \`sales_staff\`, \`territory\`, \`original_invoice_no\`, \`reason\`, \`items\`, \`gross_total\`, \`discount_total\`, \`net_total\`, \`remarks\`, \`created_by\`, \`created_at\`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          \`invoice_no\`=VALUES(\`invoice_no\`),
          \`invoice_type\`=VALUES(\`invoice_type\`),
          \`date\`=VALUES(\`date\`),
          \`account_name\`=VALUES(\`account_name\`),
          \`sales_staff\`=VALUES(\`sales_staff\`),
          \`territory\`=VALUES(\`territory\`),
          \`original_invoice_no\`=VALUES(\`original_invoice_no\`),
          \`reason\`=VALUES(\`reason\`),
          \`items\`=VALUES(\`items\`),
          \`gross_total\`=VALUES(\`gross_total\`),
          \`discount_total\`=VALUES(\`discount_total\`),
          \`net_total\`=VALUES(\`net_total\`),
          \`remarks\`=VALUES(\`remarks\`),
          \`created_by\`=VALUES(\`created_by\`)
      `, [
        invoice.id,
        invoice.invoiceNo,
        invoice.invoiceType,
        formattedDate,
        invoice.accountName,
        invoice.salesStaff || null,
        invoice.territory || null,
        invoice.originalInvoiceNo || null,
        invoice.reason || null,
        itemsJson,
        Number(invoice.grossTotal || 0),
        Number(invoice.discountTotal || 0),
        Number(invoice.netTotal || 0),
        invoice.remarks || null,
        invoice.createdBy || 'System',
        createdAtDate
      ]);
      mysqlSaved = true;
    } catch (e: any) {
      mysqlError = e.message;
      console.error('MySQL write error (invoices):', e);
    }
  }
  res.json({ success: true, invoice, mysqlSaved, mysqlError });
});

app.delete('/api/invoices/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  store.invoices = store.invoices.filter(i => i.id !== id);
  saveLocalStore();
  if (mysqlConnected && mysqlPool) {
    try {
      await mysqlPool.query('DELETE FROM \`invoices\` WHERE \`id\` = ?', [id]);
    } catch (e) {
      console.error('MySQL delete error (invoices):', e);
    }
  }
  res.json({ success: true });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distExists = fs.existsSync(path.resolve(process.cwd(), 'dist', 'index.html'));

  if (!isProd || !distExists) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Baba Fareed Seed Corporation ERP Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
