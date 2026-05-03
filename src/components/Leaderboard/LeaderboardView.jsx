import React, { useState, useEffect } from 'react';
import { Loader2, Medal, Trophy, Star, TrendingUp, Award, User } from 'lucide-react';

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
      <header className="mb-12">
        <h1 className="text-4xl font-black text-primary mb-2">
          Global <span className="text-emerald-500 italic">Leaderboards</span>
        </h1>
        <p className="text-secondary text-lg mb-8">See how you stack up against the best Home Cooks on MealDeal!</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Leaderboard Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <Trophy className="text-yellow-500" size={24} />
              <h2 className="text-xl font-black text-primary">Top Home Cooks</h2>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {leaderboard.length === 0 ? (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                  No cooks found on the leaderboard yet.
                </div>
              ) : (
                leaderboard.map((cook, index) => {
                  const isCurrentUser = user && user.id === cook.user_id;

                  return (
                    <React.Fragment key={cook.user_id}>
                      <div
                        className={`p-4 flex items-center justify-between transition-colors ${
                          isCurrentUser ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Rank */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            index === 1 ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' :
                            index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            'text-slate-400 dark:text-slate-500'
                          }`}>
                            #{index + 1}
                          </div>

                          {/* User Info */}
                          <div>
                            <p className={`font-black flex items-center gap-2 ${
                              isCurrentUser ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-white'
                            }`}>
                              {cook.username}
                              {isCurrentUser && <span className="text-[9px] uppercase tracking-widest bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">You</span>}
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                              {cook.meal_coins} MealCoins
                            </p>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="text-right">
                          <p className="text-lg font-black text-slate-900 dark:text-white">
                            {cook.cooked_count}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            Recipes Cooked
                          </p>
                          {parseInt(cook.challenges_won) > 0 && (
                            <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mt-0.5">
                              🏆 {cook.challenges_won} Challenge{parseInt(cook.challenges_won) > 1 ? 's' : ''} Won
                            </p>
                          )}
                          {parseInt(cook.total_reward_points) > 0 && (
                            <p className="text-[9px] font-bold text-emerald-500 tracking-widest mt-0.5">
                              +{cook.total_reward_points} pts
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Won challenge badges */}
                      {Array.isArray(cook.won_challenges) && cook.won_challenges.length > 0 && (
                        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                          {cook.won_challenges.map((item, i) => {
                            const title = typeof item === 'string' ? item : item?.title;
                            const wonAt = item?.won_at ? new Date(item.won_at).toLocaleDateString() : null;
                            return (
                              <span key={i} className="inline-flex items-center gap-1 text-[9px] font-black bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full">
                                🏆 {title}{wonAt && <span className="opacity-60">· {wonAt}</span>}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Badges & Achievements Column */}
        <div className="space-y-6">
          {user?.role === 'Home Cook' ? (
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-6">
                <Medal className="text-emerald-500" size={24} />
                <h2 className="text-xl font-black text-primary">Your Achievements</h2>
              </div>

              {achievements ? (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{achievements.stats.cookedCount}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Recipes Cooked</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl">
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{achievements.stats.joinedCount}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Challenges Joined</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800">
                      <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{achievements.stats.wonCount ?? 0}</p>
                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-1">🏆 Won</p>
                    </div>
                  </div>

                  {/* Badges List */}
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-2">
                      <Award size={14} /> Earned Badges
                    </h3>

                    {achievements.badges.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <Star size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">No badges yet.</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Cook recipes or join challenges to earn some!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {achievements.badges.map(badge => (
                          <div key={badge.id} className="flex gap-4 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-2xl items-center border border-slate-100 dark:border-slate-700">
                            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm flex items-center justify-center text-2xl flex-shrink-0">
                              {badge.icon}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-1">{badge.name}</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-snug">{badge.description}</p>
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
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center sticky top-24">
              <User size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">Want to earn badges?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Register as a Home Cook to track your recipes, join challenges, and collect badges.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
