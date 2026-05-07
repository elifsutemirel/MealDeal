import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const AuthView = ({ onLogin, onGuest, darkMode, setDarkMode }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('home_cook');
  const [address, setAddress] = useState('');
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    if (!isLogin && (!username || !email || !password)) {
      setError('Please fill in all fields.');
      return;
    }
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!isLogin && username.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Invalid email or password.');
        onLogin({ id: data.user_id, name: data.username, username: data.username, role: data.role, email: data.email });
      } else {
        if (role === 'local_supplier' && (!address || !locationName)) {
          setError('Address and location name are required for Local Supplier accounts.');
          setLoading(false);
          return;
        }
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password, role, address, locationName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message + (data.detail ? ': ' + data.detail : '') || 'Registration failed.');
        onLogin({ id: data.user_id, name: data.username, username: data.username, role: data.role, email: data.email });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <style>{`
        @keyframes floatA { 0%,100%{transform:translateY(0) rotate(0deg);opacity:.18} 50%{transform:translateY(-28px) rotate(8deg);opacity:.32} }
        @keyframes floatB { 0%,100%{transform:translateY(0) rotate(0deg);opacity:.14} 50%{transform:translateY(-20px) rotate(-6deg);opacity:.26} }
        @keyframes floatC { 0%,100%{transform:translateY(0) rotate(0deg);opacity:.10} 50%{transform:translateY(-36px) rotate(12deg);opacity:.22} }
        @keyframes blobPulse { 0%,100%{transform:scale(1);opacity:.55} 50%{transform:scale(1.08);opacity:.75} }
        @keyframes blobPulse2 { 0%,100%{transform:scale(1);opacity:.40} 50%{transform:scale(1.12);opacity:.60} }
        .blob1{animation:blobPulse 8s ease-in-out infinite;}
        .blob2{animation:blobPulse2 11s ease-in-out infinite;}
        .blob3{animation:blobPulse 13s 2s ease-in-out infinite;}
        .food-icon{user-select:none;pointer-events:none;position:absolute;font-size:1.9rem;filter:drop-shadow(0 0 8px rgba(16,185,129,.25));}
        .fi-1{animation:floatA 7s 0s ease-in-out infinite;}
        .fi-2{animation:floatB 9s 1.5s ease-in-out infinite;}
        .fi-3{animation:floatC 8s 0.8s ease-in-out infinite;}
        .fi-4{animation:floatA 10s 2.2s ease-in-out infinite;}
        .fi-5{animation:floatB 7.5s 3s ease-in-out infinite;}
        .fi-6{animation:floatC 9.5s 0.4s ease-in-out infinite;}
        .fi-7{animation:floatA 8.5s 1.8s ease-in-out infinite;}
        .fi-8{animation:floatB 11s 2.8s ease-in-out infinite;}
        .fi-9{animation:floatC 6.8s 0.2s ease-in-out infinite;}
        .fi-10{animation:floatA 10.5s 3.5s ease-in-out infinite;}
      `}</style>

      <div className="blob1 absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-emerald-500 opacity-[0.07] blur-[100px] pointer-events-none" />
      <div className="blob2 absolute -bottom-40 -right-40 w-[560px] h-[560px] rounded-full bg-teal-400 opacity-[0.07] blur-[120px] pointer-events-none" />
      <div className="blob3 absolute top-1/2 -translate-y-1/2 right-[10%] w-[320px] h-[320px] rounded-full bg-emerald-600 opacity-[0.05] blur-[90px] pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      <span className="food-icon fi-1" style={{ top: '8%', left: '5%' }}>🍅</span>
      <span className="food-icon fi-2" style={{ top: '15%', left: '88%' }}>🥑</span>
      <span className="food-icon fi-3" style={{ top: '72%', left: '7%' }}>🌿</span>
      <span className="food-icon fi-4" style={{ top: '82%', left: '90%' }}>🍋</span>
      <span className="food-icon fi-5" style={{ top: '45%', left: '3%' }}>🫒</span>
      <span className="food-icon fi-6" style={{ top: '30%', left: '93%' }}>🧅</span>
      <span className="food-icon fi-7" style={{ top: '60%', left: '92%' }}>🌶️</span>
      <span className="food-icon fi-8" style={{ top: '55%', left: '4%' }}>🧄</span>
      <span className="food-icon fi-9" style={{ top: '22%', left: '14%' }}>🫑</span>
      <span className="food-icon fi-10" style={{ top: '88%', left: '50%' }}>🍄</span>

      <div className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-lg">M</div>
          <span className="text-xl font-black tracking-tight text-white">mealDeal</span>
        </div>
        {setDarkMode && (
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
            <div className="h-1 bg-emerald-500 w-full" />
            <div className="p-8">
              <h2 className="text-2xl font-black text-white text-center mb-1">
                {isLogin ? 'Welcome Back' : 'Create an Account'}
              </h2>
              <p className="text-sm text-slate-400 text-center mb-7 font-medium">
                {isLogin ? 'Log in to manage your meals and orders.' : 'Choose your role to get started.'}
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-xl text-xs font-bold text-red-400">
                  {error}
                </div>
              )}
              {infoMsg && (
                <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-700/50 rounded-xl text-xs font-bold text-emerald-400">
                  {infoMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Username</label>
                      <input
                        required
                        type="text"
                        placeholder="yourname"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Role</label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setRole('home_cook')}
                          className={`flex-1 py-3 rounded-2xl border font-bold text-sm transition-all ${
                            role === 'home_cook'
                              ? 'bg-emerald-900/30 border-emerald-600 text-emerald-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          Home Cook
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('local_supplier')}
                          className={`flex-1 py-3 rounded-2xl border font-bold text-sm transition-all ${
                            role === 'local_supplier'
                              ? 'bg-emerald-900/30 border-emerald-600 text-emerald-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          Local Supplier
                        </button>
                      </div>
                    </div>
                    {role === 'local_supplier' && (
                      <>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Business Address</label>
                          <input
                            required
                            type="text"
                            placeholder="123 Market St"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Location Name</label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Ankara Bazaar"
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block tracking-widest">Email Address</label>
                  <input
                    required
                    type="email"
                    placeholder="user@bilkent.edu.tr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 block tracking-widest">Password</label>
                  </div>
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs mt-2 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Register Account'}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              {onGuest && (
                <button
                  onClick={onGuest}
                  className="w-full py-3 rounded-2xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 font-bold text-sm transition-all"
                >
                  Continue as Guest
                </button>
              )}

              <p className="text-center text-xs font-bold text-slate-500 mt-6">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => { setIsLogin(!isLogin); setError(''); setInfoMsg(''); setEmail(''); setPassword(''); setUsername(''); setRole('home_cook'); setAddress(''); setLocationName(''); }}
                  className="text-emerald-500 hover:underline"
                >
                  {isLogin ? 'Register' : 'Log In'}
                </button>
              </p>
            </div>
          </div>

          {onGuest && (
            <p className="text-center text-[11px] text-slate-600 mt-5 font-medium">
              Guests can browse recipes, challenges and the leaderboard.<br />
              <span className="text-slate-500">Sign in to shop, cook and compete.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
