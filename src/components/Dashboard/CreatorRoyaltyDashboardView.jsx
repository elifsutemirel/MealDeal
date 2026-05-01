import React, { useEffect, useState } from 'react';
import { Award, BookOpen, Receipt, Star, Utensils } from 'lucide-react';

const number = new Intl.NumberFormat('en-US');

const formatNumber = (value) => number.format(Number(value || 0));

const SummaryCard = ({ icon: Icon, label, value, tone = 'slate' }) => {
  const toneClasses = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-5 ${toneClasses[tone]}`}>
        <Icon size={20} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">{label}</p>
      <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
    </div>
  );
};

export const CreatorRoyaltyDashboardView = ({ user }) => {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const res = await fetch(`/api/creator/royalty-dashboard?userId=${user.id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Unable to load creator royalty dashboard.');
        }

        setPayload(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) fetchDashboard();
  }, [user?.id]);

  if (loading) {
    return <div className="py-24 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Calculating creator royalties...</div>;
  }

  if (error) {
    return (
      <div className="py-20 max-w-2xl mx-auto text-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-3xl p-8">
          <p className="text-sm font-bold text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  const summary = payload?.summary || {};
  const recipes = payload?.recipes || [];

  return (
    <div className="py-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mb-3">Creator analytics</p>
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">Creator Royalty Dashboard</h1>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-2xl">
          Recipe performance and royalty points for meal-kit orders, cooking logs, and reviews on recipes published by {user.name}.
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <SummaryCard icon={BookOpen} label="Total Recipes" value={formatNumber(summary.total_recipes)} />
        <SummaryCard icon={Utensils} label="Total Logs" value={formatNumber(summary.total_cooked_count)} />
        <SummaryCard icon={Star} label="Total Reviews" value={formatNumber(summary.total_review_count)} />
        <SummaryCard icon={Receipt} label="Meal Kit Orders" value={formatNumber(summary.total_meal_kit_order_count)} />
        <SummaryCard icon={Award} label="Royalty Points" value={formatNumber(summary.total_creator_reward_points)} tone="amber" />
      </section>

      <section className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm overflow-hidden border border-slate-100 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                {['Recipe', 'Visibility', 'Avg Rating', 'Reviews', 'Logs', 'Meal Kit Orders', 'Royalty Points'].map((heading) => (
                  <th key={heading} className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {recipes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-20 text-center text-xs font-bold uppercase tracking-widest text-slate-300 dark:text-slate-600">
                    No published recipe analytics yet.
                  </td>
                </tr>
              ) : (
                recipes.map((recipe) => (
                  <tr key={recipe.recipe_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-black text-slate-900 dark:text-white">{recipe.title}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">ID {recipe.recipe_id}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">
                        {recipe.visibility}
                      </span>
                    </td>
                    <td className="px-6 py-5 font-bold text-slate-600 dark:text-slate-300">{Number(recipe.avg_rating || 0).toFixed(1)}</td>
                    <td className="px-6 py-5 font-bold text-slate-600 dark:text-slate-300">{formatNumber(recipe.review_count)}</td>
                    <td className="px-6 py-5 font-bold text-slate-600 dark:text-slate-300">{formatNumber(recipe.cooked_count)}</td>
                    <td className="px-6 py-5 font-bold text-slate-600 dark:text-slate-300">{formatNumber(recipe.meal_kit_order_count)}</td>
                    <td className="px-6 py-5 font-black text-amber-600 dark:text-amber-300">{formatNumber(recipe.creator_reward_points)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
