import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Plus, X, Users, Image, Check, XCircle, Clock, Calendar, Target, ChefHat, Loader2, MessageSquare, Send, Eye, Trash2, History, Search, UtensilsCrossed } from 'lucide-react';

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
  const [newChallengeRecipes, setNewChallengeRecipes] = useState(new Set());
  const [recipeSearchQuery, setRecipeSearchQuery] = useState('');

  // Inline recipe creation modal
  const [showNewRecipeModal, setShowNewRecipeModal] = useState(false);
  const [allIngredients, setAllIngredients] = useState([]);
  const [newRecipe, setNewRecipe] = useState({ title: '', difficulty: 'Easy', cook_time_min: 30, servings: 2, dietary: '', preparation_steps: '' });
  const [newRecipeIngredients, setNewRecipeIngredients] = useState([{ ingredient_id: '', qty: '', unit: '' }]);
  const [recipeCreating, setRecipeCreating] = useState(false);
  const [ingredientSearch, setIngredientSearch] = useState('');

  useEffect(() => {
    fetchMyChallenges();
    fetchAllRecipes();
    fetch('/api/ingredients').then(r => r.json()).then(data => setAllIngredients(Array.isArray(data) ? data : [])).catch(() => {});
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

  const handleCreateNewRecipe = async (e) => {
    e.preventDefault();
    if (!newRecipe.title.trim()) return alert('Recipe title is required.');
    setRecipeCreating(true);
    try {
      const body = {
        creator_id: user.id,
        title: newRecipe.title,
        preparation_steps: newRecipe.preparation_steps || null,
        cook_time_min: Number(newRecipe.cook_time_min),
        difficulty_level: newRecipe.difficulty,
        dietary_tag: newRecipe.dietary || null,
        base_servings: Number(newRecipe.servings),
        visibility: 'public',
        ingredients: newRecipeIngredients
          .filter(i => i.ingredient_id && i.qty && i.unit)
          .map(i => ({
            ingredient_id: Number(i.ingredient_id),
            name: allIngredients.find(a => String(a.ingredient_id) === String(i.ingredient_id))?.name,
            qty: Number(i.qty),
            unit: i.unit,
          })),
      };
      const res = await fetch('/api/recipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || 'Failed'); }
      const data = await res.json();
      const newId = data.recipe_id;
      // Refresh recipe list and auto-select the new recipe
      await fetchAllRecipes();
      setNewChallengeRecipes(prev => new Set([...prev, newId]));
      setShowNewRecipeModal(false);
      setNewRecipe({ title: '', difficulty: 'Easy', cook_time_min: 30, servings: 2, dietary: '', preparation_steps: '' });
      setNewRecipeIngredients([{ ingredient_id: '', qty: '', unit: '' }]);
      setIngredientSearch('');
    } catch (err) {
      alert(err.message || 'Failed to create recipe.');
    } finally {
      setRecipeCreating(false);
    }
  };

  const handleDeleteChallenge = async (challengeId) => {
    if (!confirm('Permanently delete this challenge? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/challenges/${challengeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        fetchMyChallenges();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete challenge.');
      }
    } catch (err) {
      console.error('Delete challenge error:', err);
      alert('Failed to delete challenge.');
    }
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    if (!newChallenge.title || !newChallenge.start_date || !newChallenge.end_date) {
      return alert('Please fill in all required fields');
    }
    if (newChallengeRecipes.size === 0) {
      return alert('Please select at least one recipe for the challenge.');
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
        const created = await res.json();
        const challengeId = created.challenge?.challenge_id || created.challenge_id || created.id;
        // Add all selected recipes
        await Promise.all(
          [...newChallengeRecipes].map(recipeId =>
            fetch(`/api/challenges/${challengeId}/recipes`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, recipeId }),
            })
          )
        );
        setNewChallenge({ title: '', description: '', start_date: '', end_date: '' });
        setNewChallengeRecipes(new Set());
        setRecipeSearchQuery('');
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

  const renderChallengeCard = (challenge) => (
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
            <div className="flex items-center gap-4 text-xs text-tertiary flex-wrap">
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
            {/* Winner display for Completed challenges */}
            {getChallengeStatus(challenge) === 'Completed' && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl w-fit">
                <span className="text-lg">🏆</span>
                <div>
                  <p className="text-[10px] font-black text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">Winner</p>
                  <p className="text-sm font-black text-yellow-800 dark:text-yellow-300">
                    {challenge.winner_name || 'Unknown'}
                  </p>
                </div>
              </div>
            )}
            {getChallengeStatus(challenge) === 'Ended' && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl w-fit">
                <span className="text-base">🏁</span>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No winner — challenge ended without completion</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {['Active', 'Upcoming'].includes(getChallengeStatus(challenge)) && (
            <button
              onClick={() => {
                setSelectedChallengeForRecipes(selectedChallengeForRecipes === challenge.challenge_id ? null : challenge.challenge_id);
                setSelectedChallengeForSubmissions(null);
                setSelectedChallengeForParticipants(null);
              }}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-all"
            >
              <Plus size={16} className="inline mr-2" />
              Add Recipes
            </button>
          )}
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
          {['Active', 'Upcoming'].includes(getChallengeStatus(challenge)) && (
            <button
              onClick={() => handleDeleteChallenge(challenge.challenge_id)}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center gap-2"
              title="Delete challenge permanently"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
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
                        {sub.review_note && (
                          <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 mb-3">
                            <MessageSquare size={12} className="text-slate-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              <span className="font-black">Your note:</span> {sub.review_note}
                            </p>
                          </div>
                        )}
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
                                      isReviewing === 'approve' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'
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
  );

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
          {/* Recipe Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                Recipes *
                <span className="text-xs font-normal text-slate-500">(select at least one)</span>
                {newChallengeRecipes.size > 0 && (
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-black rounded-full">
                    {newChallengeRecipes.size} selected
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={() => setShowNewRecipeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-xl transition-all"
              >
                <Plus size={13} /> Create New Recipe
              </button>
            </div>
            <input
              type="text"
              value={recipeSearchQuery}
              onChange={(e) => setRecipeSearchQuery(e.target.value)}
              placeholder="Search recipes..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm mb-3"
            />
            <div className={`grid grid-cols-2 gap-2 max-h-64 overflow-y-auto rounded-xl border p-3 ${
              newChallengeRecipes.size === 0
                ? 'border-slate-200 dark:border-slate-600'
                : 'border-emerald-300 dark:border-emerald-700'
            } bg-slate-50 dark:bg-slate-900/30`}>
              {allRecipes
                .filter(r => r.title.toLowerCase().includes(recipeSearchQuery.toLowerCase()))
                .map((recipe) => {
                  const selected = newChallengeRecipes.has(recipe.id);
                  return (
                    <button
                      key={recipe.id}
                      type="button"
                      onClick={() => {
                        setNewChallengeRecipes(prev => {
                          const next = new Set(prev);
                          selected ? next.delete(recipe.id) : next.add(recipe.id);
                          return next;
                        });
                      }}
                      className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all ${
                        selected
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-700'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                        selected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-500'
                      }`}>
                        {selected && <Check size={12} className="text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-primary truncate">{recipe.title}</p>
                        <p className="text-[10px] text-slate-500 truncate">{recipe.cuisine} • {recipe.difficulty}</p>
                      </div>
                    </button>
                  );
                })}
              {allRecipes.filter(r => r.title.toLowerCase().includes(recipeSearchQuery.toLowerCase())).length === 0 && (
                <p className="col-span-2 text-center text-slate-400 text-sm py-4">No recipes found</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={newChallengeRecipes.size === 0}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-black py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Trophy size={20} />
            Create Challenge
            {newChallengeRecipes.size > 0 && (
              <span className="text-emerald-100 text-sm font-normal">with {newChallengeRecipes.size} recipe{newChallengeRecipes.size > 1 ? 's' : ''}</span>
            )}
          </button>
        </form>
      </div>

      {/* Inline Create New Recipe Modal */}
      {showNewRecipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 dark:border-slate-700">
            <div className="sticky top-0 bg-white dark:bg-slate-800 px-8 pt-8 pb-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <UtensilsCrossed size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-primary">Create New Recipe</h3>
                  <p className="text-xs text-slate-500">Recipe will be auto-added to the challenge</p>
                </div>
              </div>
              <button onClick={() => setShowNewRecipeModal(false)} className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-all">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateNewRecipe} className="p-8 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Recipe Title *</label>
                <input
                  type="text"
                  value={newRecipe.title}
                  onChange={e => setNewRecipe({ ...newRecipe, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  placeholder="e.g., Spicy Thai Noodles"
                  required
                />
              </div>

              {/* Difficulty / Cook Time / Servings */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Difficulty</label>
                  <select
                    value={newRecipe.difficulty}
                    onChange={e => setNewRecipe({ ...newRecipe, difficulty: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  >
                    {['Easy', 'Medium', 'Hard'].map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Cook Time (min)</label>
                  <input
                    type="number" min="1"
                    value={newRecipe.cook_time_min}
                    onChange={e => setNewRecipe({ ...newRecipe, cook_time_min: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Servings</label>
                  <input
                    type="number" min="1"
                    value={newRecipe.servings}
                    onChange={e => setNewRecipe({ ...newRecipe, servings: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Dietary tag */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Dietary Tag</label>
                <input
                  type="text"
                  value={newRecipe.dietary}
                  onChange={e => setNewRecipe({ ...newRecipe, dietary: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  placeholder="e.g., Vegan, Gluten-Free"
                />
              </div>

              {/* Preparation steps */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Preparation Steps</label>
                <textarea
                  value={newRecipe.preparation_steps}
                  onChange={e => setNewRecipe({ ...newRecipe, preparation_steps: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-sm resize-none"
                  placeholder="Describe the preparation steps..."
                />
              </div>

              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Ingredients</label>
                  <button
                    type="button"
                    onClick={() => setNewRecipeIngredients([...newRecipeIngredients, { ingredient_id: '', qty: '', unit: '' }])}
                    className="text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Row
                  </button>
                </div>

                {/* Ingredient search */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={ingredientSearch}
                    onChange={e => setIngredientSearch(e.target.value)}
                    placeholder="Filter ingredients..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                  />
                </div>

                <div className="space-y-2">
                  {newRecipeIngredients.map((ing, idx) => {
                    const selected = allIngredients.find(a => String(a.ingredient_id) === String(ing.ingredient_id));
                    const allowedUnits = selected?.allowed_units ? selected.allowed_units.split(',').map(u => u.trim()) : ['kg','g','oz','cup','L','ml','tbsp','tsp','pc','pcs'];
                    const filtered = ingredientSearch
                      ? allIngredients.filter(a => a.name.toLowerCase().includes(ingredientSearch.toLowerCase()))
                      : allIngredients;
                    return (
                      <div key={idx} className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-center">
                        <select
                          value={ing.ingredient_id}
                          onChange={e => {
                            const copy = [...newRecipeIngredients];
                            copy[idx] = { ...copy[idx], ingredient_id: e.target.value, unit: '' };
                            setNewRecipeIngredients(copy);
                          }}
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                        >
                          <option value="">— ingredient —</option>
                          {filtered.map(a => <option key={a.ingredient_id} value={a.ingredient_id}>{a.name}</option>)}
                        </select>
                        <input
                          type="number" min="0" step="any"
                          placeholder="Qty"
                          value={ing.qty}
                          onChange={e => { const copy = [...newRecipeIngredients]; copy[idx].qty = e.target.value; setNewRecipeIngredients(copy); }}
                          className="px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-xs text-center"
                        />
                        <select
                          value={ing.unit}
                          onChange={e => { const copy = [...newRecipeIngredients]; copy[idx].unit = e.target.value; setNewRecipeIngredients(copy); }}
                          className="px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                        >
                          <option value="">unit</option>
                          {allowedUnits.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => setNewRecipeIngredients(newRecipeIngredients.filter((_, i) => i !== idx))}
                          className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 flex items-center justify-center transition-all"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRecipeModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recipeCreating || !newRecipe.title.trim()}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-black py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {recipeCreating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {recipeCreating ? 'Creating...' : 'Create & Add to Challenge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* My Challenges List */}
      <div>
        <h2 className="text-2xl font-black text-primary mb-6">My Challenges ({myChallenges.length})</h2>
        
        {myChallenges.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800 rounded-[2rem] p-12 text-center border border-slate-100 dark:border-slate-700">
            <Trophy size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-400 dark:text-slate-500 font-bold">No challenges created yet</p>
          </div>
        ) : (() => {
          const activeChallenges = myChallenges.filter(c => ['Active', 'Upcoming'].includes(getChallengeStatus(c)));
          const historyChallenges = myChallenges.filter(c => ['Completed', 'Ended'].includes(getChallengeStatus(c)));
          return (
            <>
              {/* Active & Upcoming challenges */}
              {activeChallenges.length > 0 && (
                <div className="space-y-6 mb-10">
                  {activeChallenges.map((challenge) => renderChallengeCard(challenge))}
                </div>
              )}
              {activeChallenges.length === 0 && historyChallenges.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 text-center border border-dashed border-slate-200 dark:border-slate-700 mb-8">
                  <p className="text-slate-400 font-bold text-sm">No active or upcoming challenges.</p>
                </div>
              )}
              {/* Challenge History */}
              {historyChallenges.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <History size={20} className="text-slate-400" />
                    <h2 className="text-xl font-black text-primary">Challenge History ({historyChallenges.length})</h2>
                  </div>
                  <div className="space-y-6 opacity-80">
                    {historyChallenges.map((challenge) => renderChallengeCard(challenge))}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
};
