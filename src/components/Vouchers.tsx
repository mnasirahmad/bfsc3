import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { Voucher, VoucherType, Account, SalesStaff, UserProfile, VoucherLine } from '../types';
import { Receipt, Plus, Trash2, Save, Printer, Edit, X, Search, Calendar, RotateCcw, Download } from 'lucide-react';
import { printReportDirect, downloadPdfFromReportHtml } from '../utils/reportPrinter';
import { formatDate } from '../utils/dateUtils';

export const VouchersComponent: React.FC<{ currentUser: UserProfile; defaultType?: VoucherType }> = ({
  currentUser,
  defaultType = 'CASH_PAYMENT'
}) => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [staffList, setStaffList] = useState<SalesStaff[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<VoucherType>(defaultType);

  const todayIso = new Date().toISOString().split('T')[0];
  const [voucherNo, setVoucherNo] = useState('');
  const [date, setDate] = useState(todayIso);
  const [narration, setNarration] = useState('');
  const [debitNarration, setDebitNarration] = useState('');
  const [creditNarration, setCreditNarration] = useState('');
  const [salesStaff, setSalesStaff] = useState('');
  const [debitAccountId, setDebitAccountId] = useState('');
  const [creditAccountId, setCreditAccountId] = useState('');
  const [debitSearch, setDebitSearch] = useState('');
  const [creditSearch, setCreditSearch] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const debitSearchRef = useRef<HTMLInputElement>(null);
  const debitSelectRef = useRef<HTMLSelectElement>(null);
  const creditSearchRef = useRef<HTMLInputElement>(null);
  const creditSelectRef = useRef<HTMLSelectElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async (preservedDate?: string) => {
    const list = await db.getVouchers();
    const accs = await db.getAccounts();
    const staff = await db.getSalesStaff();
    const profile = await db.getCompanyProfile();

    setVouchers(list.filter(v => v.voucherType === activeTab));
    setAccounts(accs);
    setStaffList(staff);
    setCompanyProfile(profile);
    setVoucherNo(`${activeTab.substring(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`);
    const tIso = preservedDate || date || new Date().toISOString().split('T')[0];
    setDate(tIso);
    setNarration('');
    setDebitNarration('');
    setCreditNarration('');
    setSalesStaff('');
    setAmount(0);
    setEditingVoucher(null);

    const cashAcc = accs.find(a => a.code === 'ACC-10000' || a.name.toUpperCase().includes('CASH IN HAND') || a.accountType === 'Cash/Banks');
    const cashAccId = cashAcc ? cashAcc.id : (accs[0]?.id || '');

    if (activeTab === 'CASH_PAYMENT') {
      setCreditAccountId(cashAccId);
      setDebitAccountId('');
    } else if (activeTab === 'CASH_RECEIPT') {
      setDebitAccountId(cashAccId);
      setCreditAccountId('');
    } else {
      setDebitAccountId('');
      setCreditAccountId('');
    }

    setTimeout(() => {
      dateInputRef.current?.focus();
    }, 50);
  };

  const handleEdit = (v: Voucher) => {
    setEditingVoucher(v);
    setVoucherNo(v.voucherNo);
    setDate(v.date);
    setNarration(v.narration);
    setSalesStaff(v.salesStaff || '');
    if (v.lines && v.lines.length >= 2) {
      setDebitAccountId(v.lines[0].accountId);
      setCreditAccountId(v.lines[1].accountId);
      setAmount(v.lines[0].debit || v.lines[1].credit || 0);
      if (v.voucherType === 'JOURNAL') {
        setDebitNarration(v.lines[0].description || '');
        setCreditNarration(v.lines[1].description || '');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingVoucher(null);
    loadData();
  };

  const buildVoucherHtml = (v: Voucher): string => {
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const compAddr = companyProfile?.headOfficeAddress || '7-K.M MULTAN ROAD VEHARI';
    const compPhone = companyProfile?.phone || companyProfile?.mobile || '+92 300 3179077';
    const logoUrl = companyProfile?.logoUrl || '/logoittehad.png';

    const getVoucherTitle = () => {
      switch (v.voucherType) {
        case 'CASH_PAYMENT': return 'CASH PAYMENT VOUCHER (CPV)';
        case 'CASH_RECEIPT': return 'CASH RECEIPT VOUCHER (CRV)';
        case 'JOURNAL': return 'JOURNAL VOUCHER (JV)';
        default: return 'FINANCIAL VOUCHER';
      }
    };

    let totalDebit = 0;
    let totalCredit = 0;
    const linesHtml = (v.lines || [])
      .map(line => {
        const acc = accounts.find(a => a.id === line.accountId || a.name === line.accountName);
        const code = acc?.code || '1000';
        const name = acc?.name || line.accountName;
        const dr = Number(line.debit || 0);
        const cr = Number(line.credit || 0);
        totalDebit += dr;
        totalCredit += cr;
        return `
          <tr>
            <td style="font-family:monospace;font-weight:bold;color:#065f46;">${code}</td>
            <td style="font-weight:600;">${name}</td>
            <td>${line.description || v.narration || '-'}</td>
            <td style="text-align:right;font-family:monospace;">${dr > 0 ? dr.toLocaleString() : '-'}</td>
            <td style="text-align:right;font-family:monospace;">${cr > 0 ? cr.toLocaleString() : '-'}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2.5px solid #064e3b;padding-bottom:10px;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <img src="${logoUrl}" style="width:54px;height:54px;object-fit:contain;" alt="Logo" onerror="this.style.display='none'" />
            <div>
              <h1 style="margin:0;font-size:19px;font-weight:900;color:#064e3b;text-transform:uppercase;letter-spacing:0.5px;">${compName}</h1>
              <div style="font-size:11px;color:#374151;margin-top:2px;">${compAddr} &bull; PH: ${compPhone}</div>
            </div>
          </div>
          <div style="text-align:center;border:2px solid #064e3b;background:#f0fdf4;padding:6px 14px;border-radius:6px;">
            <span style="font-weight:900;color:#064e3b;font-size:13px;text-transform:uppercase;letter-spacing:1px;">${getVoucherTitle()}</span>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:11.5px;line-height:1.5;">
          <div>
            <div><strong>VOUCHER NO:</strong> <span style="font-family:monospace;font-weight:bold;color:#064e3b;">${v.voucherNo}</span></div>
            <div><strong>DATE:</strong> <span style="font-family:monospace;">${formatDate(v.date)}</span></div>
            ${v.salesStaff ? `<div><strong>SALES OFFICER:</strong> <span>${v.salesStaff}</span></div>` : ''}
          </div>
          <div style="text-align:right;">
            <div><strong>TOTAL AMOUNT:</strong> <span style="font-family:monospace;font-weight:900;color:#064e3b;font-size:13px;">PKR ${Number(v.totalAmount).toLocaleString()}</span></div>
            <div><strong>PREPARED BY:</strong> <span style="text-transform:uppercase;">${v.createdBy || 'Staff'}</span></div>
          </div>
        </div>
        <div style="margin-bottom:12px;background:#f9fafb;border:1px solid #d1d5db;border-radius:6px;padding:8px 12px;font-size:11.5px;">
          <strong>Narration / Description:</strong> ${v.narration || 'N/A'}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:85px;">Code</th>
              <th>Account Head / Title</th>
              <th>Particulars</th>
              <th style="width:120px;text-align:right;">Debit (PKR)</th>
              <th style="width:120px;text-align:right;">Credit (PKR)</th>
            </tr>
          </thead>
          <tbody>
            ${linesHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align:right;font-weight:bold;">Total Amount:</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">PKR ${totalDebit.toLocaleString()}</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">PKR ${totalCredit.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        <div style="margin-top:35px;padding-top:14px;border-top:1px solid #9ca3af;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;font-size:10.5px;text-align:center;">
          <div><div style="border-top:1.5px solid #111827;padding-top:4px;font-weight:bold;">Prepared By</div></div>
          <div><div style="border-top:1.5px solid #111827;padding-top:4px;font-weight:bold;">Verified By</div></div>
          <div><div style="border-top:1.5px solid #111827;padding-top:4px;font-weight:bold;">Accountant</div></div>
          <div><div style="border-top:1.5px solid #111827;padding-top:4px;font-weight:bold;">Authorized Officer</div></div>
        </div>
        <div style="text-align:center;font-size:10px;color:#6b7280;margin-top:20px;border-top:1px dashed #d1d5db;padding-top:6px;">
          Official Voucher issued by ${compName} ERP System &bull; ${compAddr} &bull; PH: ${compPhone}
        </div>
      </div>
    `;
  };

  const handlePrintVoucher = (v: Voucher) => {
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const htmlContent = buildVoucherHtml(v);
    printReportDirect({
      title: `${compName} - Voucher ${v.voucherNo}`,
      htmlContent,
      landscape: false
    });
  };

  const handleExportVoucherPdf = async (v: Voucher) => {
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const htmlContent = buildVoucherHtml(v);
    await downloadPdfFromReportHtml({
      htmlContent,
      filename: `${compName.replace(/\s+/g, '_')}_Voucher_${v.voucherNo}.pdf`,
      landscape: false
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debitAccountId || !creditAccountId) {
      alert('Please select both Debit and Credit accounts.');
      return;
    }
    if (debitAccountId === creditAccountId) {
      alert('Debit account and Credit account cannot be the same.');
      return;
    }
    if (amount <= 0) {
      alert('Please enter a valid voucher amount greater than 0.');
      return;
    }

    const debitAcc = accounts.find(a => a.id === debitAccountId);
    const creditAcc = accounts.find(a => a.id === creditAccountId);

    const lines: VoucherLine[] = [
      {
        accountId: debitAccountId,
        accountName: debitAcc ? debitAcc.name : '',
        description: activeTab === 'JOURNAL' ? debitNarration : narration,
        debit: amount,
        credit: 0
      },
      {
        accountId: creditAccountId,
        accountName: creditAcc ? creditAcc.name : '',
        description: activeTab === 'JOURNAL' ? creditNarration : narration,
        debit: 0,
        credit: amount
      }
    ];

    const newVoucher: Voucher = {
      id: editingVoucher ? editingVoucher.id : `vch_${Date.now()}`,
      voucherNo,
      voucherType: activeTab,
      date,
      salesStaff,
      lines,
      totalAmount: amount,
      narration: activeTab === 'JOURNAL' ? `${debitNarration} | ${creditNarration}` : narration,
      createdBy: currentUser.fullName,
      createdAt: editingVoucher ? editingVoucher.createdAt : new Date().toISOString()
    };

    await db.saveVoucher(newVoucher);
    alert(editingVoucher ? 'Voucher updated successfully!' : 'Voucher posted successfully!');

    const keptDate = date;
    setEditingVoucher(null);
    setVoucherNo(`${activeTab.substring(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`);
    setDate(keptDate);
    setNarration('');
    setDebitNarration('');
    setCreditNarration('');
    setSalesStaff('');
    setAmount(0);
    loadData(keptDate);
  };

  const handleDelete = async (id: string) => {
    if (currentUser.role !== 'ADMIN') {
      alert('Normal users cannot delete saved vouchers.');
      return;
    }
    if (confirm('Are you sure you want to delete this voucher?')) {
      await db.deleteVoucher(id);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight">
            {activeTab === 'CASH_PAYMENT' && 'Cash Payment Voucher (CPV)'}
            {activeTab === 'CASH_RECEIPT' && 'Cash Receipt Voucher (CRV)'}
            {activeTab === 'JOURNAL' && 'Journal Voucher (JV)'}
          </h2>
          <p className="text-sm text-gray-500">Record financial receipts, payments, and double-entry general ledger journals</p>
        </div>
        <div className="flex space-x-2 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm">
          <button
            onClick={() => setActiveTab('CASH_PAYMENT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CASH_PAYMENT' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Payment (CPV)
          </button>
          <button
            onClick={() => setActiveTab('CASH_RECEIPT')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'CASH_RECEIPT' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Receipt (CRV)
          </button>
          <button
            onClick={() => setActiveTab('JOURNAL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'JOURNAL' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Journal (JV)
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-gray-200 shadow-xl p-8 space-y-6">
        {editingVoucher && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-amber-900 text-sm font-semibold">
            <span>Editing Voucher: <strong>{editingVoucher.voucherNo}</strong></span>
            <button type="button" onClick={handleCancelEdit} className="text-xs text-amber-800 underline font-bold cursor-pointer">
              Cancel Edit
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Voucher No</label>
            <input
              type="text"
              required
              value={voucherNo}
              onChange={e => setVoucherNo(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Voucher Date</label>
            <input
              ref={dateInputRef}
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (activeTab === 'CASH_PAYMENT') {
                    debitSearchRef.current?.focus();
                    debitSelectRef.current?.focus();
                  } else if (activeTab === 'CASH_RECEIPT') {
                    creditSearchRef.current?.focus();
                    creditSelectRef.current?.focus();
                  } else {
                    debitSearchRef.current?.focus();
                    debitSelectRef.current?.focus();
                  }
                }
              }}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Sales Staff</label>
            <select
              value={salesStaff}
              onChange={e => setSalesStaff(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden bg-white"
            >
              <option value="">Select Sales Staff (Optional)...</option>
              {staffList.map(s => (
                <option key={s.id} value={s.staffName}>
                  {s.staffCode} - {s.staffName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Narration / Remarks</label>
            <input
              type="text"
              required={activeTab !== 'JOURNAL'}
              placeholder="Description of transaction..."
              value={narration}
              onChange={e => setNarration(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-800">
            {activeTab === 'CASH_PAYMENT' && 'Cash Payment Details (Debit Account & Credit Cash/Bank Account)'}
            {activeTab === 'CASH_RECEIPT' && 'Cash Receipt Details (Debit Cash/Bank Account & Credit Account)'}
            {activeTab === 'JOURNAL' && 'Journal Entry Details (Debit Account & Credit Account)'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                {activeTab === 'CASH_RECEIPT' ? 'Debit Account (Fixed Cash in Hand)' : 'Debit Account'}
              </label>
              {activeTab === 'CASH_RECEIPT' ? (
                <input
                  type="text"
                  disabled
                  value="ACC-10000 - CASH IN HAND • from."
                  className="w-full rounded-xl border border-gray-300 bg-gray-100 px-3.5 py-2.5 text-sm font-bold text-gray-800 font-mono"
                />
              ) : (
                <>
                  <input
                    ref={debitSearchRef}
                    type="text"
                    placeholder="Search debit account..."
                    value={debitSearch}
                    onChange={e => setDebitSearch(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-1.5 text-xs mb-2 focus:border-emerald-600 focus:outline-hidden"
                  />
                  <select
                    ref={debitSelectRef}
                    required
                    value={debitAccountId}
                    onChange={e => {
                      const accId = e.target.value;
                      setDebitAccountId(accId);
                      const selAcc = accounts.find(a => a.id === accId);
                      const credAcc = accounts.find(a => a.id === creditAccountId);
                      if (activeTab === 'CASH_PAYMENT' && selAcc) {
                        setNarration(`Cash paid to.${selAcc.name}`);
                        amountInputRef.current?.focus();
                      } else if (activeTab === 'JOURNAL' && selAcc) {
                        setDebitNarration(`JV.${voucherNo} ${selAcc.name} from.${credAcc ? credAcc.name : ''}`);
                      }
                    }}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden bg-white font-medium"
                  >
                    <option value="">Select Debit Account...</option>
                    {accounts
                      .filter(acc =>
                        acc.name.toLowerCase().includes(debitSearch.toLowerCase()) ||
                        acc.code.toLowerCase().includes(debitSearch.toLowerCase()) ||
                        acc.accountType.toLowerCase().includes(debitSearch.toLowerCase())
                      )
                      .map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name} ({acc.accountType})
                        </option>
                      ))}
                  </select>
                  {activeTab === 'JOURNAL' && (
                    <div className="mt-2">
                      <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Debit Narration</label>
                      <input
                        type="text"
                        required
                        value={debitNarration}
                        onChange={e => setDebitNarration(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                {activeTab === 'CASH_PAYMENT' ? 'Credit Account (Fixed Cash in Hand)' : activeTab === 'CASH_RECEIPT' ? 'Credit Account (Received From)' : 'Credit Account'}
              </label>
              {activeTab === 'CASH_PAYMENT' ? (
                <input
                  type="text"
                  disabled
                  value="ACC-10000 - CASH IN HAND"
                  className="w-full rounded-xl border border-gray-300 bg-gray-100 px-3.5 py-2.5 text-sm font-bold text-gray-800 font-mono"
                />
              ) : (
                <>
                  <input
                    ref={creditSearchRef}
                    type="text"
                    placeholder="Search credit account..."
                    value={creditSearch}
                    onChange={e => setCreditSearch(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-1.5 text-xs mb-2 focus:border-emerald-600 focus:outline-hidden"
                  />
                  <select
                    ref={creditSelectRef}
                    required
                    value={creditAccountId}
                    onChange={e => {
                      const accId = e.target.value;
                      setCreditAccountId(accId);
                      const selAcc = accounts.find(a => a.id === accId);
                      const debAcc = accounts.find(a => a.id === debitAccountId);
                      if (activeTab === 'CASH_RECEIPT' && selAcc) {
                        setNarration(`Cash received from.${selAcc.name}`);
                        amountInputRef.current?.focus();
                      } else if (activeTab === 'JOURNAL' && selAcc) {
                        setCreditNarration(`JV.${voucherNo} ${selAcc.name} from.${debAcc ? debAcc.name : ''}`);
                        if (debAcc) {
                          setDebitNarration(`JV.${voucherNo} ${debAcc.name} from.${selAcc.name}`);
                        }
                      }
                    }}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden bg-white font-medium"
                  >
                    <option value="">Select Credit Account...</option>
                    {accounts
                      .filter(acc =>
                        acc.name.toLowerCase().includes(creditSearch.toLowerCase()) ||
                        acc.code.toLowerCase().includes(creditSearch.toLowerCase()) ||
                        acc.accountType.toLowerCase().includes(creditSearch.toLowerCase())
                      )
                      .map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name} ({acc.accountType})
                        </option>
                      ))}
                  </select>
                  {activeTab === 'JOURNAL' && (
                    <div className="mt-2">
                      <label className="block text-[11px] font-bold uppercase text-gray-500 mb-1">Credit Narration</label>
                      <input
                        type="text"
                        required
                        value={creditNarration}
                        onChange={e => setCreditNarration(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3.5 py-1.5 text-xs font-mono"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Amount (PKR)</label>
              <input
                ref={amountInputRef}
                type="number"
                step="0.01"
                required
                min="0.01"
                placeholder="0.00"
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-black font-mono text-emerald-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-between bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
            <div className="flex space-x-6 text-sm">
              <p>Debit: <span className="font-bold text-gray-900 font-mono">PKR {amount.toLocaleString()}</span></p>
              <p>Credit: <span className="font-bold text-gray-900 font-mono">PKR {amount.toLocaleString()}</span></p>
              <p className="font-bold text-emerald-800">(Balanced Entry)</p>
            </div>
            <button
              type="submit"
              className={`flex items-center space-x-2 ${
                editingVoucher ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900'
              } text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer`}
            >
              <Save className="w-4 h-4" />
              <span>{editingVoucher ? 'Update Voucher' : 'Post Voucher'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Date-Wise Search & Filter Panel */}
      {(() => {
        const setQuickDate = (type: 'today' | 'yesterday' | '7days' | 'thisMonth' | 'all') => {
          const now = new Date();
          const todayStr = now.toISOString().split('T')[0];
          if (type === 'today') {
            setFilterStartDate(todayStr);
            setFilterEndDate(todayStr);
          } else if (type === 'yesterday') {
            const yest = new Date(now);
            yest.setDate(yest.getDate() - 1);
            const yestStr = yest.toISOString().split('T')[0];
            setFilterStartDate(yestStr);
            setFilterEndDate(yestStr);
          } else if (type === '7days') {
            const past = new Date(now);
            past.setDate(past.getDate() - 6);
            setFilterStartDate(past.toISOString().split('T')[0]);
            setFilterEndDate(todayStr);
          } else if (type === 'thisMonth') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            setFilterStartDate(firstDay);
            setFilterEndDate(todayStr);
          } else if (type === 'all') {
            setFilterStartDate('');
            setFilterEndDate('');
            setSearchKeyword('');
          }
        };

        const filteredVouchers = vouchers.filter(v => {
          const vDate = v.date ? v.date.split('T')[0] : '';
          if (filterStartDate && vDate < filterStartDate) return false;
          if (filterEndDate && vDate > filterEndDate) return false;
          if (searchKeyword.trim()) {
            const q = searchKeyword.toLowerCase().trim();
            const matchNo = v.voucherNo.toLowerCase().includes(q);
            const matchNarration = (v.narration || '').toLowerCase().includes(q);
            const matchStaff = (v.salesStaff || '').toLowerCase().includes(q);
            const matchCreator = (v.createdBy || '').toLowerCase().includes(q);
            const matchLines = v.lines?.some(l =>
              (l.accountName || '').toLowerCase().includes(q) ||
              (l.description || '').toLowerCase().includes(q)
            );
            if (!matchNo && !matchNarration && !matchStaff && !matchCreator && !matchLines) {
              return false;
            }
          }
          return true;
        });

        const filteredTotalAmount = filteredVouchers.reduce((sum, v) => sum + Number(v.totalAmount || 0), 0);
        const isFilterActive = Boolean(filterStartDate || filterEndDate || searchKeyword);

        return (
          <>
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-emerald-700" />
                    <span>Search & Filter {activeTab.replace('_', ' ')} Vouchers</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Filter vouchers date-wise or search by number, narration, or account</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-gray-400 font-bold text-[11px] uppercase mr-1">Quick:</span>
                  <button
                    type="button"
                    onClick={() => setQuickDate('today')}
                    className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 font-semibold transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate('yesterday')}
                    className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 font-semibold transition-colors cursor-pointer"
                  >
                    Yesterday
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate('7days')}
                    className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 font-semibold transition-colors cursor-pointer"
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate('thisMonth')}
                    className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 font-semibold transition-colors cursor-pointer"
                  >
                    This Month
                  </button>
                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={() => setQuickDate('all')}
                      className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={e => setFilterStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-emerald-600 focus:outline-hidden bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={e => setFilterEndDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm focus:border-emerald-600 focus:outline-hidden bg-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Search Voucher # / Account / Narration</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by voucher #, account name, narration..."
                      value={searchKeyword}
                      onChange={e => setSearchKeyword(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 pl-10 pr-8 py-2 text-sm focus:border-emerald-600 focus:outline-hidden"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    {searchKeyword && (
                      <button
                        type="button"
                        onClick={() => setSearchKeyword('')}
                        className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs font-semibold">
                <span className="text-gray-600">
                  Showing <strong className="text-gray-900">{filteredVouchers.length}</strong> of <strong className="text-gray-900">{vouchers.length}</strong> vouchers
                </span>
                <span className="text-gray-900">
                  Total Amount: <strong className="font-mono font-black text-emerald-800 text-sm">PKR {filteredTotalAmount.toLocaleString()}</strong>
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                Recent {activeTab.replace('_', ' ')} Vouchers ({filteredVouchers.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-bold uppercase text-gray-500 bg-gray-50/80">
                      <th className="py-3.5 px-4">Voucher No</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Narration</th>
                      <th className="py-3.5 px-4 text-right">Amount (PKR)</th>
                      <th className="py-3.5 px-4">Created By</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredVouchers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-gray-400">
                          No vouchers recorded for this type.
                        </td>
                      </tr>
                    ) : (
                      filteredVouchers.map(v => (
                        <tr key={v.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">{v.voucherNo}</td>
                          <td className="py-3.5 px-4 text-gray-600 font-mono text-xs">{formatDate(v.date)}</td>
                          <td className="py-3.5 px-4 font-medium text-gray-900">{v.narration}</td>
                          <td className="py-3.5 px-4 text-right font-black text-gray-900 font-mono">{v.totalAmount.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-xs text-gray-500">{v.createdBy}</td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handlePrintVoucher(v)}
                              className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl cursor-pointer"
                              title="Print Voucher"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportVoucherPdf(v)}
                              className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl cursor-pointer"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(v)}
                              className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl cursor-pointer"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {currentUser.role === 'ADMIN' && (
                              <button
                                onClick={() => handleDelete(v.id)}
                                className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-xl cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
};
