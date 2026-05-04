import React, { useState, useEffect } from 'react';
import { AuthView } from './components/Auth/AuthView';
import { Navbar } from './components/Navigation/Navbar';
import { ExploreView } from './components/Recipes/ExploreView';
import { RecipeDetailView } from './components/Recipes/RecipeDetailView';
import { CartView } from './components/Cart/CartView';
import { ChallengesView } from './components/Challenges/ChallengesView';
import { LeaderboardView } from './components/Leaderboard/LeaderboardView';
import { CreatorRoyaltyDashboardView } from './components/Dashboard/CreatorRoyaltyDashboardView';
import { SupplierInventoryView } from './components/Dashboard/SupplierInventoryView';
import { SupplierOrdersView } from './components/Dashboard/SupplierOrdersView';
import { MealListView } from './components/MealLists/MealListView';
import { RecipeCreateView } from './components/Recipes/RecipeCreateView';
import { ProfileView } from './components/Profile/ProfileView';
import { SupplierMarketplaceView } from './components/Marketplace/SupplierMarketplaceView';
import { ChallengeManagementView } from './components/Dashboard/ChallengeManagementView';
import { VerifiedChefApplicationPage } from './components/Dashboard/VerifiedChefApplicationPage';
import { AdminVerifiedChefApplicationsPage } from './components/Dashboard/AdminVerifiedChefApplicationsPage';
import { AdminDashboardPage } from './components/Dashboard/AdminDashboardPage';

// Authentication is handled server-side via POST /api/auth/login and POST /api/auth/register.
// Credentials are never stored in the frontend.

export default function App() {
  const [user, setUser] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user');
      if (savedUser) return JSON.parse(savedUser);
    }
    return null;
  });
  const [guest, setGuest] = useState(() => localStorage.getItem('guest') === 'true');
  const [currentTab, setCurrentTab] = useState('explore');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const cartKey = user ? `cart_${user.id}` : null;
  const [cart, setCart] = useState(() => {
    if (!user) return [];
    try {
      const saved = localStorage.getItem(`cart_${user.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [mealLists, setMealLists] = useState([]);
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

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.removeItem('guest');
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    if (guest) localStorage.setItem('guest', 'true');
    else localStorage.removeItem('guest');
  }, [guest]);

  useEffect(() => {
    if (user?.id) {
      fetchMealLists();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.role === 'Administrator' && !['admin-dashboard', 'admin-applications', 'auth'].includes(currentTab)) {
      setCurrentTab('admin-dashboard');
      setSelectedRecipe(null);
    }
  }, [user?.role, currentTab]);

  useEffect(() => {
    if (user?.id) {
      try {
        const saved = localStorage.getItem(`cart_${user.id}`);
        setCart(saved ? JSON.parse(saved) : []);
      } catch {
        setCart([]);
      }
    } else {
      setCart([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (cartKey) {
      localStorage.setItem(cartKey, JSON.stringify(cart));
    }
  }, [cart, cartKey]);

  const routeAfterLogin = (role) => {
    if (role === 'Administrator') return 'admin-dashboard';
    if (role === 'Local Supplier') return 'inventory';
    return 'explore';
  };

  const fetchMealLists = async () => {
    try {
      const res = await fetch(`/api/meallist?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setMealLists(data);
      }
    } catch (err) {
      console.error('Failed to fetch meal lists:', err);
    }
  };

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
    if (cartKey) localStorage.removeItem(cartKey);
    setCurrentTab('explore');
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setGuest(false);
    setCurrentTab(routeAfterLogin(userData.role));
  };

  const handleLogout = () => {
    if (cartKey) localStorage.removeItem(cartKey);
    setUser(null);
    setGuest(false);
    setCart([]);
    setCurrentTab('explore');
  };

  return (
    <div className={`min-h-screen bg-[#F8F9FA] dark:bg-slate-900 selection:bg-emerald-100 dark:selection:bg-emerald-900 font-sans text-slate-900 dark:text-white overflow-x-hidden ${darkMode ? 'dark' : ''}`}>
      {!user && !guest ? (
        <AuthView
          onLogin={handleLogin}
          onGuest={() => { setGuest(true); setCurrentTab('explore'); }}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      ) : (
        <>
          <Navbar
            user={user}
            activeTab={currentTab}
            setTab={(tab) => { setCurrentTab(tab); setSelectedRecipe(null); }}
            cartCount={cart.length}
            onLogout={handleLogout}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />

          <main className="max-w-7xl mx-auto px-6 py-4">
            {selectedRecipe ? (
              <RecipeDetailView recipe={selectedRecipe} onBack={() => setSelectedRecipe(null)} onAddToCart={handleAddToCart} user={user} onRecipeAddedToList={fetchMealLists} />
            ) : (
              <>
                {currentTab === 'auth' && <AuthView onLogin={handleLogin} onGuest={() => { setGuest(true); setCurrentTab('explore'); }} darkMode={darkMode} setDarkMode={setDarkMode} />}
                {currentTab === 'explore' && <ExploreView onSelectRecipe={setSelectedRecipe} />}
                {currentTab === 'marketplace' && <SupplierMarketplaceView user={user} onAddToCart={handleAddToCart} />}
                {currentTab === 'cart' && <CartView items={cart} onRemove={removeFromCart} onCheckoutComplete={handleCheckoutComplete} user={user} />}
                {currentTab === 'inventory' && user?.role === 'Local Supplier' && <SupplierInventoryView user={user} />}
                {currentTab === 'orders' && user?.role === 'Local Supplier' && <SupplierOrdersView user={user} />}

                {currentTab === 'challenges' && <ChallengesView user={user} />}
                {currentTab === 'leaderboards' && <LeaderboardView user={user} />}
                {currentTab === 'manage-challenges' && user?.role === 'Verified Chef' && <ChallengeManagementView user={user} />}
                {currentTab === 'my-meals' && <MealListView user={user} mealLists={mealLists} onRefresh={fetchMealLists} />}
                {currentTab === 'dashboard' && ['Home Cook', 'Verified Chef'].includes(user?.role) && <CreatorRoyaltyDashboardView user={user} />}
                {currentTab === 'create-recipe' && ['Verified Chef', 'Home Cook'].includes(user?.role) && <RecipeCreateView user={user} onCreated={() => setCurrentTab('explore')} />}
                {currentTab === 'verified-chef-application' && user?.role === 'Home Cook' && <VerifiedChefApplicationPage user={user} setUser={setUser} />}
                {currentTab === 'admin-dashboard' && user?.role === 'Administrator' && <AdminDashboardPage user={user} setTab={setCurrentTab} />}
                {currentTab === 'admin-applications' && user?.role === 'Administrator' && <AdminVerifiedChefApplicationsPage user={user} />}
                {currentTab === 'profile' && <ProfileView user={user} setUser={setUser} />}
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
        </>
      )}
    </div>
  );
}
