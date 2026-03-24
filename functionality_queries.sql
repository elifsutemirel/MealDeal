-- =============================================================
-- MealDeal Functionality Queries (PostgreSQL Version)
-- =============================================================

-- -------------------------------------------------------------
-- (a) & (b)  RECIPE DISCOVERY
-- Parameters: $1:dietary_tag, $2:max_cook_time, $3:min_chef_rating, $4:ingredient_name
-- -------------------------------------------------------------

SELECT
    r.recipe_id,
    r.title,
    u.username          AS chef_name,
    r.dietary_tag,
    r.cook_time_min,
    r.difficulty_level,
    r.base_servings,
    ROUND(AVG(c.rating), 1) AS avg_rating,
    COUNT(c.comment_id)     AS review_count
FROM "Recipe" r
JOIN "RecipeCreator" rc ON rc.user_id   = r.creator_id
JOIN "User"          u  ON u.user_id    = rc.user_id
LEFT JOIN "Comment"  c  ON c.recipe_id  = r.recipe_id
                      AND c.rating IS NOT NULL
WHERE r.visibility = 'public'
  AND ($1 IS NULL OR r.dietary_tag    = $1)
  AND ($2 IS NULL OR r.cook_time_min  <= $2)
  AND (
        $4 IS NULL
        OR EXISTS (
            SELECT 1
            FROM "Recipe_Ingredient" ri
            JOIN "Ingredient" i ON i.ingredient_id = ri.ingredient_id
            WHERE ri.recipe_id = r.recipe_id
              AND i.name ILIKE CONCAT('%', $4, '%') -- Use ILIKE for Postgres case-insensitive
        )
      )
GROUP BY r.recipe_id, r.title, u.username, r.dietary_tag,
         r.cook_time_min, r.difficulty_level, r.base_servings
HAVING ($3 IS NULL OR AVG(c.rating) >= $3)
ORDER BY avg_rating DESC;

-- -------------------------------------------------------------
-- (c-iii)  SCALING
-- Parameters: $1:recipe_id, $2:target_servings
-- -------------------------------------------------------------

SELECT
    i.ingredient_id,
    i.name,
    ROUND(ri.qty * ($2::numeric / r.base_servings), 3) AS scaled_qty,
    ri.unit
FROM "Recipe_Ingredient" ri
JOIN "Ingredient" i ON i.ingredient_id = ri.ingredient_id
JOIN "Recipe"     r ON r.recipe_id     = ri.recipe_id
WHERE ri.recipe_id = $1
ORDER BY i.name;

-- -------------------------------------------------------------
-- (d-i)  SHOP THIS MEAL — Check Inventory
-- Parameters: $1:recipe_id, $2:target_servings
-- -------------------------------------------------------------

SELECT
    i.ingredient_id,
    i.name                                                          AS ingredient_name,
    ROUND(ri.qty * ($2::numeric / r.base_servings), 3)              AS required_qty,
    ri.unit                                                         AS required_unit,
    si.inventory_id,
    su.username                                                     AS supplier_name,
    ls.location_name,
    si.available_qty,
    si.price,
    CASE
        WHEN si.available_qty >= ROUND(ri.qty * ($2::numeric / r.base_servings), 3) THEN 'available'
        WHEN si.available_qty > 0 THEN 'limited'
        ELSE 'out_of_stock'
    END AS stock_status
FROM "Recipe_Ingredient" ri
JOIN "Ingredient"        i   ON i.ingredient_id  = ri.ingredient_id
JOIN "Recipe"            r   ON r.recipe_id      = ri.recipe_id
LEFT JOIN "SupplierInventory" si ON si.ingredient_id = i.ingredient_id
LEFT JOIN "LocalSupplier"     ls ON ls.user_id       = si.supplier_id
LEFT JOIN "User"              su ON su.user_id        = ls.user_id
WHERE ri.recipe_id = $1
ORDER BY i.name, si.price ASC;

-- -------------------------------------------------------------
-- (d-iii)  CREATE CART
-- Parameters: $1:user_id, $2:recipe_id, $3:target_servings
-- -------------------------------------------------------------

BEGIN;

INSERT INTO "Cart" (user_id, recipe_id, status, target_servings, creation_time)
VALUES ($1, $2, 'active', $3, CURRENT_TIMESTAMP)
RETURNING cart_id;

-- (The cart_id is used in the app for subsequent inserts)

INSERT INTO "CartItem" (cart_id, inventory_id, qty, unit_price)
SELECT
    $4, -- cart_id
    si.inventory_id,
    ROUND(ri.qty * ($3::numeric / r.base_servings), 3),
    si.price
FROM "Recipe_Ingredient" ri
JOIN "Recipe"            r  ON r.recipe_id      = ri.recipe_id
JOIN "SupplierInventory" si ON si.ingredient_id = ri.ingredient_id
WHERE ri.recipe_id      = $2
  AND ri.ingredient_id  = $5 -- ingredient_id loop
  AND si.available_qty >= ROUND(ri.qty * ($3::numeric / r.base_servings), 3)
ORDER BY si.price ASC
LIMIT 1;

COMMIT;

-- -------------------------------------------------------------
-- (e-i & ii)  CHECKOUT
-- Parameters: $1:cart_id, $2:user_id
-- -------------------------------------------------------------

BEGIN;

UPDATE "Cart"
SET status = 'checked_out'
WHERE cart_id = $1 AND user_id = $2;

INSERT INTO "Order" (cart_id, order_date, total_amount, status)
SELECT $1, CURRENT_TIMESTAMP, SUM(ci.qty * ci.unit_price), 'confirmed'
FROM "CartItem" ci
WHERE ci.cart_id = $1;

UPDATE "SupplierInventory" si
SET available_qty = si.available_qty - ci.qty
FROM "CartItem" ci
WHERE ci.inventory_id = si.inventory_id
  AND ci.cart_id = $1;

UPDATE "User"
SET total = total + (
    SELECT SUM(ci.qty * ci.unit_price)
    FROM "CartItem" ci
    WHERE ci.cart_id = $1
)
WHERE user_id = $2;

COMMIT;
