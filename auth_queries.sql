-- =============================================================
-- MealDeal Authentication Queries (PostgreSQL Version)
-- =============================================================

-- -------------------------------------------------------------
-- REGISTRATION
-- -------------------------------------------------------------

-- Step 1: Create the base User record
-- Parameters: $1: username, $2: email, $3: password_hash
INSERT INTO "User" (username, email, password_hash, join_date)
VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
RETURNING user_id;

-- Step 2: Role-specific inserts (use the ID returned from Step 1)

-- Administrator
INSERT INTO "Administrator" (user_id, role_level, note)
VALUES ($1, $2, $3);

-- Local Supplier
INSERT INTO "LocalSupplier" (user_id, address, location_name)
VALUES ($1, $2, $3);

-- RecipeCreator + VerifiedChef
INSERT INTO "RecipeCreator" (user_id) VALUES ($1);
INSERT INTO "VerifiedChef" (user_id, verification_date, status)
VALUES ($1, CURRENT_DATE, 'pending');

-- RecipeCreator + HomeCook
INSERT INTO "RecipeCreator" (user_id) VALUES ($1);
INSERT INTO "HomeCook" (user_id) VALUES ($1);

-- -------------------------------------------------------------
-- DUPLICATE CHECKS
-- -------------------------------------------------------------
SELECT COUNT(*) AS email_exists FROM "User" WHERE email = $1;
SELECT COUNT(*) AS username_exists FROM "User" WHERE username = $1;

-- =============================================================
-- LOGIN
-- =============================================================

-- Parameter: $1: email
SELECT u.user_id,
       u.username,
       u.email,
       u.password_hash,
       u.join_date,
       CASE
           WHEN a.user_id  IS NOT NULL THEN 'Administrator'
           WHEN vs.user_id IS NOT NULL THEN 'Verified Chef'
           WHEN hc.user_id IS NOT NULL THEN 'Home Cook'
           WHEN ls.user_id IS NOT NULL THEN 'Local Supplier'
           ELSE 'User'
       END AS role
FROM   "User"          u
LEFT JOIN "Administrator"  a  ON a.user_id  = u.user_id
LEFT JOIN "VerifiedChef"   vs ON vs.user_id = u.user_id
LEFT JOIN "HomeCook"       hc ON hc.user_id = u.user_id
LEFT JOIN "LocalSupplier"  ls ON ls.user_id = u.user_id
WHERE  u.email = $1
LIMIT 1;

-- =============================================================
-- PROFILE FETCH
-- =============================================================

SELECT user_id, username, email, join_date, total
FROM   "User"
WHERE  user_id = $1;

-- =============================================================
-- UPDATE PASSWORD
-- =============================================================

UPDATE "User"
SET    password_hash = $1
WHERE  user_id = $2;
