import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  AlertTriangle,
  X,
  CheckCircle2
} from 'lucide-react';
import { apiClient } from '../../lib/api-client.js';
import { AdminUserListItem } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';

export const AdminPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);

  // Form states
  const [createEmail, setCreateEmail] = useState('');
  const [createName, setCreateName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'user' | 'admin'>('user');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');

  const fetchUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient.admin.getUsers();
      setUsers(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch user list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenCreate = () => {
    setCreateEmail('');
    setCreateName('');
    setCreatePassword('');
    setCreateRole('user');
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (target: AdminUserListItem) => {
    setSelectedUser(target);
    setEditEmail(target.email);
    setEditName(target.name || '');
    setEditPassword('');
    setEditRole(target.role);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEditOpen(true);
  };

  const handleOpenDelete = (target: AdminUserListItem) => {
    setSelectedUser(target);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsDeleteOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient.admin.createUser({
        email: createEmail,
        password: createPassword,
        name: createName || undefined,
        role: createRole,
      });
      setSuccessMessage(`User "${createEmail}" created successfully.`);
      setIsCreateOpen(false);
      await fetchUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create user');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient.admin.updateUser(selectedUser.id, {
        email: editEmail,
        name: editName || undefined,
        role: editRole,
        password: editPassword.trim() ? editPassword.trim() : undefined,
      });
      setSuccessMessage(`User "${editEmail}" updated successfully.`);
      setIsEditOpen(false);
      await fetchUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update user');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedUser) return;
    setFormSubmitting(true);
    setErrorMessage(null);
    try {
      await apiClient.admin.deleteUser(selectedUser.id);
      setSuccessMessage(`User "${selectedUser.email}" was removed.`);
      setIsDeleteOpen(false);
      await fetchUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete user');
    } finally {
      setFormSubmitting(false);
    }
  };

  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const totalStandard = users.filter((u) => u.role === 'user').length;
  const totalFlocks = users.reduce((acc, u) => acc + (u.flockCount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b-2 border-black pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-black text-white px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider">
              ADMIN CONTROL
            </span>
            <span className="text-zinc-500 font-mono text-xs uppercase">
              Root Authority Mode
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-black mt-1">
            User Accounts & Security
          </h1>
          <p className="text-xs text-zinc-600 mt-0.5">
            Manage system users, assign roles, directly override credentials without current passwords, and isolate tenant flocks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={isLoading}
            className="flex items-center gap-2 border border-black bg-white px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider hover:bg-zinc-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            title="Reload user list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 bg-black text-white border border-black px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider hover:bg-zinc-800 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>New User</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3 border-2 border-black bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-black shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-bold font-mono uppercase">System Error: </span>
            <span className="text-zinc-800">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-zinc-500 hover:text-black"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 border-2 border-black bg-zinc-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-black shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <span className="font-bold font-mono uppercase">Success: </span>
            <span className="text-zinc-800">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-zinc-500 hover:text-black"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 font-mono">
        <div className="border border-black bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
            Total Users
          </div>
          <div className="text-2xl sm:text-3xl font-bold mt-1 text-black">
            {totalUsers}
          </div>
          <div className="text-[11px] text-zinc-600 mt-1">Database Registered</div>
        </div>

        <div className="border border-black bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
            Administrators
          </div>
          <div className="text-2xl sm:text-3xl font-bold mt-1 text-black">
            {totalAdmins}
          </div>
          <div className="text-[11px] text-zinc-600 mt-1">Full System Privileges</div>
        </div>

        <div className="border border-black bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
            Standard Tenants
          </div>
          <div className="text-2xl sm:text-3xl font-bold mt-1 text-black">
            {totalStandard}
          </div>
          <div className="text-[11px] text-zinc-600 mt-1">Isolated Operations</div>
        </div>

        <div className="border border-black bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
            Total Active Flocks
          </div>
          <div className="text-2xl sm:text-3xl font-bold mt-1 text-black">
            {totalFlocks}
          </div>
          <div className="text-[11px] text-zinc-600 mt-1">Under Management</div>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="border-b border-black px-4 py-3 bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-black" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-black">
              System Accounts Register
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 uppercase">
            Showing {users.length} accounts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-black bg-zinc-100 font-mono text-[11px] uppercase tracking-wider text-black">
                <th className="py-2.5 px-4 font-bold">User / Email</th>
                <th className="py-2.5 px-4 font-bold">Full Name</th>
                <th className="py-2.5 px-4 font-bold">Role</th>
                <th className="py-2.5 px-4 font-bold text-center">Managed Flocks</th>
                <th className="py-2.5 px-4 font-bold">Registered Date</th>
                <th className="py-2.5 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-black" />
                    Loading system user registry...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500 font-mono">
                    No users registered in database.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-black flex items-center gap-2">
                          <span>{u.email}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 bg-black text-white text-[9px] font-mono uppercase font-bold tracking-tighter">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 truncate max-w-[200px]">
                          ID: {u.id}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-zinc-700 font-medium">
                        {u.name || <span className="text-zinc-400 italic">Not set</span>}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${
                            u.role === 'admin'
                              ? 'bg-black text-white border-black'
                              : 'bg-zinc-100 text-zinc-800 border-zinc-300'
                          }`}
                        >
                          {u.role === 'admin' ? (
                            <ShieldAlert className="w-3 h-3" />
                          ) : (
                            <ShieldCheck className="w-3 h-3" />
                          )}
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className="px-2 py-0.5 border border-black bg-zinc-50 text-black">
                          {u.flockCount || 0}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-zinc-600 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: '2-digit',
                        })}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="flex items-center gap-1 px-2.5 py-1 border border-black bg-white hover:bg-zinc-100 font-mono text-[11px] font-bold uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-transform"
                            title="Edit User or Reset Password directly"
                          >
                            <Edit3 className="w-3 h-3 text-black" />
                            <span>Edit / Reset</span>
                          </button>

                          <button
                            type="button"
                            disabled={isCurrent}
                            onClick={() => handleOpenDelete(u)}
                            className={`flex items-center gap-1 px-2.5 py-1 border border-black font-mono text-[11px] font-bold uppercase transition-transform ${
                              isCurrent
                                ? 'bg-zinc-100 text-zinc-400 border-zinc-300 cursor-not-allowed'
                                : 'bg-white text-black hover:bg-black hover:text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5'
                            }`}
                            title={isCurrent ? 'Cannot delete active session account' : 'Delete user'}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border-2 border-black w-full max-w-md shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="border-b border-black p-4 bg-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-black" />
                <h3 className="font-mono font-bold uppercase text-xs tracking-wider text-black">
                  Create New System Account
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-zinc-500 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-black mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="e.g. operator@farm.com"
                  className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-black mb-1">
                  Full Name / Operator Name
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Farm Operator"
                  className="w-full border border-black px-3 py-2 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-black mb-1">
                  Initial Password * (Min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-black mb-1">
                  System Role *
                </label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as 'user' | 'admin')}
                  className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black uppercase bg-white cursor-pointer"
                >
                  <option value="user">USER (Isolated Farm Operator)</option>
                  <option value="admin">ADMIN (Root System Privilege)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-zinc-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="border border-black px-4 py-2 text-xs font-mono uppercase font-bold hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="bg-black text-white border border-black px-5 py-2 text-xs font-mono uppercase font-bold hover:bg-zinc-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                >
                  {formSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER & DIRECT PASSWORD OVERRIDE MODAL */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border-2 border-black w-full max-w-md shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="border-b border-black p-4 bg-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-black" />
                <h3 className="font-mono font-bold uppercase text-xs tracking-wider text-black">
                  Edit Account & Password Override
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-zinc-500 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div className="p-2.5 bg-zinc-50 border border-zinc-300 font-mono text-[11px]">
                <div className="text-zinc-500 uppercase">Target Account ID:</div>
                <div className="font-bold text-black truncate">{selectedUser.id}</div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-black mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-black mb-1">
                  Full Name / Operator Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Farm Operator"
                  className="w-full border border-black px-3 py-2 text-xs font-sans focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-black">
                    Direct Password Override
                  </label>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">
                    Optional
                  </span>
                </div>
                <input
                  type="password"
                  minLength={6}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Type new password (or leave blank)"
                  className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black"
                />
                <p className="text-[10px] text-zinc-500 font-mono mt-1">
                  As Administrator, you can overwrite any user's password directly without providing their old password.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-black mb-1">
                  Role Privileges
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'user' | 'admin')}
                  className="w-full border border-black px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-black uppercase bg-white cursor-pointer"
                >
                  <option value="user">USER (Standard Operator)</option>
                  <option value="admin">ADMIN (Root Access)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-zinc-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="border border-black px-4 py-2 text-xs font-mono uppercase font-bold hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="bg-black text-white border border-black px-5 py-2 text-xs font-mono uppercase font-bold hover:bg-zinc-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                >
                  {formSubmitting ? 'Saving...' : 'Save Modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border-2 border-black w-full max-w-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="border-b border-black p-4 bg-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-black" />
                <h3 className="font-mono font-bold uppercase text-xs tracking-wider text-black">
                  Confirm User Deletion
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                className="text-zinc-500 hover:text-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans">
              <p className="text-zinc-800">
                Are you sure you want to delete user{' '}
                <strong className="font-mono font-bold text-black">{selectedUser.email}</strong>?
              </p>
              <div className="p-3 border border-black bg-zinc-100 font-mono text-[11px] text-zinc-700">
                WARNING: This action is permanent. If this user owns active flocks, their ownership references will be cascade-deleted or orphaned according to database constraints.
              </div>

              <div className="pt-3 border-t border-zinc-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="border border-black px-4 py-2 text-xs font-mono uppercase font-bold hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSubmit}
                  disabled={formSubmitting}
                  className="bg-black text-white border border-black px-4 py-2 text-xs font-mono uppercase font-bold hover:bg-zinc-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                >
                  {formSubmitting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
