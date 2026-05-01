import React, { useState } from 'react';
import { Filter, Star } from 'lucide-react';
import { Search, X, Clock, ChevronRight } from 'lucide-react';
import { CHALLENGES } from '../../data/challenges';

export const ChallengesView = () => {
  const [filter, setFilter] = useState('active');
  const [joinedChallenges, setJoinedChallenges] = useState([]);
  
  // Challenges are imported from data/ as an ES module

  const filteredChallenges = CHALLENGES.filter(c =>
    filter === 'all' ? true : c.status === filter
  );

  const handleJoinChallenge = (challengeId) => {
    if (!joinedChallenges.includes(challengeId)) {
      setJoinedChallenges([...joinedChallenges, challengeId]);
    }
  };

  const isJoined = (challengeId) => joinedChallenges.includes(challengeId);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8 pb-20">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-primary mb-6">Kitchen <span className="text-emerald-500 italic">Challenges</span></h1>
        <p className="text-secondary text-lg mb-8">Complete challenges, earn badges, and become a MealDeal champion!</p>

        <div className="flex gap-3 mb-8">
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
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        {filteredChallenges.map(challenge => (
          <div key={challenge.id} className="bg-secondary rounded-[2rem] overflow-hidden border border-primary shadow-sm hover:shadow-lg transition-all">
            <div className="relative h-40 overflow-hidden">
              <img src={challenge.image} className="w-full h-full object-cover" />
              <div className="absolute top-4 right-4 bg-white dark:bg-slate-800 rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-lg">
                {challenge.icon}
              </div>
              <div className="absolute top-4 left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
                {challenge.status === 'active' ? '🔥 Active' : '🔜 Upcoming'}
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-black text-primary mb-2">{challenge.title}</h3>
              <p className="text-sm text-secondary mb-4">{challenge.description}</p>

              <div className="grid grid-cols-2 gap-3 mb-4 text-[10px] font-bold uppercase">
                <div className="bg-tertiary dark:bg-slate-800 p-2 rounded-lg">
                  <p className="text-tertiary">Duration</p>
                  <p className="text-primary">{challenge.duration}</p>
                </div>
                <div className="bg-tertiary dark:bg-slate-800 p-2 rounded-lg">
                  <p className="text-tertiary">Difficulty</p>
                  <p className="text-primary">{challenge.difficulty}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-bold mb-2">
                  <span className="text-tertiary">Progress</span>
                  <span className="text-primary">{challenge.progress}%</span>
                </div>
                <div className="w-full bg-tertiary dark:bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${challenge.progress}%` }}
                  />
                </div>
              </div>

              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">🏆 Prize: {challenge.prize}</p>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-tertiary">👥 {challenge.participants} joined</span>
                <button 
                  onClick={() => handleJoinChallenge(challenge.id)}
                  className={`px-4 py-2 rounded-xl font-black uppercase text-[9px] transition-all ${
                    isJoined(challenge.id)
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-500'
                      : challenge.status === 'active'
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : 'bg-tertiary text-secondary hover:bg-primary dark:bg-slate-800 dark:hover:bg-slate-700'
                  }`}>
                  {isJoined(challenge.id) ? '✓ Joined' : challenge.status === 'active' ? 'Join' : 'Notify'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
