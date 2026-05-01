import React, { useState, useEffect } from 'react';

export const ChefAnalyticsView = ({ user }) => {
  const [payload, setPayload] = useState({ summary: {}, recipes: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const res = await fetch(`/api/creator/royalty-dashboard?userId=${user.id}`);
        const result = await res.json();
        setPayload(result);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchRewards();
  }, [user.id]);

  const summary = payload.summary || {};
  const recipes = payload.recipes || [];

    if (loading) return <div className="py-24 text-center animate-pulse text-slate-400">Calculating Creator Royalties...</div>;

  return (
    <div className="py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Creator Royalty Hub</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Recipe engagement and meal-kit order tracker</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white dark:bg-slate-800 px-8 py-4 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Meal Kit Orders</p>
            <p className="text-2xl font-black text-emerald-500">{summary.total_meal_kit_order_count || 0}</p>
          </div>
          <div className="bg-amber-500 px-8 py-4 rounded-[2rem] shadow-xl text-white">
            <p className="text-[10px] font-black uppercase text-amber-100 mb-1">Royalty Points</p>
            <p className="text-2xl font-black text-white">{summary.total_creator_reward_points || 0}</p>
          </div>
          <div className="bg-slate-900 dark:bg-slate-700 px-8 py-4 rounded-[2rem] shadow-xl text-white">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Cooks</p>
            <p className="text-2xl font-black text-white">{summary.total_cooked_count || 0}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-50 dark:border-slate-700/50">
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recipe Model</th>
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Logged Cooks</th>
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Reviews</th>
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Meal Kit Orders</th>
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Royalty Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
            {recipes.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-10 py-24 text-center">
                  <p className="text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest text-xs">No recipe data available yet.</p>
                </td>
              </tr>
            ) : (
              recipes.map((item) => (
                <tr key={item.recipe_id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="px-10 py-8">
                    <p className="font-black text-slate-800 dark:text-white mb-1">{item.title}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID: {item.recipe_id}</p>
                  </td>
                  <td className="px-10 py-8 font-black text-slate-600 dark:text-slate-400">{item.cooked_count}</td>
                  <td className="px-10 py-8 font-black text-slate-600 dark:text-slate-400">{item.review_count}</td>
                  <td className="px-10 py-8 font-black text-slate-600 dark:text-slate-400">{item.meal_kit_order_count}</td>
                  <td className="px-10 py-8 font-black text-amber-500">{item.creator_reward_points}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
