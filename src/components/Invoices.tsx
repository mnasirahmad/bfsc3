import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Invoice, InvoiceType, Product, Account, SalesStaff, Territory, UserProfile, InvoiceItem } from '../types';
import { ShoppingBag, Plus, Trash2, Save, Printer, Edit, X, Search, Calendar, RotateCcw, Download } from 'lucide-react';
import { printReportDirect, downloadPdfFromReportHtml } from '../utils/reportPrinter';
import { formatDate } from '../utils/dateUtils';

export const InvoicesComponent: React.FC<{
  currentUser: UserProfile;
  defaultType?: InvoiceType;
  initialInvoiceNo?: string;
}> = ({
  currentUser,
  defaultType = 'SALES_CREDIT',
  initialInvoiceNo
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [staffList, setStaffList] = useState<SalesStaff[]>([]);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<InvoiceType>(defaultType);
  const [selectedPrintInvoice, setSelectedPrintInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountName, setAccountName] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [productSearches, setProductSearches] = useState<{ [index: number]: string }>({});
  const [salesStaff, setSalesStaff] = useState('');
  const [territory, setTerritory] = useState('');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');

  const createEmptyItem = (): InvoiceItem => ({
    productId: '',
    productName: '',
    quantity: 1,
    unit: 'Bag',
    rate: 0,
    discountType: 'PERCENT',
    discount: 0,
    discountAmount: 0,
    amount: 0,
    packSize: '50kg',
    scheme: 'CASH SALE',
    lotNo: '',
    gstPercent: 0,
    gstAmount: 0
  });

  const [items, setItems] = useState<InvoiceItem[]>([createEmptyItem()]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (initialInvoiceNo && invoices.length > 0) {
      const found = invoices.find(i => i.invoiceNo === initialInvoiceNo);
      if (found) {
        setSelectedPrintInvoice(found);
      }
    }
  }, [initialInvoiceNo, invoices]);

  const loadData = async () => {
    const invs = await db.getInvoices();
    const prods = await db.getProducts();
    const accs = await db.getAccounts();
    const staff = await db.getSalesStaff();
    const terrs = await db.getTerritories();
    const profile = await db.getCompanyProfile();

    setInvoices(invs.filter(i => i.invoiceType === activeTab));
    setProducts(prods);
    setAccounts(accs);
    setStaffList(staff);
    setTerritories(terrs);
    setCompanyProfile(profile);
    setEditingInvoice(null);
    setAccountName('');
    setAccountSearch('');
    setProductSearches({});
    setInvoiceNo(`${activeTab.substring(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`);
    setItems([createEmptyItem()]);
  };

  const buildInvoiceHtml = (inv: Invoice): string => {
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const compAddr = companyProfile?.headOfficeAddress || '7-K.M MULTAN ROAD VEHARI';
    const compPhone = companyProfile?.phone || companyProfile?.mobile || '+92 300 3179077';
    const logoUrl = companyProfile?.logoUrl || '/logoittehad.png';

    const matchedAccount = accounts.find(
      acc => acc.name === inv.accountName || acc.id === inv.accountName
    );
    const accountPhone = matchedAccount?.phone || compPhone;

    const getInvoiceTypeName = () => {
      switch (inv.invoiceType) {
        case 'SALES_CASH': return 'CASH SALES INVOICE';
        case 'SALES_CREDIT': return 'CREDIT SALES INVOICE';
        case 'PURCHASE_CASH': return 'CASH PURCHASE INVOICE';
        case 'PURCHASE_CREDIT': return 'CREDIT PURCHASE INVOICE';
        case 'SALES_RETURN': return 'SALES RETURN INVOICE';
        case 'PURCHASE_RETURN': return 'PURCHASE RETURN INVOICE';
        default: return 'INVOICE';
      }
    };

    const rowsHtml = inv.items
      .map(
        item => `
      <tr>
        <td style="font-weight:bold;text-transform:uppercase;">${item.productName}</td>
        <td style="text-align:center;">${item.packSize || '50kg'}</td>
        <td style="text-align:center;">${item.scheme || 'CASH SALE'}</td>
        <td style="text-align:center;font-family:monospace;">${item.lotNo || '-'}</td>
        <td style="text-align:center;font-weight:bold;font-family:monospace;">${item.quantity}</td>
        <td style="text-align:right;font-family:monospace;">${Number(item.rate).toFixed(2)}</td>
        <td style="text-align:right;font-family:monospace;">${(Number(item.discountAmount || 0)).toFixed(2)}</td>
        <td style="text-align:center;font-family:monospace;">${item.gstPercent || 0}%</td>
        <td style="text-align:right;font-family:monospace;">${(Number(item.gstAmount || 0)).toFixed(2)}</td>
        <td style="text-align:right;font-weight:bold;font-family:monospace;color:#064e3b;">${Number(item.amount).toLocaleString()}</td>
      </tr>
    `
      )
      .join('');

    const totalQty = inv.items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #111827; background: #ffffff; width: 100%; min-height: 265mm; display: flex; flex-direction: column; justify-content: space-between; padding: 10mm; box-sizing: border-box;">
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
              <span style="font-weight:900;color:#064e3b;font-size:13px;text-transform:uppercase;letter-spacing:1px;">${getInvoiceTypeName()}</span>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:11.5px;line-height:1.5;">
            <div>
              <div><strong>${inv.invoiceType.includes('SALES') ? 'CUSTOMER' : 'SUPPLIER'}:</strong> <span style="font-weight:bold;color:#064e3b;text-transform:uppercase;">${inv.accountName}</span></div>
              <div><strong>Contact #:</strong> <span style="font-family:monospace;">${accountPhone}</span></div>
            </div>
            <div style="text-align:right;">
              <div><strong>INVOICE NO:</strong> <span style="font-family:monospace;font-weight:bold;color:#064e3b;">${inv.invoiceNo}</span></div>
              <div><strong>DATE:</strong> <span style="font-family:monospace;">${formatDate(inv.date)}</span></div>
              <div><strong>TERRITORY:</strong> <span style="text-transform:uppercase;">${inv.territory || 'VEHARI'}</span></div>
              <div><strong>SALES STAFF:</strong> <span style="text-transform:uppercase;">${inv.salesStaff || 'MARKET'}</span></div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Products</th>
                <th style="width:75px;text-align:center;">Pack Size</th>
                <th style="width:85px;text-align:center;">Scheme</th>
                <th style="width:75px;text-align:center;">Lot #</th>
                <th style="width:65px;text-align:center;">Quantity</th>
                <th style="width:80px;text-align:right;">Price</th>
                <th style="width:75px;text-align:right;">Discount</th>
                <th style="width:60px;text-align:center;">GST %</th>
                <th style="width:75px;text-align:right;">GST</th>
                <th style="width:95px;text-align:right;">Total (PKR)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:14px;font-size:11px;">
            <div style="border:1px solid #d1d5db;background:#f9fafb;padding:8px 10px;border-radius:6px;">
              <div><strong>Payment Mode:</strong> ${inv.invoiceType.replace('_', ' ')}</div>
              <div><strong>Invoice Total:</strong> <span style="font-family:monospace;font-weight:bold;">PKR ${inv.netTotal.toLocaleString()}</span></div>
              <div style="border-top:1px solid #d1d5db;margin-top:4px;padding-top:4px;font-size:12px;font-weight:900;color:#064e3b;">
                Net Due: PKR ${inv.netTotal.toLocaleString()}
              </div>
            </div>
            <div style="border:1px solid #d1d5db;background:#f0fdf4;padding:8px 10px;border-radius:6px;text-align:center;display:flex;flex-direction:column;justify-content:center;">
              <div style="font-size:10px;font-weight:800;color:#047857;text-transform:uppercase;">TOTAL UNITS / BAGS</div>
              <div style="font-size:22px;font-weight:900;color:#064e3b;font-family:monospace;">${totalQty}</div>
            </div>
            <div style="border:1px solid #d1d5db;background:#f9fafb;padding:8px 10px;border-radius:6px;text-align:right;">
              <div>Gross Amount: <span style="font-family:monospace;">PKR ${inv.grossTotal.toLocaleString()}</span></div>
              <div>Discount: <span style="font-family:monospace;color:#b91c1c;">- PKR ${inv.discountTotal.toLocaleString()}</span></div>
              <div style="border-top:1px solid #d1d5db;margin-top:4px;padding-top:4px;font-size:12px;font-weight:900;color:#064e3b;">
                Net Total: PKR ${inv.netTotal.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
        <div>
          <div style="margin-top:40px;padding-top:16px;border-top:1.5px solid #111827;display:grid;grid-template-columns:repeat(5, 1fr);gap:10px;font-size:10px;text-align:center;">
            <div><div style="border-top:1.5px solid #111827;padding-top:5px;font-weight:bold;">Prepared By: ${inv.createdBy || 'Staff'}</div></div>
            <div><div style="border-top:1.5px solid #111827;padding-top:5px;font-weight:bold;">Store Keeper</div></div>
            <div><div style="border-top:1.5px solid #111827;padding-top:5px;font-weight:bold;">Received By</div></div>
            <div><div style="border-top:1.5px solid #111827;padding-top:5px;font-weight:bold;">Authorized Signatory</div></div>
            <div><div style="border-top:1.5px solid #111827;padding-top:5px;font-weight:bold;">Sign & Stamp</div></div>
          </div>
          <div style="text-align:center;font-size:10px;color:#6b7280;margin-top:20px;border-top:1px dashed #d1d5db;padding-top:6px;">
            ${compName} &bull; ${compAddr} &bull; Phone: ${compPhone}
          </div>
        </div>
      </div>
    `;
  };

  const handlePrintInvoice = (inv: Invoice) => {
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const htmlContent = buildInvoiceHtml(inv);
    printReportDirect({
      title: `${compName} - Invoice ${inv.invoiceNo}`,
      htmlContent,
      landscape: false
    });
  };

  const handleExportInvoicePdf = async (inv: Invoice) => {
    const compName = companyProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const htmlContent = buildInvoiceHtml(inv);
    await downloadPdfFromReportHtml({
      htmlContent,
      filename: `${compName.replace(/\s+/g, '_')}_Invoice_${inv.invoiceNo}.pdf`,
      landscape: false
    });
  };

  const handleEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setInvoiceNo(inv.invoiceNo);
    setDate(inv.date);
    setAccountName(inv.accountName);
    setSalesStaff(inv.salesStaff || '');
    setTerritory(inv.territory || '');
    setReason(inv.reason || '');
    setItems(
      inv.items.map(it => {
        const qty = Number(it.quantity || 0);
        const rate = Number(it.rate || 0);
        const gross = qty * rate;
        const disc = Number(it.discount || 0);
        const dType = it.discountType || 'PERCENT';
        let discAmt = it.discountAmount;
        if (discAmt === undefined) {
          if (dType === 'UNIT') discAmt = qty * disc;
          else if (dType === 'FIXED') discAmt = disc;
          else discAmt = (gross * disc) / 100;
        }
        return {
          ...it,
          discountType: dType,
          discountAmount: Math.round(Number(discAmt || 0) * 100) / 100
        };
      })
    );
    setRemarks(inv.remarks || '');
  };

  const handleCancelEdit = () => {
    setEditingInvoice(null);
    setInvoiceNo(`${activeTab.substring(0, 3)}-${Math.floor(1000 + Math.random() * 9000)}`);
    setDate(new Date().toISOString().split('T')[0]);
    setAccountName('');
    setSalesStaff('');
    setTerritory('');
    setReason('');
    setItems([createEmptyItem()]);
    setRemarks('');
  };

  const handleAddItem = () => {
    setItems([...items, createEmptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      updated[index].productId = value;
      updated[index].productName = prod ? prod.productName : '';
      updated[index].unit = prod ? prod.unit : 'Bag';
      updated[index].packSize = prod ? prod.packSize : '50kg';
      updated[index].scheme = 'CASH SALE';
      updated[index].rate = activeTab.includes('SALES') ? prod?.saleRate || 0 : prod?.purchaseRate || 0;
    } else {
      (updated[index] as any)[field] = value;
    }

    const qty = Number(updated[index].quantity || 0);
    const rate = Number(updated[index].rate || 0);
    const rawDisc = Number(updated[index].discount || 0);
    const dType = updated[index].discountType || 'PERCENT';
    const gross = qty * rate;

    let calcDisc = 0;
    if (dType === 'PERCENT') {
      calcDisc = (gross * rawDisc) / 100;
    } else if (dType === 'UNIT') {
      calcDisc = qty * rawDisc;
    } else if (dType === 'FIXED') {
      calcDisc = rawDisc;
    }
    const roundedDisc = Math.max(0, Math.min(gross, Math.round(calcDisc * 100) / 100));
    updated[index].discountAmount = roundedDisc;

    const gstPct = Number(updated[index].gstPercent || 0);
    const baseAmount = gross - roundedDisc;
    const gstAmt = (baseAmount * gstPct) / 100;
    updated[index].gstAmount = Math.round(gstAmt * 100) / 100;
    updated[index].amount = Math.round((baseAmount + gstAmt) * 100) / 100;
    setItems(updated);
  };

  const grossTotal = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);
  const discountTotal = items.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0);
  const netTotal = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName) {
      alert('Please select customer or supplier account.');
      return;
    }
    const newInvoice: Invoice = {
      id: editingInvoice ? editingInvoice.id : `inv_${Date.now()}`,
      invoiceNo,
      invoiceType: activeTab,
      date,
      accountName,
      salesStaff,
      territory,
      reason,
      items,
      grossTotal,
      discountTotal,
      netTotal,
      remarks,
      createdBy: currentUser.fullName,
      createdAt: editingInvoice ? editingInvoice.createdAt : new Date().toISOString()
    };
    await db.saveInvoice(newInvoice);
    alert(editingInvoice ? 'Invoice updated successfully!' : 'Invoice saved & posted to MySQL successfully!');
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (currentUser.role !== 'ADMIN') {
      alert('Normal users cannot delete saved invoices.');
      return;
    }
    if (confirm('Are you sure you want to delete this invoice?')) {
      await db.deleteInvoice(id);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight">
            {activeTab === 'SALES_CASH' && 'Cash Sales Invoice'}
            {activeTab === 'SALES_CREDIT' && 'Credit Sales Invoice'}
            {activeTab === 'PURCHASE_CASH' && 'Cash Purchase Invoice'}
            {activeTab === 'PURCHASE_CREDIT' && 'Credit Purchase Invoice'}
            {activeTab === 'SALES_RETURN' && 'Sales Return Invoice'}
            {activeTab === 'PURCHASE_RETURN' && 'Purchase Return Invoice'}
          </h2>
          <p className="text-sm text-gray-500">Manage seed sales, purchase transactions, and inventory updates</p>
        </div>
        <div className="flex space-x-1 bg-white p-1 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('SALES_CREDIT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
              activeTab === 'SALES_CREDIT' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Credit Sales
          </button>
          <button
            onClick={() => setActiveTab('SALES_CASH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
              activeTab === 'SALES_CASH' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Cash Sales
          </button>
          <button
            onClick={() => setActiveTab('PURCHASE_CREDIT')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
              activeTab === 'PURCHASE_CREDIT' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Purchase
          </button>
          <button
            onClick={() => setActiveTab('SALES_RETURN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
              activeTab === 'SALES_RETURN' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Sales Return
          </button>
          <button
            onClick={() => setActiveTab('PURCHASE_RETURN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
              activeTab === 'PURCHASE_RETURN' ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Purchase Return
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-gray-200 shadow-xl p-8 space-y-6">
        {editingInvoice && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-amber-900 text-sm font-semibold">
            <span>Editing Invoice: {editingInvoice.invoiceNo}</span>
            <button type="button" onClick={handleCancelEdit} className="text-xs text-amber-800 underline font-bold cursor-pointer">
              Cancel Amendment
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Invoice No</label>
            <input
              type="text"
              required
              value={invoiceNo}
              onChange={e => setInvoiceNo(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Invoice Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
              {activeTab.includes('SALES') ? 'Customer Account' : 'Supplier Account'}
            </label>
            <input
              type="text"
              placeholder="Search account..."
              value={accountSearch}
              onChange={e => setAccountSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-xs mb-2 focus:border-emerald-600 focus:outline-hidden"
            />
            <select
              required
              value={accountName}
              onChange={e => setAccountName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden bg-white font-medium"
            >
              <option value="">Select Account...</option>
              {accounts
                .filter(
                  acc =>
                    (acc.name || '').toLowerCase().includes(accountSearch.toLowerCase()) ||
                    (acc.code || '').toLowerCase().includes(accountSearch.toLowerCase())
                )
                .map(acc => (
                  <option key={acc.id} value={acc.name}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
            </select>
          </div>
          {activeTab.includes('SALES') ? (
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Sales Staff</label>
              <select
                value={salesStaff}
                onChange={e => setSalesStaff(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden bg-white"
              >
                <option value="">Select Staff...</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.staffName}>
                    {s.staffCode} - {s.staffName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Territory</label>
              <select
                value={territory}
                onChange={e => setTerritory(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden bg-white"
              >
                <option value="">Select Territory...</option>
                {territories.map(t => (
                  <option key={t.id} value={t.territoryName}>
                    {t.territoryCode} - {t.territoryName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-800">Product Line Items</h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center space-x-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product Line</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-bold uppercase text-gray-500 bg-gray-50/80">
                  <th className="py-3 px-3">Product / Seed Variety</th>
                  <th className="py-3 px-3 w-28">Pack Size</th>
                  <th className="py-3 px-3 w-24">Unit</th>
                  <th className="py-3 px-3 w-28">Scheme</th>
                  <th className="py-3 px-3 w-28">Lot No</th>
                  <th className="py-3 px-3 w-24">Quantity</th>
                  <th className="py-3 px-3 w-28 text-right">Rate</th>
                  <th className="py-3 px-3 min-w-[190px] text-right">Discount Mode & Value</th>
                  <th className="py-3 px-3 w-32 text-right">Amount (PKR)</th>
                  <th className="py-3 px-3 w-12 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-emerald-50/40">
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        placeholder="Search product..."
                        value={productSearches[idx] || ''}
                        onChange={e => setProductSearches({ ...productSearches, [idx]: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 px-2.5 py-1.5 text-xs mb-1.5 focus:border-emerald-600 focus:outline-hidden"
                      />
                      <select
                        required
                        value={item.productId}
                        onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-hidden bg-white font-medium"
                      >
                        <option value="">Select Product...</option>
                        {products
                          .filter(p => {
                            const q = (productSearches[idx] || '').toLowerCase();
                            const pName = (p.productName || '').toLowerCase();
                            const pCode = (p.productCode || '').toLowerCase();
                            const pVariety = (p.variety || '').toLowerCase();
                            return pName.includes(q) || pCode.includes(q) || pVariety.includes(q);
                          })
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              {p.productCode} - {p.productName} ({p.packSize})
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={item.packSize || ''}
                        onChange={e => handleItemChange(idx, 'packSize', e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-2.5 py-2 text-sm"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={item.unit || 'Bag'}
                        onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-2.5 py-2 text-sm bg-white font-medium"
                      >
                        <option value="Bag">Bag</option>
                        <option value="kg">kg</option>
                        <option value="Packet">Packet</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={item.scheme || ''}
                        onChange={e => handleItemChange(idx, 'scheme', e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-2.5 py-2 text-sm"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={item.lotNo || ''}
                        onChange={e => handleItemChange(idx, 'lotNo', e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-2.5 py-2 text-sm font-mono"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="w-full rounded-xl border border-gray-300 px-2.5 py-2 text-sm font-bold"
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={item.rate}
                        onChange={e => handleItemChange(idx, 'rate', Number(e.target.value))}
                        className="w-full text-right rounded-xl border border-gray-300 px-2.5 py-2 text-sm font-bold font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="space-y-1.5">
                        <div className="flex rounded-xl shadow-2xs border border-gray-300 overflow-hidden text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => handleItemChange(idx, 'discountType', 'PERCENT')}
                            className={`flex-1 py-1 px-1.5 transition-colors cursor-pointer ${
                              item.discountType === 'PERCENT' || !item.discountType
                                ? 'bg-emerald-700 text-white font-black'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            % Amt
                          </button>
                          <button
                            type="button"
                            onClick={() => handleItemChange(idx, 'discountType', 'UNIT')}
                            className={`flex-1 py-1 px-1.5 transition-colors border-l border-gray-300 cursor-pointer ${
                              item.discountType === 'UNIT'
                                ? 'bg-emerald-700 text-white font-black'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            /Unit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleItemChange(idx, 'discountType', 'FIXED')}
                            className={`flex-1 py-1 px-1 transition-colors border-l border-gray-300 cursor-pointer ${
                              item.discountType === 'FIXED'
                                ? 'bg-emerald-700 text-white font-black'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            Flat
                          </button>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.discount}
                          onChange={e => handleItemChange(idx, 'discount', Number(e.target.value))}
                          placeholder="Value"
                          className="w-full text-right rounded-xl border border-gray-300 px-2.5 py-1.5 text-sm font-semibold focus:border-emerald-600 focus:outline-hidden font-mono"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="font-bold text-gray-900 font-mono text-sm">{item.amount.toLocaleString()}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 flex-wrap gap-4">
            <div className="flex space-x-6 text-sm">
              <p>Gross Total: <span className="font-bold text-gray-900 font-mono">PKR {grossTotal.toLocaleString()}</span></p>
              <p>Discount: <span className="font-bold text-gray-900 font-mono">PKR {discountTotal.toLocaleString()}</span></p>
              <p className="text-base">Net Total: <span className="font-black text-emerald-800 font-mono">PKR {netTotal.toLocaleString()}</span></p>
            </div>
            <button
              type="submit"
              className={`flex items-center space-x-2 ${
                editingInvoice ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900'
              } text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer`}
            >
              <Save className="w-4 h-4" />
              <span>{editingInvoice ? 'Update Invoice' : 'Save & Post Invoice'}</span>
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

        const filteredInvoices = invoices.filter(inv => {
          const invDate = inv.date ? inv.date.split('T')[0] : '';
          if (filterStartDate && invDate < filterStartDate) return false;
          if (filterEndDate && invDate > filterEndDate) return false;
          if (searchKeyword.trim()) {
            const q = searchKeyword.toLowerCase().trim();
            const matchNo = inv.invoiceNo.toLowerCase().includes(q);
            const matchAcc = (inv.accountName || '').toLowerCase().includes(q);
            const matchStaff = (inv.salesStaff || '').toLowerCase().includes(q);
            const matchTerr = (inv.territory || '').toLowerCase().includes(q);
            const matchItems = inv.items?.some(it =>
              (it.productName || '').toLowerCase().includes(q) ||
              (it.lotNo || '').toLowerCase().includes(q)
            );
            if (!matchNo && !matchAcc && !matchStaff && !matchTerr && !matchItems) {
              return false;
            }
          }
          return true;
        });

        const filteredNetTotal = filteredInvoices.reduce((sum, inv) => sum + Number(inv.netTotal || 0), 0);
        const isInvoiceFilterActive = Boolean(filterStartDate || filterEndDate || searchKeyword);

        return (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-emerald-700" />
                    <span>Search & Filter Invoices</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Filter invoices date-wise or search by number, account, or variety</p>
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
                  {isInvoiceFilterActive && (
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
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Search Invoice # / Account / Product</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by invoice #, account, variety..."
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
                  Showing <strong className="text-gray-900">{filteredInvoices.length}</strong> of <strong className="text-gray-900">{invoices.length}</strong> invoices
                </span>
                <span className="text-gray-900">
                  Net Total: <strong className="font-mono font-black text-emerald-800 text-sm">PKR {filteredNetTotal.toLocaleString()}</strong>
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 space-y-4">
              <h3 className="text-lg font-bold text-gray-900">
                Recent Invoices ({filteredInvoices.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-bold uppercase text-gray-500 bg-gray-50/80">
                      <th className="py-3.5 px-4">Invoice No</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Account / Customer</th>
                      <th className="py-3.5 px-4">Sales Staff</th>
                      <th className="py-3.5 px-4 text-right">Net Amount (PKR)</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-gray-400">
                          No invoices recorded for this module.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">{inv.invoiceNo}</td>
                          <td className="py-3.5 px-4 text-gray-600 font-mono text-xs">{formatDate(inv.date)}</td>
                          <td className="py-3.5 px-4 font-bold text-gray-900">{inv.accountName}</td>
                          <td className="py-3.5 px-4 text-gray-600">{inv.salesStaff || 'N/A'}</td>
                          <td className="py-3.5 px-4 text-right font-black text-emerald-700 font-mono">{inv.netTotal.toLocaleString()}</td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => setSelectedPrintInvoice(inv)}
                              className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl cursor-pointer"
                              title="Print Invoice"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleExportInvoicePdf(inv)}
                              className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl cursor-pointer"
                              title="Export PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(inv)}
                              className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl cursor-pointer"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {currentUser.role === 'ADMIN' && (
                              <button
                                onClick={() => handleDelete(inv.id)}
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

      {/* PRINT PREVIEW MODAL */}
      {selectedPrintInvoice && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-gray-900 text-white">
              <h3 className="font-bold text-lg flex items-center space-x-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <span>Invoice Print Preview</span>
              </h3>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => handlePrintInvoice(selectedPrintInvoice)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Invoice</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportInvoicePdf(selectedPrintInvoice)}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPrintInvoice(null)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-8 overflow-y-auto bg-white text-black font-sans space-y-6">
              <div className="flex items-start justify-between border-b-2 border-emerald-900 pb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-gray-300 flex items-center justify-center overflow-hidden p-1 shadow-xs">
                    <img src={companyProfile?.logoUrl || '/logoittehad.png'} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-emerald-900 tracking-wider uppercase">
                      {companyProfile?.companyName || 'BABA FAREED SEED CORPORATION'}
                    </h1>
                    <p className="text-xs font-bold text-gray-700 mt-0.5">
                      HEAD OFFICE: {companyProfile?.headOfficeAddress || '7-K.M MULTAN ROAD VEHARI'} PH.{companyProfile?.phone || '+92 300 3179077'}
                    </p>
                  </div>
                </div>
                <div className="text-center border-2 border-emerald-900 px-6 py-2 rounded-xl bg-emerald-50">
                  <span className="text-sm font-black text-emerald-900 uppercase tracking-widest">
                    {selectedPrintInvoice.invoiceType.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <p className="font-bold text-gray-900">
                    {selectedPrintInvoice.invoiceType.includes('SALES') ? 'CUSTOMER' : 'SUPPLIER'} :{' '}
                    <span className="font-semibold uppercase">{selectedPrintInvoice.accountName}</span>
                  </p>
                </div>
                <div className="text-right space-y-0.5">
                  <p className="font-bold">INVOICE NO. : <span className="font-mono">{selectedPrintInvoice.invoiceNo}</span></p>
                  <p className="font-bold">Date : <span className="font-mono">{selectedPrintInvoice.date}</span></p>
                  <p className="font-bold">Territory : <span className="font-normal uppercase">{selectedPrintInvoice.territory || 'VEHARI'}</span></p>
                </div>
              </div>

              <table className="w-full border-collapse border border-gray-400 text-xs">
                <thead>
                  <tr className="bg-emerald-900 text-white font-bold uppercase text-center">
                    <th className="border border-emerald-900 py-2 px-2 text-left">Products</th>
                    <th className="border border-emerald-900 py-2 px-2">Pack size</th>
                    <th className="border border-emerald-900 py-2 px-2">Scheme</th>
                    <th className="border border-emerald-900 py-2 px-2">Lot No</th>
                    <th className="border border-emerald-900 py-2 px-2">Quantity</th>
                    <th className="border border-emerald-900 py-2 px-2 text-right">Price</th>
                    <th className="border border-emerald-900 py-2 px-2 text-right">Dis.</th>
                    <th className="border border-emerald-900 py-2 px-2 text-center">GST%</th>
                    <th className="border border-emerald-900 py-2 px-2 text-right">GST</th>
                    <th className="border border-emerald-900 py-2 px-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {selectedPrintInvoice.items.map((item, idx) => (
                    <tr key={idx} className="text-gray-900 font-medium">
                      <td className="border border-gray-300 py-2 px-2 uppercase font-bold">{item.productName}</td>
                      <td className="border border-gray-300 py-2 px-2 text-center">{item.packSize || '50kg'}</td>
                      <td className="border border-gray-300 py-2 px-2 text-center">{item.scheme || 'CASH SALE'}</td>
                      <td className="border border-gray-300 py-2 px-2 text-center font-mono">{item.lotNo || ''}</td>
                      <td className="border border-gray-300 py-2 px-2 text-center font-bold">{item.quantity}</td>
                      <td className="border border-gray-300 py-2 px-2 text-right font-mono">{item.rate.toFixed(2)}</td>
                      <td className="border border-gray-300 py-2 px-2 text-right font-mono">{(item.discountAmount || 0).toFixed(2)}</td>
                      <td className="border border-gray-300 py-2 px-2 text-center font-mono">{item.gstPercent || 0}</td>
                      <td className="border border-gray-300 py-2 px-2 text-right font-mono">{(item.gstAmount || 0).toFixed(2)}</td>
                      <td className="border border-gray-300 py-2 px-2 text-right font-bold font-mono">{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                <div className="border border-gray-400 p-3 space-y-1 bg-gray-50 rounded-xl">
                  <div className="flex justify-between font-bold text-gray-900 text-sm">
                    <span>Net Due :</span>
                    <span className="font-mono">{selectedPrintInvoice.netTotal.toLocaleString()} PKR</span>
                  </div>
                </div>
                <div className="border border-gray-400 p-3 space-y-1 bg-gray-50 rounded-xl text-right">
                  <div>Gross Amount: <span className="font-mono">{selectedPrintInvoice.grossTotal.toLocaleString()}</span></div>
                  <div>Discount: <span className="font-mono text-rose-600">- {selectedPrintInvoice.discountTotal.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold text-gray-900 text-sm border-t border-black pt-1">
                    <span>Net Total :</span>
                    <span className="font-mono font-black text-emerald-900">{selectedPrintInvoice.netTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-3 gap-6 border-t-2 border-emerald-950 pt-4 text-center">
                  <div>Prepared By: {selectedPrintInvoice.createdBy}</div>
                  <div>Store Keeper</div>
                  <div>Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
