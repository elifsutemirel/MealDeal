import React, { useState, useEffect } from 'react';
import { Loader2, Medal, Trophy, Star, Award, User, Crown, Flame } from 'lucide-react';

export const LeaderboardView = ({ user }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [achievements, setAchievements] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
    if (user?.role === 'Home Cook') {
      fetchAchievements();
    }
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard/global');
      const data = await res.json();
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAchievements = async () => {
    try {
      const res = await fetch(`/api/users/${user.id}/achievements`);
      const data = await res.json();
      setAchievements(data);
    } catch (err) {
      console.error('Failed to fetch achievements:', err);
    }
  };

  const rankConfig = [
    { bg: 'from-yellow-400 to-amber-500', text: 'text-white', shadow: 'shadow-amber-200', medal: '🥇', border: 'border-amber-200' },
    { bg: 'from-slate-300 to-slate-400', text: 'text-white', shadow: 'shadow-slate-200', medal: '🥈', border: 'border-slate-200' },
    { bg: 'from-orange-300 to-orange-400', text: 'text-white', shadow: 'shadow-orange-200', medal: '🥉', border: 'border-orange-200' },
  ];

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center gap-4 text-slate-400">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
        <p className="text-xs font-black uppercase tracking-widest">Loading Leaderboards...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8 pb-20">
      <header className="mb-10">
        <h1 className="text-4xl font-black text-primary mb-2">
          Global <span className="text-emerald-500 italic">Leaderboards</span>
        </h1>
        <p className="text-secondary text-lg">See how you stack up against the best Home Cooks on MealDeal!</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Leaderboard Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="text-yellow-500" size={20} />
            <h2 className="text-lg font-black text-primary">Top Home Cooks</h2>
          </div>

          {leaderboard.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-400 font-medium">
              No cooks on the leaderboard yet.
            </div>
          ) : (
            leaderboard.map((cook, index) => {
              const isCurrentUser = user && parseInt(user.id) === parseInt(cook.user_id);
              const cfg = rankConfig[index] || null;
              const initials = (cook.username || 'U').slice(0, 2).toUpperCase();

              return (
                <div
                  key={cook.user_id}
                  className={`rounded-2xl border transition-all ${
                    isCurrentUser
                      ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-300/50'
                      : index === 0
                      ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-100'
                      : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                  }`}
                >
                  <div className="p-5 flex items-center gap-4">
                    {/* Rank */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                      cfg
                        ? `bg-gradient-to-br ${cfg.bg} ${cfg.text} shadow-md ${cfg.shadow}`
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {index < 3 ? cfg.medal : `#${index + 1}`}
                    </div>

                    {/* Avatar */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
                      isCurrentUser
                        ? 'bg-emerald-500 text-white'
                        : index === 0
                        ? 'bg-amber-400 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {initials}
                    </div>

                    {/* Name + coins */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-black text-base truncate ${
                          isCurrentUser ? 'text-emerald-700' : index === 0 ? 'text-amber-700' : 'text-slate-800'
                        }`}>
                          {cook.username}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] uppercase tracking-widest bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black">
                            You
                          </span>
                        )}
                        {index === 0 && (
                          <Crown size={14} className="text-amber-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-400">
                          🪙 {Number(cook.meal_coins).toLocaleString()} MealCoins
                        </span>
                        {parseInt(cook.total_reward_points) > 0 && (
                          <span className="text-[11px] font-bold text-emerald-600">
                            +{cook.total_reward_points} pts
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-center">
                        <p className="text-xl font-black text-slate-800">{cook.cooked_count}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Cooked</p>
                      </div>
                      {parseInt(cook.challenges_won) > 0 && (
                        <div className="text-center bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                          <p className="text-xl font-black text-amber-600">🏆 {cook.challenges_won}</p>
                          <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Won</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Won challenge badges */}
                  {Array.isArray(cook.won_challenges) && cook.won_challenges.length > 0 && (
                    <div className="px-5 pb-4 flex flex-wrap gap-2">
                      {cook.won_challenges.map((item, i) => {
                        const title = typeof item === 'string' ? item : item?.title;
                        const wonAt = item?.won_at ? new Date(item.won_at).toLocaleDateString('en-GB') : null;
                        return (
                          <span key={i} className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                            🏆 {title}
                            {wonAt && <span className="opacity-60">· {wonAt}</span>}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Badges & Achievements Column */}
        <div className="space-y-6">
          {user?.role === 'Home Cook' ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Medal className="text-emerald-600" size={18} />
                </div>
                <h2 className="text-lg font-black text-primary">Your Achievements</h2>
              </div>

              {achievements ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-6">
                    {[
                      { value: achievements.stats.cookedCount, label: 'Cooked', color: 'text-slate-800', bg: 'bg-slate-50', border: 'border-slate-100' },
                      { value: achievements.stats.joinedCount, label: 'Joined', color: 'text-slate-800', bg: 'bg-slate-50', border: 'border-slate-100' },
                      { value: achievements.stats.wonCount ?? 0, label: '🏆 Won', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                    ].map(({ value, label, color, bg, border }) => (
                      <div key={label} className={`${bg} border ${border} p-3 rounded-xl text-center`}>
                        <p className={`text-2xl font-black ${color}`}>{value}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Badges */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                      <Award size={12} /> Earned Badges
                    </h3>
                    {achievements.badges.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <Star size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No badges yet</p>
                        <p className="text-[10px] text-slate-400 mt-1">Cook recipes or join challenges!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {achievements.badges.map(badge => (
                          <div key={badge.id} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl border border-slate-100">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-xl flex-shrink-0">
                              {badge.icon}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-800 leading-tight">{badge.name}</p>
                              <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{badge.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-emerald-500" />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center sticky top-24">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4">
                <User size={28} className="text-slate-300" />
              </div>
              <h3 className="text-base font-black text-slate-800 mb-2">Want to earn badges?</h3>
              <p className="text-sm text-slate-500">Register as a Home Cook to track your recipes, join challenges, and collect badges.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
