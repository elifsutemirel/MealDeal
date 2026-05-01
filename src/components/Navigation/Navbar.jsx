import React from 'react';
import { ShoppingBasket, Users, Moon, Sun } from 'lucide-react';
import { LogOut } from '../Common/LogOut';

export const Navbar = ({ user, activeTab, setTab, cartCount, onLogout, darkMode, setDarkMode }) => (
  <nav className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-6 h-16 flex items-center justify-between">
    <div className="flex items-center gap-8">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setTab('explore')}>
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">M</div>
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white hidden sm:block">mealDeal</span>
      </div>
      <div className="hidden md:flex items-center gap-6">
        {(!user || user.role !== 'Local Supplier') && ['explore', 'challenges', 'leaderboards', 'my-meals'].map((tab) => (
        {['explore', 'marketplace', 'challenges', 'leaderboards', 'my-meals'].map((tab) => (
          <button key={tab} onClick={() => setTab(tab)} className={`text-sm font-bold capitalize transition-all ${activeTab === tab ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
            {tab.replace('-', ' ')}
          </button>
        ))}
        {user && ['Home Cook', 'Verified Chef'].includes(user.role) && (
          <button onClick={() => setTab('dashboard')} className={`text-sm font-bold capitalize transition-all ${activeTab === 'dashboard' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
            Royalties
          </button>
        )}
        {user && user.role === 'Local Supplier' && (
          <button onClick={() => setTab('inventory')} className={`text-sm font-bold capitalize transition-all ${activeTab === 'inventory' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
            Inventory
          </button>
        )}
        {user && (user.role === 'Verified Chef' || user.role === 'Home Cook') && (
          <button onClick={() => setTab('create-recipe')} className={`text-sm font-bold capitalize transition-all ${activeTab === 'create-recipe' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
            Create Recipe
          </button>
        )}
      </div>
    </div>
    <div className="flex items-center gap-4">
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        title="Toggle dark mode"
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
      {user ? (
        <>
          <div 
            onClick={() => setTab('profile')} 
            className="text-right hidden lg:block mr-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">{user.username || user.name}</p>
            <p className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest">{user.role}</p>
          </div>
          <button onClick={() => setTab('profile')} className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors" title="My Profile">
            <Users size={20} />
          </button>
          {user.role !== 'Local Supplier' && (
            <button onClick={() => setTab('cart')} className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors">
              <ShoppingBasket size={20} />
              {cartCount > 0 && <span className="absolute top-1 right-1 bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cartCount}</span>}
            </button>
          )}
          <button onClick={onLogout} className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
            <LogOut size={18} />
          </button>
        </>
      ) : (
        <>
          <button onClick={() => setTab('cart')} className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ShoppingBasket size={20} />
            {cartCount > 0 && <span className="absolute top-1 right-1 bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cartCount}</span>}
          </button>
          <button onClick={() => setTab('auth')} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-full text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
            <Users size={16} /> Sign In
          </button>
        </>
      )}
    </div>
  </nav>
);
