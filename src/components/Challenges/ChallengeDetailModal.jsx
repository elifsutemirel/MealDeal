import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Trophy, ChefHat, Utensils, CheckCircle2, Circle, Crown,
  Loader2, Camera, Upload, Clock, AlertCircle, XCircle, Eye, ThumbsUp, ThumbsDown, ClipboardList
} from 'lucide-react';

export const ChallengeDetailModal = ({ challenge, user, onClose, onProgressUpdate }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [progress, setProgress] = useState({ cooked_count: 0, total: 0, submissions: [] });
  const [recipes, setRecipes] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [loadingRecipes, setLoadingRecipes] = useState(true);

  // Photo submission state
  const [photoUrls, setPhotoUrls] = useState({}); // recipeId -> url string
  const [uploadModes, setUploadModes] = useState({}); // recipeId -> 'file' | 'url'
  const [fileData, setFileData] = useState({}); // recipeId -> { dataUrl, name }
  const [submittingRecipeId, setSubmittingRecipeId] = useState(null);

  // Tab state — 'info' | 'reviews'
  const [activeTab, setActiveTab] = useState('info');

  // Chef review panel state
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({}); // submissionId -> note string

  // Is current user the creator of this challenge?
  const isCreator = user && challenge.creator_id && parseInt(challenge.creator_id) === parseInt(user.id);

  // Real-time countdown
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchLeaderboard();
    fetchRecipes();
    if (user) fetchProgress();
    else setLoadingProgress(false);
    if (isCreator) fetchSubmissions();
  }, [challenge.challenge_id, user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      setProgress({
        cooked_count: data.cooked_count || 0,
        total: data.total || 0,
        submissions: Array.isArray(data.submissions) ? data.submissions : [],
      });
    } catch (err) {
      console.error('Failed to fetch progress:', err);
    } finally {
      setLoadingProgress(false);
    }
  };

  const getSubmissionForRecipe = (recipeId) => {
    return progress.submissions.find(s => s.recipe_id === recipeId) || null;
  };

  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/challenges/${challenge.challenge_id}/submissions`);
      const data = await res.json();
      setPendingSubmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleReview = async (submissionId, status) => {
    const note = reviewNotes[submissionId] || '';
    setReviewingId(submissionId);
    try {
      const res = await fetch(`/api/challenges/submissions/${submissionId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewNote: note, reviewedBy: user.id }),
      });
      const data = await res.json();
      if (res.ok) {
        // Clear note for this submission
        setReviewNotes(prev => { const n = { ...prev }; delete n[submissionId]; return n; });
        // Refresh submissions list and challenge progress/leaderboard
        await fetchSubmissions();
        await fetchLeaderboard();
        if (onProgressUpdate) onProgressUpdate(challenge.challenge_id);
      } else {
        alert(data.message || 'Review failed.');
      }
    } catch (err) {
      console.error('Review error:', err);
      alert('Failed to submit review.');
    } finally {
      setReviewingId(null);
    }
  };

  const handleFileChange = (recipeId, file) => {
    if (!file) return;
    // Validate type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP, etc.)');
      return;
    }
    // Max 5 MB
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileData(prev => ({ ...prev, [recipeId]: { dataUrl: e.target.result, name: file.name } }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPhoto = async (recipeId) => {
    // Prefer uploaded file (base64), fall back to URL
    const fd = fileData[recipeId];
    const url = fd ? fd.dataUrl : (photoUrls[recipeId] || '').trim();
    if (!url) return alert('Please choose a photo or paste an image URL first.');
    if (!fd && !url.startsWith('http') && !url.startsWith('data:')) {
      return alert('Please enter a valid URL starting with http.');
    }

    setSubmittingRecipeId(recipeId);
    try {
      const res = await fetch(`/api/challenges/${challenge.challenge_id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, recipeId, photoUrl: url }),
      });

      const data = await res.json();
      if (res.ok) {
        setPhotoUrls(prev => ({ ...prev, [recipeId]: '' }));
        setFileData(prev => { const n = { ...prev }; delete n[recipeId]; return n; });
        setUploadModes(prev => { const n = { ...prev }; delete n[recipeId]; return n; });
        await fetchProgress();
        await fetchLeaderboard();
        if (onProgressUpdate) onProgressUpdate(challenge.challenge_id);
        alert('Photo submitted for review!');
      } else {
        alert(data.message || 'Failed to submit photo.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Failed to submit photo.');
    } finally {
      setSubmittingRecipeId(null);
    }
  };

  // Compute status using live currentTime
  const getChallengeStatus = () => {
    if (challenge.winner_id) return 'completed';
    const now = currentTime;
    const start = new Date(challenge.start_date);
    const end = new Date(challenge.end_date);
    if (now < start) return 'upcoming';
    if (now > end) return 'ended';
    return 'active';
  };

  const status = getChallengeStatus();
  const isActive = status === 'active';

  const endDate = new Date(challenge.end_date);
  const timeRemaining = endDate - currentTime;
  const daysRemaining = Math.max(0, Math.floor(timeRemaining / (1000 * 60 * 60 * 24)));
  const hoursRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const minutesRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)));
  const secondsRemaining = Math.max(0, Math.floor((timeRemaining % (1000 * 60)) / 1000));
  const timeLabel = daysRemaining > 0
    ? `${daysRemaining}d ${hoursRemaining}h ${minutesRemaining}m`
    : hoursRemaining > 0
    ? `${hoursRemaining}h ${minutesRemaining}m ${secondsRemaining}s`
    : `${minutesRemaining}m ${secondsRemaining}s`;

  const progressPercent = progress.total > 0
    ? Math.round((parseInt(progress.cooked_count) / parseInt(progress.total)) * 100)
    : 0;

  const medalColors = ['text-amber-400', 'text-slate-400', 'text-amber-600'];

  const statusBadge = {
    active: 'bg-emerald-500 text-white',
    upcoming: 'bg-blue-500 text-white',
    ended: 'bg-slate-500 text-white',
    completed: 'bg-amber-500 text-white',
  }[status] || 'bg-slate-500 text-white';

  const statusLabel = {
    active: '⚡ Active',
    upcoming: '🔜 Upcoming',
    ended: '⏹ Ended',
    completed: '🏆 Completed',
  }[status] || status;

  const difficultyColor = {
    Easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    Hard: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  }[challenge.difficulty] || 'bg-slate-100 text-slate-600';

  const isHomeCook = ['Home Cook', 'Verified Chef'].includes(user?.role);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-4 pb-20">
      <button
        onClick={onClose}
        className="mb-6 inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-800 px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 shadow-sm hover:text-emerald-600 hover:border-emerald-200 dark:hover:border-emerald-700 transition-all"
      >
        <ArrowLeft size={16} />
        Back to Challenges
      </button>

      <div className="relative bg-white dark:bg-slate-900 w-full max-w-5xl mx-auto rounded-[2rem] shadow-sm flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800">

        {/* Hero banner */}
        <div className="relative h-44 flex-shrink-0 overflow-hidden">
          <img src={challenge.image} className="w-full h-full object-cover" alt={challenge.title} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 left-4 bg-white/20 backdrop-blur-md text-white rounded-full p-2 hover:bg-white/30 transition-colors"
            aria-label="Back to challenges"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl">{challenge.icon}</span>
              {challenge.difficulty && (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${difficultyColor}`}>
                  {challenge.difficulty}
                </span>
              )}
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusBadge}`}>
                {statusLabel}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">{challenge.title}</h2>
          </div>
        </div>

        {/* Tab switcher — only visible to challenge creator */}
        {isCreator && (
          <div className="flex border-b border-slate-100 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-900">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-colors ${
                activeTab === 'info'
                  ? 'text-emerald-600 border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Utensils size={12} className="inline mr-1" />
              Challenge Info
            </button>
            <button
              onClick={() => { setActiveTab('reviews'); fetchSubmissions(); }}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-colors relative ${
                activeTab === 'reviews'
                  ? 'text-amber-600 border-b-2 border-amber-500'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <ClipboardList size={12} className="inline mr-1" />
              Pending Reviews
              {pendingSubmissions.filter(s => s.status === 'pending').length > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-[9px] font-black rounded-full px-1.5 py-0.5">
                  {pendingSubmissions.filter(s => s.status === 'pending').length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Scrollable content */}
        <div className="p-6 space-y-6">

          {/* Description & meta — always visible */}
          <div>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
              {challenge.description || 'Complete all recipes before the deadline!'}
            </p>
            <div className="flex flex-wrap gap-3">
              {isActive && timeRemaining > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-2xl">
                  <p className="text-[9px] font-black uppercase text-red-400 mb-0.5">Time Left</p>
                  <p className="text-xs font-black text-red-700 dark:text-red-400">
                    ⏱ {timeLabel}
                  </p>
                </div>
              )}
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl">
                <p className="text-[9px] font-black uppercase text-slate-400 mb-0.5">Participants</p>
                <p className="text-xs font-black text-slate-800 dark:text-white">👥 {challenge.participants?.toLocaleString() || 0}</p>
              </div>
              {challenge.prize && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-2xl">
                  <p className="text-[9px] font-black uppercase text-emerald-500 mb-0.5">Prize</p>
                  <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">🏆 {challenge.prize}</p>
                </div>
              )}
              {challenge.winner_name && (
                <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-2xl">
                  <p className="text-[9px] font-black uppercase text-amber-500 mb-0.5">Winner</p>
                  <p className="text-xs font-black text-amber-700 dark:text-amber-400">👑 {challenge.winner_name}</p>
                </div>
              )}
            </div>
          </div>

          {/* 🏆 Winner banner — shown to the winning Home Cook */}
          {isHomeCook && challenge.winner_id && user && parseInt(challenge.winner_id) === parseInt(user.id) && (
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-[1.5rem] p-5 text-center shadow-lg">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)', backgroundSize: '8px 8px' }} />
              <p className="text-3xl mb-1">🏆</p>
              <p className="font-black text-amber-900 text-base uppercase tracking-widest">You Won This Challenge!</p>
              <p className="text-amber-800 text-xs font-bold mt-1">+100 Reward Points · +50 MealCoins awarded</p>
            </div>
          )}

          {/* Reward teaser for active participants who haven't won yet */}
          {isHomeCook && !challenge.winner_id && isActive && (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3">
              <span className="text-xl">🥇</span>
              <div>
                <p className="text-xs font-black text-amber-700 dark:text-amber-400">Be the first to complete all recipes!</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-500">Winner gets <strong>+100 Reward Points</strong> &amp; <strong>+50 MealCoins</strong></p>
              </div>
            </div>
          )}

          {/* Your Progress — Home Cook only, info tab */}
          {activeTab === 'info' && isHomeCook && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] p-5">
              <div className="flex items-center gap-2 mb-4">
                <ChefHat size={16} className="text-emerald-500" />
                <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider">Your Progress</h3>
              </div>
              {loadingProgress ? (
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Loader2 size={14} className="animate-spin" /> Loading...
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center text-xs font-black mb-2">
                    <span className="text-slate-500 dark:text-slate-400">Recipes Approved</span>
                    <span className="text-slate-800 dark:text-white">{progress.cooked_count} / {progress.total}</span>
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
          )}

          {/* Challenge Recipes — info tab only */}
          {activeTab === 'info' && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Utensils size={16} className="text-slate-500" />
              <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider">Challenge Recipes</h3>
            </div>

            {loadingRecipes ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-4">
                <Loader2 size={14} className="animate-spin" /> Loading recipes...
              </div>
            ) : recipes.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 text-center">
                <p className="text-slate-300 dark:text-slate-600 font-bold text-xs uppercase tracking-widest">No recipes assigned yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recipes.map((recipe) => {
                  const submission = getSubmissionForRecipe(recipe.recipe_id);
                  const isApproved = submission?.status === 'approved';
                  const isPending = submission?.status === 'pending';
                  const isRejected = submission?.status === 'rejected';
                  const canSubmit = isHomeCook && isActive && (!submission || isRejected);
                  const isSubmitting = submittingRecipeId === recipe.recipe_id;

                  return (
                    <div
                      key={recipe.recipe_id}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        isApproved
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                          : isPending
                          ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                          : isRejected
                          ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                          : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                      }`}
                    >
                      {/* Recipe header */}
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {isApproved ? (
                            <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                          ) : isPending ? (
                            <Clock size={18} className="text-amber-500 flex-shrink-0" />
                          ) : isRejected ? (
                            <XCircle size={18} className="text-red-500 flex-shrink-0" />
                          ) : (
                            <Circle size={18} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className={`text-sm font-black truncate ${
                              isApproved ? 'text-emerald-700 dark:text-emerald-400' :
                              isPending ? 'text-amber-700 dark:text-amber-400' :
                              isRejected ? 'text-red-700 dark:text-red-400' :
                              'text-slate-800 dark:text-white'
                            }`}>
                              {recipe.title}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                              {recipe.cook_time_min} min · {recipe.difficulty_level}
                            </p>
                          </div>
                        </div>
                        {/* Status badge */}
                        {isApproved && (
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase ml-2">✓ Approved</span>
                        )}
                        {isPending && (
                          <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase ml-2">⏳ Pending</span>
                        )}
                        {isRejected && (
                          <span className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase ml-2">✗ Rejected</span>
                        )}
                      </div>

                      {/* Chef review note (if rejected) */}
                      {isRejected && submission?.review_note && (
                        <div className="px-4 pb-3">
                          <div className="flex items-start gap-2 bg-red-100 dark:bg-red-900/20 rounded-xl p-3">
                            <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700 dark:text-red-400">
                              <span className="font-black">Chef's note:</span> {submission.review_note}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Resubmission warning */}
                      {isRejected && (
                        <div className="px-4 pb-2">
                          <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 rounded-xl px-3 py-2">
                            <AlertCircle size={12} className="text-amber-500 flex-shrink-0" />
                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                              Your previous photo was rejected. You can submit a new one below.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Photo submission area */}
                      {canSubmit && (() => {
                        const mode = uploadModes[recipe.recipe_id] || 'file';
                        const fd = fileData[recipe.recipe_id];
                        const hasContent = fd || (photoUrls[recipe.recipe_id] || '').trim();

                        return (
                          <div className="px-4 pb-4">
                            {/* Header + mode toggle */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Camera size={14} className="text-slate-400" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                  {isRejected ? 'Resubmit Photo' : 'Submit Photo Proof'}
                                </p>
                              </div>
                              {/* Tab toggle */}
                              <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 gap-0.5">
                                <button
                                  onClick={() => setUploadModes(prev => ({ ...prev, [recipe.recipe_id]: 'file' }))}
                                  className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                                    mode === 'file'
                                      ? 'bg-white dark:bg-slate-600 text-emerald-600 shadow-sm'
                                      : 'text-slate-400 hover:text-slate-600'
                                  }`}
                                >
                                  📁 Device
                                </button>
                                <button
                                  onClick={() => setUploadModes(prev => ({ ...prev, [recipe.recipe_id]: 'url' }))}
                                  className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                                    mode === 'url'
                                      ? 'bg-white dark:bg-slate-600 text-emerald-600 shadow-sm'
                                      : 'text-slate-400 hover:text-slate-600'
                                  }`}
                                >
                                  🔗 URL
                                </button>
                              </div>
                            </div>

                            {/* File picker */}
                            {mode === 'file' && (
                              <div>
                                {fd ? (
                                  <div className="relative">
                                    <img
                                      src={fd.dataUrl}
                                      alt="Preview"
                                      className="w-full h-32 object-cover rounded-xl border-2 border-emerald-400 dark:border-emerald-600"
                                    />
                                    <button
                                      onClick={() => setFileData(prev => { const n = { ...prev }; delete n[recipe.recipe_id]; return n; })}
                                      className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black hover:bg-red-600"
                                    >
                                      ✕
                                    </button>
                                    <p className="text-[9px] text-slate-400 mt-1 truncate">{fd.name}</p>
                                  </div>
                                ) : (
                                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-all">
                                    <Upload size={20} className="text-slate-300 dark:text-slate-600 mb-1" />
                                    <p className="text-[10px] font-bold text-slate-400">Click to choose a photo</p>
                                    <p className="text-[9px] text-slate-300 dark:text-slate-600">JPG, PNG, WebP · max 5 MB</p>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handleFileChange(recipe.recipe_id, e.target.files?.[0])}
                                    />
                                  </label>
                                )}
                              </div>
                            )}

                            {/* URL input */}
                            {mode === 'url' && (
                              <div>
                                <input
                                  type="url"
                                  value={photoUrls[recipe.recipe_id] || ''}
                                  onChange={(e) => setPhotoUrls(prev => ({ ...prev, [recipe.recipe_id]: e.target.value }))}
                                  placeholder="Paste image URL (https://...)"
                                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                              </div>
                            )}

                            {/* Submit button */}
                            <button
                              onClick={() => handleSubmitPhoto(recipe.recipe_id)}
                              disabled={isSubmitting || !hasContent}
                              className="mt-2 w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-[10px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-1.5"
                            >
                              {isSubmitting ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <Upload size={12} />
                              )}
                              {isSubmitting ? 'Uploading...' : isRejected ? 'Resubmit' : 'Submit Photo'}
                            </button>
                          </div>
                        );
                      })()}

                      {/* Pending submission photo preview */}
                      {isPending && submission?.photo_url && (
                        <div className="px-4 pb-4">
                          <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Your submitted photo:</p>
                          <img
                            src={submission.photo_url}
                            alt="Submitted photo"
                            className="h-24 w-full object-cover rounded-xl border border-amber-200 dark:border-amber-700"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )} {/* end activeTab==='info' recipes block */}

        {/* ===== CHEF REVIEW PANEL ===== */}
        {activeTab === 'reviews' && isCreator && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList size={16} className="text-amber-500" />
              <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider">Submission Reviews</h3>
            </div>

            {loadingSubmissions ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-6 justify-center">
                <Loader2 size={16} className="animate-spin" /> Loading submissions...
              </div>
            ) : pendingSubmissions.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 text-center">
                <Eye size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-400 dark:text-slate-500 font-bold text-xs uppercase tracking-widest">No submissions yet.</p>
                <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">Home Cooks haven't submitted any photos yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSubmissions.map((sub) => {
                  const isReviewing = reviewingId === sub.submission_id;
                  const statusColor = sub.status === 'approved'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                    : sub.status === 'rejected'
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';

                  return (
                    <div key={sub.submission_id} className={`rounded-2xl border overflow-hidden transition-all ${statusColor}`}>
                      {/* Header */}
                      <div className="flex items-center justify-between p-4">
                        <div>
                          <p className="text-sm font-black text-slate-800 dark:text-white">{sub.username}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{sub.recipe_title}</p>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                          sub.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : sub.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        }`}>
                          {sub.status === 'approved' ? '✓ Approved' : sub.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                        </span>
                      </div>

                      {/* Photo */}
                      {sub.photo_url && (
                        <div className="px-4 pb-3">
                          <img
                            src={sub.photo_url}
                            alt={`${sub.username}'s submission`}
                            className="w-full h-40 object-cover rounded-xl border border-slate-100 dark:border-slate-700"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <a
                            href={sub.photo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-500 hover:underline mt-1 block"
                          >
                            <Eye size={10} className="inline mr-1" />Open full image
                          </a>
                        </div>
                      )}

                      {/* Review note input (only for pending) */}
                      {sub.status === 'pending' && (
                        <div className="px-4 pb-4 space-y-2">
                          <textarea
                            rows={2}
                            value={reviewNotes[sub.submission_id] || ''}
                            onChange={(e) => setReviewNotes(prev => ({ ...prev, [sub.submission_id]: e.target.value }))}
                            placeholder="Optional note for the home cook (e.g. 'Great job!' or 'Please resubmit, photo unclear')"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReview(sub.submission_id, 'approved')}
                              disabled={isReviewing}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[10px] font-black uppercase rounded-xl transition-all"
                            >
                              {isReviewing ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={12} />}
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(sub.submission_id, 'rejected')}
                              disabled={isReviewing}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-[10px] font-black uppercase rounded-xl transition-all"
                            >
                              {isReviewing ? <Loader2 size={12} className="animate-spin" /> : <ThumbsDown size={12} />}
                              Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Already reviewed note */}
                      {sub.status !== 'pending' && sub.review_note && (
                        <div className="px-4 pb-3">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">📝 Your note: {sub.review_note}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'info' && (
          <>

          {/* Leaderboard */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-amber-500" />
              <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider">Leaderboard</h3>
            </div>

            {loadingLeaderboard ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-4">
                <Loader2 size={14} className="animate-spin" /> Loading leaderboard...
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

          </>
        )}
        </div>
      </div>
    </div>
  );
};
