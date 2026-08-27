import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Building2,
  Phone,
  KeyRound,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  RefreshCw,
  X,
  UserCheck,
} from 'lucide-react';
import { AdminUser, AdminRole } from '../types';
import { fetchAllAdmins, saveAdminUser, deleteAdminUser } from '../lib/firebase';
import { MALIAN_REGIONS } from '../data/seedData';

interface AdminManagementTabProps {
  currentAdmin: AdminUser | null;
  onAdminUpdated?: () => void;
}

export const AdminManagementTab: React.FC<AdminManagementTabProps> = ({
  currentAdmin,
  onAdminUpdated,
}) => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Visibility map for passcodes
  const [visiblePasscodes, setVisiblePasscodes] = useState<Record<string, boolean>>({});

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUser | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCreatePasscode, setShowCreatePasscode] = useState(false);
  const [showEditPasscode, setShowEditPasscode] = useState(false);

  // New Admin Form State
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPhone, setNewPhone] = useState('+223 ');
  const [newRole, setNewRole] = useState<AdminRole>('agent_dntt');
  const [newAgency, setNewAgency] = useState('Direction Nationale des Transports Terrestres - Bamako');
  const [newPasscode, setNewPasscode] = useState('00223');
  const [newStatus, setNewStatus] = useState<'active' | 'inactive'>('active');

  // Edit Admin Form State
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<AdminRole>('agent_dntt');
  const [editAgency, setEditAgency] = useState('');
  const [editPasscode, setEditPasscode] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');

  const loadAdmins = async () => {
    setIsLoading(true);
    try {
      const list = await fetchAllAdmins();
      setAdmins(list);
    } catch (e: any) {
      console.error('Erreur chargement administrateurs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const togglePasscodeVisibility = (adminId: string) => {
    setVisiblePasscodes((prev) => ({
      ...prev,
      [adminId]: !prev[adminId],
    }));
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setNewFullName('');
    setNewUsername(`agent_${Date.now().toString().slice(-4)}`);
    setNewPhone('+223 ');
    setNewRole('agent_dntt');
    setNewAgency('Direction Nationale des Transports Terrestres - Bamako');
    setNewPasscode('00223');
    setNewStatus('active');
    setShowCreateModal(true);
    setFeedback(null);
  };

  // Handle Create Admin Submit
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newUsername.trim() || !newPasscode.trim()) {
      setFeedback({ type: 'error', message: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }

    // Check unique username
    const normalizedUser = newUsername.trim().toLowerCase();
    if (admins.some((a) => a.username.toLowerCase() === normalizedUser)) {
      setFeedback({ type: 'error', message: `L'identifiant "${newUsername}" est déjà utilisé par un autre administrateur.` });
      return;
    }

    setIsProcessing(true);
    try {
      const newAdmin: AdminUser = {
        id: `admin-${Date.now()}`,
        fullName: newFullName.trim(),
        username: normalizedUser,
        phone: newPhone.trim() || '+223 70 00 00 00',
        role: newRole,
        agency: newAgency,
        passcode: newPasscode.trim(),
        status: newStatus,
        createdAt: new Date().toISOString(),
      };

      await saveAdminUser(newAdmin);
      await loadAdmins();
      setShowCreateModal(false);
      setFeedback({
        type: 'success',
        message: `Nouvel administrateur "${newAdmin.fullName}" (${newAdmin.username}) créé avec succès.`,
      });
      if (onAdminUpdated) onAdminUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erreur lors de la création: ' + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEditFullName(admin.fullName);
    setEditUsername(admin.username);
    setEditPhone(admin.phone);
    setEditRole(admin.role);
    setEditAgency(admin.agency);
    setEditPasscode(admin.passcode);
    setEditStatus(admin.status);
    setFeedback(null);
  };

  // Handle Save Edit Submit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    if (!editFullName.trim() || !editUsername.trim() || !editPasscode.trim()) {
      setFeedback({ type: 'error', message: 'Veuillez remplir tous les champs obligatoires.' });
      return;
    }

    // Check username collision
    const normalizedUser = editUsername.trim().toLowerCase();
    if (admins.some((a) => a.id !== editingAdmin.id && a.username.toLowerCase() === normalizedUser)) {
      setFeedback({ type: 'error', message: `L'identifiant "${editUsername}" est déjà utilisé par un autre compte.` });
      return;
    }

    setIsProcessing(true);
    try {
      const updated: AdminUser = {
        ...editingAdmin,
        fullName: editFullName.trim(),
        username: normalizedUser,
        phone: editPhone.trim(),
        role: editRole,
        agency: editAgency,
        passcode: editPasscode.trim(),
        status: editStatus,
      };

      await saveAdminUser(updated);
      await loadAdmins();
      setEditingAdmin(null);
      setFeedback({
        type: 'success',
        message: `Compte administrateur de "${updated.fullName}" mis à jour avec succès.`,
      });
      if (onAdminUpdated) onAdminUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erreur de modification: ' + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingAdmin) return;
    setIsProcessing(true);
    try {
      await deleteAdminUser(deletingAdmin.id);
      const name = deletingAdmin.fullName;
      setDeletingAdmin(null);
      await loadAdmins();
      setFeedback({
        type: 'success',
        message: `L'administrateur "${name}" a été définitivement supprimé.`,
      });
      if (onAdminUpdated) onAdminUpdated();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erreur lors de la suppression: ' + err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to default 00223 PIN
  const handleResetPasscodeTo00223 = async (admin: AdminUser) => {
    try {
      const updated: AdminUser = {
        ...admin,
        passcode: '00223',
      };
      await saveAdminUser(updated);
      await loadAdmins();
      setFeedback({
        type: 'success',
        message: `Code d'accès de "${admin.fullName}" réinitialisé avec succès.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erreur: ' + err.message });
    }
  };

  // Filtered list
  const filteredAdmins = admins.filter((a) => {
    const matchSearch =
      a.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.phone.includes(searchQuery) ||
      a.agency.toLowerCase().includes(searchQuery.toLowerCase());

    const matchRole = roleFilter === 'all' || a.role === roleFilter;
    return matchSearch && matchRole;
  });

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case 'super_admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
            <ShieldCheck className="w-3 h-3 text-purple-600" />
            Super Administrateur
          </span>
        );
      case 'agent_dntt':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
            <Building2 className="w-3 h-3 text-[#008543]" />
            Agent Délivrance DNTT
          </span>
        );
      case 'controleur_regional':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[10px] font-bold border border-blue-200">
            <Shield className="w-3 h-3 text-blue-600" />
            Contrôleur Régional
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Action */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#008543]" />
              <span>Gestion des Comptes Administrateurs</span>
            </h3>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[11px] font-bold font-mono border border-emerald-200">
              {admins.length} Administrateur{admins.length > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gérez les autorisations, créez de nouveaux agents DNTT, modifiez les rôles ou réinitialisez les codes d'accès sécurisés.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={loadAdmins}
            disabled={isLoading}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 hover:text-slate-900 transition cursor-pointer"
            title="Rafraîchir la liste"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            id="btn-add-new-admin"
            onClick={handleOpenCreate}
            className="flex-1 md:flex-none px-4 py-2.5 bg-[#008543] hover:bg-[#007038] text-white text-xs sm:text-sm font-bold rounded-2xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Créer un Nouvel Admin</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#008543] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-500 hover:text-slate-800 text-[11px] underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, identifiant, téléphone ou antenne..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-auto"
          >
            <option value="all">Tous les Rôles ({admins.length})</option>
            <option value="super_admin">Super Administrateurs</option>
            <option value="agent_dntt">Agents Délivrance DNTT</option>
            <option value="controleur_regional">Contrôleurs Régionaux</option>
          </select>
        </div>
      </div>

      {/* Admins Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAdmins.map((admin) => {
          const isCurrentUser = currentAdmin?.id === admin.id;
          const isPasscodeVisible = !!visiblePasscodes[admin.id];

          return (
            <div
              key={admin.id}
              className={`bg-white border rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 transition ${
                isCurrentUser
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Header: User Info & Status */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#008543] flex items-center justify-center font-bold text-sm shrink-0">
                      {admin.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {admin.fullName}
                        </h4>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                            Vous
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-slate-500">
                        @{admin.username}
                      </p>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      admin.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        admin.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                    {admin.status === 'active' ? 'Actif' : 'Inactif'}
                  </span>
                </div>

                {/* Role badge */}
                <div>{getRoleBadge(admin.role)}</div>

                {/* Details Table */}
                <div className="bg-slate-50 rounded-2xl p-3 text-[11px] space-y-1.5 border border-slate-100">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Building2 className="w-3 h-3 text-[#008543]" />
                      Antenne :
                    </span>
                    <span className="font-semibold text-slate-800 text-right truncate max-w-[170px]" title={admin.agency}>
                      {admin.agency.replace('Direction Régionale des Transports de ', 'DRT ').replace('Direction Nationale des Transports Terrestres - ', 'DNTT ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Phone className="w-3 h-3 text-[#008543]" />
                      Téléphone :
                    </span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {admin.phone}
                    </span>
                  </div>

                  {/* Passcode / PIN row */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="flex items-center gap-1 text-slate-500">
                      <KeyRound className="w-3 h-3 text-amber-600" />
                      Code PIN :
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {isPasscodeVisible ? admin.passcode : '•••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePasscodeVisibility(admin.id)}
                        className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                        title={isPasscodeVisible ? 'Masquer' : 'Afficher'}
                      >
                        {isPasscodeVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                <button
                  type="button"
                  onClick={() => handleResetPasscodeTo00223(admin)}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[11px] font-semibold rounded-xl border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                  title="Réinitialiser le code d'accès PIN"
                >
                  <Sparkles className="w-3 h-3 text-[#008543]" />
                  <span>Réinitialiser PIN</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(admin)}
                    className="p-2 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-[#008543] rounded-xl border border-slate-200 transition cursor-pointer"
                    title="Modifier cet administrateur"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingAdmin(admin)}
                    disabled={admins.filter((a) => a.role === 'super_admin').length === 1 && admin.role === 'super_admin'}
                    className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 disabled:opacity-30 rounded-xl border border-slate-200 transition cursor-pointer"
                    title="Supprimer cet administrateur"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* MODAL 1: CREATE NEW ADMIN */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-slate-900 my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#008543] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Créer un Nouvel Administrateur</h3>
                  <p className="text-[11px] text-slate-500">Ajout d'un compte agent ou administrateur DNTT</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nom et Prénom(s) du Titulaire *
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ex: Oumar Coulibaly"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Identifiant / Matricule *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="Ex: agent_bamako"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Numéro de Téléphone *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+223 70 00 00 00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Rôle et Autorisations *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as AdminRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="agent_dntt">Agent Délivrance DNTT</option>
                    <option value="super_admin">Super Administrateur</option>
                    <option value="controleur_regional">Contrôleur Régional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                    <span>Code d'accès PIN *</span>
                    <span className="text-[10px] text-slate-400">Confidentiel</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCreatePasscode ? 'text' : 'password'}
                      required
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePasscode(!showCreatePasscode)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                      title={showCreatePasscode ? 'Masquer' : 'Afficher'}
                    >
                      {showCreatePasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Antenne / Direction de Rattachement *
                </label>
                <select
                  value={newAgency}
                  onChange={(e) => setNewAgency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Direction Nationale des Transports Terrestres - Bamako">
                    Direction Nationale des Transports Terrestres (Siège Bamako)
                  </option>
                  {MALIAN_REGIONS.map((reg) => (
                    <option key={reg} value={`Direction Régionale des Transports de ${reg}`}>
                      Direction Régionale des Transports de {reg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Statut du Compte
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="active">🟢 Actif (Accès autorisé)</option>
                  <option value="inactive">🔴 Inactif (Accès suspendu)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-[#008543] hover:bg-[#007038] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Enregistrer l'Administrateur</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT EXISTING ADMIN */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-slate-900 my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#008543] flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Modifier l'Administrateur</h3>
                  <p className="text-[11px] text-slate-500">Mise à jour des accès et informations de compte</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nom et Prénom(s) *
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Identifiant / Matricule *
                  </label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Rôle *
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as AdminRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="agent_dntt">Agent Délivrance DNTT</option>
                    <option value="super_admin">Super Administrateur</option>
                    <option value="controleur_regional">Contrôleur Régional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                    <span>Code d'accès PIN *</span>
                    <button
                      type="button"
                      onClick={() => setEditPasscode('00223')}
                      className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      Réinitialiser PIN
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showEditPasscode ? 'text' : 'password'}
                      required
                      value={editPasscode}
                      onChange={(e) => setEditPasscode(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPasscode(!showEditPasscode)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                      title={showEditPasscode ? 'Masquer' : 'Afficher'}
                    >
                      {showEditPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Antenne de Rattachement *
                </label>
                <select
                  value={editAgency}
                  onChange={(e) => setEditAgency(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="Direction Nationale des Transports Terrestres - Bamako">
                    Direction Nationale des Transports Terrestres (Siège Bamako)
                  </option>
                  {MALIAN_REGIONS.map((reg) => (
                    <option key={reg} value={`Direction Régionale des Transports de ${reg}`}>
                      Direction Régionale des Transports de {reg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Statut du Compte
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="active">🟢 Actif (Accès autorisé)</option>
                  <option value="inactive">🔴 Inactif (Accès suspendu)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-[#008543] hover:bg-[#007038] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Enregistrer les Modifications</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM DELETE ADMIN */}
      {deletingAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-rose-200 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Supprimer cet Administrateur ?</h3>
                <p className="text-[11px] text-slate-500">Action irréversible</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement le compte administrateur de{' '}
              <strong className="text-slate-900 font-semibold">{deletingAdmin.fullName}</strong> (
              <span className="font-mono text-slate-700">@{deletingAdmin.username}</span>) ?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAdmin(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmer la Suppression</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
