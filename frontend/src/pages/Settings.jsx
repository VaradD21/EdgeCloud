import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { Settings as SettingsIcon, Mail, Lock, Trash2, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Alert, ConfirmModal } from '../components/ui';

function Section({ title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-6 space-y-5"
    >
      <h2 className="text-base font-semibold text-white border-b border-white/10 pb-4">{title}</h2>
      {children}
    </motion.div>
  );
}

export default function Settings() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [emailForm, setEmailForm] = useState({ new_email: '', password: '' });
  const [pwForm,    setPwForm]    = useState({ current_password: '', new_password: '', confirm: '' });
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState('');
  const [alert, setAlert]         = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const flash = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  const changeEmail = async (e) => {
    e.preventDefault();
    if (!emailForm.new_email) return;
    setLoading('email');
    try {
      await api.put('/user/update-email', emailForm);
      flash('success', 'Email updated. Please log in again.');
      setTimeout(logout, 2000);
    } catch (err) {
      flash('error', err.response?.data?.detail || 'Failed to update email');
    } finally {
      setLoading('');
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      return flash('error', 'Passwords do not match');
    }
    if (pwForm.new_password.length < 8) {
      return flash('error', 'Password must be at least 8 characters');
    }
    setLoading('pw');
    try {
      await api.put('/user/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      flash('success', 'Password changed successfully');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      flash('error', err.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading('');
    }
  };

  const deleteAccount = async () => {
    setDeleteConfirm(false);
    setLoading('delete');
    try {
      await api.delete('/user/delete-account');
      logout();
      navigate('/login');
    } catch (err) {
      flash('error', err.response?.data?.detail || 'Failed to delete account');
    } finally {
      setLoading('');
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      {deleteConfirm && (
        <ConfirmModal
          title="Delete Account"
          message="This will permanently delete your account and all associated data. You cannot undo this."
          confirmLabel="Yes, Delete My Account"
          danger
          onConfirm={deleteAccount}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-edge-glow" />
          Settings
        </h1>
        <p className="text-slate-400">Manage your account preferences.</p>
      </header>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Account info */}
      <Section title="Account Information">
        <div className="bg-white/5 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-edge-blue to-edge-purple flex items-center justify-center text-lg font-bold">
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p className="font-semibold text-white">{user?.email}</p>
            <p className="text-xs text-slate-400 capitalize mt-0.5">{user?.role} account</p>
          </div>
        </div>
      </Section>

      {/* Change email */}
      <Section title="Change Email">
        <form onSubmit={changeEmail} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">New Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={emailForm.new_email}
                onChange={e => setEmailForm(f => ({ ...f, new_email: e.target.value }))}
                placeholder="new@example.com"
                className="glass-input w-full pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Current Password (to confirm)</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={emailForm.password}
                onChange={e => setEmailForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="glass-input w-full pl-10"
              />
            </div>
          </div>
          <button type="submit" disabled={loading === 'email'} className="btn-primary flex items-center gap-2 text-sm">
            {loading === 'email' && <RefreshCw className="w-4 h-4 animate-spin" />}
            Update Email
          </button>
        </form>
      </Section>

      {/* Change password */}
      <Section title="Change Password">
        <form onSubmit={changePassword} className="space-y-4">
          {[
            { key: 'current_password', label: 'Current Password',  state: pwForm, set: setPwForm },
            { key: 'new_password',     label: 'New Password',      state: pwForm, set: setPwForm },
            { key: 'confirm',          label: 'Confirm New Password', state: pwForm, set: setPwForm },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  value={pwForm[key]}
                  onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder="••••••••"
                  className="glass-input w-full pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          <button type="submit" disabled={loading === 'pw'} className="btn-primary flex items-center gap-2 text-sm">
            {loading === 'pw' && <RefreshCw className="w-4 h-4 animate-spin" />}
            Change Password
          </button>
        </form>
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-red-400">Delete Account</p>
            <p className="text-xs text-slate-500 mt-1">Permanently delete your account and all data. Irreversible.</p>
          </div>
          <button
            onClick={() => setDeleteConfirm(true)}
            disabled={loading === 'delete'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all flex-shrink-0"
          >
            {loading === 'delete' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete Account
          </button>
        </div>
      </Section>
    </div>
  );
}
