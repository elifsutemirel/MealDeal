import React, { useState, useEffect } from 'react';

export const ChefAnalyticsView = ({ user }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoyalties = async () => {
      try {
        const res = await fetch(`/api/chef/royalties?userId=${user.id}`);
        const result = await res.json();
        setData(result);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchRoyalties();
  }, [user.id]);

  const totalEarnings = Array.isArray(data) ? data.reduce((acc, item) => acc + parseFloat(item.total_royalty || 0), 0) : 0;
  const totalCooks = Array.isArray(data) ? data.reduce((acc, item) => acc + parseInt(item.cook_count || 0), 0) : 0;

  if (loading) return <div className="py-24 text-center animate-pulse text-slate-400">Calculating Royalties...</div>;

  return (
    <div className="py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Chef Royalty Hub</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Performance-based earnings tracker</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white dark:bg-slate-800 px-8 py-4 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Earnings</p>
            <p className="text-2xl font-black text-emerald-500">${totalEarnings.toFixed(2)}</p>
          </div>
          <div className="bg-amber-500 px-8 py-4 rounded-[2rem] shadow-xl text-white">
            <p className="text-[10px] font-black uppercase text-amber-100 mb-1">Royalty Score</p>
            <p className="text-2xl font-black text-white">{parseFloat(Array.isArray(data) && data[0]?.royalty_score || 0).toFixed(1)}</p>
          </div>
          <div className="bg-slate-900 dark:bg-slate-700 px-8 py-4 rounded-[2rem] shadow-xl text-white">
            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Cooks</p>
            <p className="text-2xl font-black text-white">{totalCooks}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-50 dark:border-slate-700/50">
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recipe Model</th>
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Logged Cooks</th>
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ingredient Revenue</th>
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Royalty (10% + Base)</th>
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Performance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
            {!Array.isArray(data) || data.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-10 py-24 text-center">
                  <p className="text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest text-xs">No recipe data available yet.</p>
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={item.recipe_id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="px-10 py-8">
                    <p className="font-black text-slate-800 dark:text-white mb-1">{item.title}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID: {item.recipe_id}</p>
                  </td>
                  <td className="px-10 py-8 font-black text-slate-600 dark:text-slate-400">{item.cook_count}</td>
                  <td className="px-10 py-8 font-black text-slate-600 dark:text-slate-400">${parseFloat(item.ingredient_revenue).toFixed(2)}</td>
                  <td className="px-10 py-8">
                    <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      +${parseFloat(item.total_royalty).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-10 py-8 font-black text-amber-500">
                    {parseFloat(item.royalty_score || 0).toFixed(1)} pts
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex justify-end gap-1">
                      {[1, 2, 3, 4, 5].map(step => (
                        <div key={step} className={`h-1 w-4 rounded-full ${step <= (item.cook_count > 0 ? 5 : 0) ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-700'}`} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
