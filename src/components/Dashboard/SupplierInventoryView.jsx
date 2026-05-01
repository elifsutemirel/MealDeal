import React, { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';

const InventoryRow = ({ item, onUpdate, onDelete }) => {
  const [price, setPrice] = useState(item.price);
  const [qty, setQty] = useState(item.available_qty);
  const hasChanged = price !== item.price || qty !== item.available_qty;

  return (
    <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
      <td className="px-10 py-8 font-black text-slate-800 dark:text-white">{item.ingredient_name}</td>
      <td className="px-10 py-8">
        <div className="flex items-center gap-1">
          <span className="text-slate-400">$</span>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-20 bg-transparent border-none p-0 font-bold focus:ring-0 outline-none" />
        </div>
      </td>
      <td className="px-10 py-8">
        <div className="flex items-center gap-2">
          <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-16 bg-transparent border-none p-0 font-bold focus:ring-0 outline-none" />
          <span className="text-[10px] font-black uppercase text-slate-400">{item.unit}</span>
        </div>
      </td>
      <td className="px-10 py-8">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(item.last_updated).toLocaleDateString()}</span>
      </td>
      <td className="px-10 py-8 text-right">
        {hasChanged ? (
          <button onClick={() => onUpdate(item.inventory_id, price, qty)} className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-600 transition-colors">Update</button>
        ) : (
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-200 dark:text-slate-700">Sync'd</span>
        )}
        <button 
          onClick={() => onDelete(item.inventory_id)} 
          className="ml-4 text-slate-300 hover:text-red-500 transition-colors"
          title="Remove from inventory"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
};

export const SupplierInventoryView = ({ user }) => {
  const [inventory, setInventory] = useState([]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ ingredient_id: '', unit: 'kg', price: '', package_size: '1', available_qty: '' });

  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchInventory();
      fetchIngredients();
    }
  }, [user]);

  const fetchInventory = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/supplier/inventory?userId=${user.id}`);
      if (!res.ok) throw new Error(`Failed to fetch inventory (Status: ${res.status})`);
      const data = await res.json();
      setInventory(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchIngredients = async () => {
    try {
      const res = await fetch('/api/ingredients');
      if (!res.ok) throw new Error('Failed to fetch ingredients');
      const data = await res.json();
      setAllIngredients(data);
    } catch (err) { console.error(err); }
  };

  const handleUpdate = async (id, price, qty) => {
    try {
      await fetch(`/api/supplier/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parseFloat(price), available_qty: parseFloat(qty) })
      });
      fetchInventory();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this item from your inventory?')) return;
    try {
      const res = await fetch(`/api/supplier/inventory/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchInventory();
      } else {
        alert('Failed to remove item');
      }
    } catch (err) { console.error(err); }
  };

  const handleAdd = async () => {
    if (!newItem.ingredient_id || !newItem.price || !newItem.available_qty) {
      alert('Please fill in all fields');
      return;
    }
    try {
      await fetch('/api/supplier/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ingredient_id: parseInt(newItem.ingredient_id),
          unit: newItem.unit, 
          price: parseFloat(newItem.price), 
          package_size: newItem.package_size,
          available_qty: parseFloat(newItem.available_qty), 
          supplier_id: user.id 
        })
      });
      setShowAdd(false);
      setNewItem({ ingredient_id: '', unit: 'kg', price: '', package_size: '1', available_qty: '' });
      fetchInventory();
    } catch (err) { 
      console.error(err); 
      alert('Failed to add item');
    }
  };

  if (loading) return <div className="py-24 text-center animate-pulse text-slate-400">Loading Inventory...</div>;

  if (error) return (
    <div className="py-24 text-center">
      <div className="text-red-500 mb-4 font-bold">Error: {error}</div>
      <button onClick={fetchInventory} className="text-emerald-500 underline text-xs font-bold uppercase tracking-widest">Try Again</button>
    </div>
  );

  return (
    <div className="py-12">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Inventory Management</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Update your stock and prices in real-time</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-emerald-500/20">
          <Plus size={18} /> Add New Item
        </button>
      </div>

      {showAdd && (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-700 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ingredient</label>
              <select onChange={e => setNewItem({ ...newItem, ingredient_id: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-4 text-sm focus:ring-2 ring-emerald-500/20 transition-all outline-none appearance-none">
                <option value="">Select...</option>
                {allIngredients.map(i => <option key={i.ingredient_id} value={i.ingredient_id}>{i.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price ($)</label>
              <input type="number" onChange={e => setNewItem({ ...newItem, price: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-4 text-sm focus:ring-2 ring-emerald-500/20 outline-none" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stock Qty</label>
              <input type="number" onChange={e => setNewItem({ ...newItem, available_qty: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-4 text-sm focus:ring-2 ring-emerald-500/20 outline-none" placeholder="0" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unit</label>
              <input type="text" onChange={e => setNewItem({ ...newItem, unit: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-4 text-sm focus:ring-2 ring-emerald-500/20 outline-none" defaultValue="kg" />
            </div>
            <div className="flex items-end">
              <button onClick={handleAdd} className="w-full bg-slate-900 dark:bg-emerald-500 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all">Save Item</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-50 dark:border-slate-700/50">
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ingredient</th>
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Price</th>
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Available Qty</th>
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Last Updated</th>
              <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
            {inventory.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-10 py-24 text-center">
                  <p className="text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest text-xs">No items in your inventory yet.</p>
                </td>
              </tr>
            ) : (
              inventory.map((item) => (
                <InventoryRow key={item.inventory_id} item={item} onUpdate={handleUpdate} onDelete={handleDelete} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
