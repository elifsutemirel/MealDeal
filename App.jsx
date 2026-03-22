import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, ChefHat, ShoppingBasket, Users, Clock, Star, 
  ChevronRight, Plus, Minus, Filter, CheckCircle2, Leaf, 
  ArrowLeft, Sparkles, TrendingUp, Package, ArrowRight, 
  X, Trophy, Flame, ListPlus, CreditCard, LogIn, UserPlus, ShieldCheck,
  Moon, Sun
} from 'lucide-react';

// --- Enhanced Mock Data ---
// Note: Prices are now per unit to allow users to deselect ingredients they already own.
const RECIPES = [
  {
    id: 1,
    title: "Organic Harvest Bowl",
    chef: "Chef Aybegüm",
    chefRating: 4.9,
    rating: 4.8,
    reviews: [
      { user: "Beren I.", comment: "Fresh and delicious! Perfect for a quick lunch.", rating: 5 },
      { user: "Mehmet E.", comment: "Scaling worked perfectly for my group of 4.", rating: 4 }
    ],
    time: 20,
    difficulty: "Easy",
    category: "Vegan",
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600",
    ingredients: [
      { id: 'i1', name: "Quinoa", baseQty: 100, unit: "g", status: "available", taxonomy: "Grains", pricePerUnit: 0.02 },
      { id: 'i2', name: "Sweet Potato", baseQty: 1, unit: "pc", status: "available", taxonomy: "Root Veg", pricePerUnit: 1.50 },
      { id: 'i3', name: "Roma Tomato", baseQty: 2, unit: "pcs", status: "missing", taxonomy: "Tomato", pricePerUnit: 0.75 },
      { id: 'i4', name: "Kale", baseQty: 50, unit: "g", status: "limited", taxonomy: "Leafy Greens", pricePerUnit: 0.03 }
    ],
    steps: [
      "Rinse quinoa under cold water.",
      "Boil quinoa with 2 parts water for 15 minutes.",
      "Roast sweet potatoes with olive oil and salt.",
      "Assemble bowl with kale and tahini dressing."
    ],
    substitutions: [
      { 
        targetId: 'i3', 
        original: "Roma Tomato", 
        suggestion: "Vine Tomato", 
        suggestedPrice: 0.80,
        reason: "Mapped via Taxonomy: Tomatoes. Roma is out of stock at Bilkent Hub, but Vine tomatoes are currently available from Local Supplier A." 
      }
    ]
  },
  {
    id: 2,
    title: "Seared Atlantic Salmon",
    chef: "Chef Burkay",
    chefRating: 4.7,
    rating: 4.9,
    reviews: [
      { user: "Elif S.", comment: "High quality salmon. The kit made it so easy.", rating: 5 }
    ],
    time: 15,
    difficulty: "Medium",
    category: "Keto",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600",
    ingredients: [
      { id: 'i5', name: "Salmon Fillet", baseQty: 180, unit: "g", status: "available", taxonomy: "Fish", pricePerUnit: 0.05 }, 
      { id: 'i6', name: "Asparagus", baseQty: 6, unit: "spears", status: "available", taxonomy: "Veg", pricePerUnit: 0.50 },
      { id: 'i7', name: "Lemon", baseQty: 0.5, unit: "pc", status: "missing", taxonomy: "Citrus", pricePerUnit: 1.00 },
      { id: 'i8', name: "Grass-fed Butter", baseQty: 15, unit: "g", status: "available", taxonomy: "Dairy", pricePerUnit: 0.04 }
    ],
    steps: [
      "Pat salmon dry and season both sides.",
      "Heat skillet to high heat with oil.",
      "Sear skin-side down for 4 minutes.",
      "Flip and sear for 2 minutes with butter and herbs."
    ],
    substitutions: [
      { 
        targetId: 'i7',
        original: "Lemon", 
        suggestion: "Lime", 
        suggestedPrice: 0.80,
        reason: "Taxonomy Match: Citrus. Lime provides equivalent acidity for this protein-based keto meal." 
      }
    ]
  },
  {
    id: 3,
    title: "Creamy Mushroom Risotto",
    chef: "Chef Deniz",
    chefRating: 4.8,
    rating: 4.7,
    reviews: [
      { user: "Ahmet K.", comment: "Restaurant-quality risotto at home! Worth every penny.", rating: 5 },
      { user: "Ayşe M.", comment: "Great instructions made it easy to follow.", rating: 4 }
    ],
    time: 35,
    difficulty: "Medium",
    category: "Vegetarian",
    image: "https://images.unsplash.com/photo-1476124369162-f4978d1b74ca?auto=format&fit=crop&q=80&w=600",
    ingredients: [
      { id: 'i9', name: "Arborio Rice", baseQty: 300, unit: "g", status: "available", taxonomy: "Grains", pricePerUnit: 0.01 },
      { id: 'i10', name: "Cremini Mushrooms", baseQty: 250, unit: "g", status: "available", taxonomy: "Mushrooms", pricePerUnit: 0.04 },
      { id: 'i11', name: "Parmesan Cheese", baseQty: 80, unit: "g", status: "available", taxonomy: "Cheese", pricePerUnit: 0.10 },
      { id: 'i12', name: "Vegetable Broth", baseQty: 1, unit: "L", status: "available", taxonomy: "Broth", pricePerUnit: 1.20 },
      { id: 'i13', name: "White Wine", baseQty: 200, unit: "ml", status: "available", taxonomy: "Wine", pricePerUnit: 0.15 }
    ],
    steps: [
      "Heat broth in a separate pan and keep warm.",
      "Sauté mushrooms until golden, set aside.",
      "Toast rice in butter for 2 minutes.",
      "Add wine and stir until absorbed.",
      "Gradually add warm broth, stirring constantly for 18-20 minutes.",
      "Finish with butter, cheese, and mushrooms."
    ],
    substitutions: []
  },
  {
    id: 4,
    title: "Thai Green Curry with Chicken",
    chef: "Chef Niran",
    chefRating: 4.9,
    rating: 4.6,
    reviews: [
      { user: "Emre T.", comment: "Authentic taste! The curry paste is perfect.", rating: 5 },
      { user: "Zeynep D.", comment: "A bit spicy but loved it!", rating: 4 }
    ],
    time: 25,
    difficulty: "Medium",
    category: "Gluten-Free",
    image: "https://images.unsplash.com/photo-1455619452474-d2be8b1e4e31?auto=format&fit=crop&q=80&w=600",
    ingredients: [
      { id: 'i14', name: "Chicken Breast", baseQty: 400, unit: "g", status: "available", taxonomy: "Poultry", pricePerUnit: 0.025 },
      { id: 'i15', name: "Thai Green Curry Paste", baseQty: 3, unit: "tbsp", status: "available", taxonomy: "Spice", pricePerUnit: 0.50 },
      { id: 'i16', name: "Coconut Milk", baseQty: 400, unit: "ml", status: "available", taxonomy: "Dairy Alt", pricePerUnit: 0.08 },
      { id: 'i17', name: "Thai Basil", baseQty: 30, unit: "g", status: "limited", taxonomy: "Herbs", pricePerUnit: 0.20 },
      { id: 'i18', name: "Bell Pepper", baseQty: 1, unit: "pc", status: "available", taxonomy: "Veg", pricePerUnit: 1.00 }
    ],
    steps: [
      "Cut chicken into bite-sized pieces.",
      "Heat oil and fry curry paste for 1-2 minutes.",
      "Add coconut milk and bring to simmer.",
      "Add chicken and simmer 15-18 minutes until cooked.",
      "Add vegetables and simmer 5 more minutes.",
      "Garnish with fresh basil before serving."
    ],
    substitutions: []
  },
  {
    id: 5,
    title: "Truffle Pasta Carbonara",
    chef: "Chef Marco",
    chefRating: 5.0,
    rating: 4.9,
    reviews: [
      { user: "Serkan Y.", comment: "Pure luxury! Best carbonara ever.", rating: 5 },
      { user: "Hale K.", comment: "The truffle oil really elevates this dish.", rating: 5 }
    ],
    time: 20,
    difficulty: "Hard",
    category: "Gluten-Free",
    image: "https://images.unsplash.com/photo-1612874742237-6526221fcf1f?auto=format&fit=crop&q=80&w=600",
    ingredients: [
      { id: 'i19', name: "Fresh Pasta", baseQty: 400, unit: "g", status: "available", taxonomy: "Grains", pricePerUnit: 0.15 },
      { id: 'i20', name: "Guanciale", baseQty: 150, unit: "g", status: "available", taxonomy: "Meat", pricePerUnit: 0.30 },
      { id: 'i21', name: "Pecorino Romano", baseQty: 100, unit: "g", status: "available", taxonomy: "Cheese", pricePerUnit: 0.12 },
      { id: 'i22', name: "Egg Yolks", baseQty: 4, unit: "pcs", status: "available", taxonomy: "Eggs", pricePerUnit: 0.15 },
      { id: 'i23', name: "Black Truffle Oil", baseQty: 2, unit: "tbsp", status: "available", taxonomy: "Oil", pricePerUnit: 0.80 }
    ],
    steps: [
      "Cook pasta in salted boiling water until al dente.",
      "Dice guanciale and fry until crispy.",
      "Whisk egg yolks with grated Pecorino Romano.",
      "Reserve pasta water before draining.",
      "Toss hot pasta with guanciale off heat.",
      "Add egg mixture while tossing, add pasta water to achieve creamy texture.",
      "Drizzle with truffle oil and serve immediately."
    ],
    substitutions: []
  },
  {
    id: 6,
    title: "Buddha Power Bowl",
    chef: "Chef Zeynep",
    chefRating: 4.8,
    rating: 4.7,
    reviews: [
      { user: "Tuğçe L.", comment: "So nutritious and delicious! My new favorite.", rating: 5 },
      { user: "Cem B.", comment: "Perfect for meal prep.", rating: 4 }
    ],
    time: 25,
    difficulty: "Easy",
    category: "Vegan",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600",
    ingredients: [
      { id: 'i24', name: "Brown Rice", baseQty: 150, unit: "g", status: "available", taxonomy: "Grains", pricePerUnit: 0.01 },
      { id: 'i25', name: "Chickpeas", baseQty: 200, unit: "g", status: "available", taxonomy: "Legumes", pricePerUnit: 0.02 },
      { id: 'i26', name: "Avocado", baseQty: 1, unit: "pc", status: "available", taxonomy: "Fruit", pricePerUnit: 2.00 },
      { id: 'i27', name: "Spirulina", baseQty: 1, unit: "tbsp", status: "available", taxonomy: "Superfood", pricePerUnit: 0.30 },
      { id: 'i28', name: "Goji Berries", baseQty: 30, unit: "g", status: "limited", taxonomy: "Berries", pricePerUnit: 0.50 }
    ],
    steps: [
      "Cook brown rice according to package directions.",
      "Roast chickpeas with olive oil and spices at 200°C for 20 minutes.",
      "Assemble bowl with rice as base.",
      "Arrange roasted chickpeas, avocado slices, and greens.",
      "Sprinkle with spirulina and goji berries.",
      "Drizzle with tahini dressing before serving."
    ],
    substitutions: []
  },
  {
    id: 7,
    title: "Pan-Seared Sea Bass with Lemon Butter",
    chef: "Chef Onur",
    chefRating: 4.7,
    rating: 4.8,
    reviews: [
      { user: "Pınar E.", comment: "Fresh sea bass, perfectly cooked. Restaurant quality!", rating: 5 },
      { user: "Kerem O.", comment: "Simple but elegant. Great for dinner parties.", rating: 4 }
    ],
    time: 18,
    difficulty: "Medium",
    category: "Keto",
    image: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&q=80&w=600",
    ingredients: [
      { id: 'i29', name: "Sea Bass Fillet", baseQty: 200, unit: "g", status: "available", taxonomy: "Fish", pricePerUnit: 0.08 },
      { id: 'i30', name: "Lemon", baseQty: 1, unit: "pc", status: "available", taxonomy: "Citrus", pricePerUnit: 0.50 },
      { id: 'i31', name: "Butter", baseQty: 50, unit: "g", status: "available", taxonomy: "Dairy", pricePerUnit: 0.02 },
      { id: 'i32', name: "Fresh Thyme", baseQty: 10, unit: "g", status: "available", taxonomy: "Herbs", pricePerUnit: 0.30 },
      { id: 'i33', name: "Garlic", baseQty: 2, unit: "cloves", status: "available", taxonomy: "Veg", pricePerUnit: 0.05 }
    ],
    steps: [
      "Pat sea bass dry with paper towels.",
      "Season with salt and pepper on both sides.",
      "Heat olive oil in a skillet over medium-high heat.",
      "Sear skin-side down for 4-5 minutes until golden.",
      "Flip and sear for another 3-4 minutes.",
      "Add butter, garlic, and thyme; baste the fish.",
      "Serve with fresh lemon wedges."
    ],
    substitutions: []
  },
  {
    id: 8,
    title: "Spicy Szechuan Noodles",
    chef: "Chef Lin",
    chefRating: 4.9,
    rating: 4.5,
    reviews: [
      { user: "İbrahim K.", comment: "Authentic spicy flavors! Love this.", rating: 5 },
      { user: "Selin Ş.", comment: "A bit too spicy for me but flavorful!", rating: 4 }
    ],
    time: 22,
    difficulty: "Medium",
    category: "Vegan",
    image: "https://images.unsplash.com/photo-1569718212e3-ab0e7a99c081?auto=format&fit=crop&q=80&w=600",
    ingredients: [
      { id: 'i34', name: "Ramen Noodles", baseQty: 300, unit: "g", status: "available", taxonomy: "Grains", pricePerUnit: 0.02 },
      { id: 'i35', name: "Szechuan Peppercorns", baseQty: 1, unit: "tbsp", status: "available", taxonomy: "Spice", pricePerUnit: 0.40 },
      { id: 'i36', name: "Chili Oil", baseQty: 3, unit: "tbsp", status: "available", taxonomy: "Oil", pricePerUnit: 0.15 },
      { id: 'i37', name: "Sesame Oil", baseQty: 2, unit: "tbsp", status: "available", taxonomy: "Oil", pricePerUnit: 0.12 },
      { id: 'i38', name: "Green Onion", baseQty: 50, unit: "g", status: "available", taxonomy: "Veg", pricePerUnit: 0.08 }
    ],
    steps: [
      "Cook noodles in boiling water for 3-4 minutes, drain.",
      "Toast Szechuan peppercorns in a dry pan for 1 minute.",
      "Mix chili oil, sesame oil, and toasted peppercorns.",
      "Toss noodles with the spicy oil mixture.",
      "Top with fresh green onions and sesame seeds.",
      "Serve hot with extra chili oil on the side."
    ],
    substitutions: []
  }
];

