import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Account, Product } from '../types';
import { Printer, Download, Search, Eye, X } from 'lucide-react';
import { exportJsonToExcel } from '../utils/excelExport';
import {
  printReportDirect,
  downloadPdfFromReportHtml,
  buildStandardReportHeaderHtml,
  buildStandardReportFooterHtml
} from '../utils/reportPrinter';
import { formatDate } from '../utils/dateUtils';

export const LedgersComponent: React.FC = () => {
  const [ledgerType, setLedgerType] = useState<'account' | 'product'>('account');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [accountLedgerData, setAccountLedgerData] = useState<any[]>([]);
  const [productLedgerData, setProductLedgerData] = useState<any[]>([]);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [hasGeneratedAccountLedger, setHasGeneratedAccountLedger] = useState<boolean>(false);

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    const accs = await db.getAccounts();
    const prods = await db.getProducts();
    const profile = await db.getCompanyProfile();
    setAccounts(accs);
    setProducts(prods);
    setCompanyProfile(profile);
    if (accs.length > 0) {
      const cashInHand = accs.find(a => a.code === 'ACC-10000' || a.name.toUpperCase().includes('CASH IN HAND'));
      setSelectedAccountId(cashInHand ? cashInHand.id : accs[0].id);
    }
    if (prods.length > 0) setSelectedProductId(prods[0].id);
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const selectedProduct = products.find(p => p.id === selectedProductId);

  useEffect(() => {
    setHasGeneratedAccountLedger(false);
  }, [selectedAccountId, dateFrom, dateTo]);

  useEffect(() => {
    if (products.length > 0 && selectedProductId && ledgerType === 'product') {
      handleGenerate(undefined, selectedProductId);
    }
  }, [selectedProductId, ledgerType, dateFrom, dateTo, products.length]);

  const handleGenerate = async (customAccId?: string, customProdId?: string) => {
    const targetAccId = customAccId || selectedAccountId;
    const targetProdId = customProdId || selectedProductId;

    if (ledgerType === 'account') {
      setHasGeneratedAccountLedger(true);
      const acc = accounts.find(a => a.id === targetAccId);
      if (!acc) return;
      const vouchers = await db.getVouchers();
      const invoices = await db.getInvoices();

      // Opening balance from accounts table (Dr/Cr)
      let runningBalance = acc.openingBalanceType === 'Dr' ? Number(acc.openingBalance || 0) : -Number(acc.openingBalance || 0);

      // Sum all credit-debit transactions strictly before dateFrom
      vouchers.forEach(v => {
        const vDate = v.date ? v.date.split('T')[0] : '';
        if (vDate && vDate < dateFrom) {
          v.lines?.forEach(l => {
            if (l.accountId === targetAccId) {
              runningBalance += Number(l.debit || 0) - Number(l.credit || 0);
            }
          });
        }
      });

      invoices.forEach(inv => {
        const invDate = inv.date ? inv.date.split('T')[0] : '';
        if (invDate && invDate < dateFrom) {
          if (
            inv.accountName === acc.name ||
            inv.accountName === acc.id ||
            inv.accountName.toLowerCase() === acc.name.toLowerCase()
          ) {
            let debit = 0;
            let credit = 0;
            if (inv.invoiceType === 'SALES_CASH' || inv.invoiceType === 'SALES_CREDIT' || inv.invoiceType === 'PURCHASE_RETURN') {
              debit = Number(inv.netTotal || 0);
            } else if (inv.invoiceType === 'SALES_RETURN' || inv.invoiceType === 'PURCHASE_CASH' || inv.invoiceType === 'PURCHASE_CREDIT') {
              credit = Number(inv.netTotal || 0);
            }
            runningBalance += debit - credit;
          }
        }
      });

      const computedOpeningBalance = runningBalance;
      const rawEntries: any[] = [];

      vouchers.forEach(v => {
        const vDate = v.date ? v.date.split('T')[0] : '';
        if (vDate >= dateFrom && vDate <= dateTo) {
          v.lines?.forEach(l => {
            if (l.accountId === targetAccId) {
              rawEntries.push({
                date: v.date,
                voucherNo: v.voucherNo,
                description: v.narration || `${v.voucherType.replace('_', ' ')}`,
                debit: Number(l.debit || 0),
                credit: Number(l.credit || 0),
                timestamp: new Date(v.date).getTime()
              });
            }
          });
        }
      });

      invoices.forEach(inv => {
        const invDate = inv.date ? inv.date.split('T')[0] : '';
        if (invDate >= dateFrom && invDate <= dateTo) {
          if (
            inv.accountName === acc.name ||
            inv.accountName === acc.id ||
            inv.accountName.toLowerCase() === acc.name.toLowerCase()
          ) {
            let debit = 0;
            let credit = 0;
            let desc = '';
            if (inv.invoiceType === 'SALES_CASH' || inv.invoiceType === 'SALES_CREDIT') {
              debit = Number(inv.netTotal || 0);
              desc = `Sales Invoice #${inv.invoiceNo}`;
            } else if (inv.invoiceType === 'SALES_RETURN') {
              credit = Number(inv.netTotal || 0);
              desc = `Sales Return #${inv.invoiceNo}`;
            } else if (inv.invoiceType === 'PURCHASE_CASH' || inv.invoiceType === 'PURCHASE_CREDIT') {
              credit = Number(inv.netTotal || 0);
              desc = `Purchase Invoice #${inv.invoiceNo}`;
            } else if (inv.invoiceType === 'PURCHASE_RETURN') {
              debit = Number(inv.netTotal || 0);
              desc = `Purchase Return #${inv.invoiceNo}`;
            }
            if (debit > 0 || credit > 0) {
              rawEntries.push({
                date: inv.date,
                voucherNo: inv.invoiceNo,
                description: desc,
                items: inv.items || [],
                debit,
                credit,
                timestamp: new Date(inv.date).getTime()
              });
            }
          }
        }
      });

      rawEntries.sort((a, b) => a.timestamp - b.timestamp);
      const entries: any[] = [
        {
          date: 'Opening',
          voucherNo: 'OPENING',
          description: 'Opening Balance',
          debit: 0,
          credit: 0,
          balance: computedOpeningBalance
        }
      ];

      rawEntries.forEach(e => {
        runningBalance += e.debit - e.credit;
        entries.push({
          date: e.date,
          voucherNo: e.voucherNo,
          description: e.description,
          items: e.items,
          debit: e.debit,
          credit: e.credit,
          balance: runningBalance
        });
      });

      setAccountLedgerData(entries);
    } else {
      const prod = products.find(p => p.id === targetProdId);
      if (!prod) return;
      const invoices = await db.getInvoices();
      let runningQty = Number(prod.openingStock || 0);

      const entries: any[] = [
        {
          date: 'Opening',
          referenceNo: 'OPENING',
          transaction: 'Opening Stock',
          inQty: Number(prod.openingStock || 0),
          outQty: 0,
          rate: Number(prod.openingStockRate || 0),
          balanceQty: runningQty
        }
      ];

      invoices.forEach(inv => {
        const invDate = inv.date ? inv.date.split('T')[0] : '';
        if (invDate >= dateFrom && invDate <= dateTo) {
          inv.items?.forEach(item => {
            if (item.productId === targetProdId) {
              const isIn = inv.invoiceType.includes('PURCHASE') || inv.invoiceType.includes('SALES_RETURN');
              const inQty = isIn ? Number(item.quantity || 0) : 0;
              const outQty = !isIn ? Number(item.quantity || 0) : 0;
              if (inQty > 0 || outQty > 0) {
                runningQty += inQty - outQty;
                entries.push({
                  date: inv.date,
                  referenceNo: inv.invoiceNo,
                  transaction: inv.invoiceType.replace('_', ' '),
                  inQty,
                  outQty,
                  rate: Number(item.rate || 0),
                  balanceQty: runningQty
                });
              }
            }
          });
        }
      });
      setProductLedgerData(entries);
    }
  };

  const buildLedgerHtml = (): string => {
    const acc = accounts.find(a => a.id === selectedAccountId);
    const prod = products.find(p => p.id === selectedProductId);
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const compAddr = companyProfile?.headOfficeAddress || '7-K.M MULTAN ROAD VEHARI';
    const compPhone = companyProfile?.phone || companyProfile?.mobile || '+92 300 3179077';
    const logoUrl = companyProfile?.logoUrl || '/logoittehad.png';

    const headerHtml = buildStandardReportHeaderHtml({
      companyName: compName,
      headOfficeAddress: compAddr,
      phone: compPhone,
      logoUrl: logoUrl,
      reportTitle: ledgerType === 'account' ? 'ACCOUNT LEDGER STATEMENT' : 'PRODUCT STOCK LEDGER',
      periodText: `${formatDate(dateFrom)} to ${formatDate(dateTo)}`,
      badgeCodeLabel: ledgerType === 'account' ? 'ACCOUNT CODE' : 'PRODUCT CODE',
      badgeCode: ledgerType === 'account' ? acc?.code || 'N/A' : prod?.productCode || 'N/A',
      badgeNameLabel: ledgerType === 'account' ? 'ACCOUNT NAME' : 'PRODUCT NAME',
      badgeName: ledgerType === 'account' ? acc?.name || 'N/A' : `${prod?.productName || 'N/A'} (${prod?.variety || ''})`,
      metaLines:
        ledgerType === 'account'
          ? [
              `<strong>Account Head:</strong> ${acc?.accountType || 'N/A'}`,
              acc?.phone ? `<strong>Phone:</strong> ${acc.phone}` : '',
              acc?.salesStaff ? `<strong>Sales Officer:</strong> ${acc.salesStaff}` : '',
              `<strong>Opening Balance:</strong> PKR ${Number(acc?.openingBalance || 0).toLocaleString()} ${acc?.openingBalanceType || 'Dr'}`
            ].filter(Boolean) as string[]
          : [
              `<strong>Pack Size:</strong> ${prod?.packSize || 'N/A'}`,
              `<strong>Sale Rate:</strong> PKR ${Number(prod?.saleRate || 0).toLocaleString()}`,
              `<strong>Opening Stock:</strong> ${prod?.openingStock || 0}`
            ].filter(Boolean) as string[]
    });

    let tableRows = '';
    let totalDebit = 0;
    let totalCredit = 0;

    if (ledgerType === 'account') {
      accountLedgerData.forEach(e => {
        if (e.voucherNo !== 'OPENING') {
          totalDebit += Number(e.debit || 0);
          totalCredit += Number(e.credit || 0);
        }
      });
      const finalBalance = accountLedgerData.length > 0 ? accountLedgerData[accountLedgerData.length - 1].balance : 0;
      tableRows = accountLedgerData
        .map(
          e => `
        <tr>
          <td style="white-space:nowrap;font-family:monospace;font-size:10px;">${e.date === 'Opening' ? 'Opening' : formatDate(e.date)}</td>
          <td style="font-family:monospace;font-weight:bold;color:#065f46;">${e.voucherNo}</td>
          <td>
            <div style="font-weight:600;">${e.description}</div>
          </td>
          <td style="text-align:right;font-family:monospace;">${e.debit ? Number(e.debit).toLocaleString() : '-'}</td>
          <td style="text-align:right;font-family:monospace;">${e.credit ? Number(e.credit).toLocaleString() : '-'}</td>
          <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">
            ${Number(e.balance).toLocaleString()} ${e.balance >= 0 ? 'Dr' : 'Cr'}
          </td>
        </tr>
      `
        )
        .join('');

      return `
        <div>
          ${headerHtml}
          <table>
            <thead>
              <tr>
                <th style="width:85px;">Date</th>
                <th style="width:115px;">Voucher / Ref #</th>
                <th>Description / Particulars</th>
                <th style="width:110px;text-align:right;">Debit (PKR)</th>
                <th style="width:110px;text-align:right;">Credit (PKR)</th>
                <th style="width:125px;text-align:right;">Balance (PKR)</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="text-align:right;font-weight:bold;">Total / Closing Balance:</td>
                <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">PKR ${totalDebit.toLocaleString()}</td>
                <td style="text-align:right;font-family:monospace;font-weight:bold;color:#b91c1c;">PKR ${totalCredit.toLocaleString()}</td>
                <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;font-size:11.5px;">
                  PKR ${finalBalance.toLocaleString()} ${finalBalance >= 0 ? 'Dr' : 'Cr'}
                </td>
              </tr>
            </tfoot>
          </table>
          ${buildStandardReportFooterHtml(compName)}
        </div>
      `;
    } else {
      tableRows = productLedgerData
        .map(
          e => `
        <tr>
          <td style="white-space:nowrap;font-family:monospace;font-size:10px;">${e.date === 'Opening' ? 'Opening' : formatDate(e.date)}</td>
          <td style="font-family:monospace;font-weight:bold;color:#065f46;">${e.referenceNo}</td>
          <td style="font-weight:600;">${e.transaction}</td>
          <td style="text-align:right;font-family:monospace;font-weight:bold;color:#047857;">${e.inQty || '-'}</td>
          <td style="text-align:right;font-family:monospace;font-weight:bold;color:#b91c1c;">${e.outQty || '-'}</td>
          <td style="text-align:right;font-family:monospace;">${Number(e.rate || 0).toLocaleString()}</td>
          <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">${e.balanceQty}</td>
        </tr>
      `
        )
        .join('');

      return `
        <div>
          ${headerHtml}
          <table>
            <thead>
              <tr>
                <th style="width:85px;">Date</th>
                <th style="width:115px;">Reference #</th>
                <th>Transaction Details</th>
                <th style="width:90px;text-align:right;">In Qty</th>
                <th style="width:90px;text-align:right;">Out Qty</th>
                <th style="width:100px;text-align:right;">Rate (PKR)</th>
                <th style="width:105px;text-align:right;">Balance Qty</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          ${buildStandardReportFooterHtml(compName)}
        </div>
      `;
    }
  };

  const handlePrint = () => {
    const acc = accounts.find(a => a.id === selectedAccountId);
    const prod = products.find(p => p.id === selectedProductId);
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const name = ledgerType === 'account' ? acc?.name || 'Account' : prod?.productName || 'Product';
    const htmlContent = buildLedgerHtml();
    printReportDirect({
      title: `${compName} - ${name} Ledger`,
      htmlContent,
      landscape: false
    });
  };

  const exportPdf = async () => {
    const acc = accounts.find(a => a.id === selectedAccountId);
    const prod = products.find(p => p.id === selectedProductId);
    const name = ledgerType === 'account' ? acc?.name || 'Account' : prod?.productName || 'Product';
    const htmlContent = buildLedgerHtml();
    await downloadPdfFromReportHtml({
      htmlContent,
      filename: `${name.replace(/\s+/g, '_')}_ledger.pdf`,
      landscape: false
    });
  };

  const exportExcel = () => {
    const dataToExport = ledgerType === 'account'
      ? accountLedgerData.map(e => ({
          Date: e.date,
          'Voucher No': e.voucherNo,
          Description: e.description,
          Debit: e.debit,
          Credit: e.credit,
          Balance: e.balance
        }))
      : productLedgerData.map(e => ({
          Date: e.date,
          'Reference No': e.referenceNo,
          Transaction: e.transaction,
          'In Qty': e.inQty,
          'Out Qty': e.outQty,
          Rate: e.rate,
          'Balance Qty': e.balanceQty
        }));
    const acc = accounts.find(a => a.id === selectedAccountId);
    const prod = products.find(p => p.id === selectedProductId);
    const name = ledgerType === 'account' ? acc?.name || 'account' : prod?.productName || 'product';
    exportJsonToExcel(dataToExport, 'Ledger', `${name.replace(/\s+/g, '_')}_ledger.xlsx`);
  };

  let calcTotDebit = 0;
  let calcTotCredit = 0;
  accountLedgerData.forEach(e => {
    if (e.voucherNo !== 'OPENING') {
      calcTotDebit += Number(e.debit || 0);
      calcTotCredit += Number(e.credit || 0);
    }
  });
  const calcFinalBalance = accountLedgerData.length > 0 ? accountLedgerData[accountLedgerData.length - 1].balance : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight">Financial & Product Ledgers</h2>
          <p className="text-sm text-gray-500">View detailed account ledgers with running balance and product stock movements</p>
        </div>
        <div className="flex space-x-2 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
          <button
            onClick={() => setLedgerType('account')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              ledgerType === 'account' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Account Ledger
          </button>
          <button
            onClick={() => setLedgerType('product')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              ledgerType === 'product' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Product Stock Ledger
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {ledgerType === 'account' ? (
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Select Account</label>
              <input
                type="text"
                placeholder="Search account by name or code..."
                value={accountSearch}
                onChange={e => setAccountSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-1.5 text-xs mb-2 focus:border-emerald-600 focus:outline-hidden"
              />
              <select
                value={selectedAccountId}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden bg-white font-medium"
              >
                {accounts
                  .filter(
                    a =>
                      a.id === selectedAccountId ||
                      a.name.toLowerCase().includes(accountSearch.toLowerCase()) ||
                      a.code.toLowerCase().includes(accountSearch.toLowerCase())
                  )
                  .map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name} ({a.accountType})
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Select Product / Seed</label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden bg-white font-medium"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.productCode} - {p.productName} ({p.variety})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 flex-wrap gap-3">
          <button
            onClick={() => handleGenerate()}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Generate Ledger</span>
          </button>
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Ledger</span>
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3.5 py-2.5 rounded-xl text-sm font-bold border border-emerald-200 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center space-x-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2.5 rounded-xl text-sm font-bold border border-gray-200 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={exportExcel}
              className="flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 px-3.5 py-2.5 rounded-xl text-sm font-bold border border-blue-200 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Output Box */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between border-b-2 border-emerald-950 pb-5 gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-white border border-gray-300 rounded-2xl overflow-hidden p-1 shadow-sm flex items-center justify-center shrink-0">
              <img src={companyProfile?.logoUrl || '/logoittehad.png'} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h2 className="text-xl font-black text-emerald-950 uppercase tracking-wide">
                {companyProfile?.companyName || 'BABA FAREED SEED CORPORATION'}
              </h2>
              <p className="text-xs text-gray-600 font-medium">
                {companyProfile?.headOfficeAddress || '7-K.M MULTAN ROAD VEHARI'} | PH: {companyProfile?.phone || '+92 300 3179077'}
              </p>
              {ledgerType === 'account' && selectedAccount && (
                <div className="mt-3 pt-2.5 border-t border-emerald-950/20">
                  <div className="flex flex-wrap items-center gap-x-2 text-base font-black text-gray-900 uppercase">
                    <span className="text-xs font-bold text-gray-500 uppercase">Account Code:</span>
                    <span className="font-mono text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 text-sm">{selectedAccount.code}</span>
                    <span className="text-gray-400 mx-1">|</span>
                    <span className="text-xs font-bold text-gray-500 uppercase">Account Name:</span>
                    <span className="text-emerald-950 text-base font-black">{selectedAccount.name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider">
              {ledgerType === 'account' ? 'Account Ledger Statement' : 'Product Stock Ledger'}
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5">Period: {dateFrom} to {dateTo}</p>
          </div>
        </div>

        {ledgerType === 'account' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-gray-300">
              <thead>
                <tr className="border-b border-gray-300 text-xs font-bold uppercase text-gray-700 bg-gray-100">
                  <th className="py-3 px-3 border-r border-gray-300 w-28">Date</th>
                  <th className="py-3 px-3 border-r border-gray-300 w-36">Voucher / Ref</th>
                  <th className="py-3 px-3 border-r border-gray-300">Description</th>
                  <th className="py-3 px-3 border-r border-gray-300 text-right w-32">Debit (PKR)</th>
                  <th className="py-3 px-3 border-r border-gray-300 text-right w-32">Credit (PKR)</th>
                  <th className="py-3 px-3 text-right w-36">Balance (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 text-sm">
                {!hasGeneratedAccountLedger ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-gray-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Search className="w-8 h-8 text-emerald-600 opacity-60 animate-bounce" />
                        <p className="font-bold text-gray-800">Ready to Generate Account Ledger</p>
                        <p className="text-xs text-gray-400">Select an account and date range, then click "Generate Ledger".</p>
                      </div>
                    </td>
                  </tr>
                ) : accountLedgerData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      No ledger transactions found for this account in the selected date range.
                    </td>
                  </tr>
                ) : (
                  accountLedgerData.map((e, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 align-top">
                      <td className="py-3 px-3 border-r border-gray-300 text-gray-600 font-mono text-xs">{e.date}</td>
                      <td className="py-3 px-3 border-r border-gray-300 font-mono font-bold text-emerald-800">{e.voucherNo}</td>
                      <td className="py-3 px-3 border-r border-gray-300 text-gray-900 font-medium">{e.description}</td>
                      <td className="py-3 px-3 border-r border-gray-300 text-right font-semibold text-gray-800 font-mono">
                        {e.debit ? Number(e.debit).toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-3 border-r border-gray-300 text-right font-semibold text-gray-800 font-mono">
                        {e.credit ? Number(e.credit).toLocaleString() : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-emerald-800 font-mono">
                        {Number(e.balance).toLocaleString()} {e.balance >= 0 ? 'Dr' : 'Cr'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {ledgerType === 'account' && hasGeneratedAccountLedger && (
                <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={3} className="py-3.5 px-3 text-right uppercase text-gray-900">Total & Closing Balance:</td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-900">PKR {calcTotDebit.toLocaleString()}</td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-rose-700">PKR {calcTotCredit.toLocaleString()}</td>
                    <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-950 text-base">
                      PKR {calcFinalBalance.toLocaleString()} {calcFinalBalance >= 0 ? 'Dr' : 'Cr'}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-gray-300">
              <thead>
                <tr className="border-b border-gray-300 text-xs font-bold uppercase text-gray-700 bg-gray-100">
                  <th className="py-3 px-3 border-r border-gray-300 w-28">Date</th>
                  <th className="py-3 px-3 border-r border-gray-300 w-36">Reference</th>
                  <th className="py-3 px-3 border-r border-gray-300">Transaction</th>
                  <th className="py-3 px-3 border-r border-gray-300 text-right w-28">In Qty</th>
                  <th className="py-3 px-3 border-r border-gray-300 text-right w-28">Out Qty</th>
                  <th className="py-3 px-3 border-r border-gray-300 text-right w-32">Rate (PKR)</th>
                  <th className="py-3 px-3 text-right w-32">Balance Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 text-sm">
                {productLedgerData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      No stock transactions recorded for this product in the selected period.
                    </td>
                  </tr>
                ) : (
                  productLedgerData.map((e, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-3 px-3 border-r border-gray-300 text-gray-600 font-mono text-xs">{e.date}</td>
                      <td className="py-3 px-3 border-r border-gray-300 font-mono font-bold text-emerald-800">{e.referenceNo}</td>
                      <td className="py-3 px-3 border-r border-gray-300 font-semibold text-gray-900">{e.transaction}</td>
                      <td className="py-3 px-3 border-r border-gray-300 text-right font-bold text-emerald-700 font-mono">{e.inQty || '-'}</td>
                      <td className="py-3 px-3 border-r border-gray-300 text-right font-bold text-rose-600 font-mono">{e.outQty || '-'}</td>
                      <td className="py-3 px-3 border-r border-gray-300 text-right text-gray-700 font-mono">{e.rate ? Number(e.rate).toLocaleString() : '-'}</td>
                      <td className="py-3 px-3 text-right font-black text-gray-900 font-mono">{e.balanceQty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PREVIEW MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-gray-900 text-white">
              <h3 className="font-bold text-lg flex items-center space-x-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <span>Ledger Print Preview</span>
              </h3>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={exportPdf}
                  className="flex items-center space-x-1.5 bg-gray-700 hover:bg-gray-600 text-white px-3.5 py-2 rounded-xl text-sm font-bold cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-8 overflow-y-auto bg-gray-50 flex-1">
              <div className="bg-white p-8 border border-gray-300 shadow-sm rounded-2xl max-w-3xl mx-auto space-y-6 text-gray-900">
                <div className="flex items-start justify-between border-b-2 border-emerald-950 pb-4">
                  <div className="flex items-start space-x-3">
                    <img src={companyProfile?.logoUrl || '/logoittehad.png'} alt="Logo" className="w-14 h-14 object-contain" />
                    <div>
                      <h2 className="text-xl font-black text-emerald-950 uppercase tracking-wide">
                        {companyProfile?.companyName || 'BABA FAREED SEED CORPORATION'}
                      </h2>
                      <p className="text-xs text-gray-600">
                        {companyProfile?.headOfficeAddress || '7-K.M MULTAN ROAD VEHARI'} | PH: {companyProfile?.phone || '+92 300 3179077'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">OFFICIAL LEDGER</div>
                    <div className="text-[10px] text-gray-500 font-mono mt-0.5">Printed: {new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                {ledgerType === 'account' && selectedAccount && (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">ACCOUNT LEDGER STATEMENT</div>
                    <div className="text-base font-black text-gray-900 uppercase mt-1 flex flex-wrap items-center gap-2">
                      <span className="bg-emerald-900 text-white font-mono text-xs px-2 py-0.5 rounded">CODE: {selectedAccount.code}</span>
                      <span>NAME: {selectedAccount.name}</span>
                    </div>
                  </div>
                )}

                <table className="w-full text-left border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr className="bg-emerald-950 text-white font-bold uppercase text-[10px]">
                      <th className="p-2 border border-emerald-950">Date</th>
                      <th className="p-2 border border-emerald-950">Ref #</th>
                      <th className="p-2 border border-emerald-950">Description</th>
                      <th className="p-2 border border-emerald-950 text-right">Debit</th>
                      <th className="p-2 border border-emerald-950 text-right">Credit</th>
                      <th className="p-2 border border-emerald-950 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountLedgerData.map((e, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="p-2 border font-mono">{e.date}</td>
                        <td className="p-2 border font-mono font-bold text-emerald-800">{e.voucherNo}</td>
                        <td className="p-2 border font-medium">{e.description}</td>
                        <td className="p-2 border text-right font-mono">{e.debit ? Number(e.debit).toLocaleString() : '-'}</td>
                        <td className="p-2 border text-right font-mono">{e.credit ? Number(e.credit).toLocaleString() : '-'}</td>
                        <td className="p-2 border text-right font-mono font-bold text-emerald-900">
                          {Number(e.balance).toLocaleString()} {e.balance >= 0 ? 'Dr' : 'Cr'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
