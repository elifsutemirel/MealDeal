import React, { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, ClipboardList, MessageSquare, RefreshCw, ShieldCheck, Store, Trophy, Users } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-5 shadow-sm">
    <Icon size={20} className="text-emerald-600 dark:text-emerald-400 mb-4" />
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">{label}</p>
    <p className="text-3xl font-black text-slate-900 dark:text-white">{Number(value || 0)}</p>
  </div>
);

const Section = ({ title, icon: Icon, children }) => (
  <section className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl shadow-sm overflow-hidden">
    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
      <Icon size={18} className="text-emerald-600 dark:text-emerald-400" />
      <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
    </div>
    {children}
  </section>
);

const Empty = () => (
  <div className="p-8 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
    No records found.
  </div>
);

export const AdminDashboardPage = ({ user, setTab }) => {
  const [summary, setSummary] = useState({});
  const [users, setUsers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setMessage('');

    try {
      const adminId = user.id;
      const urls = [
        `/api/admin/dashboard-summary?adminId=${adminId}`,
        `/api/admin/users?adminId=${adminId}`,
        `/api/admin/suppliers?adminId=${adminId}`,
        `/api/admin/challenges?adminId=${adminId}`,
        `/api/admin/recipes?adminId=${adminId}`,
        `/api/admin/comments?adminId=${adminId}`,
      ];

      const responses = await Promise.all(urls.map(url => fetch(url)));
      const payloads = await Promise.all(responses.map(r => r.json()));
      const failed = responses.findIndex(r => !r.ok);
      if (failed !== -1) throw new Error(payloads[failed].message || 'Unable to load admin dashboard.');

      setSummary(payloads[0] || {});
      setUsers(Array.isArray(payloads[1]) ? payloads[1] : []);
      setSuppliers(Array.isArray(payloads[2]) ? payloads[2] : []);
      setChallenges(Array.isArray(payloads[3]) ? payloads[3] : []);
      setRecipes(Array.isArray(payloads[4]) ? payloads[4] : []);
      setComments(Array.isArray(payloads[5]) ? payloads[5] : []);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) load();
  }, [user?.id]);

  const deleteChallenge = async (challengeId) => {
    if (!window.confirm('Remove this challenge?')) return;
    const res = await fetch(`/api/admin/challenges/${challengeId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId: user.id }),
    });
    const data = await res.json();
    setMessage(data.message || 'Challenge updated.');
    await load();
  };

  const setRecipeVisibility = async (recipeId, visibility) => {
    const res = await fetch(`/api/admin/recipes/${recipeId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId: user.id, visibility }),
    });
    const data = await res.json();
    setMessage(data.message || `Recipe set to ${visibility}.`);
    await load();
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('Remove this comment/review?')) return;
    const res = await fetch(`/api/admin/comments/${commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId: user.id }),
    });
    const data = await res.json();
    setMessage(data.message || 'Comment removed.');
    await load();
  };

  return (
    <div className="py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mb-3">Administrator</p>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Admin Dashboard</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-3 max-w-2xl">
            Platform integrity tools for role approvals, content moderation, supplier oversight, and challenge quality.
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 self-start md:self-auto px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-widest">
          <RefreshCw size={14} /> Refresh
        </button>
      </header>

      {message && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-3xl p-4 text-sm font-bold text-amber-800 dark:text-amber-200">
          {message}
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-xs font-black uppercase tracking-widest text-slate-400">Loading admin workspace...</div>
      ) : (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={ClipboardList} label="Pending Applications" value={summary.pending_applications} />
            <StatCard icon={Users} label="Home Cooks" value={summary.home_cooks} />
            <StatCard icon={ShieldCheck} label="Verified Chefs" value={summary.verified_chefs} />
            <StatCard icon={BookOpen} label="Recipes" value={summary.total_recipes} />
            <StatCard icon={Trophy} label="Active Challenges" value={summary.active_challenges} />
            <StatCard icon={Store} label="Suppliers" value={summary.suppliers} />
            <StatCard icon={MessageSquare} label="Comments" value={summary.comments} />
            <StatCard icon={AlertTriangle} label="Orders" value={summary.orders} />
          </section>

          <div className="mb-8 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Verified Chef Applications</h2>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mt-1">Review professional background submissions and grant controlled chef privileges.</p>
            </div>
            <button onClick={() => setTab('admin-applications')} className="self-start md:self-auto px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest">
              Review Applications
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Section title="User Management" icon={Users}>
              {users.length === 0 ? <Empty /> : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[420px] overflow-y-auto">
                  {users.map(row => (
                    <div key={row.user_id} className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">{row.username}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{row.email}</p>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">{row.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Challenge Management" icon={Trophy}>
              {challenges.length === 0 ? <Empty /> : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[420px] overflow-y-auto">
                  {challenges.map(row => (
                    <div key={row.challenge_id} className="p-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">{row.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{row.status} · {row.participants} joined</p>
                      </div>
                      <button onClick={() => deleteChallenge(row.challenge_id)} className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-[10px] font-black uppercase">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Recipe Moderation" icon={BookOpen}>
              {recipes.length === 0 ? <Empty /> : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[420px] overflow-y-auto">
                  {recipes.map(row => (
                    <div key={row.recipe_id} className="p-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">{row.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">by {row.creator_name} · {row.visibility} · {row.comments} comments</p>
                      </div>
                      <button onClick={() => setRecipeVisibility(row.recipe_id, row.visibility === 'public' ? 'private' : 'public')} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase">
                        {row.visibility === 'public' ? 'Hide' : 'Publish'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Comment Moderation" icon={MessageSquare}>
              {comments.length === 0 ? <Empty /> : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[420px] overflow-y-auto">
                  {comments.map(row => (
                    <div key={row.comment_id} className="p-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-900 dark:text-white">{row.username}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{row.recipe_title}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{row.review_text || row.comment_text}</p>
                      </div>
                      <button onClick={() => deleteComment(row.comment_id)} className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-[10px] font-black uppercase">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Supplier Oversight" icon={Store}>
              {suppliers.length === 0 ? <Empty /> : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[420px] overflow-y-auto">
                  {suppliers.map(row => (
                    <div key={row.user_id} className="p-4">
                      <p className="font-black text-slate-900 dark:text-white">{row.location_name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{row.username} · {row.email}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{row.address}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mt-2">{row.inventory_items} inventory items</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  );
};
