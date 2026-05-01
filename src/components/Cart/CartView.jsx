import React, { useState } from 'react';
import { CheckCircle2, X, CreditCard } from 'lucide-react';

export const CartView = ({ items, onRemove, onCheckoutComplete, user }) => {
  const [checkoutStep, setCheckoutStep] = useState('summary');
  const [error, setError] = useState(null);

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length > 16) value = value.slice(0, 16);
    value = value.replace(/(\d{4})(?=\d)/g, '$1 '); // Add space after every 4 digits
    setCardNumber(value);
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length >= 3) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }
    setExpiryDate(value);
  };

  const handleCvvChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length > 4) value = value.slice(0, 4); // Max 4 digits for CVV
    setCvv(value);
  };

  const isExpiryValid = () => {
    if (expiryDate.length !== 5) return false;
    const [monthStr, yearStr] = expiryDate.split('/');
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10) + 2000;

    if (month < 1 || month > 12) return false;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (year < currentYear) return false;
    if (year === currentYear && month < currentMonth) return false;

    return true;
  };

  const isFormValid = cardName.trim().length > 0 && cardNumber.length >= 19 && isExpiryValid() && cvv.length >= 3;

  const subtotal = items.reduce((acc, item) => acc + item.recipe.finalPrice, 0);
  const total = (subtotal + (items.length > 0 ? 1.99 : 0)).toFixed(2);

  const handleProcessPayment = async () => {
    setCheckoutStep('processing');
    setError(null);
    
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user?.id || 1,
          totalAmount: parseFloat(total),
          items: items
        })
      });

      if (!response.ok) {
        throw new Error('Checkout failed');
      }

      setCheckoutStep('success');
      setTimeout(() => onCheckoutComplete(), 3000); // Auto-redirect
    } catch (err) {
      console.error(err);
      setError('An error occurred during checkout. Please try again.');
      setCheckoutStep('summary');
    }
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
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-bold border border-red-100 dark:border-red-800">
                  {error}
                </div>
              )}
              {checkoutStep === 'payment' ? (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Payment Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cardholder Name</label>
                      <input type="text" placeholder="John Doe" value={cardName} onChange={(e) => setCardName(e.target.value.replace(/[^a-zA-Z\sğüşıöçĞÜŞİÖÇ]/g, ''))} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 dark:text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Card Number</label>
                      <input type="text" placeholder="0000 0000 0000 0000" value={cardNumber} onChange={handleCardNumberChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 dark:text-white" />
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Expiry Date</label>
                        <input 
                          type="text" 
                          placeholder="MM/YY" 
                          value={expiryDate} 
                          onChange={handleExpiryChange} 
                          className={`w-full bg-slate-50 dark:bg-slate-900 border ${expiryDate.length === 5 && !isExpiryValid() ? 'border-red-500 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'} rounded-xl px-4 py-3 text-sm focus:outline-none dark:text-white transition-colors`} 
                        />
                        {expiryDate.length === 5 && !isExpiryValid() && (
                          <span className="text-red-500 text-[10px] font-bold mt-1 block animate-in fade-in slide-in-from-top-1">Invalid Date</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CVV</label>
                        <input type="password" placeholder="***" value={cvv} onChange={handleCvvChange} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 dark:text-white" />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setCheckoutStep('summary')} className="mt-8 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                    ← Back to Cart
                  </button>
                </div>
              ) : items.length === 0 ? (
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
                  ) : checkoutStep === 'summary' ? (
                    <button onClick={() => setCheckoutStep('payment')} className="w-full bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-600 dark:hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
                      Proceed to Payment
                    </button>
                  ) : (
                    <button 
                      onClick={handleProcessPayment} 
                      disabled={!isFormValid}
                      className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${isFormValid ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 shadow-lg shadow-emerald-500/20' : 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed'}`}>
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
