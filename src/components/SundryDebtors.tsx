import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Account, Voucher, Invoice } from '../types';
import { Printer, Download, Search, Users } from 'lucide-react';
import { exportJsonToExcel } from '../utils/excelExport';
import {
  printReportDirect,
  downloadPdfFromReportHtml,
  buildStandardReportHeaderHtml,
  buildStandardReportFooterHtml
} from '../utils/reportPrinter';

export const SundryDebtorsComponent: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debtorsData, setDebtorsData] = useState<any[]>([]);
  const [totals, setTotals] = useState({ opening: 0, debit: 0, credit: 0, closing: 0 });

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
    calculateDebtors(accs, vocs, invs);
  };

  const calculateDebtors = (accs: Account[], vocs: Voucher[], invs: Invoice[]) => {
    const debtorAccs = accs.filter(
      a =>
        a.accountType === 'Assets' ||
        a.name.toLowerCase().includes('customer') ||
        a.name.toLowerCase().includes('debtor') ||
        a.name.toLowerCase().includes('party') ||
        a.name.toLowerCase().includes('farmer') ||
        (a.parentAccount && a.parentAccount.toLowerCase().includes('customer'))
    );

    const rows: any[] = [];
    let totOpening = 0;
    let totDebit = 0;
    let totCredit = 0;
    let totClosing = 0;

    debtorAccs.forEach(acc => {
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
              transDr += Number(inv.netTotal || 0);
            } else if (inv.invoiceType === 'SALES_RETURN') {
              transCr += Number(inv.netTotal || 0);
            }
          }
        }
      });

      const openingAmt = acc.openingBalanceType === 'Dr' ? Number(acc.openingBalance) : -Number(acc.openingBalance);
      const closingNet = openingAmt + transDr - transCr;

      const openingDisplay =
        Math.abs(openingAmt) > 0 ? `${Math.abs(openingAmt).toLocaleString()} ${openingAmt >= 0 ? 'Dr' : 'Cr'}` : '-';
      const closingDisplay =
        Math.abs(closingNet) > 0 ? `${Math.abs(closingNet).toLocaleString()} ${closingNet >= 0 ? 'Dr' : 'Cr'}` : '-';

      totOpening += openingAmt;
      totDebit += transDr;
      totCredit += transCr;
      totClosing += closingNet;

      rows.push({
        code: acc.code,
        name: acc.name,
        phone: acc.phone || '+92 300 3179077',
        salesStaff: acc.salesStaff || 'N/A',
        openingAmt,
        openingDisplay,
        transDr,
        transCr,
        closingNet,
        closingDisplay
      });
    });

    setDebtorsData(rows);
    setTotals({
      opening: totOpening,
      debit: totDebit,
      credit: totCredit,
      closing: totClosing
    });
  };

  const handleFilter = () => {
    calculateDebtors(accounts, vouchers, invoices);
  };

  const filteredRows = debtorsData.filter(
    r =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.salesStaff.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const buildSundryDebtorsHtml = (): string => {
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const compAddr = companyProfile?.headOfficeAddress || '7-K.M MULTAN ROAD VEHARI';
    const compPhone = companyProfile?.phone || companyProfile?.mobile || '+92 300 3179077';
    const logoUrl = companyProfile?.logoUrl || '/logoittehad.png';

    const headerHtml = buildStandardReportHeaderHtml({
      companyName: compName,
      headOfficeAddress: compAddr,
      phone: compPhone,
      logoUrl: logoUrl,
      reportTitle: 'SUNDRY DEBTORS LIST REPORT',
      periodText: `${dateFrom} to ${dateTo}`,
      metaLines: [
        `<strong>Total Debtors:</strong> ${filteredRows.length}`,
        `<strong>Total Opening:</strong> PKR ${totals.opening.toLocaleString()}`,
        `<strong>Total Debit:</strong> PKR ${totals.debit.toLocaleString()}`,
        `<strong>Total Credit:</strong> PKR ${totals.credit.toLocaleString()}`,
        `<strong>Total Closing:</strong> PKR ${totals.closing.toLocaleString()}`
      ]
    });

    const tableRows = filteredRows
      .map(
        r => `
      <tr>
        <td style="font-family:monospace;font-weight:bold;color:#065f46;">${r.code}</td>
        <td style="font-weight:600;">${r.name}</td>
        <td style="font-family:monospace;">${r.phone}</td>
        <td>${r.salesStaff}</td>
        <td style="text-align:right;font-family:monospace;">${r.openingDisplay}</td>
        <td style="text-align:right;font-family:monospace;color:#064e3b;">${r.transDr > 0 ? r.transDr.toLocaleString() : '-'}</td>
        <td style="text-align:right;font-family:monospace;color:#b91c1c;">${r.transCr > 0 ? r.transCr.toLocaleString() : '-'}</td>
        <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">${r.closingDisplay}</td>
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
              <th style="width:75px;">Code</th>
              <th>Customer / Account Name</th>
              <th style="width:100px;">Phone</th>
              <th style="width:110px;">Sales Staff</th>
              <th style="width:110px;text-align:right;">Opening Balance</th>
              <th style="width:105px;text-align:right;">Debit (PKR)</th>
              <th style="width:105px;text-align:right;">Credit (PKR)</th>
              <th style="width:115px;text-align:right;">Closing Balance</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align:right;font-weight:bold;">Grand Total:</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;">PKR ${totals.opening.toLocaleString()}</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">PKR ${totals.debit.toLocaleString()}</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;color:#b91c1c;">PKR ${totals.credit.toLocaleString()}</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">PKR ${totals.closing.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        ${buildStandardReportFooterHtml(compName)}
      </div>
    `;
  };

  const handlePrint = () => {
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const htmlContent = buildSundryDebtorsHtml();
    printReportDirect({
      title: `${compName} - Sundry Debtors List`,
      htmlContent,
      landscape: false
    });
  };

  const exportPdf = async () => {
    const htmlContent = buildSundryDebtorsHtml();
    await downloadPdfFromReportHtml({
      htmlContent,
      filename: `Sundry_Debtors_${dateFrom}_to_${dateTo}.pdf`,
      landscape: false
    });
  };

  const exportExcel = () => {
    const wsData = filteredRows.map(r => ({
      'Account Code': r.code,
      'Account Name': r.name,
      Phone: r.phone,
      'Sales Staff': r.salesStaff,
      'Opening Balance': r.openingDisplay,
      Debit: r.transDr,
      Credit: r.transCr,
      'Closing Balance': r.closingDisplay
    }));
    exportJsonToExcel(wsData, 'Sundry Debtors', 'sundry-debtors-report.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight flex items-center space-x-2">
            <Users className="w-7 h-7 text-emerald-700" />
            <span>Sundry Debtors List</span>
          </h2>
          <p className="text-sm text-gray-500">Comprehensive customer and debtor balances with contact details and activity</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Search Debtor</label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search name, code, phone..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFilter}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Generate Report</span>
            </button>
          </div>
        </div>
        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
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
            className="flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 px-4 py-2.5 rounded-xl text-sm font-bold border border-blue-200 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-bold uppercase text-gray-500 bg-gray-50/80">
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Account Name</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Sales Staff</th>
                <th className="py-3.5 px-4 text-right">Opening Balance</th>
                <th className="py-3.5 px-4 text-right">Debit</th>
                <th className="py-3.5 px-4 text-right">Credit</th>
                <th className="py-3.5 px-4 text-right">Closing Balance (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    No sundry debtors found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-emerald-50/40">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">{r.code}</td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">{r.name}</td>
                    <td className="py-3.5 px-4 text-gray-600 font-mono text-xs">{r.phone}</td>
                    <td className="py-3.5 px-4 text-gray-600">{r.salesStaff}</td>
                    <td className="py-3.5 px-4 text-right text-gray-700 font-mono">{r.openingDisplay}</td>
                    <td className="py-3.5 px-4 text-right text-gray-700 font-mono">
                      {r.transDr > 0 ? r.transDr.toLocaleString() : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-gray-700 font-mono">
                      {r.transCr > 0 ? r.transCr.toLocaleString() : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-800 font-mono">{r.closingDisplay}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex justify-between items-center flex-wrap gap-2">
          <span className="font-bold text-emerald-950 text-sm">Total Sundry Debtors Net Balance:</span>
          <span className="text-xl font-black text-emerald-900 font-mono">
            PKR {Math.abs(totals.closing).toLocaleString()} {totals.closing >= 0 ? 'Dr' : 'Cr'}
          </span>
        </div>
      </div>
    </div>
  );
};
