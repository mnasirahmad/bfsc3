import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Product, UserProfile } from '../types';
import { Package, Plus, Search, Edit, Trash2, Printer, Download, X } from 'lucide-react';
import {
  printReportDirect,
  downloadPdfFromReportHtml,
  buildStandardReportHeaderHtml,
  buildStandardReportFooterHtml
} from '../utils/reportPrinter';

export const ProductProfileComponent: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Seeds');
  const [variety, setVariety] = useState('');
  const [unit, setUnit] = useState('Bag');
  const [packSize, setPackSize] = useState('50kg');
  const [purchaseRate, setPurchaseRate] = useState<number>(0);
  const [saleRate, setSaleRate] = useState<number>(0);
  const [openingStock, setOpeningStock] = useState<number>(0);
  const [openingStockRate, setOpeningStockRate] = useState<number>(0);
  const [minimumStock, setMinimumStock] = useState<number>(10);
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const list = await db.getProducts();
    setProducts(list);
  };

  const filtered = products.filter(
    p =>
      p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.variety || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const buildCatalogHtml = (compProfile: any): string => {
    const compName = compProfile?.companyName || 'BABA FAREED SEED CORPORATION';
    const compAddr = compProfile?.headOfficeAddress || '7-K.M MULTAN ROAD VEHARI';
    const compPhone = compProfile?.phone || compProfile?.mobile || '+92 300 3179077';
    const logoUrl = compProfile?.logoUrl || '/logoittehad.png';

    const headerHtml = buildStandardReportHeaderHtml({
      companyName: compName,
      headOfficeAddress: compAddr,
      phone: compPhone,
      logoUrl: logoUrl,
      reportTitle: 'PRODUCT & SEED CATALOG / STOCK LIST',
      periodText: `As of ${new Date().toLocaleDateString()}`,
      metaLines: [
        `<strong>Total Products Listed:</strong> ${filtered.length}`,
        `<strong>Category:</strong> All Active Seed & Product Varieties`
      ]
    });

    const rowsHtml = filtered
      .map(
        p => `
      <tr>
        <td style="font-family:monospace;font-weight:bold;color:#065f46;">${p.productCode}</td>
        <td>
          <div style="font-weight:bold;color:#111;">${p.productName}</div>
          <div style="font-size:10px;color:#6b7280;">Variety: ${p.variety || 'N/A'} | Category: ${p.category}</div>
        </td>
        <td>${p.unit} (${p.packSize})</td>
        <td style="text-align:right;font-family:monospace;">${Number(p.purchaseRate).toLocaleString()}</td>
        <td style="text-align:right;font-family:monospace;font-weight:bold;color:#065f46;">${Number(p.saleRate).toLocaleString()}</td>
        <td style="text-align:right;font-family:monospace;font-weight:bold;">${p.openingStock}</td>
        <td style="text-align:center;">
          <span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:bold;background:${p.active ? '#dcfce7;color:#166534;' : '#fee2e2;color:#991b1b;'}">
            ${p.active ? 'Active' : 'Inactive'}
          </span>
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
              <th style="width:85px;">Code</th>
              <th>Product Name / Variety</th>
              <th style="width:110px;">Unit & Pack Size</th>
              <th style="width:110px;text-align:right;">Pur. Rate (PKR)</th>
              <th style="width:110px;text-align:right;">Sale Rate (PKR)</th>
              <th style="width:105px;text-align:right;">Stock (Qty)</th>
              <th style="width:85px;text-align:center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7" style="text-align:center;padding:20px;color:#6b7280;">No products found.</td></tr>'}
          </tbody>
        </table>
        ${buildStandardReportFooterHtml(compName)}
      </div>
    `;
  };

  const handlePrint = async () => {
    const profile = await db.getCompanyProfile();
    const compName = profile?.companyName || 'BABA FAREED SEED CORPORATION';
    const htmlContent = buildCatalogHtml(profile);
    printReportDirect({
      title: `${compName} - Product Catalog`,
      htmlContent,
      landscape: false
    });
  };

  const exportPdf = async () => {
    const profile = await db.getCompanyProfile();
    const compName = profile?.companyName || 'BABA FAREED SEED CORPORATION';
    const htmlContent = buildCatalogHtml(profile);
    await downloadPdfFromReportHtml({
      htmlContent,
      filename: `${compName.replace(/\s+/g, '_')}_Product_Catalog.pdf`,
      landscape: false
    });
  };

  const handleOpenModal = (p?: Product) => {
    if (p) {
      setEditingProduct(p);
      setProductCode(p.productCode);
      setProductName(p.productName);
      setCategory(p.category);
      setVariety(p.variety);
      setUnit(p.unit);
      setPackSize(p.packSize);
      setPurchaseRate(p.purchaseRate);
      setSaleRate(p.saleRate);
      setOpeningStock(p.openingStock);
      setOpeningStockRate(p.openingStockRate);
      setMinimumStock(p.minimumStock);
      setDescription(p.description || '');
      setActive(p.active);
    } else {
      setEditingProduct(null);
      setProductCode(`PRD-${Math.floor(1000 + Math.random() * 9000)}`);
      setProductName('');
      setCategory('Seeds');
      setVariety('');
      setUnit('Bag');
      setPackSize('50kg');
      setPurchaseRate(0);
      setSaleRate(0);
      setOpeningStock(0);
      setOpeningStockRate(0);
      setMinimumStock(10);
      setDescription('');
      setActive(true);
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newProduct: Product = {
      id: editingProduct ? editingProduct.id : `prd_${Date.now()}`,
      productCode,
      productName,
      category,
      variety,
      unit,
      packSize,
      purchaseRate: Number(purchaseRate),
      saleRate: Number(saleRate),
      openingStock: Number(openingStock),
      openingStockRate: Number(openingStockRate),
      minimumStock: Number(minimumStock),
      description,
      active,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString()
    };
    await db.saveProduct(newProduct);
    setShowModal(false);
    loadProducts();
  };

  const handleDelete = async (id: string) => {
    if (currentUser.role !== 'ADMIN') {
      alert('Normal users cannot delete products.');
      return;
    }
    if (confirm('Delete this product?')) {
      await db.deleteProduct(id);
      loadProducts();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight">Product & Seed Profile</h2>
          <p className="text-sm text-gray-500">Manage seed varieties, pack sizes, purchase and sale rates, and inventory</p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 px-3.5 py-2 rounded-xl text-sm font-bold transition-colors border border-gray-200 cursor-pointer shadow-xs"
            title="Print Catalog directly to Default Printer"
          >
            <Printer className="w-4 h-4 text-emerald-700" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="flex items-center space-x-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 px-3.5 py-2 rounded-xl text-sm font-bold transition-colors border border-gray-200 cursor-pointer shadow-xs"
            title="Download PDF matching Print Report"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>PDF</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
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
            placeholder="Search by product code, seed variety, or name..."
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
              <th className="py-3.5 px-4">Product Name / Variety</th>
              <th className="py-3.5 px-4">Unit / Pack</th>
              <th className="py-3.5 px-4 text-right">Pur. Rate (PKR)</th>
              <th className="py-3.5 px-4 text-right">Sale Rate (PKR)</th>
              <th className="py-3.5 px-4 text-right">Opening Stock</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  No products found. Click "Add Product" to create one.
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id} className="hover:bg-emerald-50/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">{p.productCode}</td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-gray-900">{p.productName}</p>
                    <p className="text-xs text-gray-500">Variety: {p.variety || 'N/A'}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-gray-900 font-semibold">{p.unit}</p>
                    <p className="text-xs text-gray-500">{p.packSize}</p>
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-gray-700 font-mono">{p.purchaseRate.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-700 font-mono">{p.saleRate.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-gray-900 font-mono">{p.openingStock}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                        p.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {(currentUser.role === 'ADMIN' || !editingProduct) && (
                      <button
                        onClick={() => handleOpenModal(p)}
                        className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                        title="Edit Product"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete Product"
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
              <h3 className="text-lg font-bold">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setShowModal(false)} className="text-emerald-200 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Product Code</label>
                  <input
                    type="text"
                    required
                    value={productCode}
                    onChange={e => setProductCode(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Variety</label>
                  <input
                    type="text"
                    value={variety}
                    onChange={e => setVariety(e.target.value)}
                    placeholder="e.g. Akbar-2019, Bt-886"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Purchase Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseRate}
                    onChange={e => setPurchaseRate(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Sale Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={saleRate}
                    onChange={e => setSaleRate(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-bold font-mono text-emerald-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Pack Size</label>
                  <input
                    type="text"
                    value={packSize}
                    onChange={e => setPackSize(e.target.value)}
                    placeholder="e.g. 50kg, 40kg"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Opening Stock</label>
                  <input
                    type="number"
                    value={openingStock}
                    onChange={e => setOpeningStock(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Opening Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    value={openingStockRate}
                    onChange={e => setOpeningStockRate(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Min Stock Alert</label>
                  <input
                    type="number"
                    value={minimumStock}
                    onChange={e => setMinimumStock(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
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
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
