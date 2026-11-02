import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Account, Voucher, Invoice } from '../types';
import { Printer, Download, Search, Scale } from 'lucide-react';
import { exportAoaToExcel } from '../utils/excelExport';
import {
  printReportDirect,
  downloadPdfFromReportHtml,
  buildStandardReportHeaderHtml,
  buildStandardReportFooterHtml
} from '../utils/reportPrinter';
import { formatDate } from '../utils/dateUtils';

export const TrialBalanceComponent: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupedData, setGroupedData] = useState<{ [key: string]: any[] }>({});
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const accs = await db.getAccounts();
    const vocs = await db.getVouchers();
    const invs = await db.getInvoices();
    const profile = await db.getCompanyProfile();
    setAccounts(accs);
    setVouchers(vocs);
    setInvoices(invs);
    setCompanyProfile(profile);
    calculateTrialBalance(accs, vocs, invs);
  };

  const calculateTrialBalance = (accs: Account[], vocs: Voucher[], invs: Invoice[]) => {
    const groups: { [key: string]: any[] } = {
      Assets: [],
      Liabilities: [],
      Equity: [],
      Revenue: [],
      Expenses: [],
      'General Ledgers': []
    };
    let totalDr = 0;
    let totalCr = 0;

    accs.forEach(acc => {
      let transDr = 0;
      let transCr = 0;

      vocs.forEach(v => {
        if (v.date >= dateFrom && v.date <= dateTo) {
          v.lines.forEach(l => {
            if (l.accountId === acc.id) {
              transDr += Number(l.debit || 0);
              transCr += Number(l.credit || 0);
            }
          });
        }
      });

      invs.forEach(inv => {
        if (inv.date >= dateFrom && inv.date <= dateTo) {
          const isTargetAccount =
            inv.accountName === acc.name ||
            inv.accountName === acc.id ||
            inv.accountName.toLowerCase() === acc.name.toLowerCase();
          if (isTargetAccount) {
            if (inv.invoiceType === 'SALES_CASH' || inv.invoiceType === 'SALES_CREDIT') {
              if (acc.accountType === 'Revenue' || acc.name.toLowerCase().includes('sales')) {
                transCr += Number(inv.netTotal || 0);
              } else {
                transDr += Number(inv.netTotal || 0);
              }
            } else if (inv.invoiceType === 'SALES_RETURN') {
              transCr += Number(inv.netTotal || 0);
            } else if (inv.invoiceType === 'PURCHASE_CASH' || inv.invoiceType === 'PURCHASE_CREDIT') {
              transDr += Number(inv.netTotal || 0);
            }
          }
        }
      });

      const openingDr = acc.openingBalanceType === 'Dr' ? Number(acc.openingBalance) : 0;
      const openingCr = acc.openingBalanceType === 'Cr' ? Number(acc.openingBalance) : 0;
      const closingNet =
        (acc.openingBalanceType === 'Dr' ? Number(acc.openingBalance) : -Number(acc.openingBalance)) +
        transDr -
        transCr;
      const closingDr = closingNet > 0 ? closingNet : 0;
      const closingCr = closingNet < 0 ? Math.abs(closingNet) : 0;

      if (closingDr > 0 || closingCr > 0 || openingDr > 0 || openingCr > 0 || transDr > 0 || transCr > 0) {
        totalDr += closingDr;
        totalCr += closingCr;
        const typeGroup = groups[acc.accountType] ? acc.accountType : 'General Ledgers';
        if (!groups[typeGroup]) groups[typeGroup] = [];
        groups[typeGroup].push({
          code: acc.code,
          name: acc.name,
          accountType: acc.accountType,
          openingDr,
          openingCr,
          transDr,
          transCr,
          closingDr,
          closingCr
        });
      }
    });

    setGroupedData(groups);
    setTotals({ debit: totalDr, credit: totalCr });
  };

  const handleFilter = () => {
    calculateTrialBalance(accounts, vouchers, invoices);
  };

  const handleExportExcel = async () => {
    const wsData: any[][] = [
      [companyProfile?.companyName || 'BABA FAREED SEED CORPORATION'],
      ['Trial Balance Statement'],
      [`Period: ${dateFrom} to ${dateTo}`],
      [],
      ['Account Code', 'Account Name', 'Account Type', 'Opening Dr', 'Opening Cr', 'Debit', 'Credit', 'Closing Dr', 'Closing Cr']
    ];
    Object.keys(groupedData).forEach(type => {
      const rows = groupedData[type];
      if (rows && rows.length > 0) {
        wsData.push([`--- ${type} ---`, '', '', '', '', '', '', '', '']);
        rows.forEach(r => {
          wsData.push([r.code, r.name, r.accountType, r.openingDr, r.openingCr, r.transDr, r.transCr, r.closingDr, r.closingCr]);
        });
      }
    });
    wsData.push(['Total', '', '', '', '', totals.debit, totals.credit, totals.debit, totals.credit]);
    await exportAoaToExcel(wsData, 'Trial Balance', `Trial_Balance_${dateFrom}_to_${dateTo}.xlsx`);
  };

  const buildTrialBalanceHtml = (): string => {
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const compAddr = companyProfile?.headOfficeAddress || '7-K.M MULTAN ROAD VEHARI';
    const compPhone = companyProfile?.phone || companyProfile?.mobile || '+92 300 3179077';
    const logoUrl = companyProfile?.logoUrl || '/logoittehad.png';

    const headerHtml = buildStandardReportHeaderHtml({
      companyName: compName,
      headOfficeAddress: compAddr,
      phone: compPhone,
      logoUrl: logoUrl,
      reportTitle: 'TRIAL BALANCE STATEMENT (ACCOUNT TYPE WISE)',
      periodText: `${formatDate(dateFrom)} to ${formatDate(dateTo)}`,
      metaLines: [
        `<strong>Total Debit:</strong> PKR ${totals.debit.toLocaleString()}`,
        `<strong>Total Credit:</strong> PKR ${totals.credit.toLocaleString()}`,
        `<strong>Difference:</strong> PKR ${Math.abs(totals.debit - totals.credit).toLocaleString()} (${Math.abs(totals.debit - totals.credit) < 0.01 ? 'Balanced' : 'Unbalanced'})`
      ]
    });

    let tableRows = '';
    Object.keys(groupedData).forEach(type => {
      const rows = groupedData[type];
      if (rows && rows.length > 0) {
        tableRows += `
          <tr style="background:#f0fdf4;border-top:2px solid #064e3b;">
            <td colspan="9" style="padding:6px 8px;font-weight:900;color:#064e3b;font-size:11px;text-transform:uppercase;">
              --- ${type} ---
            </td>
          </tr>
        `;
        rows.forEach(r => {
          tableRows += `
            <tr>
              <td style="font-family:monospace;font-weight:bold;color:#065f46;">${r.code}</td>
              <td style="font-weight:600;">${r.name}</td>
              <td>${r.accountType}</td>
              <td style="text-align:right;font-family:monospace;">${r.openingDr > 0 ? r.openingDr.toLocaleString() : '-'}</td>
              <td style="text-align:right;font-family:monospace;">${r.openingCr > 0 ? r.openingCr.toLocaleString() : '-'}</td>
              <td style="text-align:right;font-family:monospace;color:#064e3b;">${r.transDr > 0 ? r.transDr.toLocaleString() : '-'}</td>
              <td style="text-align:right;font-family:monospace;color:#b91c1c;">${r.transCr > 0 ? r.transCr.toLocaleString() : '-'}</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">${r.closingDr > 0 ? r.closingDr.toLocaleString() : '-'}</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;color:#b91c1c;">${r.closingCr > 0 ? r.closingCr.toLocaleString() : '-'}</td>
            </tr>
          `;
        });
      }
    });

    return `
      <div>
        ${headerHtml}
        <table>
          <thead>
            <tr>
              <th style="width:75px;">Code</th>
              <th>Account Name</th>
              <th style="width:85px;">Type</th>
              <th style="width:90px;text-align:right;">Opening Dr</th>
              <th style="width:90px;text-align:right;">Opening Cr</th>
              <th style="width:95px;text-align:right;">Debit</th>
              <th style="width:95px;text-align:right;">Credit</th>
              <th style="width:100px;text-align:right;">Closing Dr</th>
              <th style="width:100px;text-align:right;">Closing Cr</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align:right;font-weight:bold;">Total / Net Balance:</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">PKR ${totals.debit.toLocaleString()}</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;color:#b91c1c;">PKR ${totals.credit.toLocaleString()}</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">PKR ${totals.debit.toLocaleString()}</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;color:#b91c1c;">PKR ${totals.credit.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        ${buildStandardReportFooterHtml(compName)}
      </div>
    `;
  };

  const handlePrint = () => {
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const htmlContent = buildTrialBalanceHtml();
    printReportDirect({
      title: `${compName} - Trial Balance Report`,
      htmlContent,
      landscape: true
    });
  };

  const handlePrintPDF = async () => {
    const htmlContent = buildTrialBalanceHtml();
    await downloadPdfFromReportHtml({
      htmlContent,
      filename: `Trial_Balance_${dateFrom}_to_${dateTo}.pdf`,
      landscape: true
    });
  };

  const diff = Math.abs(totals.debit - totals.credit);
  const isBalanced = diff < 0.01;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight">Trial Balance Statement</h2>
          <p className="text-sm text-gray-500">Account type wise summary with opening, transaction, and closing balances</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPDF}
            className="flex items-center space-x-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-4 py-2.5 rounded-xl text-sm font-bold border border-emerald-200 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4 flex-wrap gap-2">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
          <div className="pt-5">
            <button
              onClick={handleFilter}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              Generate
            </button>
          </div>
        </div>
        <div className="relative flex-1 max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search account..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-gray-300 focus:border-emerald-600 focus:outline-hidden"
          />
        </div>
      </div>

      <div
        className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm ${
          isBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}
      >
        <div className="flex items-center space-x-2">
          <Scale className="w-5 h-5 text-emerald-700" />
          <span className="font-bold text-sm">
            {isBalanced ? 'Trial Balance is Balanced' : `Trial Balance Difference: PKR ${diff.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </span>
        </div>
        <div className="text-sm space-x-6 font-bold">
          <span>Total Debit: <strong className="text-emerald-950 font-black">{totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
          <span>Total Credit: <strong className="text-emerald-950 font-black">{totals.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-700 uppercase tracking-wider">
              <th className="py-3.5 px-4">Code</th>
              <th className="py-3.5 px-4">Account Name</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4 text-right">Opening Dr</th>
              <th className="py-3.5 px-4 text-right">Opening Cr</th>
              <th className="py-3.5 px-4 text-right">Debit</th>
              <th className="py-3.5 px-4 text-right">Credit</th>
              <th className="py-3.5 px-4 text-right">Closing Dr</th>
              <th className="py-3.5 px-4 text-right">Closing Cr</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {Object.keys(groupedData).map(type => {
              const rows = groupedData[type].filter(
                r =>
                  r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  r.accountType.toLowerCase().includes(searchQuery.toLowerCase())
              );
              if (rows.length === 0) return null;
              const typeTotalDr = rows.reduce((acc, r) => acc + r.closingDr, 0);
              const typeTotalCr = rows.reduce((acc, r) => acc + r.closingCr, 0);
              return (
                <React.Fragment key={type}>
                  <tr className="bg-gray-100 font-bold text-gray-900">
                    <td colSpan={9} className="py-2.5 px-4 text-xs uppercase tracking-wider text-emerald-900 font-black">
                      {type} ({rows.length} accounts)
                    </td>
                  </tr>
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/40">
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-emerald-800 pl-6">{row.code}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">{row.name}</td>
                      <td className="py-3.5 px-4 text-xs text-gray-600">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-100 font-bold">{row.accountType}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-600 font-mono">
                        {row.openingDr > 0 ? row.openingDr.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-600 font-mono">
                        {row.openingCr > 0 ? row.openingCr.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-600 font-mono">
                        {row.transDr > 0 ? row.transDr.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-600 font-mono">
                        {row.transCr > 0 ? row.transCr.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-gray-900 font-mono">
                        {row.closingDr > 0 ? row.closingDr.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-gray-900 font-mono">
                        {row.closingCr > 0 ? row.closingCr.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-bold text-gray-900 border-t border-gray-200">
                    <td colSpan={7} className="py-2.5 px-4 text-right text-xs uppercase font-bold">
                      Subtotal {type}:
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800">
                      {typeTotalDr > 0 ? typeTotalDr.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-800">
                      {typeTotalCr > 0 ? typeTotalCr.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot className="bg-gray-100 font-black text-gray-900 border-t-2 border-gray-300">
            <tr>
              <td colSpan={7} className="py-3.5 px-4 text-right uppercase text-xs">
                Total Trial Balance:
              </td>
              <td className="py-3.5 px-4 text-right text-emerald-900 font-mono text-base">
                {totals.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="py-3.5 px-4 text-right text-emerald-900 font-mono text-base">
                {totals.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