// --- Mock Users Data ---
const USERS_DB = [
  {
    id: 1,
    name: "Elif Sütemirel",
    email: "elif@bilkent.edu.tr",
    password: "password123",
    role: "Home Cook",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
    joinDate: "2025-06-15",
    stats: { ordersPlaced: 24, totalSpent: 450.50, favoriteChef: "Chef Aybegüm" }
  },
  {
    id: 2,
    name: "Chef Aybegüm Yılmaz",
    email: "aybegum@mealdeal.com",
    password: "chef123",
    role: "Verified Chef",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100",
    joinDate: "2024-01-10",
    stats: { recipesCreated: 12, totalCooks: 342, rating: 4.9, earnings: 8750 }
  },
  {
    id: 3,
    name: "Ankara Fresh Supplier",
    email: "supplier@ankara.farm",
    password: "supplier123",
    role: "Local Supplier",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100",
    joinDate: "2024-03-20",
    stats: { itemsListed: 156, ordersFilfilled: 489, rating: 4.7 }
  },
  {
    id: 4,
    name: "Admin Dashboard",
    email: "admin@mealdeal.com",
    password: "admin123",
    role: "Administrator",
    avatar: "https://images.unsplash.com/photo-1502685457456-3b7b3f2b0e3d?auto=format&fit=crop&q=80&w=100",
    joinDate: "2023-11-01",
    stats: { platformUsers: 2341, totalTransactions: 12500, revenue: 125000 }
  }
];

