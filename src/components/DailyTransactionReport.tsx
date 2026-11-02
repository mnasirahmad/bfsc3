import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Invoice, Voucher, CompanyProfileData, Account } from '../types';
import { Printer, Download, Search } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';
import { exportJsonToExcel } from '../utils/excelExport';
import {
  printReportDirect,
  downloadPdfFromReportHtml,
  buildStandardReportHeaderHtml,
  buildStandardReportFooterHtml
} from '../utils/reportPrinter';

export const DailyTransactionReportComponent: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileData | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const invs = await db.getInvoices();
    const vocs = await db.getVouchers();
    const accs = await db.getAccounts();
    const profile = await db.getCompanyProfile();
    setInvoices(invs);
    setVouchers(vocs);
    setAccounts(accs);
    setCompanyProfile(profile);
  };

  const getAccountCode = (name: string) => {
    const acc = accounts.find(a => a.name.toLowerCase() === name.toLowerCase());
    return acc ? acc.code : '1000';
  };

  const filteredInvoices = invoices.filter(i => i.date >= dateFrom && i.date <= dateTo);
  const filteredVouchers = vouchers.filter(v => v.date >= dateFrom && v.date <= dateTo);

  const salesInvoices = filteredInvoices.filter(i => i.invoiceType === 'SALES_CASH' || i.invoiceType === 'SALES_CREDIT');
  const purchaseInvoices = filteredInvoices.filter(i => i.invoiceType === 'PURCHASE_CASH' || i.invoiceType === 'PURCHASE_CREDIT');
  const salesReturns = filteredInvoices.filter(i => i.invoiceType === 'SALES_RETURN');
  const purchaseReturns = filteredInvoices.filter(i => i.invoiceType === 'PURCHASE_RETURN');
  const cpvVouchers = filteredVouchers.filter(v => v.voucherType === 'CASH_PAYMENT');
  const crvVouchers = filteredVouchers.filter(v => v.voucherType === 'CASH_RECEIPT');
  const jvVouchers = filteredVouchers.filter(v => v.voucherType === 'JOURNAL');

  const getCashBalanceUpTo = (targetDate: string, isEnd: boolean = true) => {
    const cashAcc = accounts.find(a => a.code === 'ACC-10000' || a.name.toLowerCase().includes('cash in hand') || a.accountType === 'Cash/Banks');
    if (!cashAcc) return 0;
    let bal = cashAcc.openingBalanceType === 'Dr' ? Number(cashAcc.openingBalance || 0) : -Number(cashAcc.openingBalance || 0);
    const dateCondition = (d: string) => isEnd ? d <= targetDate : d < targetDate;

    vouchers.forEach(v => {
      const vDate = v.date ? v.date.split('T')[0] : '';
      if (vDate && dateCondition(vDate)) {
        v.lines?.forEach(l => {
          if (
            l.accountId === cashAcc.id ||
            l.accountId === cashAcc.code ||
            l.accountName === cashAcc.name ||
            l.accountName.toLowerCase().includes('cash in hand')
          ) {
            bal += Number(l.debit || 0) - Number(l.credit || 0);
          }
        });
      }
    });

    invoices.forEach(inv => {
      const invDate = inv.date ? inv.date.split('T')[0] : '';
      if (invDate && dateCondition(invDate)) {
        if (
          inv.accountName === cashAcc.name ||
          inv.accountName === cashAcc.id ||
          inv.accountName.toLowerCase() === cashAcc.name.toLowerCase() ||
          inv.accountName === cashAcc.code
        ) {
          let debit = 0;
          let credit = 0;
          if (inv.invoiceType === 'SALES_CASH' || inv.invoiceType === 'SALES_CREDIT' || inv.invoiceType === 'PURCHASE_RETURN') {
            debit = Number(inv.netTotal || 0);
          } else if (inv.invoiceType === 'SALES_RETURN' || inv.invoiceType === 'PURCHASE_CASH' || inv.invoiceType === 'PURCHASE_CREDIT') {
            credit = Number(inv.netTotal || 0);
          }
          bal += debit - credit;
        } else {
          if (inv.invoiceType === 'SALES_CASH') {
            bal += Number(inv.netTotal || 0);
          } else if (inv.invoiceType === 'PURCHASE_CASH') {
            bal -= Number(inv.netTotal || 0);
          }
        }
      }
    });
    return bal;
  };

  const cashBalFrom = getCashBalanceUpTo(dateFrom, false);
  const cashBalTo = getCashBalanceUpTo(dateTo, true);

  const totalSalesNet = salesInvoices.reduce((s, i) => s + i.netTotal, 0);
  const totalPurchaseNet = purchaseInvoices.reduce((s, i) => s + i.netTotal, 0);
  const totalSalesReturnNet = salesReturns.reduce((s, i) => s + i.netTotal, 0);
  const totalPurchaseReturnNet = purchaseReturns.reduce((s, i) => s + i.netTotal, 0);
  const totalCpvAmount = cpvVouchers.reduce((s, v) => s + v.totalAmount, 0);
  const totalCrvAmount = crvVouchers.reduce((s, v) => s + v.totalAmount, 0);
  const totalJvAmount = jvVouchers.reduce((sum, v) => sum + (v.lines?.reduce((s, l) => s + (l.debit || 0), 0) || 0), 0);

  const buildDailyReportHtml = (): string => {
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const compAddr = companyProfile?.headOfficeAddress || '7-K.M MULTAN ROAD VEHARI';
    const compPhone = companyProfile?.phone || companyProfile?.mobile || '+92 300 3179077';
    const logoUrl = companyProfile?.logoUrl || '/logoittehad.png';

    const headerHtml = buildStandardReportHeaderHtml({
      companyName: compName,
      headOfficeAddress: compAddr,
      phone: compPhone,
      logoUrl: logoUrl,
      reportTitle: 'DAILY TRANSACTION REPORT',
      periodText: `${formatDate(dateFrom)} to ${formatDate(dateTo)}`,
      metaLines: [
        `<strong>Cash in Hand (${formatDate(dateFrom)}):</strong> PKR ${cashBalFrom.toLocaleString()}`,
        `<strong>Cash in Hand (${formatDate(dateTo)}):</strong> PKR ${cashBalTo.toLocaleString()}`,
        `<strong>Sales Total:</strong> PKR ${totalSalesNet.toLocaleString()}`,
        `<strong>Purchase Total:</strong> PKR ${totalPurchaseNet.toLocaleString()}`
      ]
    });

    let sectionsHtml = '';
    const renderSection = (title: string, rows: any[], subtotalLabel: string, subtotalVal: string) => {
      if (rows.length === 0) return '';
      return `
        <tr style="background:#f0fdf4;border-top:2px solid #064e3b;">
          <td colspan="6" style="padding:6px 8px;font-weight:900;color:#064e3b;font-size:11px;text-transform:uppercase;">
            ${title}
          </td>
        </tr>
        ${rows
          .map(
            r => `
          <tr>
            <td style="font-family:monospace;font-size:10px;font-weight:bold;">${r[0]}</td>
            <td style="font-family:monospace;font-weight:bold;color:#065f46;">${r[1]}</td>
            <td>${r[2]}</td>
            <td style="text-align:right;font-family:monospace;">${r[3]}</td>
            <td style="text-align:right;font-family:monospace;">${r[4]}</td>
            <td style="text-align:right;font-family:monospace;font-weight:bold;">${r[5]}</td>
          </tr>
        `
          )
          .join('')}
        <tr style="background:#e6f4ea;border-top:1px dashed #047857;font-weight:bold;">
          <td colspan="5" style="padding:5px 8px;text-align:right;font-size:10px;text-transform:uppercase;color:#064e3b;">${subtotalLabel}:</td>
          <td style="text-align:right;font-family:monospace;font-size:11px;color:#064e3b;">PKR ${subtotalVal}</td>
        </tr>
      `;
    };

    const salesRows: any[] = [];
    salesInvoices.forEach(inv => {
      inv.items.forEach(item => {
        salesRows.push([
          getAccountCode(inv.accountName),
          inv.invoiceNo,
          `${inv.accountName} - ${item.productName} (${item.quantity} ${item.unit} @ ${item.rate})`,
          '',
          Number(item.amount).toLocaleString(),
          Number(inv.netTotal).toLocaleString()
        ]);
      });
    });

    const purchaseRows: any[] = [];
    purchaseInvoices.forEach(inv => {
      inv.items.forEach(item => {
        purchaseRows.push([
          getAccountCode(inv.accountName),
          inv.invoiceNo,
          `${inv.accountName} - ${item.productName} (${item.quantity} ${item.unit} @ ${item.rate})`,
          Number(item.amount).toLocaleString(),
          '',
          Number(inv.netTotal).toLocaleString()
        ]);
      });
    });

    const sReturnsRows: any[] = [];
    salesReturns.forEach(inv => {
      inv.items.forEach(item => {
        sReturnsRows.push([
          getAccountCode(inv.accountName),
          inv.invoiceNo,
          `${inv.accountName} - ${item.productName} (${item.quantity} ${item.unit} @ ${item.rate})`,
          '',
          Number(item.amount).toLocaleString(),
          Number(inv.netTotal).toLocaleString()
        ]);
      });
    });

    const pReturnsRows: any[] = [];
    purchaseReturns.forEach(inv => {
      inv.items.forEach(item => {
        pReturnsRows.push([
          getAccountCode(inv.accountName),
          inv.invoiceNo,
          `${inv.accountName} - ${item.productName} (${item.quantity} ${item.unit} @ ${item.rate})`,
          Number(item.amount).toLocaleString(),
          '',
          Number(inv.netTotal).toLocaleString()
        ]);
      });
    });

    const cpvRows: any[] = [];
    cpvVouchers.forEach(v => {
      cpvRows.push([
        getAccountCode(v.lines?.[1]?.accountName || ''),
        v.voucherNo,
        `${v.lines?.[1]?.accountName || 'CPV'} - ${v.narration || ''}`,
        Number(v.totalAmount).toLocaleString(),
        '',
        Number(v.totalAmount).toLocaleString()
      ]);
    });

    const crvRows: any[] = [];
    crvVouchers.forEach(v => {
      crvRows.push([
        getAccountCode(v.lines?.[0]?.accountName || ''),
        v.voucherNo,
        `${v.lines?.[0]?.accountName || 'CRV'} - ${v.narration || ''}`,
        '',
        Number(v.totalAmount).toLocaleString(),
        Number(v.totalAmount).toLocaleString()
      ]);
    });

    const jvRows: any[] = [];
    jvVouchers.forEach(v => {
      v.lines?.forEach(l => {
        jvRows.push([
          getAccountCode(l.accountName),
          v.voucherNo,
          `${l.accountName} - ${l.description || v.narration || 'Journal Entry'}`,
          l.debit ? Number(l.debit).toLocaleString() : '',
          l.credit ? Number(l.credit).toLocaleString() : '',
          Number(v.totalAmount).toLocaleString()
        ]);
      });
    });

    sectionsHtml += renderSection('Sales Invoices', salesRows, 'Sub Total - Sales Invoices', totalSalesNet.toLocaleString());
    sectionsHtml += renderSection('Purchase Invoices', purchaseRows, 'Sub Total - Purchase Invoices', totalPurchaseNet.toLocaleString());
    sectionsHtml += renderSection('Sales Return Invoices', sReturnsRows, 'Sub Total - Sales Returns', totalSalesReturnNet.toLocaleString());
    sectionsHtml += renderSection('Purchase Return Invoices', pReturnsRows, 'Sub Total - Purchase Returns', totalPurchaseReturnNet.toLocaleString());
    sectionsHtml += renderSection('Cash Payment Vouchers (CPV)', cpvRows, 'Sub Total - Cash Payments', totalCpvAmount.toLocaleString());
    sectionsHtml += renderSection('Cash Receipt Vouchers (CRV)', crvRows, 'Sub Total - Cash Receipts', totalCrvAmount.toLocaleString());
    sectionsHtml += renderSection('Journal Vouchers (JV)', jvRows, 'Sub Total - Journal Vouchers', totalJvAmount.toLocaleString());

    return `
      <div>
        ${headerHtml}
        <table>
          <thead>
            <tr>
              <th style="width:75px;">Code</th>
              <th style="width:110px;">Doc / Inv #</th>
              <th>Description & Account Head</th>
              <th style="width:105px;text-align:right;">Debit (PKR)</th>
              <th style="width:105px;text-align:right;">Credit (PKR)</th>
              <th style="width:115px;text-align:right;">Total (PKR)</th>
            </tr>
          </thead>
          <tbody>
            ${sectionsHtml}
          </tbody>
        </table>
        <div style="margin-top:16px;padding:12px 16px;background:#f0fdf4;border:2px solid #047857;border-radius:8px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:16px;font-size:11.5px;">
          <div><strong>Cash in Hand (${formatDate(dateFrom)}):</strong> <span style="font-family:monospace;font-weight:bold;color:#1e3a8a;">PKR ${cashBalFrom.toLocaleString()}</span></div>
          <div><strong>Cash in Hand (${formatDate(dateTo)}):</strong> <span style="font-family:monospace;font-weight:bold;color:#064e3b;font-size:13px;">PKR ${cashBalTo.toLocaleString()}</span></div>
        </div>
        ${buildStandardReportFooterHtml(compName)}
      </div>
    `;
  };

  const handlePrint = () => {
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const htmlContent = buildDailyReportHtml();
    printReportDirect({
      title: `${compName} - Daily Transaction Report`,
      htmlContent,
      landscape: true
    });
  };

  const exportPdf = async () => {
    const htmlContent = buildDailyReportHtml();
    await downloadPdfFromReportHtml({
      htmlContent,
      filename: `Daily_Transaction_Report_${dateFrom}_to_${dateTo}.pdf`,
      landscape: true
    });
  };

  const exportExcel = () => {
    const wsData: any[] = [];
    filteredInvoices.forEach(inv => {
      inv.items.forEach(item => {
        wsData.push({
          Date: inv.date,
          Code: getAccountCode(inv.accountName),
          'Doc No': inv.invoiceNo,
          Type: inv.invoiceType,
          'Account / Party': inv.accountName,
          'Product / Details': `${item.productName} (${item.quantity} ${item.unit} @ ${item.rate})`,
          'Item Amount': item.amount,
          'Invoice Total': inv.netTotal
        });
      });
    });
    filteredVouchers.forEach(v => {
      v.lines.forEach(l => {
        wsData.push({
          Date: v.date,
          Code: getAccountCode(l.accountName),
          'Doc No': v.voucherNo,
          Type: v.voucherType,
          'Account / Party': l.accountName,
          'Product / Details': l.description || v.narration,
          Debit: l.debit,
          Credit: l.credit
        });
      });
    });
    exportJsonToExcel(wsData, 'Daily Transactions', `daily-transactions-${dateFrom}-to-${dateTo}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-xl">
        <div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight">DAILY TRANSACTION REPORT</h2>
          <p className="text-sm text-gray-500 mt-0.5">{companyProfile?.companyName || 'BABA FAREED SEED CORPORATION'} • Period: {dateFrom} to {dateTo}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-4 py-2.5 rounded-xl text-sm font-bold border border-emerald-200 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center space-x-1.5 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div>
          <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Search Details / Party</label>
          <input
            type="text"
            placeholder="Search invoice no, party, product..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-300 shadow-xl overflow-hidden font-mono text-xs">
        <div className="bg-gradient-to-r from-emerald-950 to-teal-950 text-white px-6 py-3.5 flex justify-between items-center font-sans">
          <span className="font-black">BABA FAREED SEED CORPORATION - DAILY TRANSACTION LEDGER</span>
          <span className="font-bold">PERIOD: {dateFrom} to {dateTo}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-gray-700 font-bold uppercase">
                <th className="py-3 px-3 border-r border-gray-300 w-20">CODE:</th>
                <th className="py-3 px-3 border-r border-gray-300 w-44">INV & DOC</th>
                <th className="py-3 px-3 border-r border-gray-300">DESCRIPTION AND ACCOUNT HEAD</th>
                <th className="py-3 px-3 border-r border-gray-300 text-right w-28">DEBIT:</th>
                <th className="py-3 px-3 border-r border-gray-300 text-right w-28">CREDIT:</th>
                <th className="py-3 px-3 text-right w-28">TOTAL:</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {salesInvoices.length > 0 && (
                <>
                  <tr className="bg-blue-50 font-bold text-blue-900">
                    <td colSpan={6} className="py-2 px-3 uppercase">SALES INVOICES</td>
                  </tr>
                  {salesInvoices.map(inv =>
                    inv.items.map((item, idx) => (
                      <tr key={`${inv.id}-${idx}`} className="hover:bg-gray-50">
                        <td className="py-2 px-3 border-r border-gray-200 font-bold text-emerald-800">{getAccountCode(inv.accountName)}</td>
                        <td className="py-2 px-3 border-r border-gray-200 font-semibold">{inv.invoiceNo}</td>
                        <td className="py-2 px-3 border-r border-gray-200">{item.quantity} {item.unit} @ {item.rate} {item.productName} • {inv.accountName}</td>
                        <td className="py-2 px-3 border-r border-gray-200 text-right"></td>
                        <td className="py-2 px-3 border-r border-gray-200 text-right">{item.amount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold">{idx === 0 ? inv.netTotal.toLocaleString() : ''}</td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-blue-100 font-bold text-blue-950 border-t border-blue-200">
                    <td colSpan={5} className="py-2 px-3 border-r border-gray-200 text-right uppercase">Sub Total - Sales Invoices:</td>
                    <td className="py-2 px-3 text-right">PKR {totalSalesNet.toLocaleString()}</td>
                  </tr>
                </>
              )}

              {purchaseInvoices.length > 0 && (
                <>
                  <tr className="bg-indigo-50 font-bold text-indigo-900">
                    <td colSpan={6} className="py-2 px-3 uppercase">PURCHASE INVOICES</td>
                  </tr>
                  {purchaseInvoices.map(inv =>
                    inv.items.map((item, idx) => (
                      <tr key={`${inv.id}-${idx}`} className="hover:bg-gray-50">
                        <td className="py-2 px-3 border-r border-gray-200 font-bold text-emerald-800">{getAccountCode(inv.accountName)}</td>
                        <td className="py-2 px-3 border-r border-gray-200 font-semibold">{inv.invoiceNo}</td>
                        <td className="py-2 px-3 border-r border-gray-200">{item.quantity} {item.unit} @ {item.rate} {item.productName} • {inv.accountName}</td>
                        <td className="py-2 px-3 border-r border-gray-200 text-right">{item.amount.toLocaleString()}</td>
                        <td className="py-2 px-3 border-r border-gray-200 text-right"></td>
                        <td className="py-2 px-3 text-right font-bold">{idx === 0 ? inv.netTotal.toLocaleString() : ''}</td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-indigo-100 font-bold text-indigo-950 border-t border-indigo-200">
                    <td colSpan={5} className="py-2 px-3 border-r border-gray-200 text-right uppercase">Sub Total - Purchase Invoices:</td>
                    <td className="py-2 px-3 text-right">PKR {totalPurchaseNet.toLocaleString()}</td>
                  </tr>
                </>
              )}

              {salesReturns.length > 0 && (
                <>
                  <tr className="bg-amber-50 font-bold text-amber-900">
                    <td colSpan={6} className="py-2 px-3 uppercase">SALES RETURN INVOICES</td>
                  </tr>
                  {salesReturns.map(inv =>
                    inv.items.map((item, idx) => (
                      <tr key={`${inv.id}-${idx}`} className="hover:bg-gray-50">
                        <td className="py-2 px-3 border-r border-gray-200 font-bold text-emerald-800">{getAccountCode(inv.accountName)}</td>
                        <td className="py-2 px-3 border-r border-gray-200 font-semibold">{inv.invoiceNo}</td>
                        <td className="py-2 px-3 border-r border-gray-200">{item.quantity} {item.unit} @ {item.rate} {item.productName} • {inv.accountName}</td>
                        <td className="py-2 px-3 border-r border-gray-200 text-right"></td>
                        <td className="py-2 px-3 border-r border-gray-200 text-right">{item.amount.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold">{idx === 0 ? inv.netTotal.toLocaleString() : ''}</td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-amber-100 font-bold text-amber-950 border-t border-amber-200">
                    <td colSpan={5} className="py-2 px-3 border-r border-gray-200 text-right uppercase">Sub Total - Sales Returns:</td>
                    <td className="py-2 px-3 text-right">PKR {totalSalesReturnNet.toLocaleString()}</td>
                  </tr>
                </>
              )}

              {cpvVouchers.length > 0 && (
                <>
                  <tr className="bg-rose-50 font-bold text-rose-900">
                    <td colSpan={6} className="py-2 px-3 uppercase">CASH PAYMENT VOUCHERS (CPV)</td>
                  </tr>
                  {cpvVouchers.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 border-r border-gray-200 font-bold text-emerald-800">{getAccountCode(v.lines?.[1]?.accountName || '')}</td>
                      <td className="py-2 px-3 border-r border-gray-200 font-semibold">{v.voucherNo}</td>
                      <td className="py-2 px-3 border-r border-gray-200">{v.narration || 'Cash Payment'} • {v.lines?.[1]?.accountName}</td>
                      <td className="py-2 px-3 border-r border-gray-200 text-right font-bold">{v.totalAmount.toLocaleString()}</td>
                      <td className="py-2 px-3 border-r border-gray-200 text-right"></td>
                      <td className="py-2 px-3 text-right"></td>
                    </tr>
                  ))}
                  <tr className="bg-rose-100 font-bold text-rose-950 border-t border-rose-200">
                    <td colSpan={5} className="py-2 px-3 border-r border-gray-200 text-right uppercase">Sub Total - Cash Payments (CPV):</td>
                    <td className="py-2 px-3 text-right">PKR {totalCpvAmount.toLocaleString()}</td>
                  </tr>
                </>
              )}

              {crvVouchers.length > 0 && (
                <>
                  <tr className="bg-emerald-50 font-bold text-emerald-900">
                    <td colSpan={6} className="py-2 px-3 uppercase">CASH RECEIPT VOUCHERS (CRV)</td>
                  </tr>
                  {crvVouchers.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 border-r border-gray-200 font-bold text-emerald-800">{getAccountCode(v.lines?.[0]?.accountName || '')}</td>
                      <td className="py-2 px-3 border-r border-gray-200 font-semibold">{v.voucherNo}</td>
                      <td className="py-2 px-3 border-r border-gray-200">{v.narration || 'Cash Receipt'} • {v.lines?.[0]?.accountName}</td>
                      <td className="py-2 px-3 border-r border-gray-200 text-right"></td>
                      <td className="py-2 px-3 border-r border-gray-200 text-right font-bold">{v.totalAmount.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right"></td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-100 font-bold text-emerald-950 border-t border-emerald-200">
                    <td colSpan={5} className="py-2 px-3 border-r border-gray-200 text-right uppercase">Sub Total - Cash Receipts (CRV):</td>
                    <td className="py-2 px-3 text-right">PKR {totalCrvAmount.toLocaleString()}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-emerald-50 border-t-2 border-emerald-700 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-sm">
          <div>
            <p className="text-gray-600 font-bold uppercase text-xs">Cash in Hand ({dateFrom})</p>
            <p className="text-lg font-black text-blue-900 font-mono">PKR {cashBalFrom.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600 font-bold uppercase text-xs">Cash in Hand ({dateTo})</p>
            <p className="text-lg font-black text-emerald-900 font-mono">PKR {cashBalTo.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
