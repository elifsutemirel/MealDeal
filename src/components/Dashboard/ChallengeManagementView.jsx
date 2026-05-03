import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Plus, X, Users, Image, Check, XCircle, Clock, Calendar, Target, ChefHat, Loader2, MessageSquare, Send, Eye } from 'lucide-react';

export const ChallengeManagementView = ({ user }) => {
  const [myChallenges, setMyChallenges] = useState([]);
  const [allRecipes, setAllRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallengeForRecipes, setSelectedChallengeForRecipes] = useState(null);
  const [selectedChallengeForSubmissions, setSelectedChallengeForSubmissions] = useState(null);
  const [selectedChallengeForParticipants, setSelectedChallengeForParticipants] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  // Review note state: submissionId -> note text
  const [reviewNotes, setReviewNotes] = useState({});
  // Which submission is showing its note textarea: submissionId -> 'approve' | 'reject' | null
  const [activeReview, setActiveReview] = useState({});
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchMyChallenges();
    fetchAllRecipes();
  }, []);

  const fetchMyChallenges = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/challenges');
      const data = await res.json();
      setMyChallenges(Array.isArray(data) ? data.filter(c => c.creator_id === user.id) : []);
    } catch (err) {
      console.error('Failed to fetch challenges:', err);
      setMyChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRecipes = async () => {
    try {
      const res = await fetch('/api/recipes');
      const data = await res.json();
      setAllRecipes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch recipes:', err);
      setAllRecipes([]);
    }
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    if (!newChallenge.title || !newChallenge.start_date || !newChallenge.end_date) {
      return alert('Please fill in all required fields');
    }

    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: user.id,
          title: newChallenge.title,
          description: newChallenge.description,
          start_date: newChallenge.start_date,
          end_date: newChallenge.end_date,
        }),
      });

      if (res.ok) {
        setNewChallenge({ title: '', description: '', start_date: '', end_date: '' });
        fetchMyChallenges();
        alert('Challenge created successfully!');
      } else {
        const error = await res.json();
        alert(error.message || error.error || 'Failed to create challenge');
      }
    } catch (err) {
      console.error('Failed to create challenge:', err);
      alert('Failed to create challenge');
    }
  };

  const handleAddRecipe = async (challengeId, recipeId) => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, recipeId }),
      });

      if (res.ok) {
        fetchMyChallenges();
        alert('Recipe added to challenge!');
      } else {
        const error = await res.json();
        alert(error.message || error.error || 'Failed to add recipe');
      }
    } catch (err) {
      console.error('Failed to add recipe:', err);
      alert('Failed to add recipe');
    }
  };

  const handleRemoveRecipe = async (challengeId, recipeId) => {
    if (!confirm('Remove this recipe from the challenge?')) return;

    try {
      const res = await fetch(`/api/challenges/${challengeId}/recipes/${recipeId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchMyChallenges();
        alert('Recipe removed from challenge!');
      } else {
        const error = await res.json();
        alert(error.message || error.error || 'Failed to remove recipe');
      }
    } catch (err) {
      console.error('Failed to remove recipe:', err);
      alert('Failed to remove recipe');
    }
  };

  const fetchSubmissions = async (challengeId) => {
    setSubmissionsLoading(true);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/submissions`);
      const data = await res.json();
      setSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const fetchParticipants = async (challengeId) => {
    setParticipantsLoading(true);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/participants`);
      const data = await res.json();
      setParticipants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch participants:', err);
      setParticipants([]);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const handleReviewSubmission = async (submissionId, status, reviewNote = '') => {
    try {
      const res = await fetch(`/api/challenges/submissions/${submissionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewNote, reviewedBy: user.id }),
      });

      if (res.ok) {
        // Clear note + close textarea
        setReviewNotes(prev => { const n = { ...prev }; delete n[submissionId]; return n; });
        setActiveReview(prev => { const n = { ...prev }; delete n[submissionId]; return n; });
        if (selectedChallengeForSubmissions) fetchSubmissions(selectedChallengeForSubmissions);
        fetchMyChallenges();
      } else {
        const error = await res.json();
        alert(error.message || error.error || 'Failed to review submission');
      }
    } catch (err) {
      console.error('Failed to review submission:', err);
      alert('Failed to review submission');
    }
  };

  const getChallengeStatus = (challenge) => {
    const now = new Date();
    const start = new Date(challenge.start_date);
    const end = new Date(challenge.end_date);
    
    if (challenge.winner_id) return 'Completed';
    if (now < start) return 'Upcoming';
    if (now > end) return 'Ended';
    return 'Active';
  };

  if (loading) {
    return (
      <div className="py-32 flex flex-col items-center gap-4 text-slate-400">
        <Loader2 size={32} className="animate-spin text-emerald-500" />
        <p className="text-xs font-black uppercase tracking-widest">Loading...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8 pb-20">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-primary mb-2">
          Manage <span className="text-emerald-500 italic">Challenges</span>
        </h1>
        <p className="text-secondary text-lg">Create and manage your kitchen challenges</p>
      </header>

      {/* Create New Challenge Form */}
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-700 shadow-sm mb-8">
        <h2 className="text-2xl font-black text-primary mb-6 flex items-center gap-2">
          <Plus size={24} className="text-emerald-500" />
          Create New Challenge
        </h2>
        <form onSubmit={handleCreateChallenge} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Challenge Title *
            </label>
            <input
              type="text"
              value={newChallenge.title}
              onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g., Summer BBQ Challenge"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Description
            </label>
            <textarea
              value={newChallenge.description}
              onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Describe the challenge..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Start Date *
              </label>
              <input
                type="datetime-local"
                value={newChallenge.start_date}
                onChange={(e) => setNewChallenge({ ...newChallenge, start_date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                End Date *
              </label>
              <input
                type="datetime-local"
                value={newChallenge.end_date}
                onChange={(e) => setNewChallenge({ ...newChallenge, end_date: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Trophy size={20} />
            Create Challenge
          </button>
        </form>
      </div>

      {/* My Challenges List */}
      <div>
        <h2 className="text-2xl font-black text-primary mb-6">My Challenges ({myChallenges.length})</h2>
        
        {myChallenges.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-[2rem] p-12 text-center border border-slate-100 dark:border-slate-700">
            <Trophy size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-400 dark:text-slate-500 font-bold">No challenges created yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {myChallenges.map((challenge) => (
              <div
                key={challenge.challenge_id}
                className="bg-white dark:bg-slate-800 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-black text-primary">{challenge.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          getChallengeStatus(challenge) === 'Active' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                          getChallengeStatus(challenge) === 'Upcoming' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                          getChallengeStatus(challenge) === 'Completed' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                          'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          {getChallengeStatus(challenge)}
                        </span>
                      </div>
                      <p className="text-sm text-secondary mb-3">{challenge.description || 'No description'}</p>
                      <div className="flex items-center gap-4 text-xs text-tertiary">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(challenge.start_date).toLocaleDateString()}
                        </span>
                        <span>→</span>
                        <span className="flex items-center gap-1">
                          <Target size={14} />
                          {new Date(challenge.end_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {challenge.participants || 0} participants
                        </span>
                        <span className="flex items-center gap-1">
                          <ChefHat size={14} />
                          {challenge.recipe_count || 0} recipes
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedChallengeForRecipes(
                          selectedChallengeForRecipes === challenge.challenge_id ? null : challenge.challenge_id
                        );
                        setSelectedChallengeForSubmissions(null);
                        setSelectedChallengeForParticipants(null);
                      }}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-all"
                    >
                      <Plus size={16} className="inline mr-2" />
                      Add Recipes
                    </button>
                    <button
                      onClick={() => {
                        const newId = selectedChallengeForParticipants === challenge.challenge_id ? null : challenge.challenge_id;
                        setSelectedChallengeForParticipants(newId);
                        setSelectedChallengeForRecipes(null);
                        setSelectedChallengeForSubmissions(null);
                        if (newId) fetchParticipants(newId);
                      }}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-xl transition-all"
                    >
                      <Users size={16} className="inline mr-2" />
                      View Participants
                    </button>
                    <button
                      onClick={() => {
                        const newId = selectedChallengeForSubmissions === challenge.challenge_id ? null : challenge.challenge_id;
                        setSelectedChallengeForSubmissions(newId);
                        setSelectedChallengeForRecipes(null);
                        setSelectedChallengeForParticipants(null);
                        if (newId) fetchSubmissions(newId);
                      }}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-xl transition-all"
                    >
                      <Image size={16} className="inline mr-2" />
                      Review Submissions
                    </button>
                  </div>

                  {/* Recipe Management Section */}
                  {selectedChallengeForRecipes === challenge.challenge_id && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-700">
                      <h4 className="font-black text-lg mb-4">Add Recipes to Challenge</h4>
                      <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                        {allRecipes.map((recipe) => {
                          const isAdded = challenge.recipe_ids?.includes(recipe.id);
                          return (
                            <div
                              key={recipe.id}
                              className={`p-4 rounded-xl border ${
                                isAdded
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h5 className="font-black text-sm">{recipe.title}</h5>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {recipe.cuisine} • {recipe.difficulty}
                                  </p>
                                </div>
                                {isAdded ? (
                                  <button
                                    onClick={() => handleRemoveRecipe(challenge.challenge_id, recipe.id)}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <X size={18} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAddRecipe(challenge.challenge_id, recipe.id)}
                                    className="text-emerald-500 hover:text-emerald-600"
                                  >
                                    <Plus size={18} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Participants Section */}
                  {selectedChallengeForParticipants === challenge.challenge_id && (
                    <div className="p-6 border-t border-slate-100 dark:border-slate-700">
                      <h4 className="font-black text-lg mb-4">Participants</h4>
                      {participantsLoading ? (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 size={14} className="animate-spin" />
                          Loading...
                        </div>
                      ) : participants.length === 0 ? (
                        <p className="text-slate-400 text-sm">No participants yet</p>
                      ) : (
                        <div className="space-y-2">
                          {participants.map((p) => (
                            <div
                              key={p.user_id}
                              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-xl"
                            >
                              <span className="font-bold text-sm">{p.username}</span>
                              <span className="text-xs text-slate-500">
                                Joined: {new Date(p.joined_at).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                    {/* Submissions Review Section */}
                  {selectedChallengeForSubmissions === challenge.challenge_id && (
                    <div className="mt-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                      <h4 className="font-black text-lg mb-4 flex items-center gap-2">
                        <Eye size={18} className="text-emerald-500" /> Review Submissions
                      </h4>
                      {submissionsLoading ? (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Loader2 size={14} className="animate-spin" /> Loading...
                        </div>
                      ) : submissions.length === 0 ? (
                        <p className="text-slate-400 text-sm">No submissions yet</p>
                      ) : (
                        <div className="space-y-4">
                          {submissions.map((sub) => {
                            const isReviewing = activeReview[sub.submission_id];
                            const note = reviewNotes[sub.submission_id] || '';
                            const isDataUrl = sub.photo_url?.startsWith('data:');

                            return (
                              <div
                                key={sub.submission_id}
                                className={`rounded-2xl border overflow-hidden ${
                                  sub.status === 'approved'
                                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10'
                                    : sub.status === 'rejected'
                                    ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                }`}
                              >
                                {/* Photo preview */}
                                {sub.photo_url && (
                                  <div className="relative w-full bg-slate-100 dark:bg-slate-900" style={{ maxHeight: '220px', overflow: 'hidden' }}>
                                    <img
                                      src={sub.photo_url}
                                      alt="Submission photo"
                                      className="w-full object-cover"
                                      style={{ maxHeight: '220px' }}
                                      onError={(e) => { e.target.parentElement.style.display = 'none'; }}
                                    />
                                    {!isDataUrl && (
                                      <a
                                        href={sub.photo_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute top-2 right-2 bg-black/60 text-white text-[9px] font-bold px-2 py-1 rounded-lg hover:bg-black/80 transition"
                                      >
                                        Open ↗
                                      </a>
                                    )}
                                  </div>
                                )}

                                {/* Info row */}
                                <div className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <p className="font-black text-sm text-slate-800 dark:text-white">{sub.recipe_title}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">by <span className="font-bold">{sub.username}</span></p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">{new Date(sub.submitted_at).toLocaleString()}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                      sub.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' :
                                      sub.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' :
                                      'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                                    }`}>
                                      {sub.status}
                                    </span>
                                  </div>

                                  {/* Previous review note */}
                                  {sub.review_note && (
                                    <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 mb-3">
                                      <MessageSquare size={12} className="text-slate-400 flex-shrink-0 mt-0.5" />
                                      <p className="text-xs text-slate-600 dark:text-slate-300">
                                        <span className="font-black">Your note:</span> {sub.review_note}
                                      </p>
                                    </div>
                                  )}

                                  {/* Action buttons — only for pending */}
                                  {sub.status === 'pending' && (
                                    <div>
                                      {!isReviewing ? (
                                        <div className="flex gap-2 mt-1">
                                          <button
                                            onClick={() => setActiveReview(prev => ({ ...prev, [sub.submission_id]: 'approve' }))}
                                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5"
                                          >
                                            <Check size={14} /> Approve
                                          </button>
                                          <button
                                            onClick={() => setActiveReview(prev => ({ ...prev, [sub.submission_id]: 'reject' }))}
                                            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-black py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5"
                                          >
                                            <XCircle size={14} /> Reject
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="mt-2 bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-3">
                                          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                            {isReviewing === 'approve' ? '✅ Approving submission' : '❌ Rejecting submission'}
                                          </p>
                                          <div className="flex items-start gap-2 mb-2">
                                            <MessageSquare size={14} className="text-slate-400 flex-shrink-0 mt-2.5" />
                                            <textarea
                                              value={note}
                                              onChange={(e) => setReviewNotes(prev => ({ ...prev, [sub.submission_id]: e.target.value }))}
                                              placeholder={isReviewing === 'approve' ? 'Add a compliment or tip... (optional)' : 'Tell the cook why it was rejected... (required for rejection)'}
                                              rows={2}
                                              className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                                            />
                                          </div>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => setActiveReview(prev => { const n = {...prev}; delete n[sub.submission_id]; return n; })}
                                              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-all"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              onClick={() => {
                                                if (isReviewing === 'reject' && !note.trim()) {
                                                  return alert('Please provide a reason for rejection.');
                                                }
                                                handleReviewSubmission(sub.submission_id, isReviewing === 'approve' ? 'approved' : 'rejected', note);
                                              }}
                                              className={`flex-1 text-xs font-black py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 text-white ${
                                                isReviewing === 'approve'
                                                  ? 'bg-emerald-500 hover:bg-emerald-600'
                                                  : 'bg-red-500 hover:bg-red-600'
                                              }`}
                                            >
                                              <Send size={12} />
                                              {isReviewing === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
