import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChefHat, Clock3, Plus, Sparkles, Trash2, UtensilsCrossed } from 'lucide-react';
import './RecipeCreateView.css';

const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];
const VISIBILITY_OPTIONS = ['public', 'private'];

// Helper to get allowed units for an ingredient
const getUnitOptionsForIngredient = (ingredient_id, allIngredients) => {
  if (!ingredient_id) return [];
  const ingredient = allIngredients.find(a => a.ingredient_id === parseInt(ingredient_id));
  if (!ingredient || !ingredient.allowed_units) return [];
  
  const units = ingredient.allowed_units.split(',');
  const unitLabels = {
    kg: 'kg (Kilogram)', g: 'g (Gram)', lb: 'lb (Pound)', oz: 'oz (Ounce)',
    L: 'L (Liter)', ml: 'ml (Milliliter)', cup: 'cup', tbsp: 'tbsp (Tablespoon)',
    tsp: 'tsp (Teaspoon)', pc: 'pc (Piece)', pcs: 'pcs (Pieces)', bunch: 'bunch',
    clove: 'clove', spear: 'spear', can: 'can', mg: 'mg (Milligram)'
  };
  
  return units.map(u => ({ value: u, label: unitLabels[u] || u }));
};

const emptyIngredient = { ingredient_id: '', qty: '', unit: '' };

