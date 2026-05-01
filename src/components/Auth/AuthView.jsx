import React, { useState } from 'react';
import { Users } from 'lucide-react';

export const AuthView = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('Home Cook');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [address, setAddress] = useState('');
  const [locationName, setLocationName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    
    // Validations
    if (!isLogin && (!username || !email || !password)) {
      setError('Please fill in all fields.');
      return;
    }
    if (!isLogin && role === 'Local Supplier' && (!address || !locationName)) {
      setError('Please provide address and location name for Local Supplier.');
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
        // LOGIN — calls backend which runs the SQL login query
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Invalid email or password.');
        onLogin({ id: data.user_id, name: data.username, role: data.role, email: data.email });
      } else {
        // REGISTER — calls backend which runs the SQL registration queries
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password, role, address, location_name: locationName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message + (data.detail ? ': ' + data.detail : '') || 'Registration failed.');
        onLogin({ id: data.user_id, name: data.username, role: data.role, email: data.email });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 flex items-center justify-center">
      <div className="bg-secondary p-10 rounded-[3rem] shadow-2xl w-full max-w-md border border-primary relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black text-xl">M</div>
          <span className="text-2xl font-black tracking-tight text-primary">mealDeal</span>
        </div>

        <h2 className="text-2xl font-black text-primary text-center mb-2">
          {isLogin ? 'Welcome Back' : 'Create an Account'}
        </h2>
        <p className="text-sm text-tertiary text-center mb-6 font-medium">
          {isLogin ? 'Log in to manage your meals and orders.' : 'Join the farm-to-table marketplace.'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-[10px] font-bold text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        {infoMsg && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="text-[10px] font-black uppercase text-tertiary mb-2 block tracking-widest">Username</label>
                <input
                  required
                  type="text"
                  placeholder="yourname"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-tertiary dark:bg-slate-700 border border-primary dark:border-slate-600 rounded-2xl px-4 py-3 text-sm text-primary dark:text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-tertiary dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-tertiary mb-2 block tracking-widest">Select Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Home Cook', 'Verified Chef', 'Local Supplier', 'Administrator'].map(r => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRole(r)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${role === r ? 'bg-emerald-50 dark:bg-emerald-900 border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-tertiary dark:bg-slate-700 border-primary dark:border-slate-600 text-tertiary'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {role === 'Local Supplier' && (
                <>
                  <div>
                    <label className="text-[10px] font-black uppercase text-tertiary mb-2 block tracking-widest">Address</label>
                    <input
                      required
                      type="text"
                      placeholder="123 Farm Road, Green Valley"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-tertiary dark:bg-slate-700 border border-primary dark:border-slate-600 rounded-2xl px-4 py-3 text-sm text-primary dark:text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-tertiary dark:placeholder:text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-tertiary mb-2 block tracking-widest">Location Name</label>
                    <input
                      required
                      type="text"
                      placeholder="Green Valley Farms"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      className="w-full bg-tertiary dark:bg-slate-700 border border-primary dark:border-slate-600 rounded-2xl px-4 py-3 text-sm text-primary dark:text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-tertiary dark:placeholder:text-slate-500"
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div>
            <label className="text-[10px] font-black uppercase text-tertiary mb-2 block tracking-widest">Email Address</label>
            <input
              required
              type="email"
              placeholder="user@bilkent.edu.tr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-tertiary dark:bg-slate-700 border border-primary dark:border-slate-600 rounded-2xl px-4 py-3 text-sm text-primary dark:text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-tertiary dark:placeholder:text-slate-500"
            />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-[10px] font-black uppercase text-tertiary block tracking-widest">Password</label>
              {isLogin && (
                <button 
                  type="button" 
                  onClick={() => setInfoMsg('A password reset link has been sent to your email (simulated).')}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <input
              required
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-tertiary dark:bg-slate-700 border border-primary dark:border-slate-600 rounded-2xl px-4 py-3 text-sm text-primary dark:text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-tertiary dark:placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 dark:bg-slate-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs mt-4 hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors shadow-lg shadow-slate-200 dark:shadow-slate-950 disabled:opacity-60"
          >
            {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Register Account'}
          </button>
        </form>

        <p className="text-center text-xs font-bold text-tertiary mt-8">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); setInfoMsg(''); setEmail(''); setPassword(''); setUsername(''); setAddress(''); setLocationName(''); }} className="text-emerald-600 dark:text-emerald-400 hover:underline">
            {isLogin ? 'Register' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
};
