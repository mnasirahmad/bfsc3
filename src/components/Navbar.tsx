import React, { useState, useEffect } from 'react';
import { UserProfile, CompanyProfileData, DatabaseStatus } from '../types';
import { db } from '../services/db';
import { LogOut, Database, Shield, User as UserIcon, CheckCircle2, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentUser: UserProfile;
  companyProfile: CompanyProfileData;
  onLogout: () => void;
  onOpenMySQLModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, companyProfile, onLogout, onOpenMySQLModal }) => {
  const [dbStatus, setDbStatus] = useState<DatabaseStatus>({ type: 'local', connected: false });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const s = await db.getDatabaseStatus();
    setDbStatus(s);
  };

  return (
    <header className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white shadow-xl sticky top-0 z-30 border-b border-emerald-500/20">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-white/95 backdrop-blur-md flex items-center justify-center border-2 border-emerald-400 shadow-lg overflow-hidden p-0.5">
            <img
              src={companyProfile.logoUrl || '/logoittehad.png'}
              alt="Baba Fareed Seed Corporation"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <h1 className="text-sm sm:text-base font-black tracking-wider uppercase text-white">
                {companyProfile.companyName || 'BABA FAREED SEED CORPORATION'}
              </h1>
            </div>
            <p className="text-[11px] text-emerald-300 font-medium">
              {companyProfile.headOfficeAddress || '7-K.M MULTAN ROAD VEHARI'} | PH: {companyProfile.phone || '+92 300 3179077'}
            </p>
          </div>
        </div>

        {/* Actions & User */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenMySQLModal}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-md ${
              dbStatus.connected
                ? 'bg-gradient-to-r from-emerald-700 to-teal-800 text-white border-emerald-500 shadow-emerald-500/20'
                : 'bg-emerald-900/80 text-emerald-200 border-emerald-700 hover:bg-emerald-800'
            }`}
            title="Configure MySQL Backend Database"
          >
            <Database className="w-3.5 h-3.5 text-emerald-300" />
            <span>{dbStatus.connected ? 'MySQL Connected' : 'MySQL Setup'}</span>
            {dbStatus.connected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            )}
          </button>

          <div className="flex items-center space-x-2 bg-emerald-900/50 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-emerald-700/50 shadow-inner">
            {currentUser.role === 'ADMIN' ? (
              <Shield className="w-4 h-4 text-amber-400" />
            ) : (
              <UserIcon className="w-4 h-4 text-emerald-300" />
            )}
            <div className="text-left">
              <p className="text-xs font-bold leading-tight text-white">{currentUser.fullName}</p>
              <p className="text-[10px] text-emerald-300 uppercase tracking-wider font-mono font-semibold">{currentUser.role}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
