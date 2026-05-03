// seed_ingredients_comprehensive.cjs
// Comprehensive ingredient database with enforced units

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres_secure_2026',
  database: process.env.PGDATABASE || 'mealdeal',
});

// Comprehensive ingredient list with allowed units
const INGREDIENTS = [
  // === GRAINS & STARCHES ===
  { name: 'Quinoa', allowed_units: 'kg,g,cup' },
  { name: 'White Rice', allowed_units: 'kg,g,cup' },
  { name: 'Brown Rice', allowed_units: 'kg,g,cup' },
  { name: 'Basmati Rice', allowed_units: 'kg,g,cup' },
  { name: 'Arborio Rice', allowed_units: 'kg,g,cup' },
  { name: 'Jasmine Rice', allowed_units: 'kg,g,cup' },
  { name: 'Wild Rice', allowed_units: 'kg,g,cup' },
  { name: 'Pasta', allowed_units: 'kg,g,lb,oz' },
  { name: 'Spaghetti', allowed_units: 'kg,g,lb,oz' },
  { name: 'Penne', allowed_units: 'kg,g,lb,oz' },
  { name: 'Fettuccine', allowed_units: 'kg,g,lb,oz' },
  { name: 'Lasagna Sheets', allowed_units: 'kg,g,pc,pcs' },
  { name: 'Fresh Pasta', allowed_units: 'kg,g,lb,oz' },
  { name: 'Ramen Noodles', allowed_units: 'kg,g,pcs' },
  { name: 'Rice Noodles', allowed_units: 'kg,g,lb,oz' },
  { name: 'Udon Noodles', allowed_units: 'kg,g,lb,oz' },
  { name: 'Couscous', allowed_units: 'kg,g,cup' },
  { name: 'Bulgur', allowed_units: 'kg,g,cup' },
  { name: 'Oats', allowed_units: 'kg,g,cup' },
  { name: 'Rolled Oats', allowed_units: 'kg,g,cup' },
  { name: 'Steel Cut Oats', allowed_units: 'kg,g,cup' },
  { name: 'Cornmeal', allowed_units: 'kg,g,cup' },
  { name: 'Polenta', allowed_units: 'kg,g,cup' },
  { name: 'Bread Crumbs', allowed_units: 'kg,g,cup' },
  { name: 'Panko', allowed_units: 'kg,g,cup' },

  // === FLOURS & BAKING ===
  { name: 'All-Purpose Flour', allowed_units: 'kg,g,cup' },
  { name: 'Bread Flour', allowed_units: 'kg,g,cup' },
  { name: 'Whole Wheat Flour', allowed_units: 'kg,g,cup' },
  { name: 'Cake Flour', allowed_units: 'kg,g,cup' },
  { name: 'Almond Flour', allowed_units: 'kg,g,cup' },
  { name: 'Coconut Flour', allowed_units: 'kg,g,cup' },
  { name: 'Cornstarch', allowed_units: 'kg,g,tbsp,tsp' },
  { name: 'Baking Powder', allowed_units: 'g,tbsp,tsp' },
  { name: 'Baking Soda', allowed_units: 'g,tbsp,tsp' },
  { name: 'Yeast', allowed_units: 'g,tbsp,tsp,pcs' },
  { name: 'Sugar', allowed_units: 'kg,g,cup,tbsp,tsp' },
  { name: 'Brown Sugar', allowed_units: 'kg,g,cup,tbsp,tsp' },
  { name: 'Powdered Sugar', allowed_units: 'kg,g,cup,tbsp,tsp' },
  { name: 'Honey', allowed_units: 'kg,g,L,ml,cup,tbsp,tsp' },
  { name: 'Maple Syrup', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Molasses', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Vanilla Extract', allowed_units: 'ml,tbsp,tsp' },
  { name: 'Cocoa Powder', allowed_units: 'kg,g,cup,tbsp,tsp' },
  { name: 'Chocolate Chips', allowed_units: 'kg,g,cup' },

  // === PROTEINS - MEAT ===
  { name: 'Chicken Breast', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Chicken Thigh', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Chicken Wings', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Whole Chicken', allowed_units: 'kg,g,lb,pc' },
  { name: 'Ground Chicken', allowed_units: 'kg,g,lb,oz' },
  { name: 'Beef Steak', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Ground Beef', allowed_units: 'kg,g,lb,oz' },
  { name: 'Beef Brisket', allowed_units: 'kg,g,lb,oz' },
  { name: 'Beef Ribs', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Pork Chops', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Ground Pork', allowed_units: 'kg,g,lb,oz' },
  { name: 'Bacon', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Pancetta', allowed_units: 'kg,g,lb,oz' },
  { name: 'Guanciale', allowed_units: 'kg,g,lb,oz' },
  { name: 'Prosciutto', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Sausage', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Italian Sausage', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Chorizo', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Lamb Chops', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Ground Lamb', allowed_units: 'kg,g,lb,oz' },
  { name: 'Turkey Breast', allowed_units: 'kg,g,lb,oz' },
  { name: 'Ground Turkey', allowed_units: 'kg,g,lb,oz' },

  // === PROTEINS - SEAFOOD ===
  { name: 'Salmon Fillet', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Tuna Steak', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Cod Fillet', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Sea Bass Fillet', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Halibut', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Tilapia', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Trout', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Shrimp', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Prawns', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Scallops', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Mussels', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Clams', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Oysters', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Squid', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Octopus', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Crab Meat', allowed_units: 'kg,g,lb,oz' },
  { name: 'Lobster Tail', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Anchovies', allowed_units: 'kg,g,oz,pcs' },
  { name: 'Sardines', allowed_units: 'kg,g,oz,pcs' },

  // === PROTEINS - PLANT-BASED ===
  { name: 'Tofu', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Tempeh', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Seitan', allowed_units: 'kg,g,lb,oz' },
  { name: 'Black Beans', allowed_units: 'kg,g,cup' },
  { name: 'Kidney Beans', allowed_units: 'kg,g,cup' },
  { name: 'Pinto Beans', allowed_units: 'kg,g,cup' },
  { name: 'Cannellini Beans', allowed_units: 'kg,g,cup' },
  { name: 'Chickpeas', allowed_units: 'kg,g,cup' },
  { name: 'Lentils', allowed_units: 'kg,g,cup' },
  { name: 'Red Lentils', allowed_units: 'kg,g,cup' },
  { name: 'Green Lentils', allowed_units: 'kg,g,cup' },
  { name: 'Split Peas', allowed_units: 'kg,g,cup' },

  // === VEGETABLES - LEAFY GREENS ===
  { name: 'Spinach', allowed_units: 'kg,g,lb,oz,bunch,cup' },
  { name: 'Kale', allowed_units: 'kg,g,lb,oz,bunch,cup' },
  { name: 'Arugula', allowed_units: 'kg,g,lb,oz,bunch,cup' },
  { name: 'Swiss Chard', allowed_units: 'kg,g,lb,oz,bunch' },
  { name: 'Collard Greens', allowed_units: 'kg,g,lb,oz,bunch' },
  { name: 'Lettuce', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Romaine Lettuce', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Iceberg Lettuce', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Cabbage', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Red Cabbage', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Napa Cabbage', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Bok Choy', allowed_units: 'kg,g,lb,oz,pc,bunch' },

  // === VEGETABLES - ROOT & TUBERS ===
  { name: 'Potato', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Sweet Potato', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Carrot', allowed_units: 'kg,g,lb,oz,pc,pcs,bunch' },
  { name: 'Beet', allowed_units: 'kg,g,lb,oz,pc,pcs,bunch' },
  { name: 'Turnip', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Parsnip', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Radish', allowed_units: 'kg,g,lb,oz,pc,pcs,bunch' },
  { name: 'Onion', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Red Onion', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Yellow Onion', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'White Onion', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Shallot', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Garlic', allowed_units: 'kg,g,lb,oz,pc,clove' },
  { name: 'Ginger', allowed_units: 'kg,g,lb,oz,pc,tbsp,tsp' },
  { name: 'Turmeric Root', allowed_units: 'kg,g,oz,pc' },

  // === VEGETABLES - FRUITING ===
  { name: 'Tomato', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Roma Tomato', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Cherry Tomato', allowed_units: 'kg,g,lb,oz,pcs,cup' },
  { name: 'Cucumber', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Zucchini', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Eggplant', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Bell Pepper', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Red Bell Pepper', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Yellow Bell Pepper', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Green Bell Pepper', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Jalapeño', allowed_units: 'kg,g,oz,pc,pcs' },
  { name: 'Serrano Pepper', allowed_units: 'kg,g,oz,pc,pcs' },
  { name: 'Habanero', allowed_units: 'kg,g,oz,pc,pcs' },
  { name: 'Thai Chili', allowed_units: 'kg,g,oz,pc,pcs' },
  { name: 'Poblano Pepper', allowed_units: 'kg,g,oz,pc,pcs' },

  // === VEGETABLES - OTHER ===
  { name: 'Broccoli', allowed_units: 'kg,g,lb,oz,pc,bunch' },
  { name: 'Cauliflower', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Brussels Sprouts', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Asparagus', allowed_units: 'kg,g,lb,oz,spear,bunch' },
  { name: 'Green Beans', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Peas', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Snow Peas', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Snap Peas', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Corn', allowed_units: 'kg,g,lb,oz,pc,pcs,cup' },
  { name: 'Celery', allowed_units: 'kg,g,lb,oz,pc,bunch' },
  { name: 'Leek', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Fennel', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Artichoke', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Okra', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Butternut Squash', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Acorn Squash', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Pumpkin', allowed_units: 'kg,g,lb,oz,pc' },

  // === MUSHROOMS ===
  { name: 'Button Mushrooms', allowed_units: 'kg,g,lb,oz,pcs,cup' },
  { name: 'Cremini Mushrooms', allowed_units: 'kg,g,lb,oz,pcs,cup' },
  { name: 'Portobello Mushrooms', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Shiitake Mushrooms', allowed_units: 'kg,g,lb,oz,pcs,cup' },
  { name: 'Oyster Mushrooms', allowed_units: 'kg,g,lb,oz,pcs,cup' },
  { name: 'Chanterelle Mushrooms', allowed_units: 'kg,g,lb,oz,pcs' },
  { name: 'Porcini Mushrooms', allowed_units: 'kg,g,oz,pcs' },
  { name: 'Enoki Mushrooms', allowed_units: 'kg,g,oz,pcs' },

  // === FRUITS ===
  { name: 'Apple', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Banana', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Orange', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Lemon', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Lime', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Grapefruit', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Strawberry', allowed_units: 'kg,g,lb,oz,pcs,cup' },
  { name: 'Blueberry', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Raspberry', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Blackberry', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Cranberry', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Grape', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Watermelon', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Cantaloupe', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Honeydew Melon', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Pineapple', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Mango', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Papaya', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Peach', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Nectarine', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Plum', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Apricot', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Cherry', allowed_units: 'kg,g,lb,oz,pcs,cup' },
  { name: 'Pear', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Kiwi', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Avocado', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Coconut', allowed_units: 'kg,g,lb,oz,pc' },
  { name: 'Pomegranate', allowed_units: 'kg,g,lb,oz,pc,pcs' },
  { name: 'Fig', allowed_units: 'kg,g,oz,pc,pcs' },
  { name: 'Date', allowed_units: 'kg,g,oz,pcs,cup' },
  { name: 'Goji Berries', allowed_units: 'kg,g,oz,cup' },

  // === DAIRY & EGGS ===
  { name: 'Milk', allowed_units: 'L,ml,cup' },
  { name: 'Whole Milk', allowed_units: 'L,ml,cup' },
  { name: 'Skim Milk', allowed_units: 'L,ml,cup' },
  { name: 'Heavy Cream', allowed_units: 'L,ml,cup,tbsp' },
  { name: 'Light Cream', allowed_units: 'L,ml,cup,tbsp' },
  { name: 'Half and Half', allowed_units: 'L,ml,cup,tbsp' },
  { name: 'Sour Cream', allowed_units: 'kg,g,cup,tbsp' },
  { name: 'Yogurt', allowed_units: 'kg,g,L,ml,cup' },
  { name: 'Greek Yogurt', allowed_units: 'kg,g,cup' },
  { name: 'Butter', allowed_units: 'kg,g,lb,oz,tbsp' },
  { name: 'Grass-fed Butter', allowed_units: 'kg,g,lb,oz,tbsp' },
  { name: 'Ghee', allowed_units: 'kg,g,lb,oz,tbsp' },
  { name: 'Cream Cheese', allowed_units: 'kg,g,lb,oz,tbsp' },
  { name: 'Cottage Cheese', allowed_units: 'kg,g,cup' },
  { name: 'Ricotta Cheese', allowed_units: 'kg,g,cup' },
  { name: 'Mozzarella Cheese', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Cheddar Cheese', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Parmesan Cheese', allowed_units: 'kg,g,lb,oz,cup,tbsp' },
  { name: 'Pecorino Romano', allowed_units: 'kg,g,lb,oz,cup,tbsp' },
  { name: 'Gruyere Cheese', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Feta Cheese', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Goat Cheese', allowed_units: 'kg,g,lb,oz' },
  { name: 'Blue Cheese', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Brie', allowed_units: 'kg,g,lb,oz' },
  { name: 'Eggs', allowed_units: 'pcs' },
  { name: 'Egg Whites', allowed_units: 'pcs,ml,cup' },
  { name: 'Egg Yolks', allowed_units: 'pcs' },

  // === PLANT MILKS ===
  { name: 'Almond Milk', allowed_units: 'L,ml,cup' },
  { name: 'Soy Milk', allowed_units: 'L,ml,cup' },
  { name: 'Oat Milk', allowed_units: 'L,ml,cup' },
  { name: 'Coconut Milk', allowed_units: 'L,ml,cup' },
  { name: 'Cashew Milk', allowed_units: 'L,ml,cup' },
  { name: 'Rice Milk', allowed_units: 'L,ml,cup' },

  // === OILS & FATS ===
  { name: 'Olive Oil', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Extra Virgin Olive Oil', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Vegetable Oil', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Canola Oil', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Coconut Oil', allowed_units: 'kg,g,L,ml,cup,tbsp,tsp' },
  { name: 'Sesame Oil', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Avocado Oil', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Peanut Oil', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Sunflower Oil', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Grapeseed Oil', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Truffle Oil', allowed_units: 'ml,tbsp,tsp' },
  { name: 'Black Truffle Oil', allowed_units: 'ml,tbsp,tsp' },
  { name: 'Chili Oil', allowed_units: 'L,ml,cup,tbsp,tsp' },

  // === NUTS & SEEDS ===
  { name: 'Almonds', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Walnuts', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Cashews', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Peanuts', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Pecans', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Pistachios', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Hazelnuts', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Macadamia Nuts', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Pine Nuts', allowed_units: 'kg,g,oz,cup,tbsp' },
  { name: 'Peanut Butter', allowed_units: 'kg,g,lb,oz,cup,tbsp' },
  { name: 'Almond Butter', allowed_units: 'kg,g,lb,oz,cup,tbsp' },
  { name: 'Tahini', allowed_units: 'kg,g,cup,tbsp' },
  { name: 'Sunflower Seeds', allowed_units: 'kg,g,lb,oz,cup,tbsp' },
  { name: 'Pumpkin Seeds', allowed_units: 'kg,g,lb,oz,cup,tbsp' },
  { name: 'Chia Seeds', allowed_units: 'kg,g,oz,cup,tbsp,tsp' },
  { name: 'Flax Seeds', allowed_units: 'kg,g,oz,cup,tbsp,tsp' },
  { name: 'Sesame Seeds', allowed_units: 'kg,g,oz,cup,tbsp,tsp' },
  { name: 'Poppy Seeds', allowed_units: 'kg,g,oz,tbsp,tsp' },

  // === HERBS (FRESH) ===
  { name: 'Basil', allowed_units: 'g,oz,bunch,cup,tbsp' },
  { name: 'Thai Basil', allowed_units: 'g,oz,bunch,cup,tbsp' },
  { name: 'Parsley', allowed_units: 'g,oz,bunch,cup,tbsp' },
  { name: 'Cilantro', allowed_units: 'g,oz,bunch,cup,tbsp' },
  { name: 'Mint', allowed_units: 'g,oz,bunch,cup,tbsp' },
  { name: 'Dill', allowed_units: 'g,oz,bunch,cup,tbsp' },
  { name: 'Rosemary', allowed_units: 'g,oz,bunch,tbsp,tsp' },
  { name: 'Thyme', allowed_units: 'g,oz,bunch,tbsp,tsp' },
  { name: 'Fresh Thyme', allowed_units: 'g,oz,bunch,tbsp,tsp' },
  { name: 'Oregano', allowed_units: 'g,oz,bunch,tbsp,tsp' },
  { name: 'Sage', allowed_units: 'g,oz,bunch,tbsp,tsp' },
  { name: 'Chives', allowed_units: 'g,oz,bunch,tbsp,tsp' },
  { name: 'Tarragon', allowed_units: 'g,oz,bunch,tbsp,tsp' },
  { name: 'Bay Leaves', allowed_units: 'g,oz,pcs' },
  { name: 'Green Onion', allowed_units: 'kg,g,oz,pcs,bunch,tbsp' },
  { name: 'Scallion', allowed_units: 'kg,g,oz,pcs,bunch,tbsp' },

  // === SPICES (DRIED) ===
  { name: 'Salt', allowed_units: 'kg,g,tbsp,tsp' },
  { name: 'Sea Salt', allowed_units: 'kg,g,tbsp,tsp' },
  { name: 'Kosher Salt', allowed_units: 'kg,g,tbsp,tsp' },
  { name: 'Black Pepper', allowed_units: 'kg,g,oz,tbsp,tsp' },
  { name: 'White Pepper', allowed_units: 'kg,g,oz,tbsp,tsp' },
  { name: 'Cayenne Pepper', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Paprika', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Smoked Paprika', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Cumin', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Coriander', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Turmeric', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Curry Powder', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Garam Masala', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Chili Powder', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Red Pepper Flakes', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Cinnamon', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Nutmeg', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Cloves', allowed_units: 'g,oz,tbsp,tsp,pcs' },
  { name: 'Cardamom', allowed_units: 'g,oz,tbsp,tsp,pcs' },
  { name: 'Star Anise', allowed_units: 'g,oz,pcs' },
  { name: 'Fennel Seeds', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Mustard Seeds', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Caraway Seeds', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Dried Oregano', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Dried Basil', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Dried Thyme', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Dried Rosemary', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Dried Parsley', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Onion Powder', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Garlic Powder', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Ginger Powder', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Chinese Five Spice', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Szechuan Peppercorns', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Saffron', allowed_units: 'g,mg,pcs' },
  { name: 'Vanilla Bean', allowed_units: 'g,oz,pcs' },

  // === CONDIMENTS & SAUCES ===
  { name: 'Soy Sauce', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Tamari', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Fish Sauce', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Worcestershire Sauce', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Hot Sauce', allowed_units: 'L,ml,tbsp,tsp' },
  { name: 'Sriracha', allowed_units: 'L,ml,tbsp,tsp' },
  { name: 'Tabasco', allowed_units: 'ml,tbsp,tsp' },
  { name: 'Ketchup', allowed_units: 'kg,g,L,ml,cup,tbsp' },
  { name: 'Mustard', allowed_units: 'kg,g,L,ml,cup,tbsp,tsp' },
  { name: 'Dijon Mustard', allowed_units: 'kg,g,cup,tbsp,tsp' },
  { name: 'Mayonnaise', allowed_units: 'kg,g,L,ml,cup,tbsp' },
  { name: 'BBQ Sauce', allowed_units: 'kg,g,L,ml,cup,tbsp' },
  { name: 'Teriyaki Sauce', allowed_units: 'L,ml,cup,tbsp' },
  { name: 'Hoisin Sauce', allowed_units: 'kg,g,cup,tbsp' },
  { name: 'Oyster Sauce', allowed_units: 'L,ml,cup,tbsp' },
  { name: 'Tomato Paste', allowed_units: 'kg,g,oz,tbsp' },
  { name: 'Tomato Sauce', allowed_units: 'kg,g,L,ml,cup' },
  { name: 'Marinara Sauce', allowed_units: 'kg,g,L,ml,cup' },
  { name: 'Pesto', allowed_units: 'kg,g,cup,tbsp' },
  { name: 'Salsa', allowed_units: 'kg,g,cup,tbsp' },
  { name: 'Guacamole', allowed_units: 'kg,g,cup,tbsp' },
  { name: 'Hummus', allowed_units: 'kg,g,cup,tbsp' },
  { name: 'Thai Green Curry Paste', allowed_units: 'kg,g,tbsp,tsp' },
  { name: 'Thai Red Curry Paste', allowed_units: 'kg,g,tbsp,tsp' },
  { name: 'Miso Paste', allowed_units: 'kg,g,tbsp' },

  // === VINEGARS ===
  { name: 'White Vinegar', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Apple Cider Vinegar', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Balsamic Vinegar', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Red Wine Vinegar', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'White Wine Vinegar', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Rice Vinegar', allowed_units: 'L,ml,cup,tbsp,tsp' },
  { name: 'Sherry Vinegar', allowed_units: 'L,ml,cup,tbsp,tsp' },

  // === STOCKS & BROTHS ===
  { name: 'Chicken Stock', allowed_units: 'L,ml,cup' },
  { name: 'Beef Stock', allowed_units: 'L,ml,cup' },
  { name: 'Vegetable Broth', allowed_units: 'L,ml,cup' },
  { name: 'Fish Stock', allowed_units: 'L,ml,cup' },
  { name: 'Bone Broth', allowed_units: 'L,ml,cup' },
  { name: 'Dashi', allowed_units: 'L,ml,cup' },

  // === WINES & SPIRITS ===
  { name: 'White Wine', allowed_units: 'L,ml,cup' },
  { name: 'Red Wine', allowed_units: 'L,ml,cup' },
  { name: 'Dry White Wine', allowed_units: 'L,ml,cup' },
  { name: 'Cooking Wine', allowed_units: 'L,ml,cup' },
  { name: 'Sake', allowed_units: 'L,ml,cup,tbsp' },
  { name: 'Mirin', allowed_units: 'L,ml,cup,tbsp' },
  { name: 'Marsala Wine', allowed_units: 'L,ml,cup,tbsp' },
  { name: 'Sherry', allowed_units: 'L,ml,cup,tbsp' },
  { name: 'Rum', allowed_units: 'L,ml,cup,tbsp' },
  { name: 'Brandy', allowed_units: 'L,ml,cup,tbsp' },

  // === CANNED & PRESERVED ===
  { name: 'Canned Tomatoes', allowed_units: 'kg,g,L,ml,cup' },
  { name: 'Crushed Tomatoes', allowed_units: 'kg,g,L,ml,cup' },
  { name: 'Diced Tomatoes', allowed_units: 'kg,g,L,ml,cup' },
  { name: 'Tomato Puree', allowed_units: 'kg,g,L,ml,cup' },
  { name: 'Sun-dried Tomatoes', allowed_units: 'kg,g,oz,pcs,cup,tbsp' },
  { name: 'Olives', allowed_units: 'kg,g,oz,pcs,cup' },
  { name: 'Capers', allowed_units: 'kg,g,oz,tbsp,tsp' },
  { name: 'Pickles', allowed_units: 'kg,g,oz,pcs,cup' },
  { name: 'Sauerkraut', allowed_units: 'kg,g,lb,oz,cup' },
  { name: 'Kimchi', allowed_units: 'kg,g,lb,oz,cup' },

  // === DRIED FRUITS ===
  { name: 'Raisins', allowed_units: 'kg,g,oz,cup,tbsp' },
  { name: 'Dried Cranberries', allowed_units: 'kg,g,oz,cup,tbsp' },
  { name: 'Dried Apricots', allowed_units: 'kg,g,oz,pcs,cup' },
  { name: 'Dried Figs', allowed_units: 'kg,g,oz,pcs,cup' },
  { name: 'Prunes', allowed_units: 'kg,g,oz,pcs,cup' },
  { name: 'Dried Dates', allowed_units: 'kg,g,oz,pcs,cup' },

  // === SUPERFOODS & SPECIALTY ===
  { name: 'Spirulina', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Nutritional Yeast', allowed_units: 'g,oz,cup,tbsp' },
  { name: 'Matcha Powder', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Acai Powder', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Maca Powder', allowed_units: 'g,oz,tbsp,tsp' },
  { name: 'Protein Powder', allowed_units: 'kg,g,oz,cup,tbsp' },
  { name: 'Collagen Powder', allowed_units: 'g,oz,tbsp' },
  { name: 'Kombucha', allowed_units: 'L,ml,cup' },
];

async function seedIngredients() {
  const client = await pool.connect();
  console.log('✓ Connected to database');

  try {
    await client.query('BEGIN');
    console.log(`\n[1/2] Seeding ${INGREDIENTS.length} ingredients...`);
    
    // Clear existing data
    await client.query('TRUNCATE TABLE "SupplierInventory", "Recipe_Ingredient", "Ingredient" RESTART IDENTITY CASCADE');

    let count = 0;
    for (const ing of INGREDIENTS) {
      await client.query(
        'INSERT INTO "Ingredient" (name, allowed_units) VALUES ($1, $2)',
        [ing.name, ing.allowed_units]
      );
      count++;
      if (count % 50 === 0) {
        console.log(`  ✓ Seeded ${count}/${INGREDIENTS.length} ingredients...`);
      }
    }
    
    await client.query('COMMIT');
    console.log(`\n[2/2] ✅ Successfully seeded ${INGREDIENTS.length} ingredients with enforced units!`);
    console.log('\nNote: Each ingredient now has specific allowed units.');
    console.log('The system will validate units when creating recipes or adding inventory.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

seedIngredients();
