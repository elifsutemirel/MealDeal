import React, { useState, useEffect } from 'react';
import { X, Trophy, ChefHat, Utensils, CheckCircle2, Circle, Crown, Loader2 } from 'lucide-react';

export const ChallengeDetailModal = ({ challenge, user, onClose, onCookLogged }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [progress, setProgress] = useState({ cooked_count: 0, total: 0 });
  const [recipes, setRecipes] = useState([]);
  const [cookingRecipeId, setCookingRecipeId] = useState(null);
  const [cookedRecipeIds, setCookedRecipeIds] = useState(new Set());
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [loadingRecipes, setLoadingRecipes] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
    fetchRecipes();
    if (user) fetchProgress();
    else setLoadingProgress(false);
  }, [challenge.challenge_id, user]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`/api/challenges/${challenge.challenge_id}/leaderboard`);
      const data = await res.json();
      setLeaderboard(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const fetchRecipes = async () => {
    try {
      const res = await fetch(`/api/challenges/${challenge.challenge_id}/recipes`);
      const data = await res.json();
      setRecipes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch challenge recipes:', err);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await fetch(`/api/challenges/${challenge.challenge_id}/progress?userId=${user.id}`);
      const data = await res.json();
      setProgress(data);
      if (data.cooked_recipe_ids) {
        setCookedRecipeIds(new Set(data.cooked_recipe_ids));
      }
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleMarkCooked = async (recipeId) => {
    if (!user || cookedRecipeIds.has(recipeId)) return;
    setCookingRecipeId(recipeId);
    try {
      const res = await fetch('/api/recipe/cook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeId, userId: user.id }),
      });
      if (res.ok) {
        setCookedRecipeIds(prev => new Set([...prev, recipeId]));
        setProgress(prev => ({
          ...prev,
          cooked_count: Math.min(parseInt(prev.cooked_count) + 1, parseInt(prev.total)),
        }));
        if (onCookLogged) onCookLogged(challenge.challenge_id);
      }
    } catch (err) {
      console.error('Failed to mark as cooked:', err);
    } finally {
      setCookingRecipeId(null);
    }
  };

  const progressPercent = progress.total > 0
    ? Math.round((parseInt(progress.cooked_count) / parseInt(progress.total)) * 100)
    : 0;

  const medalColors = ['text-amber-400', 'text-slate-400', 'text-amber-600'];

  const difficultyColor = {
    Easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    Hard: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  }[challenge.difficulty] || 'bg-slate-100 text-slate-600';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[88vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800">

        {/* Hero banner */}
        <div className="relative h-44 flex-shrink-0 overflow-hidden">
          <img src={challenge.image} className="w-full h-full object-cover" alt={challenge.title} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/20 backdrop-blur-md text-white rounded-full p-2 hover:bg-white/30 transition-colors"
          >
            <X size={18} />
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl">{challenge.icon}</span>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${difficultyColor}`}>
                {challenge.difficulty}
              </span>
              <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase">
                {challenge.status === 'active' ? '⚡ Active' : '🔜 Upcoming'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">{challenge.title}</h2>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Description & meta */}
          <div>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">{challenge.description}</p>
            <div className="flex flex-wrap gap-3">
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Duration</p>
                <p className="text-xs font-black text-slate-800 dark:text-white">{challenge.duration}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Participants</p>
                <p className="text-xs font-black text-slate-800 dark:text-white">👥 {challenge.participants?.toLocaleString()}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-2xl">
                <p className="text-[9px] font-black uppercase text-emerald-500 mb-0.5">Prize</p>
                <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">🏆 {challenge.prize}</p>
              </div>
            </div>
          </div>

          {/* Your Progress (only for logged-in users) */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] p-5">
            <div className="flex items-center gap-2 mb-4">
              <ChefHat size={16} className="text-emerald-500" />
              <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider">Your Progress</h3>
            </div>
            {!user ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Sign in as a Home Cook to track your progress.</p>
            ) : loadingProgress ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Loader2 size={14} className="animate-spin" />
                Loading...
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center text-xs font-black mb-2">
                  <span className="text-slate-500 dark:text-slate-400">Recipes Cooked</span>
                  <span className="text-slate-800 dark:text-white">
                    {progress.cooked_count} / {progress.total}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-1">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-3 rounded-full transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-right text-slate-400 dark:text-slate-500 font-bold">{progressPercent}% complete</p>
              </>
            )}
          </div>

          {/* Required Recipes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Utensils size={16} className="text-slate-500" />
              <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider">Challenge Recipes</h3>
            </div>

            {loadingRecipes ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-4">
                <Loader2 size={14} className="animate-spin" />
                Loading recipes...
              </div>
            ) : recipes.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 text-center">
                <p className="text-slate-300 dark:text-slate-600 font-bold text-xs uppercase tracking-widest">No recipes assigned to this challenge yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recipes.map((recipe) => {
                  const isCooked = cookedRecipeIds.has(recipe.recipe_id);
                  const isCooking = cookingRecipeId === recipe.recipe_id;
                  const canCook = user && ['Home Cook', 'Verified Chef'].includes(user.role) && !isCooked && challenge.status === 'active';

                  return (
                    <div
                      key={recipe.recipe_id}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        isCooked
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isCooked ? (
                          <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle size={18} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                        )}
                        <div>
                          <p className={`text-sm font-black ${
                            isCooked ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-white'
                          }`}>
                            {recipe.title}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            {recipe.cook_time_min} min · {recipe.difficulty_level}
                          </p>
                        </div>
                      </div>
                      {canCook && (
                        <button
                          onClick={() => handleMarkCooked(recipe.recipe_id)}
                          disabled={isCooking}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl transition-all disabled:opacity-60 flex items-center gap-1.5"
                        >
                          {isCooking ? <Loader2 size={12} className="animate-spin" /> : '✓'}
                          {isCooking ? 'Logging...' : 'Mark Cooked'}
                        </button>
                      )}
                      {isCooked && (
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">✓ Done</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-amber-500" />
              <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider">Leaderboard</h3>
            </div>

            {loadingLeaderboard ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-4">
                <Loader2 size={14} className="animate-spin" />
                Loading leaderboard...
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 text-center">
                <p className="text-slate-300 dark:text-slate-600 font-bold text-xs uppercase tracking-widest">Be the first to cook!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => {
                  const isCurrentUser = user && entry.user_id === user.id;
                  const entryPercent = progress.total > 0
                    ? Math.round((parseInt(entry.cooked_count) / parseInt(progress.total)) * 100)
                    : 0;

                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                        isCurrentUser
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700'
                      }`}
                    >
                      <div className="w-8 flex-shrink-0 text-center">
                        {idx < 3
                          ? <Crown size={20} className={medalColors[idx]} />
                          : <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black truncate ${isCurrentUser ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                          {entry.username} {isCurrentUser && <span className="text-[10px] text-emerald-500">(You)</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                            <div
                              className="bg-gradient-to-r from-amber-400 to-amber-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(entryPercent, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-slate-400 flex-shrink-0">
                            {entry.cooked_count}/{progress.total}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
