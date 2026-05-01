import React, { useState, useMemo } from 'react';
import { ArrowLeft, Sparkles, Leaf, ChefHat, Clock, X, ArrowRight, Plus, Minus, ShoppingBasket, ListPlus, Star, Send } from 'lucide-react';
import { fetchGeminiWithBackoff } from '../../utils/geminiApi';

export const RecipeDetailView = ({ recipe, onBack, onAddToCart, user, onRecipeAddedToList }) => {
  const [servings, setServings] = useState(2);
  const [activeSubView, setActiveSubView] = useState('ingredients');
  const [ingredientsState, setIngredientsState] = useState(
    recipe.ingredients.map(i => {
      // Normalize suppliers: convert strings to objects with synthetic IDs
      const normalizedSuppliers = (i.suppliers || []).map((s, idx) => 
        typeof s === 'object' ? s : { id: `mock-${idx}`, location_name: s, price: i.pricePerUnit || 0 }
      );
      // Find cheapest supplier as default
      const sortedSuppliers = [...normalizedSuppliers].sort((a, b) => (a.price || 0) - (b.price || 0));
      
      return { 
        ...i, 
        suppliers: normalizedSuppliers,
        selected: true, 
        selectedInventoryId: sortedSuppliers[0]?.inventory_id || sortedSuppliers[0]?.id || null,
        currentPrice: sortedSuppliers[0]?.price || i.pricePerUnit // Use db price if available
      };
    })
  );

  // AI substitution state
  const [aiTargetIngredient, setAiTargetIngredient] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Meal List state
  const [userMealLists, setUserMealLists] = useState([]);
  const [showMealListModal, setShowMealListModal] = useState(false);
  const [mealListLoading, setMealListLoading] = useState(false);

  // Review state
  const [reviews, setReviews] = useState(recipe.reviews || []);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const canReview = user && (user.role === 'Home Cook' || user.role === 'Verified Chef');

  const handleSubmitReview = async () => {
    if (!reviewText.trim() || reviewRating === 0) return;
    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/recipe/${recipe.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          rating: reviewRating,
          comment: reviewText.trim()
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to post review');
      }
      const newReview = await res.json();
      setReviews(prev => [newReview, ...prev]);
      setReviewText('');
      setReviewRating(0);
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Recalculate quantities and price based on servings and selection
  const scaleFactor = servings / 2;

  const selectedTotal = useMemo(() => {
    return ingredientsState
      .filter(i => i.selected)
      .reduce((total, i) => total + (i.currentPrice * (i.baseQty * scaleFactor)), 0);
  }, [ingredientsState, scaleFactor]);

  const handleToggleIngredient = (id) => {
    setIngredientsState(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  };



  const handleRequestAI = (ingredient) => {
    setAiTargetIngredient(ingredient);
    setAiPrompt('');
    setAiResult(null);
  };

  // GEMINI API INTEGRATION
  const handleGenerateAISub = async () => {
    setAiLoading(true);
    try {
      const systemPrompt = "You are an expert culinary AI assistant for 'MealDeal', a Farm-to-Table marketplace. A user needs an ingredient substitution based on local availability, dietary restrictions, or personal requests. You must return a JSON object with strictly these three fields: 'suggestion' (the specific name of the substitute), 'suggestedPrice' (a reasonable estimated unit price as a number, e.g., 1.50), and 'reason' (a 1-2 sentence explanation of why this is a good substitute based on the user's prompt).";
      const prompt = `I need a substitute for ${aiTargetIngredient.name} (Taxonomy Category: ${aiTargetIngredient.taxonomy}). My specific request or constraint is: "${aiPrompt}". Currently, the original ingredient costs $${aiTargetIngredient.pricePerUnit.toFixed(2)} per unit. Give me a creative and practical alternative.`;

      const result = await fetchGeminiWithBackoff(prompt, systemPrompt);

      setAiResult({
        targetId: aiTargetIngredient.id,
        original: aiTargetIngredient.name,
        suggestion: result.suggestion,
        suggestedPrice: result.suggestedPrice,
        reason: result.reason
      });
    } catch (error) {
      console.error("AI Substitution failed:", error);
      // Fallback in case API key is missing or call fails
      setAiResult({
        targetId: aiTargetIngredient.id,
        original: aiTargetIngredient.name,
        suggestion: "Standard Pantry Substitute",
        suggestedPrice: aiTargetIngredient.pricePerUnit,
        reason: "The AI service is currently unavailable. We recommend using a standard generic substitute for now."
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplySubstitution = () => {
    setIngredientsState(prev => prev.map(i => {
      if (i.id === aiResult.targetId) {
        return {
          ...i,
          name: aiResult.suggestion,
          suppliers: ['AI Standard Pantry'],
          pricePerUnit: aiResult.suggestedPrice / i.baseQty // Estimate new unit price
        };
      }
      return i;
    }));
    setAiTargetIngredient(null);
    setAiResult(null);
  };

  const missingIngredientsCount = ingredientsState.filter(i => !i.suppliers || i.suppliers.length === 0).length;

  const handleOpenMealListModal = async () => {
    if (!user) {
      alert('Please sign in to save recipes to meal lists');
      return;
    }
    setMealListLoading(true);
    try {
      const res = await fetch(`/api/meallist?userId=${user.id}`);
      if (res.ok) {
        const lists = await res.json();
        setUserMealLists(lists);
        setShowMealListModal(true);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load meal lists');
    } finally {
      setMealListLoading(false);
    }
  };

  const handleAddToMealList = async (mealListId) => {
    try {
      const res = await fetch(`/api/meallist/${mealListId}/recipe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipe_id: recipe.id })
      });
      if (res.ok) {
        alert(`Added to meal list!`);
        setShowMealListModal(false);
        if (onRecipeAddedToList) onRecipeAddedToList();
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to add recipe');
      }
    } catch (err) {
      console.error(err);
      alert('Error adding to meal list');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-8 pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 mb-8 font-black text-[10px] uppercase tracking-widest">
        <ArrowLeft size={16} /> Back to discovery
      </button>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <div className="rounded-[2.5rem] overflow-hidden shadow-xl mb-10 aspect-video relative">
            <img src={recipe.image} className="w-full h-full object-cover" />
          </div>

          <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">{recipe.title}</h1>
          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Leaf size={14} /> Farm Sourced
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              <ChefHat size={14} /> {recipe.chef}
            </div>
          </div>

          <div className="flex border-b border-slate-100 dark:border-slate-700 mb-8">
            {['ingredients', 'steps', 'reviews'].map(view => (
              <button key={view} onClick={() => setActiveSubView(view)} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeSubView === view ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-400 dark:text-slate-500'}`}>
                {view}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8 min-h-[300px]">
            {activeSubView === 'ingredients' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[10px]">Select what you need</h3>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Uncheck items you already have.</span>
                </div>
                {ingredientsState.map(ing => (
                  <div key={ing.id} className={`flex items-center justify-between py-4 border-b border-slate-50 dark:border-slate-700 last:border-0 transition-colors ${!ing.selected ? 'opacity-50 grayscale' : ''}`}>
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={ing.selected}
                        onChange={() => handleToggleIngredient(ing.id)}
                        className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                      />
                      <div>
                        <p className={`font-bold text-slate-800 dark:text-white ${!ing.selected && 'line-through'}`}>{ing.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{ing.taxonomy}</p>

                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      {/* Interactive AI Suggestion Button per Ingredient (only if missing and logged in) */}
                      {user && (!ing.suppliers || ing.suppliers.length === 0) && (
                        <button
                          onClick={() => handleRequestAI(ing)}
                          className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-full transition-colors flex items-center justify-center shadow-sm"
                          title={`Ask AI to substitute ${ing.name}`}
                        >
                          <Sparkles size={16} />
                        </button>
                      )}

                      <div className="w-32 flex flex-col items-end gap-1">
                        <p className="font-black text-slate-900 dark:text-white">{(ing.baseQty * scaleFactor).toFixed(1)} {ing.unit}</p>
                        {user && ing.suppliers && ing.suppliers.length > 0 && (
                          <div className="mt-2 w-full flex flex-wrap justify-end gap-1.5">
                            {ing.suppliers.map((sup) => {
                              const isSelected = (ing.selectedInventoryId || '').toString() === (sup.inventory_id || sup.id).toString();
                              return (
                                <button
                                  key={sup.inventory_id || sup.id}
                                  onClick={() => {
                                    const val = (sup.inventory_id || sup.id).toString();
                                    setIngredientsState(prev => prev.map(p => p.id === ing.id ? { ...p, selectedInventoryId: val, currentPrice: sup.price || p.currentPrice } : p));
                                  }}
                                  className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all border ${
                                    isSelected 
                                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' 
                                      : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700 hover:border-emerald-500/50 hover:text-emerald-500'
                                  }`}
                                >
                                  {sup.location_name || sup.supplier_name || sup.name}
                                  {sup.price !== undefined && ` • $${Number(sup.price).toFixed(2)}`}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {user && (!ing.suppliers || ing.suppliers.length === 0) && (
                          <div className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-200 dark:border-red-800 rounded-lg text-[9px] font-black uppercase tracking-widest mt-1 text-center">
                            Missing
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeSubView === 'steps' && (
              <div className="space-y-6">
                {recipe.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-1">{step}</p>
                  </div>
                ))}
              </div>
            )}
            {activeSubView === 'reviews' && (
              <div className="space-y-6">
                {/* Review Form — only for Home Cooks & Verified Chefs */}
                {canReview && (
                  <div className="p-6 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                    <h4 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-4">Write a Review</h4>
                    {reviewSuccess && (
                      <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 p-3 rounded-xl text-xs font-bold mb-4 animate-in fade-in">✓ Review posted successfully!</div>
                    )}
                    {reviewError && (
                      <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold mb-4">{reviewError}</div>
                    )}
                    <div className="flex items-center gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setReviewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            size={24}
                            className={`transition-colors ${(hoverRating || reviewRating) >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                          />
                        </button>
                      ))}
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 ml-2">
                        {reviewRating > 0 ? `${reviewRating}/5` : 'Select rating'}
                      </span>
                    </div>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Share your experience with this recipe..."
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 h-20 resize-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                    <button
                      onClick={handleSubmitReview}
                      disabled={!reviewText.trim() || reviewRating === 0 || reviewSubmitting}
                      className={`mt-3 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all ${!reviewText.trim() || reviewRating === 0 ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20'}`}
                    >
                      {reviewSubmitting ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> : <Send size={14} />}
                      {reviewSubmitting ? 'Posting...' : 'Submit Review'}
                    </button>
                  </div>
                )}
                {!canReview && user && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl text-xs text-slate-400 dark:text-slate-500 font-bold text-center">
                    Only Home Cooks and Verified Chefs can post reviews.
                  </div>
                )}
                {!user && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl text-xs text-slate-400 dark:text-slate-500 font-bold text-center">
                    Sign in to leave a review.
                  </div>
                )}

                {/* Existing Reviews */}
                {reviews.length === 0 ? (
                  <div className="py-12 text-center text-sm font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">No reviews yet</div>
                ) : (
                  reviews.map((rev, idx) => (
                    <div key={rev.id || idx} className="p-6 bg-slate-50 dark:bg-slate-700 rounded-2xl animate-in fade-in">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-slate-800 dark:text-white text-sm">{rev.user}</span>
                        {rev.rating && (
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} size={12} className={`${s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 italic">"{rev.comment}"</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ORDER CUSTOMIZATION SIDEBAR */}
        <div className="lg:w-96">
          <div className="sticky top-24 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-2xl p-8">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-8 text-center">Order Customization</h3>

            <div className="flex items-center justify-between mb-10">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase">Serving Size</span>
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-600">
                <button onClick={() => setServings(Math.max(1, servings - 1))} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"><Minus size={16} /></button>
                <span className="text-xl font-black text-slate-900 dark:text-white w-8 text-center">{servings}</span>
                <button onClick={() => setServings(Math.min(12, servings + 1))} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"><Plus size={16} /></button>
              </div>
            </div>

            <div className="space-y-3 mb-10">
              <div className="flex justify-between text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                <span>Selected Ingredients ({ingredientsState.filter(i => i.selected).length})</span>
                <span className="text-slate-900 dark:text-white">${selectedTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                <span>Supplier Fee</span>
                <span className="text-slate-900 dark:text-white">${selectedTotal > 0 ? '1.99' : '0.00'}</span>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-sm font-black text-slate-900 dark:text-white uppercase">Total</span>
                <span className="text-3xl font-black text-emerald-500 dark:text-emerald-400">${selectedTotal > 0 ? (selectedTotal + 1.99).toFixed(2) : '0.00'}</span>
              </div>
            </div>

            <button
              disabled={selectedTotal === 0 || missingIngredientsCount > 0}
              onClick={() => onAddToCart({ ...recipe, cartIngredients: ingredientsState.filter(i => i.selected), finalPrice: selectedTotal }, servings)}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${selectedTotal === 0 || missingIngredientsCount > 0 ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 hover:bg-emerald-600 dark:hover:bg-emerald-600 active:scale-95'}`}
            >
              <ShoppingBasket size={18} />
              {missingIngredientsCount > 0 ? 'Resolve Missing Items' : 'Shop This Meal'}
            </button>
            <button onClick={handleOpenMealListModal} className="w-full mt-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 py-3 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:border-slate-400 dark:hover:border-slate-500 transition-all flex items-center justify-center gap-2">
              <ListPlus size={14} /> Add to Meal List
            </button>
          </div>
        </div>
      </div>

      {/* AI SUBSTITUTION INTERACTIVE MODAL */}
      {aiTargetIngredient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm" onClick={() => setAiTargetIngredient(null)} />
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl"><Sparkles size={24} /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">Ask AI to Substitute</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Target: {aiTargetIngredient.name}</p>
                </div>
              </div>
              <button onClick={() => setAiTargetIngredient(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500"><X size={20} /></button>
            </div>

            {!aiResult ? (
              <div className="space-y-4">
                <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Why do you need a substitute?</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., 'I have a peanut allergy', 'It is out of stock', 'I want something cheaper'..."
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl p-4 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-indigo-400 h-24 resize-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button
                  onClick={handleGenerateAISub}
                  disabled={!aiPrompt.trim() || aiLoading}
                  className="w-full bg-indigo-600 dark:bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 dark:hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {aiLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Sparkles size={16} />}
                  {aiLoading ? 'Calling Gemini API...' : 'Generate Suggestion'}
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 line-through">{aiResult.original}</span>
                    <ArrowRight size={14} className="text-indigo-500 dark:text-indigo-400" />
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{aiResult.suggestion}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 italic leading-relaxed">"{aiResult.reason}"</p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4">Estimated Unit Price: ${aiResult.suggestedPrice.toFixed(2)}</p>
                  <div className="flex gap-3">
                    <button onClick={() => setAiResult(null)} className="flex-1 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Retry</button>
                    <button onClick={handleApplySubstitution} className="flex-1 py-3 bg-indigo-600 dark:bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-700 dark:hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">Apply Substitute</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MEAL LIST MODAL */}
      {showMealListModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowMealListModal(false)} />
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">Add to Meal List</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase mt-1">Recipe: {recipe.title}</p>
              </div>
              <button onClick={() => setShowMealListModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500"><X size={20} /></button>
            </div>

            {userMealLists.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mb-4">No meal lists yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">Create your first meal list to save recipes</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {userMealLists.map(list => (
                  <button
                    key={list.meal_list_id}
                    onClick={() => handleAddToMealList(list.meal_list_id)}
                    className="w-full text-left p-4 bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                  >
                    <p className="font-bold text-slate-800 dark:text-white">{list.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{list.recipe_count || 0} recipes</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
