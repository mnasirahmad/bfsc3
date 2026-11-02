import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { UserProfile, DatabaseStatus } from '../types';
import { Lock, User, ShieldCheck, Database, CheckCircle2, Sparkles, Phone, Building } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  onOpenMySQLModal: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onOpenMySQLModal }) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus>({ type: 'local', connected: false });

  useEffect(() => {
    checkDb();
  }, []);

  const checkDb = async () => {
    const s = await db.getDatabaseStatus();
    setDbStatus(s);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const users = await db.getUsers();
      const found = users.find(
        u =>
          (u.username.toLowerCase() === usernameOrEmail.toLowerCase().trim() ||
            (u.email && u.email.toLowerCase() === usernameOrEmail.toLowerCase().trim())) &&
          u.active &&
          ((u.password || 'admin123') === password)
      );
      if (!found) {
        setError('Invalid username/email or password, or account is inactive.');
        setLoading(false);
        return;
      }
      onLoginSuccess(found);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDefaultAdmin = () => {
    setUsernameOrEmail('admin');
    setPassword('admin123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-teal-900 to-indigo-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Lighting colorful backdrop blur glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/30 relative z-10">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-950 p-6 text-center text-white relative">
          <button
            onClick={onOpenMySQLModal}
            className="absolute top-4 right-4 flex items-center space-x-1.5 bg-emerald-800/90 hover:bg-emerald-700 text-xs px-2.5 py-1.5 rounded-lg border border-emerald-600 transition-colors shadow-xs cursor-pointer"
            title="Configure MySQL Backend"
          >
            <Database className="w-3.5 h-3.5 text-emerald-300" />
            <span>{dbStatus.connected ? 'MySQL Connected' : 'MySQL Setup'}</span>
            {dbStatus.connected && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          </button>
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-3 shadow-xl overflow-hidden border-2 border-emerald-400 p-1">
            <img src="/logoittehad.png" alt="Baba Fareed Seed Corporation" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <div className="flex items-center justify-center space-x-1 text-emerald-300 text-[10px] font-bold tracking-widest uppercase mb-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Enterprise Accounting ERP</span>
          </div>
          <h1 className="text-xl font-black tracking-wide uppercase text-white">BABA FAREED SEED CORPORATION</h1>
          <p className="text-xs text-emerald-200 mt-1 font-semibold flex items-center justify-center space-x-1">
            <Building className="w-3 h-3 inline" />
            <span>7-K.M MULTAN ROAD VEHARI</span>
          </p>
          <p className="text-xs text-emerald-300 mt-0.5 font-medium flex items-center justify-center space-x-1">
            <Phone className="w-3 h-3 inline" />
            <span>+92 300 3179077</span>
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-gray-900">Secure Sign In</h2>
            <p className="text-xs text-gray-500 mt-1">Enter your ERP credentials to access accounts and invoices</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Username / Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  value={usernameOrEmail}
                  onChange={e => setUsernameOrEmail(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-gray-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In to ERP System'}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={fillDefaultAdmin}
              className="text-emerald-700 hover:underline font-bold"
            >
              Quick Fill Admin (admin / admin123)
            </button>
            <span className="text-gray-400 font-medium">MySQL Configured</span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500 font-medium">Baba Fareed Seed Corporation • 7-K.M Multan Road Vehari</p>
        </div>
      </div>
    </div>
  );
};