// --- Challenges Data ---
const CHALLENGES = [
  {
    id: 1,
    title: "Zero Waste Week",
    description: "Cook only with ingredients you have at home. No new purchases!",
    icon: "🌱",
    difficulty: "Hard",
    duration: "7 days",
    prize: "Green Leaf Badge + 50 MealCoins",
    participants: 342,
    image: "https://images.unsplash.com/photo-1559027615-cd2628902d4a?auto=format&fit=crop&q=80&w=600",
    status: "active",
    progress: 45,
    recipes: ["Organic Harvest Bowl", "Buddha Power Bowl", "Creamy Mushroom Risotto"]
  },
  {
    id: 2,
    title: "Under 20 Minutes Challenge",
    description: "Prepare a delicious meal in 20 minutes or less!",
    icon: "⚡",
    difficulty: "Medium",
    duration: "14 days",
    prize: "Speed Chef Badge + 30 MealCoins",
    participants: 618,
    image: "https://images.unsplash.com/photo-1571407531221-fcd14d1239ba?auto=format&fit=crop&q=80&w=600",
    status: "active",
    progress: 62,
    recipes: ["Seared Atlantic Salmon", "Pan-Seared Sea Bass", "Spicy Szechuan Noodles"]
  },
  {
    id: 3,
    title: "Vegan Venture",
    description: "Try 5 different vegan recipes this month!",
    icon: "🥬",
    difficulty: "Easy",
    duration: "30 days",
    prize: "Plant-Based Master Badge + 75 MealCoins",
    participants: 891,
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=600",
    status: "active",
    progress: 28,
    recipes: ["Organic Harvest Bowl", "Buddha Power Bowl", "Spicy Szechuan Noodles"]
  },
  {
    id: 4,
    title: "Keto King",
    description: "Complete 10 keto-friendly meals and log your progress!",
    icon: "🥩",
    difficulty: "Hard",
    duration: "21 days",
    prize: "Keto Champion Badge + 100 MealCoins",
    participants: 245,
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=600",
    status: "active",
    progress: 18,
    recipes: ["Seared Atlantic Salmon", "Pan-Seared Sea Bass"]
  },
  {
    id: 5,
    title: "Fusion Flavor Fest",
    description: "Cook one recipe from 3 different cuisines!",
    icon: "🌍",
    difficulty: "Medium",
    duration: "14 days",
    prize: "Global Palate Badge + 40 MealCoins",
    participants: 523,
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600",
    status: "upcoming",
    progress: 0,
    recipes: ["Thai Green Curry with Chicken", "Truffle Pasta Carbonara", "Spicy Szechuan Noodles"]
  },
  {
    id: 6,
    title: "Budget Gourmet",
    description: "Create a 3-course meal for under $15!",
    icon: "💎",
    difficulty: "Hard",
    duration: "Ongoing",
    prize: "Deal Hunter Badge + 60 MealCoins",
    participants: 712,
    image: "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&q=80&w=600",
    status: "active",
    progress: 35,
    recipes: ["Organic Harvest Bowl", "Creamy Mushroom Risotto", "Buddha Power Bowl"]
  }
];

