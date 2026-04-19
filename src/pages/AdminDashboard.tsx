import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MapPin, AlertTriangle, BarChart2, Shield, Trash2, Ban, CheckCircle, XCircle, LogOut, RefreshCw } from 'lucide-react';

function useAdmin() {
  const token = localStorage.getItem('authToken');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const get = async (url: string) => {
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error('Failed');
    return r.json();
  };
  const put = async (url: string, body: any) => {
    const r = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('Failed');
    return r.json();
  };
  const del = async (url: string) => {
    const r = await fetch(url, { method: 'DELETE', headers });
    if (!r.ok) throw new Error('Failed');
    return r.json();
  };

  return { get, put, del };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const api = useAdmin();
  const [tab, setTab] = useState<'analytics' | 'users' | 'incidents'>('analytics');
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [incidentFilter, setIncidentFilter] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const checkAuth = () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('adminUser');
    if (!token || !user) { navigate('/'); return false; }
    try {
      const u = JSON.parse(user);
      if (u.role !== 'admin' && u.role !== 'moderator') { navigate('/'); return false; }
    } catch { navigate('/'); return false; }
    return true;
  };

  const loadAnalytics = async () => {
    try { const data = await api.get('/api/admin/analytics'); setAnalytics(data); } catch { showToast('Failed to load analytics'); }
  };

  const loadUsers = async () => {
    setLoading(true);
    try { const data = await api.get(`/api/admin/users?search=${search}&limit=30`); setUsers(data.users || []); } catch { showToast('Failed to load users'); }
    setLoading(false);
  };

  const loadIncidents = async () => {
    setLoading(true);
    try { const data = await api.get(`/api/admin/incidents?status=${incidentFilter}&limit=30`); setIncidents(data.incidents || []); } catch { showToast('Failed to load incidents'); }
    setLoading(false);
  };

  useEffect(() => { if (!checkAuth()) return; loadAnalytics(); }, []);
  useEffect(() => { if (tab === 'users') loadUsers(); }, [tab, search]);
  useEffect(() => { if (tab === 'incidents') loadIncidents(); }, [tab, incidentFilter]);

  const banUser = async (id: string, isBanned: boolean) => {
    try { await api.put(`/api/admin/users/${id}/ban`, { isBanned }); showToast(isBanned ? 'User banned' : 'User unbanned'); loadUsers(); } catch { showToast('Failed'); }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try { await api.del(`/api/admin/users/${id}`); showToast('User deleted'); loadUsers(); } catch { showToast('Failed'); }
  };

  const changeRole = async (id: string, role: string) => {
    try { await api.put(`/api/admin/users/${id}/role`, { role }); showToast('Role updated'); loadUsers(); } catch { showToast('Failed'); }
  };

  const updateIncident = async (id: string, status: string) => {
    try { await api.put(`/api/admin/incidents/${id}`, { status }); showToast('Incident updated'); loadIncidents(); } catch { showToast('Failed'); }
  };

  const deleteIncident = async (id: string) => {
    if (!confirm('Delete incident?')) return;
    try { await api.del(`/api/admin/incidents/${id}`); showToast('Deleted'); loadIncidents(); } catch { showToast('Failed'); }
  };

  const logout = () => { localStorage.removeItem('authToken'); localStorage.removeItem('adminUser'); navigate('/'); };

  const statCards = analytics ? [
    { label: 'Total Users', value: analytics.totalUsers, sub: `+${analytics.usersToday} today`, icon: Users, color: 'text-blue-500' },
    { label: 'Total Trips', value: analytics.totalTrips, sub: `${analytics.tripsThisWeek} this week`, icon: MapPin, color: 'text-emerald-500' },
    { label: 'Incidents', value: analytics.totalIncidents, sub: `${analytics.pendingIncidents} pending`, icon: AlertTriangle, color: 'text-amber-500' },
    { label: 'High Risk Trips', value: analytics.highRiskTrips, sub: 'total flagged', icon: Shield, color: 'text-red-500' },
  ] : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm shadow-lg">{toast}</div>
      )}

      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-white" />
          </div>
          <span className="font-semibold text-lg">SafeRoute Admin</span>
        </div>
        <button onClick={logout} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
          <LogOut size={16} /> Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-800 px-6 flex gap-1 pt-2">
        {(['analytics', 'users', 'incidents'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="p-6">

        {/* Analytics Tab */}
        {tab === 'analytics' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Overview</h2>
              <button onClick={loadAnalytics} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {statCards.map((card) => (
                <div key={card.label} className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-zinc-400 text-sm">{card.label}</span>
                    <card.icon size={18} className={card.color} />
                  </div>
                  <p className="text-3xl font-bold mb-1">{card.value ?? '—'}</p>
                  <p className="text-xs text-zinc-500">{card.sub}</p>
                </div>
              ))}
            </div>

            {analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
                  <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2"><BarChart2 size={14} /> Today's activity</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'New users', val: analytics.usersToday },
                      { label: 'Trips calculated', val: analytics.tripsToday },
                      { label: 'Incidents reported', val: analytics.incidentsToday },
                    ].map(r => (
                      <div key={r.label} className="flex items-center justify-between">
                        <span className="text-sm text-zinc-300">{r.label}</span>
                        <span className="text-sm font-medium text-emerald-400">{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
                  <h3 className="text-sm font-medium text-zinc-400 mb-4">Vehicle type breakdown</h3>
                  <div className="space-y-3">
                    {analytics.vehicleStats?.map((v: any) => (
                      <div key={v.vehicleType} className="flex items-center justify-between">
                        <span className="text-sm text-zinc-300 capitalize">{v.vehicleType}</span>
                        <span className="text-sm font-medium">{v._count} trips</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Users</h2>
              <input
                type="text" placeholder="Search by name or email..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-emerald-500"
              />
            </div>
            {loading ? (
              <div className="text-center py-12 text-zinc-500">Loading...</div>
            ) : (
              <div className="space-y-2">
                {users.map(user => (
                  <div key={user.id} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-medium overflow-hidden">
                        {user.photo ? <img src={user.photo} alt="" className="w-full h-full object-cover" /> : user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{user.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : user.role === 'moderator' ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-700 text-zinc-400'}`}>{user.role}</span>
                          {user.isBanned && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">banned</span>}
                        </div>
                        <span className="text-xs text-zinc-500">{user.email} · {user._count?.trips ?? 0} trips · {user._count?.incidents ?? 0} incidents</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select value={user.role} onChange={e => changeRole(user.id, e.target.value)}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs focus:outline-none">
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button onClick={() => banUser(user.id, !user.isBanned)}
                        className={`p-1.5 rounded-lg transition-colors ${user.isBanned ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'}`}
                        title={user.isBanned ? 'Unban' : 'Ban'}>
                        <Ban size={14} />
                      </button>
                      <button onClick={() => deleteUser(user.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {users.length === 0 && <div className="text-center py-12 text-zinc-500">No users found</div>}
              </div>
            )}
          </div>
        )}

        {/* Incidents Tab */}
        {tab === 'incidents' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Incidents</h2>
              <select value={incidentFilter} onChange={e => setIncidentFilter(e.target.value)}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500">
                <option value="">All status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            {loading ? (
              <div className="text-center py-12 text-zinc-500">Loading...</div>
            ) : (
              <div className="space-y-2">
                {incidents.map(inc => (
                  <div key={inc.id} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${inc.severity === 'high' ? 'bg-red-500' : inc.severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm capitalize">{inc.type.replace(/_/g, ' ')}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${inc.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : inc.status === 'resolved' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>{inc.status}</span>
                        </div>
                        <span className="text-xs text-zinc-500">
                          By {inc.reportedBy?.name} · {inc.lat?.toFixed(4)}, {inc.lon?.toFixed(4)} · 👍 {inc.upvotes}
                          {inc.description && ` · ${inc.description.slice(0, 40)}...`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {inc.status === 'pending' && (
                        <button onClick={() => updateIncident(inc.id, 'approved')} className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors" title="Approve">
                          <CheckCircle size={14} />
                        </button>
                      )}
                      {inc.status === 'approved' && (
                        <button onClick={() => updateIncident(inc.id, 'resolved')} className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors" title="Mark resolved">
                          <XCircle size={14} />
                        </button>
                      )}
                      <button onClick={() => deleteIncident(inc.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {incidents.length === 0 && <div className="text-center py-12 text-zinc-500">No incidents found</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
