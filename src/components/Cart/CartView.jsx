import React, { useState } from 'react';
import { CheckCircle2, X, CreditCard } from 'lucide-react';

export const CartView = ({ items, onRemove, onCheckoutComplete }) => {
  const [checkoutStep, setCheckoutStep] = useState('summary');
  const subtotal = items.reduce((acc, item) => acc + item.recipe.finalPrice, 0);
  const total = (subtotal + (items.length > 0 ? 1.99 : 0)).toFixed(2);

  const handleProcessPayment = () => {
    setCheckoutStep('processing');
    setTimeout(() => {
      setCheckoutStep('success');
      setTimeout(() => onCheckoutComplete(), 3000); // Auto-redirect
    }, 2000);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 py-8">
      {checkoutStep === 'success' ? (
        <div className="max-w-md mx-auto py-24 text-center">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">Order Confirmed</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
            <strong>System Action Logged:</strong><br />
            - Local Supplier inventory deducted.<br />
            - "Cook Action" logged for Chef Royalty metric update.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 animate-pulse">Redirecting to Dashboard...</p>
        </div>
      ) : (
        <>
          <header className="mb-12">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">Cart Review</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Finalizing custom ingredient list from <span className="text-slate-900 dark:text-white font-bold underline">Bilkent Farm Hub</span>.</p>
          </header>

          <div className="flex flex-col lg:flex-row gap-12">
            <div className="flex-1 space-y-4">
              {items.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800 p-20 rounded-[3rem] text-center font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">Cart is empty</div>
              ) : (
                items.map((item, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <img src={item.recipe.image} className="w-20 h-20 rounded-2xl object-cover" />
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white leading-tight">{item.recipe.title}</h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">{item.servings} Servings • {item.recipe.cartIngredients.length} Ingredients</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <span className="font-black text-slate-900 dark:text-white">${item.recipe.finalPrice.toFixed(2)}</span>
                      <button onClick={() => onRemove(idx)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"><X size={18} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="lg:w-96">
                <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><CreditCard size={120} /></div>
                  <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-10 relative z-10 text-center">Secure Checkout</h3>
                  <div className="space-y-4 mb-10 relative z-10">
                    <div className="flex justify-between text-sm text-slate-400 dark:text-slate-500"><span>Ingredient Total</span><span className="font-bold text-white">${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-slate-400 dark:text-slate-500"><span>Marketplace Fee</span><span className="font-bold text-white">$1.99</span></div>
                    <div className="pt-6 border-t border-slate-800 dark:border-slate-700 flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-widest">Grand Total</span>
                      <span className="text-3xl font-black text-emerald-400 tracking-tighter">${total}</span>
                    </div>
                  </div>

                  {checkoutStep === 'processing' ? (
                    <div className="w-full py-5 rounded-2xl bg-slate-800 dark:bg-slate-700 flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span className="text-xs font-black uppercase tracking-widest">Processing Transaction...</span>
                    </div>
                  ) : (
                    <button onClick={handleProcessPayment} className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 dark:hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
                      Confirm & Pay ${total}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