export const RecipeCreateView = ({ user, onCreated }) => {
  const [title, setTitle] = useState('');
  const [preparationSteps, setPreparationSteps] = useState('');
  const [cookTime, setCookTime] = useState(30);
  const [difficulty, setDifficulty] = useState('Easy');
  const [dietary, setDietary] = useState('');
  const [servings, setServings] = useState(2);
  const [visibility, setVisibility] = useState('public');
  const [ingredients, setIngredients] = useState([{ ...emptyIngredient }]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/ingredients')
      .then(r => r.json())
      .then(data => setAllIngredients(data))
      .catch(() => setAllIngredients([]));
  }, []);

  const ingredientCount = useMemo(
    () => ingredients.filter(ing => ing.ingredient_id && String(ing.ingredient_id).trim()).length,
    [ingredients]
  );

  const canSubmit = title.trim() && cookTime > 0 && servings > 0;

  const resetForm = () => {
    setTitle('');
    setPreparationSteps('');
    setCookTime(30);
    setDifficulty('Easy');
    setDietary('');
    setServings(2);
    setVisibility('public');
    setIngredients([{ ...emptyIngredient }]);
    setMessage('');
  };

  const applyDemoRecipe = () => {
    setTitle('Charred Lemon Herb Chicken');
    setCookTime(45);
    setDifficulty('Medium');
    setDietary('High-Protein');
    setServings(4);
    setVisibility('public');
    setIngredients([
      { ingredient_id: allIngredients[0]?.ingredient_id || '', qty: '2', unit: 'cups' },
      { ingredient_id: allIngredients[1]?.ingredient_id || '', qty: '1', unit: 'tbsp' },
    ]);
    setMessage('Demo values loaded.');
  };

  const addIngredientRow = () => {
    setIngredients([...ingredients, { ...emptyIngredient }]);
  };
  const updateIngredient = (idx, field, value) => {
    const copy = [...ingredients];
    copy[idx][field] = value;
    setIngredients(copy);
  };
  const removeIngredient = (idx) => {
    const copy = [...ingredients];
    copy.splice(idx, 1);
    setIngredients(copy);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/ingredients/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const addSearchedIngredient = (ing) => {
    if (!allIngredients.find(a => a.ingredient_id === ing.ingredient_id)) {
      setAllIngredients(prev => [...prev, ing]);
    }
    const emptyIdx = ingredients.findIndex(i => !i.ingredient_id);
    if (emptyIdx !== -1) {
      const copy = [...ingredients];
      copy[emptyIdx].ingredient_id = ing.ingredient_id;
      setIngredients(copy);
    } else {
      setIngredients([...ingredients, { ingredient_id: ing.ingredient_id, qty: '', unit: '' }]);
    }
    setSearchResults([]);
    setSearchQuery('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const body = {
        creator_id: user.id,
        title,
        preparation_steps: preparationSteps || null,
        cook_time_min: cookTime,
        difficulty_level: difficulty,
        dietary_tag: dietary,
        base_servings: servings,
        visibility,
        ingredients: ingredients.filter(i => i.ingredient_id).map(i => ({ 
          ingredient_id: String(i.ingredient_id).startsWith('external-') ? i.ingredient_id : Number(i.ingredient_id), 
          name: allIngredients.find(a => String(a.ingredient_id) === String(i.ingredient_id))?.name,
          qty: Number(i.qty), 
          unit: i.unit 
        }))
      };
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to create recipe');
      }
      const data = await res.json();
      setMessage('Recipe created successfully!');
      if (onCreated) onCreated(data);
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recipe-create-page">
      <div className="recipe-hero mb-8">
        <div className="recipe-hero-grid">
          <div className="recipe-hero-copy">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em] mb-5 ring-1 ring-white/10">
                <ChefHat size={12} /> Recipe Studio
              </div>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-none max-w-xl">
                Design a recipe page that feels premium.
              </h2>
              <p className="mt-4 text-sm md:text-base text-slate-300 max-w-2xl leading-7">
                Home Cooks and Verified Chefs can create a refined recipe card with a bold visual header, structured metadata, and ingredient rows that are easy to scan.
              </p>
              <div className="recipe-pill-row">
                {['Fast setup', 'Polished UI', 'Live preview'].map((label) => (
                  <span key={label} className="recipe-pill">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="recipe-hero-stats">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] font-black text-slate-400">Signed in as</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-400">{user?.role}</p>
              </div>
            </div>
            <div className="recipe-stat-grid">
              <div className="recipe-stat">
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">Time</p>
                <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{cookTime}</p>
              </div>
              <div className="recipe-stat">
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">Servings</p>
                <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{servings}</p>
              </div>
              <div className="recipe-stat">
                <p className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400">Ingredients</p>
                <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{ingredientCount}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={applyDemoRecipe}
              className="recipe-demo-button w-full inline-flex items-center justify-center gap-2"
            >
              <Sparkles size={16} /> Load demo recipe
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_0.95fr] gap-8 items-start">
        <form onSubmit={submit} className="space-y-6">
          <section className="recipe-section p-6 md:p-8">
            <div className="recipe-section-head">
              <div className="recipe-section-icon">
                <UtensilsCrossed size={18} />
              </div>
              <div>
                <h3 className="recipe-section-title">Recipe details</h3>
                <p className="recipe-section-subtitle">Keep the title short and descriptive.</p>
              </div>
            </div>

            <div className="recipe-field-grid">
              <div>
                <label className="recipe-label">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Creamy mushroom risotto"
                  className="recipe-field"
                />
              </div>

              <div>
                <label className="recipe-label">Preparation Steps</label>
                <textarea
                  value={preparationSteps}
                  onChange={(e) => setPreparationSteps(e.target.value)}
                  placeholder={"Step 1: Preheat oven to 180°C\nStep 2: Mix ingredients\nStep 3: Bake for 30 minutes"}
                  className="recipe-field resize-none"
                  rows={5}
                />
                <p className="text-[10px] text-slate-400 mt-1">Each line will appear as a separate step.</p>
              </div>

              <div className="recipe-field-grid recipe-field-grid--three">
                <div>
                  <label className="recipe-label flex items-center gap-1"><Clock3 size={12} /> Cook Time</label>
                  <input
                    type="number"
                    min="1"
                    value={cookTime}
                    onChange={(e) => setCookTime(Number(e.target.value))}
                    className="recipe-field"
                  />
                </div>
                <div>
                  <label className="recipe-label">Difficulty</label>
                  <div className="recipe-choice-group recipe-choice-group--three">
                    {DIFFICULTY_LEVELS.map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDifficulty(level)}
                        className={`recipe-choice ${difficulty === level ? 'is-active' : ''}`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="recipe-label">Servings</label>
                  <div className="mt-2 flex items-center rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(203, 213, 225, 0.95)', background: 'rgba(248, 250, 252, 0.95)' }}>
                    <button type="button" onClick={() => setServings(Math.max(1, servings - 1))} className="px-4 py-3 text-slate-500 hover:bg-white dark:hover:bg-slate-800">−</button>
                    <input
                      type="number"
                      min="1"
                      value={servings}
                      onChange={(e) => setServings(Number(e.target.value))}
                      className="w-full bg-transparent px-2 py-3 text-center text-sm text-slate-900 dark:text-white outline-none"
                    />
                    <button type="button" onClick={() => setServings(servings + 1)} className="px-4 py-3 text-slate-500 hover:bg-white dark:hover:bg-slate-800">+</button>
                  </div>
                </div>
              </div>

              <div className="recipe-field-grid recipe-field-grid--two">
                <div>
                  <label className="recipe-label">Dietary Tag</label>
                  <input
                    value={dietary}
                    onChange={(e) => setDietary(e.target.value)}
                    placeholder="e.g. Vegan, Keto, Gluten-Free"
                    className="recipe-field"
                  />
                </div>
                <div>
                  <label className="recipe-label">Visibility</label>
                  <div className="recipe-choice-group recipe-choice-group--two">
                    {VISIBILITY_OPTIONS.map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setVisibility(option)}
                        className={`recipe-choice ${visibility === option ? 'is-active' : ''}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="recipe-section p-6 md:p-8">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="recipe-section-title">Ingredients</h3>
                <p className="recipe-section-subtitle">Add each ingredient, quantity, and unit.</p>
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {ingredientCount} selected
              </div>
            </div>

            <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
              <label className="recipe-label">Search USDA Database for Ingredients</label>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                  placeholder="e.g. Tomato, raw"
                  className="recipe-field flex-1"
                />
                <button type="button" onClick={handleSearch} disabled={isSearching} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-2 rounded-xl transition-all whitespace-nowrap text-sm">
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
              {searchResults.length > 0 && (
                <div className="mt-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  {searchResults.map(res => (
                    <div
                      key={res.ingredient_id}
                      onClick={() => addSearchedIngredient(res)}
                      className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex justify-between items-center text-sm text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      <span className="truncate pr-4">{res.name}</span>
                      <Plus size={16} className="text-emerald-500 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="recipe-ingredients">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="recipe-ingredient-row">
                  <select
                    value={ing.ingredient_id}
                    onChange={(e) => updateIngredient(idx, 'ingredient_id', e.target.value)}
                    className="recipe-field"
                  >
                    <option value="">Select ingredient</option>
                    {allIngredients.map(a => <option key={a.ingredient_id} value={a.ingredient_id}>{a.name}</option>)}
                  </select>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ing.qty}
                    onChange={(e) => updateIngredient(idx, 'qty', e.target.value)}
                    placeholder="Qty"
                    className="recipe-field"
                  />
                  <select
                    value={ing.unit}
                    onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                    className="recipe-field"
                    disabled={!ing.ingredient_id}
                  >
                    <option value="">Select unit</option>
                    {getUnitOptionsForIngredient(ing.ingredient_id, allIngredients).map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    disabled={ingredients.length === 1}
                    className="recipe-ingredient-remove inline-flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={16} />
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={addIngredientRow} className="recipe-primary-button inline-flex items-center gap-2">
                <Plus size={16} /> Add ingredient
              </button>
              <p className="text-xs text-slate-400 dark:text-slate-500">Tip: keep ingredient names consistent with your inventory list.</p>
            </div>
          </section>

          <section className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="recipe-primary-button inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating…' : 'Create recipe'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="recipe-ghost-button inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} /> Reset form
            </button>
            {message && (
              <div className="recipe-status inline-flex items-center gap-2">
                <CheckCircle2 size={16} /> {message}
              </div>
            )}
          </section>
        </form>

        <aside className="sticky top-24 space-y-4 lg:pt-0 pt-2">
          <div className="recipe-preview">
            <div className="recipe-preview-header">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live preview</p>
              <span className="recipe-preview-badge">
                Live
              </span>
            </div>
            <div className="recipe-preview-card">
              <div className="recipe-preview-hero">
                <div className="recipe-preview-hero-content">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Recipe card</p>
                  <h3 className="recipe-preview-title">{title || 'Your recipe title'}</h3>
                </div>
              </div>
              <div className="recipe-preview-body">
                <div className="recipe-preview-mini-grid text-center">
                  <div className="recipe-preview-mini">
                    <p className="text-[10px] uppercase font-black tracking-[0.18em] text-slate-400">Time</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{cookTime} min</p>
                  </div>
                  <div className="recipe-preview-mini">
                    <p className="text-[10px] uppercase font-black tracking-[0.18em] text-slate-400">Servings</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{servings}</p>
                  </div>
                  <div className="recipe-preview-mini">
                    <p className="text-[10px] uppercase font-black tracking-[0.18em] text-slate-400">Difficulty</p>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">{difficulty}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-[0.18em] text-slate-400">Dietary tag</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">{dietary || 'No tag yet'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-[0.18em] text-slate-400">Visibility</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300 capitalize">{visibility}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-[0.18em] text-slate-400">Ingredients</p>
                    <ul className="recipe-preview-list mt-2">
                      {ingredients.filter(ing => ing.ingredient_id).length > 0 ? (
                        ingredients.filter(ing => ing.ingredient_id).map((ing, idx) => {
                          const ingredientName = allIngredients.find(a => String(a.ingredient_id) === String(ing.ingredient_id))?.name || 'Ingredient';
                          return (
                            <li key={idx} className="recipe-preview-item">
                              <span className="font-medium text-slate-700 dark:text-slate-200">{ingredientName}</span>
                              <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase">{ing.qty || '—'} {ing.unit || ''}</span>
                            </li>
                          );
                        })
                      ) : (
                        <li className="text-sm text-slate-400 dark:text-slate-500 italic">Add ingredients to preview them here.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="recipe-tip">
              <p className="recipe-tip-title">Publishing tip</p>
              <p className="recipe-tip-copy">
              Use a concise title, enter realistic prep time, and keep units consistent so your recipe is easy to scan on mobile.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
