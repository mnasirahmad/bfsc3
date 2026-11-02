import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { UserProfile, Role } from '../types';
import { ShieldUser, Plus, UserCheck, UserX, Key, Edit, Trash2, X } from 'lucide-react';

export const UserManagement: React.FC<{ currentUser: UserProfile }> = ({ currentUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('USER');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const list = await db.getUsers();
    setUsers(list);
  };

  const handleOpenModal = (user?: UserProfile) => {
    if (user) {
      setEditingUser(user);
      setUsername(user.username);
      setFullName(user.fullName);
      setEmail(user.email);
      setMobile(user.mobile);
      setPassword('');
      setRole(user.role);
    } else {
      setEditingUser(null);
      setUsername('');
      setFullName('');
      setEmail('');
      setMobile('');
      setPassword('');
      setRole('USER');
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser && (!password || password.length < 6)) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    const newUser: UserProfile = {
      id: editingUser ? editingUser.id : `usr_${Date.now()}`,
      username: username.trim(),
      fullName: fullName.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      password: password ? password : (editingUser ? editingUser.password : 'admin123'),
      role,
      active: editingUser ? editingUser.active : true,
      permissions:
        role === 'ADMIN'
          ? {
              canManageUsers: true,
              canManageAccounts: true,
              canManageProducts: true,
              canManageStaff: true,
              canManageTerritories: true,
              canManageCompany: true,
              canCreateVouchers: true,
              canCreateInvoices: true,
              canViewReports: true,
              canEditDelete: true
            }
          : {
              canManageUsers: false,
              canManageAccounts: true,
              canManageProducts: true,
              canManageStaff: true,
              canManageTerritories: true,
              canManageCompany: false,
              canCreateVouchers: true,
              canCreateInvoices: true,
              canViewReports: true,
              canEditDelete: false
            },
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString()
    };

    await db.saveUser(newUser);
    setShowModal(false);
    loadUsers();
  };

  const toggleActive = async (user: UserProfile) => {
    if (user.id === currentUser.id) {
      alert('You cannot deactivate your own active session account.');
      return;
    }
    user.active = !user.active;
    await db.saveUser(user);
    loadUsers();
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser.id) {
      alert('You cannot delete your own account.');
      return;
    }
    if (confirm('Are you sure you want to delete this user?')) {
      await db.deleteUser(id);
      loadUsers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight">User & Admin Management</h2>
          <p className="text-sm text-gray-500">Manage user accounts, roles, and strict permission levels</p>
        </div>
        {currentUser.role === 'ADMIN' && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center space-x-2 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New User / Admin</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-xs font-bold uppercase text-gray-500 bg-gray-50/80">
              <th className="py-3.5 px-4">User Info</th>
              <th className="py-3.5 px-4">Username / Email</th>
              <th className="py-3.5 px-4">Mobile</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-emerald-50/40">
                <td className="py-3.5 px-4">
                  <p className="font-bold text-gray-900">{u.fullName}</p>
                  <p className="text-xs text-gray-400">Created: {new Date(u.createdAt).toLocaleDateString()}</p>
                </td>
                <td className="py-3.5 px-4">
                  <p className="text-gray-900 font-mono font-bold">{u.username}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </td>
                <td className="py-3.5 px-4 text-gray-600 font-mono text-xs">{u.mobile || 'N/A'}</td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                      u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-bold rounded-full ${
                      u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {u.active ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                    <span>{u.active ? 'Active' : 'Inactive'}</span>
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right space-x-2">
                  <button
                    onClick={() => handleOpenModal(u)}
                    className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                    title="Edit User"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleActive(u)}
                    className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                    title={u.active ? 'Deactivate' : 'Activate'}
                  >
                    <Key className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-emerald-500/20">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingUser ? 'Edit User / Admin' : 'Add New User or Admin'}</h3>
              <button onClick={() => setShowModal(false)} className="text-emerald-200 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Mobile</label>
                  <input
                    type="text"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as Role)}
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden bg-white font-bold"
                  >
                    <option value="USER">USER (Restricted - No Delete/Edit)</option>
                    <option value="ADMIN">ADMIN (Full Access)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">
                    Password {editingUser && '(Leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-hidden font-mono"
                  />
                </div>
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
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
