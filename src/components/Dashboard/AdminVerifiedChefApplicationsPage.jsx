import React, { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, ExternalLink, RefreshCw, XCircle } from 'lucide-react';

const statusTone = {
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
};

const StatCard = ({ label, value }) => (
  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-5 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">{label}</p>
    <p className="text-3xl font-black text-slate-900 dark:text-white">{Number(value || 0)}</p>
  </div>
);

export const AdminVerifiedChefApplicationsPage = ({ user, onUserApproved }) => {
  const [filter, setFilter] = useState('pending');
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState({});
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setMessage('');
    try {
      const [listRes, summaryRes] = await Promise.all([
        fetch(`/api/admin/verified-chef-applications?adminId=${user.id}&status=${filter}`),
        fetch(`/api/admin/verified-chef-applications/summary?adminId=${user.id}`),
      ]);
      const listData = await listRes.json();
      const summaryData = await summaryRes.json();
      if (!listRes.ok) throw new Error(listData.message || 'Unable to load applications.');
      if (!summaryRes.ok) throw new Error(summaryData.message || 'Unable to load summary.');
      setApplications(Array.isArray(listData) ? listData : []);
      setSummary(summaryData || {});
      setSelected(null);
      setAdminNote('');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id, filter]);

  const review = async (status) => {
    if (!selected) return;
    setMessage('');
    try {
      const res = await fetch(`/api/admin/verified-chef-applications/${selected.application_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: user.id, status, admin_note: adminNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unable to update application.');
      setMessage(`Application ${status}.`);
      if (status === 'approved' && onUserApproved) onUserApproved(selected.user_id);
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mb-3">Administrator</p>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Verified Chef Applications</h1>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 self-start md:self-auto px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-widest">
          <RefreshCw size={14} /> Refresh
        </button>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Pending Applications" value={summary.pending_count} />
        <StatCard label="Approved Applications" value={summary.approved_count} />
        <StatCard label="Rejected Applications" value={summary.rejected_count} />
        <StatCard label="Verified Chefs" value={summary.verified_chef_count} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6 items-start">
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex gap-2 flex-wrap">
            {['pending', 'approved', 'rejected', 'all'].map(status => (
              <button key={status} onClick={() => setFilter(status)} className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${filter === status ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>
                {status}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="p-10 text-center text-xs font-bold uppercase tracking-widest text-slate-400">Loading applications...</div>
          ) : applications.length === 0 ? (
            <div className="p-10 text-center text-xs font-bold uppercase tracking-widest text-slate-400">No applications found.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {applications.map(app => (
                <button key={app.application_id} onClick={() => { setSelected(app); setAdminNote(app.admin_note || ''); }} className={`w-full text-left p-5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors ${selected?.application_id === app.application_id ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}>
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-black text-slate-900 dark:text-white">{app.full_name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{app.username} · {app.email}</p>
                    </div>
                    <span className={`h-fit px-3 py-1 rounded-full text-[9px] font-black uppercase ${statusTone[app.status]}`}>{app.status}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
          {!selected ? (
            <div className="py-20 text-center text-slate-400">
              <ClipboardList size={32} className="mx-auto mb-4" />
              <p className="text-xs font-black uppercase tracking-widest">Select an application</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selected.full_name}</h2>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1">Submitted {new Date(selected.submitted_at).toLocaleString()}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${statusTone[selected.status]}`}>{selected.status}</span>
              </div>

              {[
                ['Biography', selected.biography],
                ['Cooking Experience', selected.cooking_experience],
                ['Education', selected.education],
                ['Certificates', selected.certificates],
                ['Awards', selected.awards],
                ['Professional Experience', selected.professional_experience],
                ['CV Text', selected.cv_text],
              ].map(([label, value]) => (
                value ? (
                  <div key={label}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">{label}</p>
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{value}</p>
                  </div>
                ) : null
              ))}

              {(selected.portfolio_url || selected.cv_file_path || selected.certificate_file_path) && (
                <div className="flex flex-wrap gap-3">
                  {selected.portfolio_url && <a className="inline-flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-300" href={selected.portfolio_url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Portfolio</a>}
                  {selected.cv_file_path && <a className="inline-flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-300" href={selected.cv_file_path} target="_blank" rel="noreferrer"><ExternalLink size={14} /> CV File</a>}
                  {selected.certificate_file_path && <a className="inline-flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-300" href={selected.certificate_file_path} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Certificate File</a>}
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 block">Admin note</label>
                <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={4} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500" />
              </div>

              {selected.status === 'pending' && (
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => review('approved')} className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest">
                    <CheckCircle2 size={16} /> Approve
                  </button>
                  <button onClick={() => review('rejected')} className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest">
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              )}
            </div>
          )}
          {message && <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-5">{message}</p>}
        </div>
      </section>
    </div>
  );
};
