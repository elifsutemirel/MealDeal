import React, { useState, useEffect } from 'react';
import { ListPlus } from 'lucide-react';
import { AuthView } from './components/Auth/AuthView';
import { Navbar } from './components/Navigation/Navbar';
import { ExploreView } from './components/Recipes/ExploreView';
import { RecipeDetailView } from './components/Recipes/RecipeDetailView';
import { CartView } from './components/Cart/CartView';
import { ChallengesView } from './components/Challenges/ChallengesView';
import { ChefAnalyticsView } from './components/Dashboard/ChefAnalyticsView';
import { SupplierInventoryView } from './components/Dashboard/SupplierInventoryView';

// Authentication is handled server-side via POST /api/auth/login and POST /api/auth/register.
// Credentials are never stored in the frontend.

// --- Main App Setup ---
export default function App() {
  const [user, setUser] = useState(null); // Auth State
  const [currentTab, setCurrentTab] = useState('explore');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [cart, setCart] = useState([]);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleAddToCart = (recipe, servings) => {
    setCart([...cart, { recipe, servings }]);
    setCurrentTab('cart');
    setSelectedRecipe(null);
  };

  const removeFromCart = (index) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const handleCheckoutComplete = () => {
    setCart([]);
    setCurrentTab('explore');
  };

  return (
    <div className={`min-h-screen bg-[#F8F9FA] dark:bg-slate-900 selection:bg-emerald-100 dark:selection:bg-emerald-900 font-sans text-slate-900 dark:text-white overflow-x-hidden ${darkMode ? 'dark' : ''}`}>
      <Navbar
        user={user}
        activeTab={currentTab}
        setTab={(tab) => { setCurrentTab(tab); setSelectedRecipe(null); }}
        cartCount={cart.length}
        onLogout={() => { setUser(null); setCurrentTab('explore'); }}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <main className="max-w-7xl mx-auto px-6 py-4">
        {selectedRecipe ? (
          <RecipeDetailView recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} onAddToCart={handleAddToCart} />
        ) : (
          <>
            {currentTab === 'auth' && <AuthView onLogin={(userData) => { setUser(userData); setCurrentTab('explore'); }} />}
            {currentTab === 'explore' && <ExploreView onSelectRecipe={setSelectedRecipe} />}
            {currentTab === 'cart' && <CartView items={cart} onRemove={removeFromCart} onCheckoutComplete={handleCheckoutComplete} />}
            {currentTab === 'inventory' && user?.role === 'Local Supplier' && <SupplierInventoryView user={user} />}

            {currentTab === 'challenges' && <ChallengesView />}
            {currentTab === 'my-meals' && (
              <div className="py-24 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-600"><ListPlus size={32} /></div>
                <h2 className="text-lg font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">My Meal Lists</h2>
                {user ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2">Organize your favorite recipes here.</p>
                ) : (
                  <div className="mt-4">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mb-4">You must be logged in to save meal lists.</p>
                    <button onClick={() => setCurrentTab('auth')} className="bg-slate-900 dark:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors">Sign In / Register</button>
                  </div>
                )}
              </div>
            )}
            {currentTab === 'dashboard' && user?.role === 'Verified Chef' && <ChefAnalyticsView user={user} />}
          </>
        )}
      </main>

      <footer className="mt-24 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center opacity-40 grayscale text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">
          <span>©️ 2026 MealDeal Platform</span>
          <span>Bilkent CS 353 Database Systems</span>
          <span>{user ? `Logged in as: ${user.role}` : 'Browsing as Guest'}</span>
        </div>
      </footer>
    </div>
  );
}
