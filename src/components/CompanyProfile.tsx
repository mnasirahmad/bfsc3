import React, { useState, useEffect, useRef } from 'react';
import { db, DEFAULT_COMPANY_PROFILE } from '../services/db';
import { CompanyProfileData, UserProfile } from '../types';
import { Building, Save, CheckCircle2, Upload, RefreshCw } from 'lucide-react';

interface CompanyProfileProps {
  currentUser: UserProfile;
  onProfileUpdated?: (profile: CompanyProfileData) => void;
}

export const CompanyProfileComponent: React.FC<CompanyProfileProps> = ({ currentUser, onProfileUpdated }) => {
  const [profile, setProfile] = useState<CompanyProfileData>(DEFAULT_COMPANY_PROFILE);
  const [savedMessage, setSavedMessage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const data = await db.getCompanyProfile();
    setProfile(data);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setProfile(prev => ({ ...prev, logoUrl: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'ADMIN') {
      alert('Only Admin can modify Company Profile.');
      return;
    }
    await db.saveCompanyProfile(profile);
    if (onProfileUpdated) {
      onProfileUpdated(profile);
    }
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-gray-950 tracking-tight">Company Profile Setup</h2>
        <p className="text-sm text-gray-500">Configure official company details, address, NTN, STRN, and footers</p>
      </div>

      {savedMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-2xl flex items-center space-x-2 font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          <span>Company profile updated and saved to MySQL backend successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-gray-200 shadow-xl p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              required
              value={profile.companyName}
              onChange={e => setProfile({ ...profile, companyName: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-bold text-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Financial Year</label>
            <input
              type="text"
              required
              value={profile.financialYear}
              onChange={e => setProfile({ ...profile, financialYear: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-semibold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Head Office Address</label>
          <input
            type="text"
            required
            value={profile.headOfficeAddress}
            onChange={e => setProfile({ ...profile, headOfficeAddress: e.target.value })}
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-medium"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={profile.phone}
              onChange={e => setProfile({ ...profile, phone: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Mobile</label>
            <input
              type="text"
              value={profile.mobile}
              onChange={e => setProfile({ ...profile, mobile: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={e => setProfile({ ...profile, email: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Website</label>
            <input
              type="text"
              value={profile.website}
              onChange={e => setProfile({ ...profile, website: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">NTN</label>
            <input
              type="text"
              value={profile.ntn}
              onChange={e => setProfile({ ...profile, ntn: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">STRN</label>
            <input
              type="text"
              value={profile.strn}
              onChange={e => setProfile({ ...profile, strn: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
            />
          </div>
        </div>

        <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700">Official Company Logo</label>
              <p className="text-xs text-gray-500">Upload a logo file from your device or specify an image URL</p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Logo File</span>
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={profile.logoUrl || '/logoittehad.png'}
              onChange={e => setProfile({ ...profile, logoUrl: e.target.value })}
              placeholder="/logoittehad.png"
              className="flex-1 rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden bg-white"
            />
            <div className="w-16 h-16 border-2 border-emerald-600/40 rounded-2xl overflow-hidden bg-white flex items-center justify-center p-1 shadow-sm">
              <img
                src={profile.logoUrl || '/logoittehad.png'}
                alt="Logo Preview"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Invoice Footer Note</label>
            <textarea
              rows={2}
              value={profile.invoiceFooter}
              onChange={e => setProfile({ ...profile, invoiceFooter: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Report Footer Note</label>
            <textarea
              rows={2}
              value={profile.reportFooter}
              onChange={e => setProfile({ ...profile, reportFooter: e.target.value })}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 flex items-center justify-between flex-wrap gap-4">
          <p className="text-xs text-gray-500 font-bold">Baba Fareed Seed Corporation • Vehari</p>
          {currentUser.role === 'ADMIN' && (
            <div className="flex space-x-3 flex-wrap gap-2">
              <button
                type="submit"
                className="flex items-center space-x-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
