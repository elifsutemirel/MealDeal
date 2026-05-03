import React, { useState, useEffect } from 'react';
import { Trash2, Plus, X, ChefHat, Loader2 } from 'lucide-react';

export const MealListView = ({ user, mealLists, onRefresh }) => {
  const [selectedList, setSelectedList] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [listRecipes, setListRecipes] = useState([]);
  const [recipesLoading, setRecipesLoading] = useState(false);

  useEffect(() => {
    if (!selectedList) {
      setListRecipes([]);
      return;
    }
    setRecipesLoading(true);
    fetch(`/api/meallist/${selectedList}/recipes`)
      .then(res => res.json())
      .then(data => setListRecipes(Array.isArray(data) ? data : []))
      .catch(err => { console.error(err); setListRecipes([]); })
      .finally(() => setRecipesLoading(false));
  }, [selectedList]);

  const handleCreateMealList = async () => {
    if (!newListName.trim()) {
      alert('Please enter a meal list name');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/meallist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          name: newListName,
          description: newListDesc
        })
      });
      if (res.ok) {
        setNewListName('');
        setNewListDesc('');
        setShowCreateForm(false);
        await onRefresh();
      }
    } catch (err) {
      console.error('Error creating meal list:', err);
      alert('Failed to create meal list');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMealList = async (listId) => {
    if (!window.confirm('Delete this meal list?')) return;
    try {
      const res = await fetch(`/api/meallist/${listId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedList(null);
        await onRefresh();
      }
    } catch (err) {
      console.error('Error deleting meal list:', err);
      alert('Failed to delete meal list');
    }
  };

  const handleRemoveRecipe = async (listId, recipeId) => {
    try {
      const res = await fetch(`/api/meallist/${listId}/recipe/${recipeId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await onRefresh();
      }
    } catch (err) {
      console.error('Error removing recipe:', err);
      alert('Failed to remove recipe');
    }
  };

  if (!user) {
    return (
      <div className="py-24 text-center">
        <ChefHat size={48} className="mx-auto mb-6 text-slate-300 dark:text-slate-600" />
        <h2 className="text-lg font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
          Sign In to Save Meals
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-6">
          Create and organize your favorite recipes into custom meal lists.
        </p>
        <button 
          onClick={() => window.location.href = '#'} 
          className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-xs hover:bg-emerald-600 transition-colors"
        >
          Sign In / Register
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 py-8">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">My <span className="text-emerald-500 italic">Meal Lists</span></h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Organize and save your favorite recipes.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Meal Lists Sidebar */}
        <div className="lg:w-80">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm p-8 space-y-4">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={16} /> New Meal List
            </button>

            {showCreateForm && (
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-700 rounded-2xl border border-slate-100 dark:border-slate-600">
                <input
                  type="text"
                  placeholder="List name..."
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500"
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 resize-none h-20"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateMealList}
                    disabled={loading}
                    className="flex-1 bg-slate-900 dark:bg-slate-700 text-white py-2 rounded-xl text-xs font-bold uppercase hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 rounded-xl text-xs font-bold uppercase hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {mealLists.length === 0 ? (
                <p className="text-center text-slate-400 dark:text-slate-500 text-xs font-medium py-6">No meal lists yet</p>
              ) : (
                mealLists.map(list => (
                  <button
                    key={list.meal_list_id}
                    onClick={() => setSelectedList(list.meal_list_id)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                      selectedList === list.meal_list_id
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 border-2 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                        : 'bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                    }`}
                  >
                    <p className="font-bold text-sm">{list.name}</p>
                    <p className="text-[10px] opacity-70">{list.recipe_count || 0} recipes</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Meal List Details */}
        <div className="flex-1">
          {selectedList ? (
            (() => {
              const list = mealLists.find(l => l.meal_list_id === selectedList);

              return (
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white">{list?.name}</h2>
                      {list?.description && (
                        <p className="text-slate-500 dark:text-slate-400 mt-2">{list.description}</p>
                      )}
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-4 uppercase tracking-widest">
                        {list?.recipe_count || 0} recipes
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteMealList(selectedList)}
                      className="p-3 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>

                  {recipesLoading ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                      <Loader2 size={24} className="animate-spin text-emerald-500" />
                      <span className="text-xs font-black uppercase tracking-widest">Loading recipes...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {listRecipes.length === 0 ? (
                        <div className="col-span-full py-12 text-center bg-slate-50 dark:bg-slate-800 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                          <ChefHat size={40} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                          <p className="text-slate-400 dark:text-slate-500 font-medium">No recipes in this list yet</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Add recipes from the Explore tab</p>
                        </div>
                      ) : (
                        listRecipes.map(recipe => (
                          <div key={recipe.recipe_id} className="bg-white dark:bg-slate-800 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all">
                            <div className="p-6">
                              <h3 className="font-bold text-slate-900 dark:text-white mb-1">{recipe.title}</h3>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-1">
                                {recipe.cook_time_min} min • {recipe.difficulty_level}
                              </p>
                              {recipe.dietary_tag && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mb-4">{recipe.dietary_tag}</p>
                              )}
                              <button
                                onClick={() => handleRemoveRecipe(selectedList, recipe.recipe_id)}
                                className="w-full py-2 text-xs font-bold uppercase tracking-widest text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors flex items-center justify-center gap-2"
                              >
                                <X size={14} /> Remove
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="py-24 text-center bg-slate-50 dark:bg-slate-800 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
              <ChefHat size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-400 dark:text-slate-500 font-medium">Select a meal list to view recipes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
