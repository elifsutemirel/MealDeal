// --- Enhanced Mock Data ---
// Note: Prices are now per unit to allow users to deselect ingredients they already own.
export const RECIPES = [
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
      { id: 'i1', name: "Quinoa", baseQty: 100, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Grains", pricePerUnit: 0.02 },
      { id: 'i2', name: "Sweet Potato", baseQty: 1, unit: "pc", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Root Veg", pricePerUnit: 1.50 },
      { id: 'i3', name: "Roma Tomato", baseQty: 2, unit: "pcs", suppliers: [], taxonomy: "Tomato", pricePerUnit: 0.75 },
      { id: 'i4', name: "Kale", baseQty: 50, unit: "g", suppliers: ["Bahcelievler Market"], taxonomy: "Leafy Greens", pricePerUnit: 0.03 }
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
      { id: 'i5', name: "Salmon Fillet", baseQty: 180, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Fish", pricePerUnit: 0.05 },
      { id: 'i6', name: "Asparagus", baseQty: 6, unit: "spears", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Veg", pricePerUnit: 0.50 },
      { id: 'i7', name: "Lemon", baseQty: 0.5, unit: "pc", suppliers: [], taxonomy: "Citrus", pricePerUnit: 1.00 },
      { id: 'i8', name: "Grass-fed Butter", baseQty: 15, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Dairy", pricePerUnit: 0.04 }
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
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=600",
    ingredients: [
      { id: 'i9', name: "Arborio Rice", baseQty: 300, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Grains", pricePerUnit: 0.01 },
      { id: 'i10', name: "Cremini Mushrooms", baseQty: 250, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Mushrooms", pricePerUnit: 0.04 },
      { id: 'i11', name: "Parmesan Cheese", baseQty: 80, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Cheese", pricePerUnit: 0.10 },
      { id: 'i12', name: "Vegetable Broth", baseQty: 1, unit: "L", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Broth", pricePerUnit: 1.20 },
      { id: 'i13', name: "White Wine", baseQty: 200, unit: "ml", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Wine", pricePerUnit: 0.15 }
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
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=600",
    ingredients: [
      { id: 'i14', name: "Chicken Breast", baseQty: 400, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Poultry", pricePerUnit: 0.025 },
      { id: 'i15', name: "Thai Green Curry Paste", baseQty: 3, unit: "tbsp", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Spice", pricePerUnit: 0.50 },
      { id: 'i16', name: "Coconut Milk", baseQty: 400, unit: "ml", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Dairy Alt", pricePerUnit: 0.08 },
      { id: 'i17', name: "Thai Basil", baseQty: 30, unit: "g", suppliers: ["Bahcelievler Market"], taxonomy: "Herbs", pricePerUnit: 0.20 },
      { id: 'i18', name: "Bell Pepper", baseQty: 1, unit: "pc", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Veg", pricePerUnit: 1.00 }
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
    image: "https://images.unsplash.com/photo-1608756687911-aa1599ab3bd9?auto=format&fit=crop&q=80&w=600",
    ingredients: [
      { id: 'i19', name: "Fresh Pasta", baseQty: 400, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Grains", pricePerUnit: 0.15 },
      { id: 'i20', name: "Guanciale", baseQty: 150, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Meat", pricePerUnit: 0.30 },
      { id: 'i21', name: "Pecorino Romano", baseQty: 100, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Cheese", pricePerUnit: 0.12 },
      { id: 'i22', name: "Egg Yolks", baseQty: 4, unit: "pcs", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Eggs", pricePerUnit: 0.15 },
      { id: 'i23', name: "Black Truffle Oil", baseQty: 2, unit: "tbsp", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Oil", pricePerUnit: 0.80 }
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
      { id: 'i24', name: "Brown Rice", baseQty: 150, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Grains", pricePerUnit: 0.01 },
      { id: 'i25', name: "Chickpeas", baseQty: 200, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Legumes", pricePerUnit: 0.02 },
      { id: 'i26', name: "Avocado", baseQty: 1, unit: "pc", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Fruit", pricePerUnit: 2.00 },
      { id: 'i27', name: "Spirulina", baseQty: 1, unit: "tbsp", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Superfood", pricePerUnit: 0.30 },
      { id: 'i28', name: "Goji Berries", baseQty: 30, unit: "g", suppliers: ["Bahcelievler Market"], taxonomy: "Berries", pricePerUnit: 0.50 }
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
      { id: 'i29', name: "Sea Bass Fillet", baseQty: 200, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Fish", pricePerUnit: 0.08 },
      { id: 'i30', name: "Lemon", baseQty: 1, unit: "pc", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Citrus", pricePerUnit: 0.50 },
      { id: 'i31', name: "Butter", baseQty: 50, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Dairy", pricePerUnit: 0.02 },
      { id: 'i32', name: "Fresh Thyme", baseQty: 10, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Herbs", pricePerUnit: 0.30 },
      { id: 'i33', name: "Garlic", baseQty: 2, unit: "cloves", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Veg", pricePerUnit: 0.05 }
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
      { id: 'i34', name: "Ramen Noodles", baseQty: 300, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Grains", pricePerUnit: 0.02 },
      { id: 'i35', name: "Szechuan Peppercorns", baseQty: 1, unit: "tbsp", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Spice", pricePerUnit: 0.40 },
      { id: 'i36', name: "Chili Oil", baseQty: 3, unit: "tbsp", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Oil", pricePerUnit: 0.15 },
      { id: 'i37', name: "Sesame Oil", baseQty: 2, unit: "tbsp", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Oil", pricePerUnit: 0.12 },
      { id: 'i38', name: "Green Onion", baseQty: 50, unit: "g", suppliers: ["Bilkent Hub", "Tunali Fresh"], taxonomy: "Veg", pricePerUnit: 0.08 }
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
