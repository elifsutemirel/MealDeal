import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Trophy } from 'lucide-react';
import { ChallengeDetailModal } from './ChallengeDetailModal';

export const ChallengesView = ({ user }) => {
  const [filter, setFilter] = useState('active');
  const [joinedChallenges, setJoinedChallenges] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleJoinChallenge = (challengeId) => {
    if (!joinedChallenges.includes(challengeId)) {
      setJoinedChallenges([...joinedChallenges, challengeId]);
    }
  };

  const isJoined = (challengeId) => joinedChallenges.includes(challengeId);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const [joinedIds, setJoinedIds] = useState(new Set());
  const [progressMap, setProgressMap] = useState({}); // { challenge_id: { cooked_count, total } }
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  // Fetch all challenges from DB
  const fetchChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/challenges');
      const data = await res.json();
      setChallenges(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch challenges:', err);
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch which challenges this user has joined
  const fetchJoined = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/challenges/joined?userId=${user.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setJoinedIds(new Set(data.map(d => d.challenge_id)));
      }
    } catch (err) {
      console.error('Failed to fetch joined challenges:', err);
    }
  }, [user]);

  // Fetch per-challenge progress for current user
  const fetchAllProgress = useCallback(async (challengeList) => {
    if (!user || !challengeList.length) return;
    const results = {};
    await Promise.allSettled(
      challengeList.map(async (c) => {
        try {
          const res = await fetch(`/api/challenges/${c.challenge_id}/progress?userId=${user.id}`);
          const data = await res.json();
          results[c.challenge_id] = data;
        } catch { /* ignore individual failures */ }
      })
    );
    setProgressMap(results);
  }, [user]);

  useEffect(() => {
    fetchChallenges();
    fetchJoined();
  }, [fetchChallenges, fetchJoined]);

  useEffect(() => {
    if (challenges.length > 0) {
      fetchAllProgress(challenges);
    }
  }, [challenges, fetchAllProgress]);

  const handleJoin = async (e, challengeId) => {
    e.stopPropagation();
    if (!user) return alert('Please sign in to join a challenge.');
    if (user.role !== 'Home Cook') return alert('Only Home Cooks can join challenges.');
    if (joinedIds.has(challengeId)) return;

    setJoiningId(challengeId);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (res.ok || data.already_joined) {
        setJoinedIds(prev => new Set([...prev, challengeId]));
        // Update participants count locally
        setChallenges(prev =>
          prev.map(c =>
            c.challenge_id === challengeId && !joinedIds.has(challengeId)
              ? { ...c, participants: (parseInt(c.participants) || 0) + 1 }
              : c
          )
        );
      }
    } catch (err) {
      console.error('Failed to join challenge:', err);
    } finally {
      setJoiningId(null);
    }
  };

  // Called by the modal when a cook is logged, to refresh progress card
  const handleCookLogged = (challengeId) => {
    if (!user) return;
    fetch(`/api/challenges/${challengeId}/progress?userId=${user.id}`)
      .then(r => r.json())
      .then(data => setProgressMap(prev => ({ ...prev, [challengeId]: data })))
      .catch(() => { });
  };

  const filteredChallenges = challenges.filter(c => {
    const matchesFilter = filter === 'all' ? true : c.status === filter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = c.title.toLowerCase().includes(searchLower) || c.description.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  const difficultyColor = (d) => ({
    Easy: 'text-emerald-500',
    Medium: 'text-amber-500',
    Hard: 'text-red-500',
  }[d] || 'text-slate-400');

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center gap-4 text-slate-400">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
        <p className="text-xs font-black uppercase tracking-widest">Loading Challenges...</p>
      </div>
    );
  }

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8 pb-20">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-primary mb-2">
            Kitchen <span className="text-emerald-500 italic">Challenges</span>
          </h1>
          <p className="text-secondary text-lg mb-8">Complete challenges, earn badges, and become a MealDeal champion!</p>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm mb-8 space-y-6">
            {/* Filter tabs */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700 px-5 py-4 rounded-2xl w-full border border-slate-200 dark:border-slate-600 focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-slate-600 transition-all">
              <Search size={20} className="text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search challenges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="flex gap-3">
              {['all', 'active', 'upcoming'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-6 py-3 rounded-2xl font-bold uppercase text-xs transition-all ${filter === status
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20'
                    : 'bg-tertiary text-secondary hover:bg-primary dark:bg-slate-800 dark:hover:bg-slate-700'
                    }`}
                >
                  {status === 'all' ? '🎯 All' : status === 'active' ? '⚡ Active' : '🔜 Upcoming'}
                </button>
              ))}
            </div>
          </div>
        </header>

        {filteredChallenges.length === 0 ? (
          <div className="py-20 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[3rem]">
            No challenges found matching your search.
          </div>
        ) : (
          {
            filteredChallenges.length === 0 ? (
              <div className="py-24 text-center">
                <Trophy size={40} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
                <p className="text-slate-300 dark:text-slate-600 font-black uppercase tracking-widest text-xs">
                  No {filter === 'all' ? '' : filter} challenges found.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                {filteredChallenges.map(challenge => {
                  const prog = progressMap[challenge.challenge_id];
                  const progressPercent = prog && prog.total > 0
                    ? Math.round((parseInt(prog.cooked_count) / parseInt(prog.total)) * 100)
                    : 0;
                  const isJoined = joinedIds.has(challenge.challenge_id);
                  const isJoining = joiningId === challenge.challenge_id;
                  const isHomeCook = user?.role === 'Home Cook';

                  return (
                    <div
                      key={challenge.challenge_id}
                      onClick={() => setSelectedChallenge(challenge)}
                      className="bg-secondary rounded-[2rem] overflow-hidden border border-primary shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                    >
                      {/* Image */}
                      <div className="relative h-44 overflow-hidden">
                        <img
                          src={challenge.image}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          alt={challenge.title}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <div className="absolute top-4 right-4 bg-white dark:bg-slate-800 rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-lg">
                          {challenge.icon}
                        </div>
                        <div className="absolute top-4 left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
                          {challenge.status === 'active' ? '🔥 Active' : '🔜 Upcoming'}
                        </div>
                        {isJoined && (
                          <div className="absolute bottom-4 left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
                            ✅ Joined
                          </div>
                        )}
                      </div>

                      <div className="p-6">
                        <h3 className="text-xl font-black text-primary mb-1">{challenge.title}</h3>
                        <p className="text-sm text-secondary mb-4 line-clamp-2">{challenge.description}</p>

                        {/* Meta grid */}
                        <div className="grid grid-cols-3 gap-2 mb-4 text-[10px] font-bold uppercase">
                          <div className="bg-tertiary dark:bg-slate-800 p-2 rounded-xl">
                            <p className="text-tertiary">Duration</p>
                            <p className="text-primary">{challenge.duration}</p>
                          </div>
                          <div className="bg-tertiary dark:bg-slate-800 p-2 rounded-xl">
                            <p className="text-tertiary">Difficulty</p>
                            <p className={difficultyColor(challenge.difficulty)}>{challenge.difficulty}</p>
                          </div>
                          <div className="bg-tertiary dark:bg-slate-800 p-2 rounded-xl">
                            <p className="text-tertiary">Recipes</p>
                            <p className="text-primary">{challenge.recipe_count ?? '—'}</p>
                          </div>
                        </div>

                        {/* Progress bar — only if user is logged in */}
                        {user && (
                          <div className="mb-4">
                            <div className="flex justify-between text-[10px] font-bold mb-1.5">
                              <span className="text-tertiary">Your Progress</span>
                              <span className="text-primary">
                                {prog ? `${prog.cooked_count}/${prog.total}` : '0/—'} recipes
                              </span>
                            </div>
                            <div className="w-full bg-tertiary dark:bg-slate-800 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all duration-700"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Prize */}
                        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                          <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                            🏆 {challenge.prize}
                          </p>
                        </div>

                        {/* Footer row */}
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-tertiary">👥 {(challenge.participants ?? 0).toLocaleString()} joined</span>
                          <button
                            onClick={(e) => {
                              if (challenge.status !== 'active') {
                                e.stopPropagation();
                                return;
                              }
                              handleJoin(e, challenge.challenge_id);
                            }}
                            disabled={isJoining || isJoined || !isHomeCook}
                            className={`px-4 py-2 rounded-xl font-black uppercase text-[9px] transition-all flex items-center gap-1.5
                          ${challenge.status !== 'active'
                                ? 'bg-tertiary text-secondary dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                                : isJoined
                                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 cursor-default border border-emerald-200 dark:border-emerald-800'
                                  : isHomeCook
                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
                                    : 'bg-tertiary text-secondary dark:bg-slate-800 cursor-not-allowed opacity-60'
                              }`}
                          >
                            {isJoining && <Loader2 size={10} className="animate-spin" />}
                            {challenge.status !== 'active'
                              ? '🔜 Upcoming'
                              : isJoined
                                ? '✅ Joined'
                                : !user
                                  ? 'Sign In'
                                  : !isHomeCook
                                    ? 'Home Cook only'
                                    : 'Join Challenge'
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          }
      </div>

      {/* Detail Modal */}
      {selectedChallenge && (
        <ChallengeDetailModal
          challenge={selectedChallenge}
          user={user}
          onClose={() => setSelectedChallenge(null)}
          onCookLogged={handleCookLogged}
        />
      )}
    </>
  );
};
