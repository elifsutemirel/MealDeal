import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Sparkles, Leaf, ChefHat, Clock, X, ArrowRight, Plus, Minus, ShoppingBasket, ListPlus, Star, Send, Trash2 } from 'lucide-react';
import { getPricePerRecipeUnit, canSupplierFulfill, areUnitsCompatible, convertAmount } from '../../utils/unitConversion';
import { useToast } from '../Common/Toast.jsx';

export const RecipeDetailView = ({ recipe, onBack, onAddToCart, user, onRecipeAddedToList, onDelete }) => {
  const { add: toast } = useToast();
  const mapIngredientsWithSelection = (nextIngredients, previousIngredients = []) => {
    const previousById = new Map(previousIngredients.map(i => [i.id?.toString(), i]));

    return (nextIngredients || []).map(i => {
      // Normalise and enrich each supplier with conversion data
      const normalizedSuppliers = (i.suppliers || []).map((s, idx) => {
        if (typeof s !== 'object') {
          // Legacy mock string supplier — treat as same unit as recipe
          return {
            id: `mock-${idx}`,
            location_name: s,
            price: i.pricePerUnit || 0,
            unit: i.unit,
            available_qty: Infinity,
            convertedPrice: i.pricePerUnit || 0,
          };
        }
        const supUnit = s.unit || i.unit;
        const convertedPrice = getPricePerRecipeUnit(s.price || 0, supUnit, i.unit);
        const availableInRecipeUnit =
          convertedPrice !== null
            ? convertAmount(s.available_qty || 0, supUnit, i.unit) ?? 0
            : 0;
        return { ...s, unit: supUnit, convertedPrice, availableInRecipeUnit };
      });

      // Sort compatible suppliers cheapest first (by price per recipe unit)
      const compatibleSuppliers = normalizedSuppliers
        .filter(s => s.convertedPrice !== null)
        .sort((a, b) => (a.convertedPrice || 0) - (b.convertedPrice || 0));

      const existing = previousById.get(i.id?.toString());
      const existingSelectedInventoryId =
        existing?.selectedInventoryId != null ? existing.selectedInventoryId.toString() : null;
      const hasExistingSupplier =
        existingSelectedInventoryId &&
        compatibleSuppliers.some(
          s => (s.inventory_id || s.id)?.toString() === existingSelectedInventoryId
        );
      const fallbackSupplier = compatibleSuppliers[0];

      return {
        ...i,
        suppliers: normalizedSuppliers,
        selected: existing?.selected ?? true,
        selectedInventoryId: hasExistingSupplier
          ? existingSelectedInventoryId
          : (fallbackSupplier?.inventory_id || fallbackSupplier?.id || null),
        // currentPrice = price per 1 recipe-unit (already converted)
        currentPrice: hasExistingSupplier
          ? (existing?.currentPrice ?? fallbackSupplier?.convertedPrice ?? i.pricePerUnit ?? 0)
          : (fallbackSupplier?.convertedPrice ?? i.pricePerUnit ?? 0),
      };
    });
  };

  const [servings, setServings] = useState(recipe.base_servings || 2);
  const [activeSubView, setActiveSubView] = useState('ingredients');
  const [ingredientsState, setIngredientsState] = useState(
    mapIngredientsWithSelection(recipe.ingredients)
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
  const [replyingTo, setReplyingTo] = useState(null); // Review object we are replying to

  const canReview = user && (user.role === 'Home Cook' || user.role === 'Verified Chef');

  useEffect(() => {
    setServings(recipe.base_servings || 2);
    setIngredientsState(mapIngredientsWithSelection(recipe.ingredients));
  }, [recipe.id, recipe.ingredients]);

  useEffect(() => {
    let isMounted = true;

    const syncInventory = async () => {
      try {
        const res = await fetch(`/api/recipes/${recipe.id}/inventory`);
        if (!res.ok) return;
        const data = await res.json();
        console.log(`[RecipeDetail] Received inventory for recipe ${recipe.id}:`, data);
        if (!isMounted || !Array.isArray(data.ingredients)) return;

        setIngredientsState(prev => mapIngredientsWithSelection(data.ingredients, prev));
      } catch (err) {
        console.error('Failed to sync recipe inventory:', err);
      }
    };

    syncInventory();
    const intervalId = setInterval(syncInventory, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [recipe.id]);

  const handleSubmitReview = async (parentId = null) => {
    const isReply = !!parentId;
    const text = isReply ? replyText.trim() : reviewText.trim();
    const rating = isReply ? 0 : reviewRating;

    if (!text || (!isReply && rating === 0)) return;

    setReviewSubmitting(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/recipe/${recipe.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          rating: rating || null,
          comment: text,
          parentCommentId: parentId
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to post review');
      }
      const newReview = await res.json();
      setReviews(prev => [...prev, newReview]);
      
      if (isReply) {
        setReplyText('');
        setReplyingTo(null);
      } else {
        setReviewText('');
        setReviewRating(0);
      }
      
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const [replyText, setReplyText] = useState('');

  const nestedReviews = useMemo(() => {
    const map = {};
    const roots = [];
    reviews.forEach(r => {
      map[r.id] = { ...r, replies: [] };
    });
    reviews.forEach(r => {
      if (r.parentId && map[r.parentId]) {
        map[r.parentId].replies.push(map[r.id]);
      } else {
        roots.push(map[r.id]);
      }
    });
    return roots;
  }, [reviews]);

  const renderReviewItem = (review, depth = 0) => {
    const isReplying = replyingTo?.id === review.id;

    return (
      <div key={review.id} className={`space-y-4 ${depth > 0 ? 'ml-6 md:ml-10 mt-4 border-l-2 border-slate-100 dark:border-slate-700 pl-4' : ''}`}>
        <div className="p-6 bg-slate-50 dark:bg-slate-700/50 rounded-2xl animate-in fade-in transition-all hover:shadow-md border border-transparent hover:border-slate-200 dark:hover:border-slate-600">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-[10px] uppercase">
                {review.user?.[0] || '?'}
              </div>
              <span className="font-bold text-slate-800 dark:text-white text-sm">{review.user}</span>
              {review.parentId && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <ArrowRight size={10} /> reply
                </span>
              )}
            </div>
            <div className="flex flex-col items-end">
              {review.rating && (
                <div className="flex items-center gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={12} className={`${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-600'}`} />
                  ))}
                </div>
              )}
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {new Date(review.date).toLocaleDateString()}
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4 italic">"{review.comment}"</p>
          
          {canReview && !isReplying && (
            <button 
              onClick={() => {
                setReplyingTo(review);
                setReplyText('');
              }}
              className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-600 flex items-center gap-1 transition-colors"
            >
              Reply to this
            </button>
          )}

          {isReplying && (
            <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-emerald-900/50 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Replying to {review.user}</span>
                <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
              </div>
              <textarea
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply..."
                className="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 rounded-lg p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 min-h-[80px] resize-none mb-3"
              />
              <div className="flex justify-end">
                <button
                  disabled={!replyText.trim() || reviewSubmitting}
                  onClick={() => handleSubmitReview(review.id)}
                  className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {reviewSubmitting ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> : <Send size={12} />}
                  Post Reply
                </button>
              </div>
            </div>
          )}
        </div>
        
        {review.replies && review.replies.length > 0 && (
          <div className="space-y-4">
            {review.replies.map(reply => renderReviewItem(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Recalculate quantities and price based on servings and selection
  const scaleFactor = servings / (recipe.base_servings || 2);

  const selectedTotal = useMemo(() => {
    return ingredientsState.filter(i => i.selected).reduce((total, i) => {
      const required = i.baseQty * scaleFactor;
      // Only count suppliers that can fulfill the scaled quantity
      const validSuppliers = (i.suppliers || [])
        .filter(s =>
          s.convertedPrice != null &&
          canSupplierFulfill(s.available_qty || 0, s.unit || i.unit, required, i.unit)
        )
        .sort((a, b) => (a.convertedPrice || 0) - (b.convertedPrice || 0));
      if (validSuppliers.length === 0) return total;
      // Prefer the selected supplier; fall back to cheapest valid one
      const chosen =
        validSuppliers.find(
          s => (s.inventory_id || s.id)?.toString() === i.selectedInventoryId?.toString()
        ) || validSuppliers[0];
      return total + chosen.convertedPrice * required;
    }, 0);
  }, [ingredientsState, scaleFactor]);

  const missingIngredientsCount = useMemo(() => {
    return ingredientsState.filter(i => {
      if (!i.selected) return false;
      const required = i.baseQty * scaleFactor;
      return (
        (i.suppliers || []).filter(
          s =>
            s.convertedPrice != null &&
            canSupplierFulfill(s.available_qty || 0, s.unit || i.unit, required, i.unit)
        ).length === 0
      );
    }).length;
  }, [ingredientsState, scaleFactor]);

  const handleToggleIngredient = (id) => {
    setIngredientsState(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  };

  const handleRequestAI = (ingredient) => {
    setAiTargetIngredient(ingredient);
    setAiPrompt('');
    setAiResult(null);
  };

  // GEMINI API INTEGRATION (proxied through /api/ai/substitute)
  const handleGenerateAISub = async () => {
    setAiLoading(true);
    try {
      const pricePerUnit = Number(aiTargetIngredient.pricePerUnit) || Number(aiTargetIngredient.currentPrice) || 0;

      const res = await fetch('/api/ai/substitute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredientName: aiTargetIngredient.name,
          userPrompt: aiPrompt,
          currentPrice: pricePerUnit
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Server error ${res.status}`);
      }

      const result = await res.json();
      setAiResult({
        targetId: aiTargetIngredient.id,
        original: aiTargetIngredient.name,
        suggestion: result.suggestion,
        suggestedPrice: result.suggestedPrice,
        reason: result.reason
      });
    } catch (error) {
      console.error("AI Substitution failed:", error);
      const isRateLimit = error.message?.toLowerCase().includes('rate limit') || error.message?.toLowerCase().includes('quota exceeded');
      const isConfigError = error.message?.toLowerCase().includes('not configured') || error.message?.toLowerCase().includes('authentication');
      setAiResult({
        targetId: aiTargetIngredient.id,
        original: aiTargetIngredient.name,
        suggestion: "Standard Pantry Substitute",
        suggestedPrice: Number(aiTargetIngredient.pricePerUnit) || Number(aiTargetIngredient.currentPrice) || 0,
        reason: isRateLimit
          ? "The AI service is temporarily busy. Please try again in a few moments or use a standard substitute."
          : isConfigError
            ? "AI service is currently being reconfigured. Please try again later."
            : (error.message?.length < 120 ? error.message : "The AI service is currently unavailable. Please try again shortly.")
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplySubstitution = async () => {
    console.log('[AI] Applying substitution:', aiResult.suggestion);
    
    // Fetch actual suppliers for the substituted ingredient
    try {
      const response = await fetch(`/api/ingredients/suppliers?name=${encodeURIComponent(aiResult.suggestion)}`);
      const suppliers = await response.json();
      console.log('[AI] Found suppliers for substitution:', suppliers);

      setIngredientsState(prev => prev.map(i => {
        if (i.id === aiResult.targetId) {
          if (suppliers && suppliers.length > 0) {
            // Found suppliers - use real supplier data
            const supplierData = suppliers.map(s => ({
              supplierId: s.supplier_id,
              supplierName: s.supplier_name,
              locationName: s.location_name,
              price: parseFloat(s.price),
              unit: s.unit,
              availableQty: parseFloat(s.available_qty),
              inventoryId: s.inventory_id
            }));

            // Select cheapest supplier by default
            const cheapest = supplierData.reduce((min, s) => s.price < min.price ? s : min);

            return {
              ...i,
              name: aiResult.suggestion,
              suppliers: supplierData,
              supplierId: cheapest.supplierId,
              currentPrice: (cheapest.price * i.baseQty).toFixed(2),
              pricePerUnit: cheapest.price,
              unit: cheapest.unit
            };
          } else {
            // No suppliers found - show as unavailable
            return {
              ...i,
              name: aiResult.suggestion,
              suppliers: [],
              supplierId: null,
              currentPrice: 0,
              pricePerUnit: aiResult.suggestedPrice
            };
          }
        }
        return i;
      }));
    } catch (error) {
      console.error('[AI] Error fetching suppliers for substitution:', error);
      // Fallback to estimated pricing if API fails
      setIngredientsState(prev => prev.map(i => {
        if (i.id === aiResult.targetId) {
          return {
            ...i,
            name: aiResult.suggestion,
            suppliers: [],
            pricePerUnit: aiResult.suggestedPrice
          };
        }
        return i;
      }));
    }

    setAiTargetIngredient(null);
    setAiResult(null);
  };

  const canDelete = user && (parseInt(user.id) === parseInt(recipe.creator_id) || user.role === 'Administrator');

  const handleDeleteRecipe = async () => {
    try {
      const res = await fetch(`/api/recipes/${recipe.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        toast('Recipe deleted.', 'success');
        if (onDelete) onDelete(recipe.id);
        else onBack();
      } else {
        const data = await res.json();
        toast(data.message || 'Failed to delete recipe.', 'error');
      }
    } catch (err) {
      console.error('Delete recipe error:', err);
      toast('Failed to delete recipe.', 'error');
    }
  };

  const handleOpenMealListModal = async () => {
    if (!user) {
      toast('Please sign in to save recipes to meal lists', 'warning');
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
      toast('Failed to load meal lists', 'error');
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
        toast('Added to meal list!', 'success');
        setShowMealListModal(false);
        if (onRecipeAddedToList) onRecipeAddedToList();
      } else {
        const data = await res.json();
        toast(data.message || 'Failed to add recipe', 'error');
      }
    } catch (err) {
      console.error(err);
      toast('Error adding to meal list', 'error');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-8 pb-20">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 font-black text-[10px] uppercase tracking-widest">
          <ArrowLeft size={16} /> Back to discovery
        </button>
        {canDelete && (
          <button
            onClick={handleDeleteRecipe}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Trash2 size={14} /> Delete Recipe
          </button>
        )}
      </div>

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
              <button key={view} onClick={() => setActiveSubView(view)} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeSubView === view ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-400 dark:text-slate-400'}`}>
                {view}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8 min-h-[300px]">
            {activeSubView === 'ingredients' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest text-[10px]">Select what you need</h3>
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
                        <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest">{ing.taxonomy}</p>

                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      {/* AI Suggestion Button — shown when no valid supplier can fulfill */}
                      {user && (
                        <button
                          onClick={() => handleRequestAI(ing)}
                          className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-full transition-colors flex items-center justify-center shadow-sm"
                          title={`Ask AI to substitute ${ing.name}`}
                        >
                          <Sparkles size={16} />
                        </button>
                      )}

                      <div className="w-48 flex flex-col items-end gap-1">
                        <p className="font-black text-slate-900 dark:text-white">{(ing.baseQty * scaleFactor).toFixed(2)} {ing.unit}</p>
                        {user && (() => {
                          const required = ing.baseQty * scaleFactor;
                          // Only show suppliers that have compatible units AND enough stock
                          const validSuppliers = (ing.suppliers || []).filter(
                            s => s.convertedPrice != null &&
                                 canSupplierFulfill(s.available_qty || 0, s.unit || ing.unit, required, ing.unit)
                          );
                          if (validSuppliers.length === 0) {
                            return (
                              <div className="px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-[9px] font-black uppercase tracking-widest mt-1 text-center">
                                No supplier available
                              </div>
                            );
                          }
                          return (
                            <div className="mt-2 w-full flex flex-wrap justify-end gap-1.5">
                              {validSuppliers.map(sup => {
                                const supplierId = sup.inventory_id || sup.id;
                                if (!supplierId) return null;
                                const isSelected = (ing.selectedInventoryId || '').toString() === supplierId.toString();
                                // Total cost for this ingredient at current serving size
                                const totalCost = sup.convertedPrice * required;
                                return (
                                  <button
                                    key={supplierId}
                                    onClick={() => {
                                      setIngredientsState(prev =>
                                        prev.map(p =>
                                          p.id === ing.id
                                            ? { ...p, selectedInventoryId: supplierId.toString(), currentPrice: sup.convertedPrice }
                                            : p
                                        )
                                      );
                                    }}
                                    className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all border ${
                                      isSelected
                                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                                        : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-400 border-slate-100 dark:border-slate-700 hover:border-emerald-500/50 hover:text-emerald-500'
                                    }`}
                                    title={`$${sup.convertedPrice.toFixed(4)}/${ing.unit} (supplier sells in ${sup.unit})`}
                                  >
                                    {sup.location_name || sup.supplier_name || sup.name}
                                    {` • $${totalCost.toFixed(2)}`}
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                        {!user && (
                          <p className="text-[9px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Sign in to see prices</p>
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
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-400 ml-2">
                        {reviewRating > 0 ? `${reviewRating}/5` : 'Select rating'}
                      </span>
                    </div>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Share your experience with this recipe..."
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500 h-20 resize-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-400"
                    />
                    <button
                      onClick={() => handleSubmitReview()}
                      disabled={!reviewText.trim() || reviewRating === 0 || reviewSubmitting}
                      className={`mt-3 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all ${!reviewText.trim() || reviewRating === 0 ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20'}`}
                    >
                      {reviewSubmitting ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> : <Send size={14} />}
                      {reviewSubmitting ? 'Posting...' : 'Submit Review'}
                    </button>
                  </div>
                )}
                {!canReview && user && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl text-xs text-slate-400 dark:text-slate-400 font-bold text-center">
                    Only Home Cooks and Verified Chefs can post reviews.
                  </div>
                )}
                {!user && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl text-xs text-slate-400 dark:text-slate-400 font-bold text-center">
                    Sign in to leave a review.
                  </div>
                )}

                {/* Existing Reviews */}
                {nestedReviews.length === 0 ? (
                  <div className="py-12 text-center text-sm font-bold text-slate-300 dark:text-slate-500 uppercase tracking-widest">No reviews yet</div>
                ) : (
                  <div className="space-y-8">
                    {nestedReviews.map((rev) => renderReviewItem(rev))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ORDER CUSTOMIZATION SIDEBAR */}
        <div className="lg:w-96">
          <div className="sticky top-24 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-2xl p-8">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-8 text-center">Order Customization</h3>

            <div className="flex items-center justify-between mb-10">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase">Serving Size</span>
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-600">
                <button onClick={() => setServings(Math.max(1, servings - 1))} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><Minus size={16} /></button>
                <span className="text-xl font-black text-slate-900 dark:text-white w-8 text-center">{servings}</span>
                <button onClick={() => setServings(Math.min(12, servings + 1))} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><Plus size={16} /></button>
              </div>
            </div>

            <div className="space-y-3 mb-10">
              <div className="flex justify-between text-xs font-bold text-slate-400 dark:text-slate-400 uppercase">
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
              onClick={() => onAddToCart({ ...recipe, cartIngredients: ingredientsState.filter(i => i.selected), finalPrice: selectedTotal, base_servings: recipe.base_servings || 2 }, servings)}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${selectedTotal === 0 || missingIngredientsCount > 0 ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400 cursor-not-allowed' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 hover:bg-emerald-600 dark:hover:bg-emerald-600 active:scale-95'}`}
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
                  <p className="text-xs text-slate-400 dark:text-slate-400 font-bold uppercase">Target: {aiTargetIngredient.name}</p>
                </div>
              </div>
              <button onClick={() => setAiTargetIngredient(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-400"><X size={20} /></button>
            </div>

            {!aiResult ? (
              <div className="space-y-4">
                <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Why do you need a substitute?</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., 'I have a peanut allergy', 'It is out of stock', 'I want something cheaper'..."
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl p-4 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-indigo-400 h-24 resize-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-400"
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
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-400 line-through">{aiResult.original}</span>
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
                <p className="text-xs text-slate-400 dark:text-slate-400 font-bold uppercase mt-1">Recipe: {recipe.title}</p>
              </div>
              <button onClick={() => setShowMealListModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-400"><X size={20} /></button>
            </div>

            {userMealLists.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 dark:text-slate-400 text-sm font-medium mb-4">No meal lists yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-400 mb-6">Create your first meal list to save recipes</p>
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
                    <p className="text-xs text-slate-400 dark:text-slate-400">{list.recipe_count || 0} recipes</p>
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
