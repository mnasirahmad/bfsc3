import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { SalesStaff, UserProfile, Territory } from '../types';
import { Users, Plus, Search, Edit, Trash2, Printer, Download, X } from 'lucide-react';
import {
  printReportDirect,
  downloadPdfFromReportHtml,
  buildStandardReportHeaderHtml,
  buildStandardReportFooterHtml
} from '../utils/reportPrinter';

export const SalesStaffComponent: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  const [staffList, setStaffList] = useState<SalesStaff[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<SalesStaff | null>(null);
  const [staffCode, setStaffCode] = useState('');
  const [staffName, setStaffName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Vehari');
  const [territory, setTerritory] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [remarks, setRemarks] = useState('');

  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const staff = await db.getSalesStaff();
    const terrs = await db.getTerritories();
    setStaffList(staff);
    setTerritories(terrs);
  };

  const handleOpenModal = (s?: SalesStaff) => {
    if (s) {
      setEditingStaff(s);
      setStaffCode(s.staffCode);
      setStaffName(s.staffName);
      setFatherName(s.fatherName);
      setMobile(s.mobile);
      setWhatsapp(s.whatsapp);
      setAddress(s.address);
      setCity(s.city);
      setTerritory(s.territory);
      setJoiningDate(s.joiningDate);
      setStatus(s.status);
      setRemarks(s.remarks || '');
    } else {
      setEditingStaff(null);
      setStaffCode(`STF-${Math.floor(100 + Math.random() * 900)}`);
      setStaffName('');
      setFatherName('');
      setMobile('');
      setWhatsapp('');
      setAddress('');
      setCity('Vehari');
      setTerritory(territories[0]?.territoryName || 'Vehari Central');
      setJoiningDate(new Date().toISOString().split('T')[0]);
      setStatus('Active');
      setRemarks('');
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newStaff: SalesStaff = {
      id: editingStaff ? editingStaff.id : `stf_${Date.now()}`,
      staffCode,
      staffName,
      fatherName,
      mobile,
      whatsapp,
      address,
      city,
      territory,
      joiningDate,
      status,
      remarks
    };
    await db.saveSalesStaff(newStaff);
    setShowModal(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (currentUser.role !== 'ADMIN') {
      alert('Normal users cannot delete records.');
      return;
    }
    if (confirm('Delete this sales staff member?')) {
      await db.deleteSalesStaff(id);
      loadData();
    }
  };

  const generateStaffBalanceReportHtml = async (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return '';
    const accounts = await db.getAccounts();
    const vouchers = await db.getVouchers();
    const invoices = await db.getInvoices();
    const profile = await db.getCompanyProfile();

    const staffAccounts = accounts.filter(
      acc =>
        acc.salesStaff === staff.staffName ||
        acc.salesStaff === staff.id ||
        acc.salesStaff === staff.staffCode ||
        (acc.salesStaff && acc.salesStaff.toLowerCase() === staff.staffName.toLowerCase())
    );

    let totalDr = 0;
    let totalCr = 0;
    const rows: any[] = [];

    staffAccounts.forEach(acc => {
      let transDr = 0;
      let transCr = 0;
      vouchers.forEach(v => {
        v.lines.forEach(l => {
          if (l.accountId === acc.id) {
            transDr += Number(l.debit || 0);
            transCr += Number(l.credit || 0);
          }
        });
      });
      invoices.forEach(inv => {
        const isTarget =
          inv.accountName === acc.name ||
          inv.accountName === acc.id ||
          inv.accountName.toLowerCase() === acc.name.toLowerCase();
        if (isTarget) {
          if (inv.invoiceType.includes('SALES')) {
            transCr += Number(inv.netTotal || 0);
          } else if (inv.invoiceType.includes('PURCHASE')) {
            transDr += Number(inv.netTotal || 0);
          }
        }
      });
      const closingNet =
        (acc.openingBalanceType === 'Dr' ? Number(acc.openingBalance) : -Number(acc.openingBalance)) +
        transDr -
        transCr;
      const closingDr = closingNet > 0 ? closingNet : 0;
      const closingCr = closingNet < 0 ? Math.abs(closingNet) : 0;
      totalDr += closingDr;
      totalCr += closingCr;
      rows.push({
        code: acc.code,
        name: acc.name,
        accountType: acc.accountType,
        closingDr,
        closingCr
      });
    });

    const rowsHtml = rows
      .map(
        (r, idx) => `
      <tr>
        <td style="text-align:center;font-family:monospace;font-weight:bold;">${idx + 1}</td>
        <td style="font-family:monospace;font-weight:bold;color:#065f46;">${r.code}</td>
        <td style="font-weight:600;">${r.name}</td>
        <td>${r.accountType}</td>
        <td style="text-align:right;font-family:monospace;">${r.closingDr > 0 ? r.closingDr.toLocaleString() : '-'}</td>
        <td style="text-align:right;font-family:monospace;">${r.closingCr > 0 ? r.closingCr.toLocaleString() : '-'}</td>
      </tr>
    `
      )
      .join('');

    return `
      <div>
        ${buildStandardReportHeaderHtml({
          companyName: profile?.companyName,
          headOfficeAddress: profile?.headOfficeAddress,
          phone: profile?.phone,
          logoUrl: profile?.logoUrl,
          reportTitle: 'Sales Staff Wise Balance List (Trial Balance)',
          subtitle: `Staff: ${staff.staffName} (${staff.staffCode}) &bull; Territory: ${staff.territory || '-'}`
        })}
        <table>
          <thead>
            <tr>
              <th style="width:40px;text-align:center;">#</th>
              <th style="width:90px;">Account Code</th>
              <th>Account Name</th>
              <th style="width:110px;">Account Type</th>
              <th style="width:120px;text-align:right;">Closing Debit (PKR)</th>
              <th style="width:120px;text-align:right;">Closing Credit (PKR)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="6" style="text-align:center;padding:20px;">No accounts assigned to this sales staff.</td></tr>'}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align:right;font-weight:bold;">Total Balance:</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;color:#064e3b;">PKR ${totalDr.toLocaleString()}</td>
              <td style="text-align:right;font-family:monospace;font-weight:bold;color:#b91c1c;">PKR ${totalCr.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        ${buildStandardReportFooterHtml(profile?.companyName)}
      </div>
    `;
  };

  const handlePrintSelectedStaffBalance = async () => {
    if (!selectedStaffId) {
      alert('Please select a sales staff first.');
      return;
    }
    const staff = staffList.find(s => s.id === selectedStaffId);
    const htmlContent = await generateStaffBalanceReportHtml(selectedStaffId);
    printReportDirect({
      title: `${staff?.staffName || 'Sales Staff'} - Balance List`,
      htmlContent,
      landscape: false
    });
    setShowBalanceModal(false);
  };

  const handleExportSelectedStaffBalancePdf = async () => {
    if (!selectedStaffId) {
      alert('Please select a sales staff first.');
      return;
    }
    const staff = staffList.find(s => s.id === selectedStaffId);
    const htmlContent = await generateStaffBalanceReportHtml(selectedStaffId);
    await downloadPdfFromReportHtml({
      htmlContent,
      filename: `${(staff?.staffName || 'Staff').replace(/\s+/g, '_')}_Balance_List.pdf`,
      landscape: false
    });
    setShowBalanceModal(false);
  };

  const filtered = staffList.filter(
    s =>
      s.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.staffCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.territory.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Sales Staff Profiles</h2>
          <p className="text-sm text-gray-500">Manage field sales personnel and territory assignments for Baba Fareed Seed Corporation</p>
        </div>
        <div className="flex space-x-3 flex-wrap gap-2">
          <button
            onClick={() => setShowBalanceModal(true)}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-teal-700 to-emerald-800 hover:from-teal-800 hover:to-emerald-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Sales Staff Balance Report</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Sales Staff</span>
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by staff code, name, or territory..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm rounded-xl border border-gray-300 focus:border-emerald-600 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-bold uppercase text-gray-500 bg-gray-50/80">
              <th className="py-3.5 px-4">Code</th>
              <th className="py-3.5 px-4">Staff Name / Father Name</th>
              <th className="py-3.5 px-4">Contact (Mobile / WhatsApp)</th>
              <th className="py-3.5 px-4">Territory / City</th>
              <th className="py-3.5 px-4">Joining Date</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  No sales staff registered. Click "Add Sales Staff" to create one.
                </td>
              </tr>
            ) : (
              filtered.map(s => (
                <tr key={s.id} className="hover:bg-emerald-50/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">{s.staffCode}</td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-gray-900">{s.staffName}</p>
                    <p className="text-xs text-gray-400">S/O: {s.fatherName}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-gray-900 font-mono font-semibold">{s.mobile}</p>
                    <p className="text-xs text-gray-500 font-mono">WA: {s.whatsapp || s.mobile}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-gray-900">{s.territory}</p>
                    <p className="text-xs text-gray-500">{s.city}</p>
                  </td>
                  <td className="py-3.5 px-4 text-gray-600 font-mono text-xs">{s.joiningDate}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                        s.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {(currentUser.role === 'ADMIN' || !editingStaff) && (
                      <button
                        onClick={() => handleOpenModal(s)}
                        className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/20">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingStaff ? 'Edit Sales Staff' : 'Add New Sales Staff'}</h3>
              <button onClick={() => setShowModal(false)} className="text-emerald-200 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Staff Code</label>
                  <input
                    type="text"
                    required
                    value={staffCode}
                    onChange={e => setStaffCode(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Staff Name</label>
                  <input
                    type="text"
                    required
                    value={staffName}
                    onChange={e => setStaffName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Father Name</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={e => setFatherName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Mobile No</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +92 300 3179077"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Territory</label>
                  <input
                    type="text"
                    value={territory}
                    onChange={e => setTerritory(e.target.value)}
                    placeholder="e.g. Vehari, Burewala, Mailsi"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={e => setJoiningDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md cursor-pointer"
                >
                  Save Sales Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/20">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-lg font-bold">Select Sales Staff for Balance Report</h3>
              <button onClick={() => setShowBalanceModal(false)} className="text-emerald-200 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Select Sales Staff</label>
                <select
                  value={selectedStaffId}
                  onChange={e => setSelectedStaffId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden bg-white"
                >
                  <option value="">Choose Sales Staff...</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.staffCode} - {s.staffName} ({s.territory})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBalanceModal(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePrintSelectedStaffBalance}
                  className="flex items-center space-x-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-gray-700 text-white hover:bg-gray-800 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportSelectedStaffBalancePdf}
                  className="flex items-center space-x-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-700 text-white hover:bg-emerald-800 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
