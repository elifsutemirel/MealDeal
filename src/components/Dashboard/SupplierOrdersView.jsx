import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle } from 'lucide-react';

export const SupplierOrdersView = ({ user }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/supplier/orders?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFulfill = async (orderId) => {
    try {
      const res = await fetch(`/api/supplier/orders/${orderId}/fulfill`, {
        method: 'PUT'
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error('Failed to fulfill order', err);
    }
  };

  if (loading) return <div className="py-24 text-center animate-pulse text-slate-400">Loading Orders...</div>;

  if (error) return (
    <div className="py-24 text-center">
      <div className="text-red-500 mb-4 font-bold">Error: {error}</div>
      <button onClick={fetchOrders} className="text-emerald-500 underline text-xs font-bold uppercase tracking-widest">Try Again</button>
    </div>
  );

  return (
    <div className="py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-12">
        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Orders Dashboard</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">View and manage orders placed for your ingredients</p>
      </div>

      <div className="space-y-6">
        {orders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-16 text-center shadow-xl border border-slate-100 dark:border-slate-700">
            <Package size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-sm">No orders received yet.</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.order_id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row">
              <div className="p-8 md:w-1/3 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Order #{order.order_id}</span>
                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${order.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                      {order.status === 'pending' ? <Clock size={10} /> : <CheckCircle size={10} />} {order.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">Buyer: {order.buyer_name}</h3>
                  <p className="text-xs text-slate-400 font-bold">{new Date(order.order_date).toLocaleString()}</p>
                </div>
                <div className="mt-8">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Amount</p>
                  <p className="text-3xl font-black text-emerald-500">${Number(order.total_amount).toFixed(2)}</p>
                </div>
              </div>
              <div className="p-8 md:w-2/3">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Order Items</h4>
                <div className="space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">{item.item_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{Number(item.qty).toFixed(1)} {item.unit}</p>
                      </div>
                      <p className="font-black text-slate-600 dark:text-slate-300">${(Number(item.qty) * Number(item.price)).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                
                {order.status === 'pending' && (
                  <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700 text-right">
                    <button 
                      onClick={() => handleFulfill(order.order_id)}
                      className="bg-slate-900 dark:bg-emerald-500 text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-emerald-600 transition-colors shadow-lg"
                    >
                      Mark as Fulfilled
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
