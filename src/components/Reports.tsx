import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Invoice } from '../types';
import { Printer, Download, Search } from 'lucide-react';
import { exportJsonToExcel } from '../utils/excelExport';
import {
  printReportDirect,
  downloadPdfFromReportHtml,
  buildStandardReportHeaderHtml,
  buildStandardReportFooterHtml
} from '../utils/reportPrinter';
import { formatDate } from '../utils/dateUtils';

export const ReportsComponent: React.FC<{
  defaultReport?: 'sales' | 'purchase' | 'summary' | 'purchase-summary';
}> = ({ defaultReport = 'sales' }) => {
  const [reportType, setReportType] = useState<'sales' | 'purchase' | 'summary' | 'purchase-summary'>(defaultReport);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<any[]>([]);

  useEffect(() => {
    loadInvoices();
  }, [reportType]);

  const loadInvoices = async () => {
    const invs = await db.getInvoices();
    const profile = await db.getCompanyProfile();
    setInvoices(invs);
    setCompanyProfile(profile);
    generateReport(invs);
  };

  const generateReport = (allInvoices = invoices) => {
    const filteredInvs = allInvoices.filter(i => i.date >= dateFrom && i.date <= dateTo);
    if (reportType === 'sales') {
      const sales = filteredInvs.filter(i => i.invoiceType === 'SALES_CASH' || i.invoiceType === 'SALES_CREDIT');
      const rows: any[] = [];
      sales.forEach(inv => {
        inv.items.forEach(item => {
          rows.push({
            invoiceNo: inv.invoiceNo,
            date: inv.date,
            customer: inv.accountName,
            staff: inv.salesStaff || 'N/A',
            product: item.productName,
            qty: item.quantity,
            rate: item.rate,
            discount: item.discount,
            netAmount: item.amount
          });
        });
      });
      setReportData(rows);
    } else if (reportType === 'purchase') {
      const purchases = filteredInvs.filter(i => i.invoiceType === 'PURCHASE_CASH' || i.invoiceType === 'PURCHASE_CREDIT');
      const rows: any[] = [];
      purchases.forEach(inv => {
        inv.items.forEach(item => {
          rows.push({
            invoiceNo: inv.invoiceNo,
            date: inv.date,
            supplier: inv.accountName,
            product: item.productName,
            qty: item.quantity,
            rate: item.rate,
            discount: item.discount,
            netAmount: item.amount
          });
        });
      });
      setReportData(rows);
    } else if (reportType === 'summary') {
      const sales = filteredInvs.filter(i => i.invoiceType === 'SALES_CASH' || i.invoiceType === 'SALES_CREDIT');
      const summaryMap: { [key: string]: { customer: string; invoicesCount: number; totalAmount: number } } = {};
      sales.forEach(inv => {
        if (!summaryMap[inv.accountName]) {
          summaryMap[inv.accountName] = { customer: inv.accountName, invoicesCount: 0, totalAmount: 0 };
        }
        summaryMap[inv.accountName].invoicesCount += 1;
        summaryMap[inv.accountName].totalAmount += Number(inv.netTotal || 0);
      });
      setReportData(Object.values(summaryMap));
    } else if (reportType === 'purchase-summary') {
      const purchases = filteredInvs.filter(i => i.invoiceType === 'PURCHASE_CASH' || i.invoiceType === 'PURCHASE_CREDIT');
      const summaryMap: { [key: string]: { supplier: string; invoicesCount: number; totalAmount: number } } = {};
      purchases.forEach(inv => {
        if (!summaryMap[inv.accountName]) {
          summaryMap[inv.accountName] = { supplier: inv.accountName, invoicesCount: 0, totalAmount: 0 };
        }
        summaryMap[inv.accountName].invoicesCount += 1;
        summaryMap[inv.accountName].totalAmount += Number(inv.netTotal || 0);
      });
      setReportData(Object.values(summaryMap));
    }
  };

  const buildReportHtml = (): string => {
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const compAddr = companyProfile?.headOfficeAddress || '7-K.M MULTAN ROAD VEHARI';
    const compPhone = companyProfile?.phone || companyProfile?.mobile || '+92 300 3179077';
    const logoUrl = companyProfile?.logoUrl || '/logoittehad.png';

    const getReportTitle = () => {
      switch (reportType) {
        case 'sales': return 'SALES REPORT';
        case 'purchase': return 'PURCHASE REPORT';
        case 'summary': return 'SALES SUMMARY REPORT';
        case 'purchase-summary': return 'PURCHASES SUMMARY REPORT';
      }
    };

    const headerHtml = buildStandardReportHeaderHtml({
      companyName: compName,
      headOfficeAddress: compAddr,
      phone: compPhone,
      logoUrl: logoUrl,
      reportTitle: getReportTitle(),
      periodText: `${formatDate(dateFrom)} to ${formatDate(dateTo)}`,
      metaLines: [
        `<strong>Total Records:</strong> ${reportData.length}`,
        `<strong>Total Value:</strong> PKR ${totalSum.toLocaleString()}`
      ]
    });

    let theadHtml = '';
    let tbodyHtml = '';

    if (reportType === 'sales') {
      theadHtml = `
        <tr>
          <th style="width:100px;">Invoice #</th>
          <th style="width:85px;">Date</th>
          <th>Customer</th>
          <th style="width:110px;">Sales Staff</th>
          <th>Product / Variety</th>
          <th style="width:70px;text-align:right;">Qty</th>
          <th style="width:90px;text-align:right;">Rate (PKR)</th>
          <th style="width:110px;text-align:right;">Net (PKR)</th>
        </tr>
      `;
      tbodyHtml = reportData
        .map(
          r => `
        <tr>
          <td style="font-family:monospace;font-weight:bold;color:#065f46;">${r.invoiceNo}</td>
          <td style="font-family:monospace;font-size:10px;">${formatDate(r.date)}</td>
          <td style="font-weight:600;">${r.customer}</td>
          <td>${r.staff}</td>
          <td>${r.product}</td>
          <td style="text-align:right;font-family:monospace;font-weight:bold;">${r.qty}</td>
          <td style="text-align:right;font-family:monospace;">${Number(r.rate).toLocaleString()}</td>
          <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">${Number(r.netAmount).toLocaleString()}</td>
        </tr>
      `
        )
        .join('');
    } else if (reportType === 'purchase') {
      theadHtml = `
        <tr>
          <th style="width:100px;">Invoice #</th>
          <th style="width:85px;">Date</th>
          <th>Supplier</th>
          <th>Product / Variety</th>
          <th style="width:70px;text-align:right;">Qty</th>
          <th style="width:90px;text-align:right;">Rate (PKR)</th>
          <th style="width:110px;text-align:right;">Net (PKR)</th>
        </tr>
      `;
      tbodyHtml = reportData
        .map(
          r => `
        <tr>
          <td style="font-family:monospace;font-weight:bold;color:#065f46;">${r.invoiceNo}</td>
          <td style="font-family:monospace;font-size:10px;">${formatDate(r.date)}</td>
          <td style="font-weight:600;">${r.supplier}</td>
          <td>${r.product}</td>
          <td style="text-align:right;font-family:monospace;font-weight:bold;">${r.qty}</td>
          <td style="text-align:right;font-family:monospace;">${Number(r.rate).toLocaleString()}</td>
          <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">${Number(r.netAmount).toLocaleString()}</td>
        </tr>
      `
        )
        .join('');
    } else if (reportType === 'summary') {
      theadHtml = `
        <tr>
          <th>Customer Account Name</th>
          <th style="width:140px;text-align:center;">Total Invoices</th>
          <th style="width:180px;text-align:right;">Total Amount (PKR)</th>
        </tr>
      `;
      tbodyHtml = reportData
        .map(
          r => `
        <tr>
          <td style="font-weight:600;">${r.customer}</td>
          <td style="text-align:center;font-family:monospace;font-weight:bold;">${r.invoicesCount}</td>
          <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">${Number(r.totalAmount).toLocaleString()}</td>
        </tr>
      `
        )
        .join('');
    } else if (reportType === 'purchase-summary') {
      theadHtml = `
        <tr>
          <th>Supplier Account Name</th>
          <th style="width:140px;text-align:center;">Total Invoices</th>
          <th style="width:180px;text-align:right;">Total Amount (PKR)</th>
        </tr>
      `;
      tbodyHtml = reportData
        .map(
          r => `
        <tr>
          <td style="font-weight:600;">${r.supplier}</td>
          <td style="text-align:center;font-family:monospace;font-weight:bold;">${r.invoicesCount}</td>
          <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">${Number(r.totalAmount).toLocaleString()}</td>
        </tr>
      `
        )
        .join('');
    }

    const colSpan = reportType === 'sales' ? 7 : reportType === 'purchase' ? 6 : 2;

    return `
      <div>
        ${headerHtml}
        <table>
          <thead>
            ${theadHtml}
          </thead>
          <tbody>
            ${tbodyHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="${colSpan}" style="text-align:right;font-weight:bold;">Grand Total:</td>
              <td style="text-align:right;font-family:monospace;font-weight:black;color:#064e3b;font-size:11.5px;">PKR ${totalSum.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        ${buildStandardReportFooterHtml(compName)}
      </div>
    `;
  };

  const handlePrint = () => {
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const htmlContent = buildReportHtml();
    printReportDirect({
      title: `${compName} - ${reportType.toUpperCase()} Report`,
      htmlContent,
      landscape: reportType === 'sales' || reportType === 'purchase'
    });
  };

  const exportPdf = async () => {
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const htmlContent = buildReportHtml();
    await downloadPdfFromReportHtml({
      htmlContent,
      filename: `${compName.replace(/\s+/g, '_')}_${reportType}_report_${dateFrom}_to_${dateTo}.pdf`,
      landscape: reportType === 'sales' || reportType === 'purchase'
    });
  };

  const exportExcel = () => {
    exportJsonToExcel(reportData, 'Report', `report_${reportType}.xlsx`);
  };

  const totalSum = reportData.reduce(
    (acc, curr) => acc + Number(curr.netAmount || curr.totalAmount || 0),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight">
            {reportType === 'sales' && 'Sales Report'}
            {reportType === 'purchase' && 'Purchase Report'}
            {reportType === 'summary' && 'Sales Summary Report'}
            {reportType === 'purchase-summary' && 'Purchases Summary Report'}
          </h2>
          <p className="text-sm text-gray-500">Comprehensive sales and purchase transaction summaries with export tools</p>
        </div>
        <div className="flex flex-wrap gap-1 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
          <button
            onClick={() => setReportType('sales')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportType === 'sales' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Sales Report
          </button>
          <button
            onClick={() => setReportType('purchase')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportType === 'purchase' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Purchase Report
          </button>
          <button
            onClick={() => setReportType('summary')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportType === 'summary' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Sales Summary
          </button>
          <button
            onClick={() => setReportType('purchase-summary')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              reportType === 'purchase-summary' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Purchases Summary
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="flex items-end">
            <button
              onClick={() => generateReport()}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Filter Report</span>
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
          {reportType === 'sales' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold uppercase text-gray-500 bg-gray-50/80">
                  <th className="py-3.5 px-4">Invoice No</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Staff</th>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4 text-right">Qty</th>
                  <th className="py-3.5 px-4 text-right">Rate</th>
                  <th className="py-3.5 px-4 text-right">Net Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      No sales records found.
                    </td>
                  </tr>
                ) : (
                  reportData.map((r, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/40">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">{r.invoiceNo}</td>
                      <td className="py-3.5 px-4 text-gray-600 font-mono text-xs">{r.date}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">{r.customer}</td>
                      <td className="py-3.5 px-4 text-gray-600">{r.staff}</td>
                      <td className="py-3.5 px-4 text-gray-800">{r.product}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-gray-900">{r.qty}</td>
                      <td className="py-3.5 px-4 text-right text-gray-700 font-mono">{r.rate.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-800 font-mono">{r.netAmount.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          {reportType === 'purchase' && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold uppercase text-gray-500 bg-gray-50/80">
                  <th className="py-3.5 px-4">Invoice No</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4 text-right">Qty</th>
                  <th className="py-3.5 px-4 text-right">Rate</th>
                  <th className="py-3.5 px-4 text-right">Net Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400">
                      No purchase records found.
                    </td>
                  </tr>
                ) : (
                  reportData.map((r, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/40">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">{r.invoiceNo}</td>
                      <td className="py-3.5 px-4 text-gray-600 font-mono text-xs">{r.date}</td>
                      <td className="py-3.5 px-4 font-bold text-gray-900">{r.supplier}</td>
                      <td className="py-3.5 px-4 text-gray-800">{r.product}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-gray-900">{r.qty}</td>
                      <td className="py-3.5 px-4 text-right text-gray-700 font-mono">{r.rate.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-800 font-mono">{r.netAmount.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          {(reportType === 'summary' || reportType === 'purchase-summary') && (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold uppercase text-gray-500 bg-gray-50/80">
                  <th className="py-3.5 px-4">Account Name</th>
                  <th className="py-3.5 px-4 text-center">Total Invoices</th>
                  <th className="py-3.5 px-4 text-right">Total Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-gray-400">
                      No summary records found.
                    </td>
                  </tr>
                ) : (
                  reportData.map((r, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/40">
                      <td className="py-3.5 px-4 font-bold text-gray-900">{r.customer || r.supplier}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-700">{r.invoicesCount}</td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-800 font-mono">{r.totalAmount.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex justify-between items-center">
          <span className="font-bold text-emerald-950 text-sm">Total Report Amount:</span>
          <span className="text-xl font-black text-emerald-900 font-mono">PKR {totalSum.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};
