import React, { useState, useMemo, useEffect } from 'react';
import { Search, X, Clock, Star, Filter, Loader2 } from 'lucide-react';
import { RECIPES } from '../../data/recipes';

export const ExploreView = ({ onSelectRecipe }) => {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState('All');
  const [maxTime, setMaxTime] = useState(60);
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    fetch('/api/recipes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setRecipes(data);
        } else {
          // Fallback to mock data if the DB is empty (e.g., after a fresh docker compose down -v)
          setRecipes(RECIPES);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch recipes:", err);
        setLoading(false);
      });
  }, []);

  // Effective Filtering Logic
  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = recipe.title.toLowerCase().includes(searchLower) ||
        recipe.ingredients.some(i => i.name.toLowerCase().includes(searchLower)) ||
        recipe.chef.toLowerCase().includes(searchLower);
      const matchesDiet = dietFilter === 'All' || recipe.category === dietFilter;
      const matchesTime = recipe.time <= maxTime;
      const matchesRating = recipe.rating >= minRating;
      return matchesSearch && matchesDiet && matchesTime && matchesRating;
    });
  }, [searchQuery, dietFilter, maxTime, minRating]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-6">Discovery <span className="text-emerald-500 italic">Marketplace</span></h1>

        {/* Search & Advanced Filters */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm mb-8 space-y-6">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700 px-5 py-4 rounded-2xl w-full border border-slate-200 dark:border-slate-600 focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-slate-600 transition-all">
            <Search size={20} className="text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search recipes, ingredients, or chefs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"><X size={16} /></button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-6 px-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Diet:</span>
              <div className="flex bg-slate-50 dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600">
                {['All', 'Vegan', 'Keto', 'Gluten-Free'].map(diet => (
                  <button
                    key={diet}
                    onClick={() => setDietFilter(diet)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dietFilter === diet ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    {diet}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Max Time:</span>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600">
                <input type="range" min="10" max="60" step="5" value={maxTime} onChange={(e) => setMaxTime(Number(e.target.value))} className="w-24 accent-emerald-500" />
                <span className="text-xs font-bold w-12 text-slate-700 dark:text-slate-300">{maxTime} min</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Min Rating:</span>
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600 px-2">
                {[0, 3, 4, 4.5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setMinRating(rating)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${minRating === rating ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'}`}
                  >
                    {rating === 0 ? 'Any' : <><Star size={12} fill="currentColor" /> {rating}+</>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 size={32} className="animate-spin text-emerald-500 mb-4" />
          <p className="font-bold uppercase tracking-widest text-xs">Loading Recipes...</p>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="py-20 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[3rem]">
          No recipes found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {filteredRecipes.map(recipe => (
            <div key={recipe.id} onClick={() => onSelectRecipe(recipe)} className="bg-white dark:bg-slate-800 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all cursor-pointer group">
              <div className="relative h-52 overflow-hidden">
                <img src={recipe.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-slate-800 dark:text-white tracking-widest">{recipe.category}</div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{recipe.title}</h3>
                  <div className="flex items-center gap-1 text-amber-500 shrink-0">
                    <Star size={12} fill="currentColor" />
                    <span className="text-xs font-bold">{recipe.rating}</span>
                  </div>
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs mb-4 font-medium italic">by {recipe.chef}</p>
                <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Clock size={12} /> {recipe.time}M</span>
                  <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{recipe.difficulty}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
