import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Territory, UserProfile } from '../types';
import { MapPin, Plus, Search, Edit, Trash2, X } from 'lucide-react';

export const TerritoryComponent: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
  const [territoryCode, setTerritoryCode] = useState('');
  const [territoryName, setTerritoryName] = useState('');
  const [city, setCity] = useState('Vehari');
  const [district, setDistrict] = useState('Vehari');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  useEffect(() => {
    loadTerritories();
  }, []);

  const loadTerritories = async () => {
    const list = await db.getTerritories();
    setTerritories(list);
  };

  const handleOpenModal = (t?: Territory) => {
    if (t) {
      setEditingTerritory(t);
      setTerritoryCode(t.territoryCode);
      setTerritoryName(t.territoryName);
      setCity(t.city);
      setDistrict(t.district);
      setDescription(t.description || '');
      setStatus(t.status);
    } else {
      setEditingTerritory(null);
      setTerritoryCode(`TER-${Math.floor(100 + Math.random() * 900)}`);
      setTerritoryName('');
      setCity('Vehari');
      setDistrict('Vehari');
      setDescription('');
      setStatus('Active');
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTerritory: Territory = {
      id: editingTerritory ? editingTerritory.id : `ter_${Date.now()}`,
      territoryCode,
      territoryName,
      city,
      district,
      description,
      status
    };
    await db.saveTerritory(newTerritory);
    setShowModal(false);
    loadTerritories();
  };

  const handleDelete = async (id: string) => {
    if (currentUser.role !== 'ADMIN') {
      alert('Normal users cannot delete territories.');
      return;
    }
    if (confirm('Delete this territory?')) {
      await db.deleteTerritory(id);
      loadTerritories();
    }
  };

  const filtered = territories.filter(
    t =>
      t.territoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight">Territory Profiles</h2>
          <p className="text-sm text-gray-500">Manage agricultural sales territories, cities, and operational regions</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Territory</span>
        </button>
      </div>

      <div className="flex items-center space-x-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by territory name, city, or district..."
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
              <th className="py-3.5 px-4">Territory Name</th>
              <th className="py-3.5 px-4">City</th>
              <th className="py-3.5 px-4">District</th>
              <th className="py-3.5 px-4">Description</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  No territories defined yet. Click "Add Territory" to create one.
                </td>
              </tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} className="hover:bg-emerald-50/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">{t.territoryCode}</td>
                  <td className="py-3.5 px-4 font-bold text-gray-900">{t.territoryName}</td>
                  <td className="py-3.5 px-4 text-gray-700 font-semibold">{t.city}</td>
                  <td className="py-3.5 px-4 text-gray-600">{t.district}</td>
                  <td className="py-3.5 px-4 text-gray-500 text-xs">{t.description || 'N/A'}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                        t.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {(currentUser.role === 'ADMIN' || !editingTerritory) && (
                      <button
                        onClick={() => handleOpenModal(t)}
                        className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => handleDelete(t.id)}
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
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/20">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingTerritory ? 'Edit Territory' : 'Add New Territory'}</h3>
              <button onClick={() => setShowModal(false)} className="text-emerald-200 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Territory Code</label>
                  <input
                    type="text"
                    required
                    value={territoryCode}
                    onChange={e => setTerritoryCode(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Territory Name</label>
                  <input
                    type="text"
                    required
                    value={territoryName}
                    onChange={e => setTerritoryName(e.target.value)}
                    placeholder="e.g. Vehari Rural, Multan Road Sector"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">District</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
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
                  Save Territory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