// Exponential Backoff Fetch for Gemini API
const fetchGeminiWithBackoff = async (prompt, systemPrompt) => {
  const apiKey = ""; // API Key injected at runtime
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          suggestion: { type: "STRING" },
          suggestedPrice: { type: "NUMBER" },
          reason: { type: "STRING" }
        },
        required: ["suggestion", "suggestedPrice", "reason"]
      }
    }
  };

  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < 6; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(text);
    } catch (error) {
      if (i === 5) throw error;
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
};

// --- Components ---

// 1. AUTHENTICATION (Login/Register Interface)
const AuthView = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('Home Cook');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      // Login logic - check against USERS_DB
      const user = USERS_DB.find(u => u.email === email && u.password === password);
      if (user) {
        onLogin({ name: user.name, role: user.role, email: user.email, id: user.id, avatar: user.avatar });
      } else {
        setError('Invalid email or password. Try: elif@bilkent.edu.tr / password123');
      }
    } else {
      // Register logic - create new user (for demo)
      if (email && password) {
        const newUser = {
          id: USERS_DB.length + 1,
          name: `${role} User`,
          email: email,
          password: password,
          role: role,
          avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100",
          joinDate: new Date().toISOString().split('T')[0],
          stats: {}
        };
        onLogin({ name: newUser.name, role: newUser.role, email: newUser.email, id: newUser.id });
      } else {
        setError('Please fill in all fields');
      }
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
        <p className="text-sm text-tertiary text-center mb-4 font-medium">
          {isLogin ? 'Log in to manage your meals and orders.' : 'Join the farm-to-table marketplace.'}
        </p>
        
        {isLogin && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-[10px] font-bold text-blue-700 dark:text-blue-400">
            Demo Accounts:<br/>
            📧 elif@bilkent.edu.tr / password123<br/>
            👨‍🍳 aybegum@mealdeal.com / chef123<br/>
            🌾 supplier@ankara.farm / supplier123
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-[10px] font-bold text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
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
            <label className="text-[10px] font-black uppercase text-tertiary mb-2 block tracking-widest">Password</label>
            <input 
              required 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-tertiary dark:bg-slate-700 border border-primary dark:border-slate-600 rounded-2xl px-4 py-3 text-sm text-primary dark:text-white outline-none focus:border-emerald-500 transition-colors placeholder:text-tertiary dark:placeholder:text-slate-500" 
            />
          </div>

          <button type="submit" className="w-full bg-slate-900 dark:bg-slate-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs mt-4 hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors shadow-lg shadow-slate-200 dark:shadow-slate-950">
            {isLogin ? 'Sign In' : 'Register Account'}
          </button>
        </form>

        <p className="text-center text-xs font-bold text-tertiary mt-8">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); setEmail(''); setPassword(''); }} className="text-emerald-600 dark:text-emerald-400 hover:underline">
            {isLogin ? 'Register' : 'Log In'}
          </button>
        </p>
      </div>
    </div>
  );
};

