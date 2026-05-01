import React, { useState, useEffect } from 'react';
import { Search, MapPin, Store, ShoppingBasket, Plus, Minus } from 'lucide-react';

export const SupplierMarketplaceView = ({ user, onAddToCart }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    const fetchMarketplace = async () => {
      try {
        const res = await fetch('/api/marketplace');
        if (res.ok) {
          const data = await res.json();
          setSuppliers(data);
        }
      } catch (err) {
        console.error("Failed to fetch marketplace", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMarketplace();
  }, []);

  const handleQtyChange = (inventoryId, delta, max) => {
    setQuantities(prev => {
      const current = prev[inventoryId] || 1;
      const next = Math.max(1, Math.min(max, current + delta));
      return { ...prev, [inventoryId]: next };
    });
  };

  const handleAddToCart = (supplier, item) => {
    const qty = quantities[item.inventory_id] || 1;
    
    // Structure it so CartView can process it smoothly
    const cartItem = {
      isIngredientOnly: true,
      title: `${item.name} from ${supplier.location_name}`,
      image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600', // Generic fresh food image
      finalPrice: parseFloat(item.price) * qty,
      cartIngredients: [{
        id: item.ingredient_id,
        name: item.name,
        baseQty: 1, // Will be scaled by qty in CartView via servings
        unit: item.unit,
        selectedSupplier: {
          inventory_id: item.inventory_id,
          supplier_id: supplier.supplier_id,
          supplier_name: supplier.supplier_name,
          location_name: supplier.location_name,
          price: item.price
        }
      }]
    };

    // We pass qty as the 'servings' parameter to CartView's onAddToCart
    onAddToCart(cartItem, qty);
    
    // Reset qty
    setQuantities(prev => ({ ...prev, [item.inventory_id]: 1 }));
    alert(`Added ${qty} ${item.unit} of ${item.name} to cart!`);
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.supplier_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.inventory.some(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return <div className="py-24 text-center animate-pulse text-slate-400">Loading Marketplace...</div>;
  }

  return (
    <div className="py-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Local Marketplace</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Buy fresh ingredients directly from farms & suppliers</p>
        </div>
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search suppliers or ingredients..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {filteredSuppliers.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700">
          <Store size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
          <p className="text-slate-500 font-bold">No suppliers found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {filteredSuppliers.map(supplier => (
            <div key={supplier.supplier_id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                    <Store size={20} className="text-emerald-500" /> {supplier.location_name}
                  </h3>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <MapPin size={10} /> {supplier.supplier_name}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
                    {supplier.inventory.length} Items Available
                  </span>
                </div>
              </div>
              
              <div className="p-8 flex-1">
                {supplier.inventory.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center italic">No inventory listed.</p>
                ) : (
                  <div className="space-y-4">
                    {supplier.inventory.map(item => (
                      <div key={item.inventory_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-900 transition-colors bg-white dark:bg-slate-800">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">${item.price}/{item.unit} • {item.available_qty} {item.unit} left</p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-slate-700">
                            <button 
                              onClick={() => handleQtyChange(item.inventory_id, -1, item.available_qty)}
                              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-6 text-center text-sm font-black text-slate-900 dark:text-white">
                              {quantities[item.inventory_id] || 1}
                            </span>
                            <button 
                              onClick={() => handleQtyChange(item.inventory_id, 1, item.available_qty)}
                              className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          
                          <button 
                            onClick={() => handleAddToCart(supplier, item)}
                            className="bg-emerald-500 text-white p-3 rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 active:scale-95"
                            title="Add to Cart"
                          >
                            <ShoppingBasket size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
