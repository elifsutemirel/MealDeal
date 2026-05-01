import React, { useState, useMemo } from 'react';
import { ArrowLeft, Sparkles, Leaf, ChefHat, Clock, X, ArrowRight, Plus, Minus, ShoppingBasket, ListPlus } from 'lucide-react';
import { fetchGeminiWithBackoff } from '../../utils/geminiApi';

export const RecipeDetailView = ({ recipe, onBack, onAddToCart, user, onRecipeAddedToList }) => {
  const [servings, setServings] = useState(2);
  const [activeSubView, setActiveSubView] = useState('ingredients');
  const [ingredientsState, setIngredientsState] = useState(recipe.ingredients.map(i => ({ ...i, selected: true })));

  // AI substitution state
  const [aiTargetIngredient, setAiTargetIngredient] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Meal List state
  const [userMealLists, setUserMealLists] = useState([]);
  const [showMealListModal, setShowMealListModal] = useState(false);
  const [mealListLoading, setMealListLoading] = useState(false);

  // Recalculate quantities and price based on servings and selection
  const scaleFactor = servings / 2;

  const selectedTotal = useMemo(() => {
    return ingredientsState
      .filter(i => i.selected)
      .reduce((total, i) => total + (i.pricePerUnit * (i.baseQty * scaleFactor)), 0);
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
          status: 'available',
          pricePerUnit: aiResult.suggestedPrice / i.baseQty // Estimate new unit price
        };
      }
      return i;
    }));
    setAiTargetIngredient(null);
    setAiResult(null);
  };

  const missingIngredientsCount = ingredientsState.filter(i => i.status === 'missing').length;

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
                      {user && ing.status === 'missing' && (
                        <button
                          onClick={() => handleRequestAI(ing)}
                          className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-full transition-colors flex items-center justify-center shadow-sm"
                          title={`Ask AI to substitute ${ing.name}`}
                        >
                          <Sparkles size={16} />
                        </button>
                      )}

                      <div className="w-28 flex flex-col items-end gap-1">
                        <p className="font-black text-slate-900 dark:text-white">{(ing.baseQty * scaleFactor).toFixed(1)} {ing.unit}</p>
                        {user && (
                          <div 
                            className={`w-full px-2 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${ing.status === 'available' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-200 dark:border-emerald-800' : ing.status === 'missing' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-800' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 border-orange-200 dark:border-orange-800'}`}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full ${ing.status === 'available' ? 'bg-emerald-500' : ing.status === 'missing' ? 'bg-red-500' : 'bg-orange-500'}`} /> {ing.status}
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
                {recipe.reviews.map((rev, idx) => (
                  <div key={idx} className="p-6 bg-slate-50 dark:bg-slate-700 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-800 dark:text-white text-sm">{rev.user}</span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">"{rev.comment}"</p>
                  </div>
                ))}
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