const Navbar = ({ user, activeTab, setTab, cartCount, onLogout, darkMode, setDarkMode }) => (
  <nav className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-6 h-16 flex items-center justify-between">
    <div className="flex items-center gap-8">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setTab('explore')}>
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">M</div>
        <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white hidden sm:block">mealDeal</span>
      </div>
      <div className="hidden md:flex items-center gap-6">
        {['explore', 'challenges', 'my-meals'].map((tab) => (
          <button key={tab} onClick={() => setTab(tab)} className={`text-sm font-bold capitalize transition-all ${activeTab === tab ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
            {tab.replace('-', ' ')}
          </button>
        ))}
        {user && user.role === 'Verified Chef' && (
          <button onClick={() => setTab('dashboard')} className={`text-sm font-bold capitalize transition-all ${activeTab === 'dashboard' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'}`}>
            Dashboard
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
          <div className="text-right hidden lg:block mr-2">
            <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">{user.name}</p>
            <p className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest">{user.role}</p>
          </div>
          <button onClick={() => setTab('cart')} className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ShoppingBasket size={20} />
            {cartCount > 0 && <span className="absolute top-1 right-1 bg-orange-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{cartCount}</span>}
          </button>
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

const LogOut = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

// 2. CHALLENGES VIEW
const ChallengesView = () => {
  const [filter, setFilter] = useState('active');

  const filteredChallenges = CHALLENGES.filter(c => 
    filter === 'all' ? true : c.status === filter
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8 pb-20">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-primary mb-6">Kitchen <span className="text-emerald-500 italic">Challenges</span></h1>
        <p className="text-secondary text-lg mb-8">Complete challenges, earn badges, and become a MealDeal champion!</p>
        
        <div className="flex gap-3 mb-8">
          {['all', 'active', 'upcoming'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-6 py-3 rounded-2xl font-bold uppercase text-xs transition-all ${
                filter === status 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20' 
                  : 'bg-tertiary text-secondary hover:bg-primary dark:bg-slate-800 dark:hover:bg-slate-700'
              }`}
            >
              {status === 'all' ? '🎯 All' : status === 'active' ? '⚡ Active' : '🔜 Upcoming'}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        {filteredChallenges.map(challenge => (
          <div key={challenge.id} className="bg-secondary rounded-[2rem] overflow-hidden border border-primary shadow-sm hover:shadow-lg transition-all">
            <div className="relative h-40 overflow-hidden">
              <img src={challenge.image} className="w-full h-full object-cover" />
              <div className="absolute top-4 right-4 bg-white dark:bg-slate-800 rounded-full w-12 h-12 flex items-center justify-center text-2xl shadow-lg">
                {challenge.icon}
              </div>
              <div className="absolute top-4 left-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">
                {challenge.status === 'active' ? '🔥 Active' : '🔜 Upcoming'}
              </div>
            </div>
            
            <div className="p-6">
              <h3 className="text-xl font-black text-primary mb-2">{challenge.title}</h3>
              <p className="text-sm text-secondary mb-4">{challenge.description}</p>
              
              <div className="grid grid-cols-2 gap-3 mb-4 text-[10px] font-bold uppercase">
                <div className="bg-tertiary dark:bg-slate-800 p-2 rounded-lg">
                  <p className="text-tertiary">Duration</p>
                  <p className="text-primary">{challenge.duration}</p>
                </div>
                <div className="bg-tertiary dark:bg-slate-800 p-2 rounded-lg">
                  <p className="text-tertiary">Difficulty</p>
                  <p className="text-primary">{challenge.difficulty}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-bold mb-2">
                  <span className="text-tertiary">Progress</span>
                  <span className="text-primary">{challenge.progress}%</span>
                </div>
                <div className="w-full bg-tertiary dark:bg-slate-800 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${challenge.progress}%` }}
                  />
                </div>
              </div>

              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">🏆 Prize: {challenge.prize}</p>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-tertiary">👥 {challenge.participants} joined</span>
                <button className={`px-4 py-2 rounded-xl font-black uppercase text-[9px] transition-all ${
                  challenge.status === 'active'
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-tertiary text-secondary hover:bg-primary dark:bg-slate-800 dark:hover:bg-slate-700'
                }`}>
                  {challenge.status === 'active' ? 'Join' : 'Notify'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 3. DISCOVERY & FUNCTIONAL FILTERING
const ExploreView = ({ onSelectRecipe }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState('All');
  const [maxTime, setMaxTime] = useState(60);
  const [minRating, setMinRating] = useState(0);

  // Effective Filtering Logic
  const filteredRecipes = useMemo(() => {
    return RECIPES.filter(recipe => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = recipe.title.toLowerCase().includes(searchLower) || 
                            recipe.ingredients.some(i => i.name.toLowerCase().includes(searchLower)) ||
                            recipe.chef.toLowerCase().includes(searchLower);
      const matchesDiet = dietFilter === 'All' || recipe.category === dietFilter;
      const matchesTime = recipe.time <= maxTime;
      const matchesRating = recipe.rating >= minRating;
      return matchesSearch && matchesDiet && matchesTime && matchesRating;
    });
  }, [searchQuery, dietFilter, maxTime, minRating]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-8">
      <header className="mb-12">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-6">Discovery <span className="text-emerald-500 italic">Marketplace</span></h1>
        
        {/* Search & Advanced Filters */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm mb-8 space-y-6">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700 px-5 py-4 rounded-2xl w-full border border-slate-200 dark:border-slate-600 focus-within:border-emerald-500 focus-within:bg-white dark:focus-within:bg-slate-600 transition-all">
            <Search size={20} className="text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Search recipes, ingredients, or chefs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500" 
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"><X size={16}/></button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-6 px-2">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Diet:</span>
              <div className="flex bg-slate-50 dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600">
                {['All', 'Vegan', 'Keto', 'Gluten-Free'].map(diet => (
                  <button 
                    key={diet}
                    onClick={() => setDietFilter(diet)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dietFilter === diet ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    {diet}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Max Time:</span>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600">
                <input type="range" min="10" max="60" step="5" value={maxTime} onChange={(e) => setMaxTime(Number(e.target.value))} className="w-24 accent-emerald-500" />
                <span className="text-xs font-bold w-12 text-slate-700 dark:text-slate-300">{maxTime} min</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Min Rating:</span>
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700 p-1 rounded-xl border border-slate-200 dark:border-slate-600 px-2">
                {[0, 3, 4, 4.5].map(rating => (
                  <button 
                    key={rating}
                    onClick={() => setMinRating(rating)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${minRating === rating ? 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'}`}
                  >
                    {rating === 0 ? 'Any' : <><Star size={12} fill="currentColor" /> {rating}+</>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {filteredRecipes.length === 0 ? (
        <div className="py-20 text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[3rem]">
          No recipes found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
          {filteredRecipes.map(recipe => (
            <div key={recipe.id} onClick={() => onSelectRecipe(recipe)} className="bg-white dark:bg-slate-800 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all cursor-pointer group">
              <div className="relative h-52 overflow-hidden">
                <img src={recipe.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-black uppercase text-slate-800 dark:text-white tracking-widest">{recipe.category}</div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{recipe.title}</h3>
                  <div className="flex items-center gap-1 text-amber-500 shrink-0">
                    <Star size={12} fill="currentColor" />
                    <span className="text-xs font-bold">{recipe.rating}</span>
                  </div>
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs mb-4 font-medium italic">by {recipe.chef}</p>
                <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Clock size={12} /> {recipe.time}M</span>
                  <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{recipe.difficulty}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 3. RECIPE DETAIL & SHOPPING CART GENERATION
const RecipeDetailView = ({ recipe, onBack, onAddToCart }) => {
  const [servings, setServings] = useState(2);
  const [activeSubView, setActiveSubView] = useState('ingredients');
  const [ingredientsState, setIngredientsState] = useState(recipe.ingredients.map(i => ({ ...i, selected: true })));

  // AI substitution state
  const [aiTargetIngredient, setAiTargetIngredient] = useState(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Recalculate quantities and price based on servings and selection
  const scaleFactor = servings / 2;
  
  const selectedTotal = useMemo(() => {
    return ingredientsState
      .filter(i => i.selected)
      .reduce((total, i) => total + (i.pricePerUnit * (i.baseQty * scaleFactor)), 0);
  }, [ingredientsState, scaleFactor]);

  const handleToggleIngredient = (id) => {
    setIngredientsState(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  };

  const handleRequestAI = (ingredient) => {
    setAiTargetIngredient(ingredient);
    setAiPrompt('');
    setAiResult(null);
  };

  // GEMINI API INTEGRATION
  const handleGenerateAISub = async () => {
    setAiLoading(true);
    try {
      const systemPrompt = "You are an expert culinary AI assistant for 'MealDeal', a Farm-to-Table marketplace. A user needs an ingredient substitution based on local availability, dietary restrictions, or personal requests. You must return a JSON object with strictly these three fields: 'suggestion' (the specific name of the substitute), 'suggestedPrice' (a reasonable estimated unit price as a number, e.g., 1.50), and 'reason' (a 1-2 sentence explanation of why this is a good substitute based on the user's prompt).";
      const prompt = `I need a substitute for ${aiTargetIngredient.name} (Taxonomy Category: ${aiTargetIngredient.taxonomy}). My specific request or constraint is: "${aiPrompt}". Currently, the original ingredient costs $${aiTargetIngredient.pricePerUnit.toFixed(2)} per unit. Give me a creative and practical alternative.`;
      
      const result = await fetchGeminiWithBackoff(prompt, systemPrompt);
      
      setAiResult({
        targetId: aiTargetIngredient.id,
        original: aiTargetIngredient.name,
        suggestion: result.suggestion,
        suggestedPrice: result.suggestedPrice,
        reason: result.reason
      });
    } catch (error) {
      console.error("AI Substitution failed:", error);
      // Fallback in case API key is missing or call fails
      setAiResult({
        targetId: aiTargetIngredient.id,
        original: aiTargetIngredient.name,
        suggestion: "Standard Pantry Substitute",
        suggestedPrice: aiTargetIngredient.pricePerUnit,
        reason: "The AI service is currently unavailable. We recommend using a standard generic substitute for now."
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplySubstitution = () => {
    setIngredientsState(prev => prev.map(i => {
      if (i.id === aiResult.targetId) {
        return {
          ...i,
          name: aiResult.suggestion,
          status: 'available',
          pricePerUnit: aiResult.suggestedPrice / i.baseQty // Estimate new unit price
        };
      }
      return i;
    }));
    setAiTargetIngredient(null);
    setAiResult(null);
  };

  const missingIngredientsCount = ingredientsState.filter(i => i.status === 'missing').length;

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 pt-8 pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 mb-8 font-black text-[10px] uppercase tracking-widest">
        <ArrowLeft size={16} /> Back to discovery
      </button>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <div className="rounded-[2.5rem] overflow-hidden shadow-xl mb-10 aspect-video relative">
            <img src={recipe.image} className="w-full h-full object-cover" />
          </div>

          <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">{recipe.title}</h1>
          <div className="flex items-center gap-4 mb-8">
             <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
               <Leaf size={14} /> Farm Sourced
             </div>
             <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
               <ChefHat size={14} /> {recipe.chef}
             </div>
          </div>

          <div className="flex border-b border-slate-100 dark:border-slate-700 mb-8">
            {['ingredients', 'steps', 'reviews'].map(view => (
              <button key={view} onClick={() => setActiveSubView(view)} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeSubView === view ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-400 dark:text-slate-500'}`}>
                {view}
              </button>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm p-8 min-h-[300px]">
            {activeSubView === 'ingredients' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[10px]">Select what you need</h3>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Uncheck items you already have.</span>
                </div>
                {ingredientsState.map(ing => (
                  <div key={ing.id} className={`flex items-center justify-between py-4 border-b border-slate-50 dark:border-slate-700 last:border-0 transition-colors ${!ing.selected ? 'opacity-50 grayscale' : ''}`}>
                    <div className="flex items-center gap-4">
                      <input 
                        type="checkbox" 
                        checked={ing.selected} 
                        onChange={() => handleToggleIngredient(ing.id)}
                        className="w-5 h-5 accent-emerald-500 rounded cursor-pointer" 
                      />
                      <div>
                        <p className={`font-bold text-slate-800 dark:text-white ${!ing.selected && 'line-through'}`}>{ing.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{ing.taxonomy}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      {/* Interactive AI Suggestion Button per Ingredient */}
                      <button 
                        onClick={() => handleRequestAI(ing)}
                        className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-full transition-colors flex items-center justify-center shadow-sm"
                        title={`Ask AI to substitute ${ing.name}`}
                      >
                        <Sparkles size={16} />
                      </button>

                      <div className="w-20">
                        <p className="font-black text-slate-900">{(ing.baseQty * scaleFactor).toFixed(1)} {ing.unit}</p>
                        <span className={`text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 justify-end ${ing.status === 'available' ? 'text-emerald-500' : ing.status === 'missing' ? 'text-red-500' : 'text-orange-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${ing.status === 'available' ? 'bg-emerald-500' : ing.status === 'missing' ? 'bg-red-500' : 'bg-orange-500'}`} /> {ing.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeSubView === 'steps' && (
              <div className="space-y-6">
                {recipe.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-700 text-white flex items-center justify-center font-black text-xs shrink-0">{idx + 1}</div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed pt-1">{step}</p>
                  </div>
                ))}
              </div>
            )}
            {activeSubView === 'reviews' && (
              <div className="space-y-6">
                {recipe.reviews.map((rev, idx) => (
                  <div key={idx} className="p-6 bg-slate-50 dark:bg-slate-700 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-800 dark:text-white text-sm">{rev.user}</span>
                      <div className="flex gap-0.5 text-amber-500"><Star size={12} fill="currentColor" /></div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">"{rev.comment}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ORDER CUSTOMIZATION SIDEBAR */}
        <div className="lg:w-96">
          <div className="sticky top-24 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-2xl p-8">
            <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-8 text-center">Order Customization</h3>
            
            <div className="flex items-center justify-between mb-10">
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase">Serving Size</span>
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-700 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-600">
                <button onClick={() => setServings(Math.max(1, servings-1))} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"><Minus size={16} /></button>
                <span className="text-xl font-black text-slate-900 dark:text-white w-8 text-center">{servings}</span>
                <button onClick={() => setServings(Math.min(12, servings+1))} className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"><Plus size={16} /></button>
              </div>
            </div>

            <div className="space-y-3 mb-10">
              <div className="flex justify-between text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                <span>Selected Ingredients ({ingredientsState.filter(i => i.selected).length})</span>
                <span className="text-slate-900 dark:text-white">${selectedTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                <span>Supplier Fee</span>
                <span className="text-slate-900 dark:text-white">${selectedTotal > 0 ? '1.99' : '0.00'}</span>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <span className="text-sm font-black text-slate-900 dark:text-white uppercase">Total</span>
                <span className="text-3xl font-black text-emerald-500 dark:text-emerald-400">${selectedTotal > 0 ? (selectedTotal + 1.99).toFixed(2) : '0.00'}</span>
              </div>
            </div>

            <button 
              disabled={selectedTotal === 0 || missingIngredientsCount > 0}
              onClick={() => onAddToCart({ ...recipe, cartIngredients: ingredientsState.filter(i => i.selected), finalPrice: selectedTotal }, servings)} 
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${selectedTotal === 0 || missingIngredientsCount > 0 ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 hover:bg-emerald-600 dark:hover:bg-emerald-600 active:scale-95'}`}
            >
              <ShoppingBasket size={18} /> 
              {missingIngredientsCount > 0 ? 'Resolve Missing Items' : 'Shop This Meal'}
            </button>
            <button className="w-full mt-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 py-3 rounded-2xl font-black uppercase tracking-widest text-[9px] hover:border-slate-400 dark:hover:border-slate-500 transition-all flex items-center justify-center gap-2">
              <ListPlus size={14} /> Add to Meal List
            </button>
          </div>
        </div>
      </div>

      {/* AI SUBSTITUTION INTERACTIVE MODAL */}
      {aiTargetIngredient && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm" onClick={() => setAiTargetIngredient(null)} />
          <div className="relative bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl"><Sparkles size={24} /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">Ask AI to Substitute</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Target: {aiTargetIngredient.name}</p>
                </div>
              </div>
              <button onClick={() => setAiTargetIngredient(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500"><X size={20} /></button>
            </div>
            
            {!aiResult ? (
              <div className="space-y-4">
                <label className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest">Why do you need a substitute?</label>
                <textarea 
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., 'I have a peanut allergy', 'It is out of stock', 'I want something cheaper'..."
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl p-4 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-indigo-400 h-24 resize-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button 
                  onClick={handleGenerateAISub}
                  disabled={!aiPrompt.trim() || aiLoading}
                  className="w-full bg-indigo-600 dark:bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 dark:hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {aiLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Sparkles size={16} />}
                  {aiLoading ? 'Calling Gemini API...' : 'Generate Suggestion'}
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 line-through">{aiResult.original}</span>
                    <ArrowRight size={14} className="text-indigo-500 dark:text-indigo-400" />
                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{aiResult.suggestion}</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 italic leading-relaxed">"{aiResult.reason}"</p>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-4">Estimated Unit Price: ${aiResult.suggestedPrice.toFixed(2)}</p>
                  <div className="flex gap-3">
                    <button onClick={() => setAiResult(null)} className="flex-1 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">Retry</button>
                    <button onClick={handleApplySubstitution} className="flex-1 py-3 bg-indigo-600 dark:bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-700 dark:hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">Apply Substitute</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 4. MOCK PAYMENT & CHECKOUT
const CartView = ({ items, onRemove, onCheckoutComplete }) => {
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
            <strong>System Action Logged:</strong><br/>
            - Local Supplier inventory deducted.<br/>
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
            {currentTab === 'dashboard' && user?.role === 'Verified Chef' && (
              <div className="py-24 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-600"><TrendingUp size={32} /></div>
                <h2 className="text-lg font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Chef Analytics Hub</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2">Monitor royalties based on Logged Cooks.</p>
              </div>
            )}
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