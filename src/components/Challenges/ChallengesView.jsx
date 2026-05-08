import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Trophy, Search, X, Clock } from 'lucide-react';
import { ChallengeDetailModal } from './ChallengeDetailModal';

export const ChallengesView = ({ user }) => {
  const [filter, setFilter] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const [joinedIds, setJoinedIds] = useState(new Set());
  const [progressMap, setProgressMap] = useState({});
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

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

  // Real-time status updates: Update current time every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second for real-time countdown

    return () => clearInterval(interval);
  }, []);

  const handleJoin = async (e, challengeId) => {
    e.stopPropagation();
    if (!user) return alert('Please sign in to join a challenge.');
    if (user.role !== 'Home Cook') {
      return alert('Only Home Cooks can join challenges. Verified Chefs are not eligible.');
    }

    setJoiningId(challengeId);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (res.ok) {
        setJoinedIds(new Set([...joinedIds, challengeId]));
        fetchChallenges();
        alert('Joined challenge successfully!');
      } else {
        const error = await res.json();
        alert(
          error.message === 'User has already joined this challenge.'
            ? 'Already joined!'
            : 'Failed to join challenge.'
        );
      }
    } catch (err) {
      console.error('Failed to join challenge:', err);
    } finally {
      setJoiningId(null);
    }
  };

  const handleProgressUpdate = (challengeId) => {
    if (!user) return;
    fetch(`/api/challenges/${challengeId}/progress?userId=${user.id}`)
      .then(r => r.json())
      .then(data => setProgressMap(prev => ({ ...prev, [challengeId]: data })))
      .catch(() => { });
    fetchChallenges();
  };

  const getChallengeStatus = (challenge) => {
    const now = currentTime;
    const start = new Date(challenge.start_date);
    const end = new Date(challenge.end_date);
    
    if (challenge.winner_id) return 'completed';
    if (now < start) return 'upcoming';
    if (now > end) return 'ended';
    return 'active';
  };

  // Debug: Log status changes
  useEffect(() => {
    if (challenges.length > 0) {
      challenges.forEach(c => {
        const status = getChallengeStatus(c);
        console.log(`Challenge "${c.title}" status: ${status}`, {
          now: currentTime,
          start: new Date(c.start_date),
          end: new Date(c.end_date)
        });
      });
    }
  }, [currentTime, challenges]);

  const filteredChallenges = challenges.filter(c => {
    const status = getChallengeStatus(c);
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = c.title.toLowerCase().includes(searchLower) || (c.description || '').toLowerCase().includes(searchLower);
    if (filter === 'joined') {
      return joinedIds.has(c.challenge_id) && matchesSearch;
    }
    const matchesFilter = filter === 'all' ? true : filter === status;
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center gap-4 text-slate-400">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
        <p className="text-xs font-black uppercase tracking-widest">Loading Challenges...</p>
      </div>
    );
  }

  if (selectedChallenge) {
    return (
      <ChallengeDetailModal
        challenge={selectedChallenge}
        user={user}
        onClose={() => setSelectedChallenge(null)}
        onProgressUpdate={handleProgressUpdate}
      />
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
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700 px-5 py-4 rounded-2xl w-full border border-slate-200 dark:border-slate-600 focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-slate-600 transition-all">
              <Search size={20} className="text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search challenges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="flex gap-3 flex-wrap">
              {[
                { key: 'all', label: 'All' },
                { key: 'active', label: 'Active' },
                { key: 'upcoming', label: 'Upcoming' },
                { key: 'completed', label: 'Completed' },
                ...(user?.role === 'Home Cook' ? [{ key: 'joined', label: `Joined (${joinedIds.size})` }] : []),
              ].map(({ key: f, label }) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase transition-all ${
                    filter === f
                      ? f === 'joined'
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {filteredChallenges.length === 0 ? (
          <div className="py-20 text-center">
            <Trophy size={64} className="mx-auto text-slate-200 dark:text-slate-700 mb-4" />
            <p className="text-slate-400 dark:text-slate-500 font-bold text-lg">No challenges found</p>
            <p className="text-slate-300 dark:text-slate-600 text-sm mt-2">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredChallenges.map((challenge) => {
              const prog = progressMap[challenge.challenge_id] || {};
              const progressPercent = prog.total > 0
                ? Math.round((parseInt(prog.completed_count || prog.cooked_count || 0) / parseInt(prog.total)) * 100)
                : 0;

              const isJoined = joinedIds.has(challenge.challenge_id);
              const isJoining = joiningId === challenge.challenge_id;
              const canJoinChallenge = user?.role === 'Home Cook';
              const status = getChallengeStatus(challenge);
              
              const endDate = new Date(challenge.end_date);
              const now = currentTime;
              const timeRemaining = endDate - now;
              const daysRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60 * 24)));
              const hoursRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
              const minutesRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)));
              const secondsRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60)) / 1000));
              const timeLabel = daysRemaining > 0
                ? `${daysRemaining}d ${hoursRemaining}h ${minutesRemaining}m`
                : hoursRemaining > 0
                ? `${hoursRemaining}h ${minutesRemaining}m ${secondsRemaining}s`
                : `${minutesRemaining}m ${secondsRemaining}s`;

              return (
                <div
                  key={challenge.challenge_id}
                  onClick={() => setSelectedChallenge(challenge)}
                  className="bg-secondary rounded-[2rem] overflow-hidden border border-primary shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                >
                  <div className="relative h-44 overflow-hidden">
                    {challenge.image ? (
                      <img
                        src={challenge.image}
                        alt={challenge.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 group-hover:scale-105 transition-transform duration-500 flex items-center justify-center">
                        <Trophy size={64} className="text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute top-4 right-4 bg-white dark:bg-slate-800 rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-lg">
                      🏆
                    </div>
                    <div className="absolute top-4 left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
                      {status === 'active' ? '🔥 Active' : status === 'upcoming' ? '🔜 Upcoming' : status === 'completed' ? '✅ Done' : '⏰ Ended'}
                    </div>
                    {isJoined && (
                      <div className="absolute bottom-4 left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
                        ✅ Joined
                      </div>
                    )}
                    {challenge.winner_id && challenge.winner_name && (
                      <div className="absolute bottom-4 right-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
                        👑 {challenge.winner_name}
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-black text-primary mb-1">{challenge.title}</h3>
                    <p className="text-sm text-secondary mb-4 line-clamp-2">{challenge.description || 'Complete all recipes before the deadline!'}</p>

                    <div className="grid grid-cols-3 gap-2 mb-4 text-[10px] font-bold uppercase">
                      <div className="bg-tertiary dark:bg-slate-800 p-2 rounded-xl">
                        <p className="text-tertiary flex items-center gap-1">
                          <Clock size={10} />
                          Time Left
                        </p>
                        <p className="text-primary">
                          {status === 'completed' || status === 'ended' ? 'Ended' : timeLabel}
                        </p>
                      </div>
                      <div className="bg-tertiary dark:bg-slate-800 p-2 rounded-xl">
                        <p className="text-tertiary">Participants</p>
                        <p className="text-primary">{challenge.participants || 0}</p>
                      </div>
                      <div className="bg-tertiary dark:bg-slate-800 p-2 rounded-xl">
                        <p className="text-tertiary">Recipes</p>
                        <p className="text-primary">{challenge.recipe_count || 0}</p>
                      </div>
                    </div>

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

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-tertiary">
                        {new Date(challenge.start_date).toLocaleDateString()} - {new Date(challenge.end_date).toLocaleDateString()}
                      </span>
                      <button
                        onClick={(e) => {
                          if (status !== 'active') {
                            e.stopPropagation();
                            return;
                          }
                          handleJoin(e, challenge.challenge_id);
                        }}
                        disabled={isJoining || isJoined || !canJoinChallenge || status !== 'active'}
                        className={`px-4 py-2 rounded-xl font-black uppercase text-[9px] transition-all flex items-center gap-1.5
                          ${status !== 'active'
                            ? 'bg-tertiary text-secondary dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                            : isJoined
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 cursor-default border border-emerald-200 dark:border-emerald-800'
                              : canJoinChallenge
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
                                : 'bg-tertiary text-secondary dark:bg-slate-800 cursor-not-allowed opacity-60'
                          }`}
                      >
                        {isJoining && <Loader2 size={10} className="animate-spin" />}
                        {status === 'completed' || status === 'ended'
                          ? '🏁 Ended'
                          : status === 'upcoming'
                            ? '🔜 Upcoming'
                            : isJoined
                              ? '✅ Joined'
                              : '🚀 Join Now'
                        }
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </>
  );
};
