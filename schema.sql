-- =============================================================
-- MealDeal Database Schema (PostgreSQL Version)
-- =============================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS "MealListItem" CASCADE;
DROP TABLE IF EXISTS "MealList" CASCADE;
DROP TABLE IF EXISTS "AISuggestion" CASCADE;
DROP TABLE IF EXISTS "SuggestedSubstitution" CASCADE;
DROP TABLE IF EXISTS "Comment" CASCADE;
DROP TABLE IF EXISTS "CartItem" CASCADE;
DROP TABLE IF EXISTS "Cart" CASCADE;
DROP TABLE IF EXISTS "Order" CASCADE;
DROP TABLE IF EXISTS "ChallengeReward" CASCADE;
DROP TABLE IF EXISTS "ChallengeSubmission" CASCADE;
DROP TABLE IF EXISTS "KitchenChallenge_Recipe" CASCADE;
DROP TABLE IF EXISTS "HomeCook_Challenge" CASCADE;
DROP TABLE IF EXISTS "KitchenChallenge" CASCADE;
DROP TABLE IF EXISTS "SupplierInventory" CASCADE;
DROP TABLE IF EXISTS "Recipe_Ingredient" CASCADE;
DROP TABLE IF EXISTS "Ingredient" CASCADE;
DROP TABLE IF EXISTS "Recipe" CASCADE;
DROP TABLE IF EXISTS "RecipeCreator" CASCADE;
DROP TABLE IF EXISTS "VerifiedChefApplication" CASCADE;
DROP TABLE IF EXISTS "VerifiedChef" CASCADE;
DROP TABLE IF EXISTS "HomeCook" CASCADE;
DROP TABLE IF EXISTS "LocalSupplier" CASCADE;
DROP TABLE IF EXISTS "Administrator" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- =============================================================
-- CORE USER HIERARCHY
-- =============================================================

CREATE TABLE "User" (
    user_id       SERIAL         PRIMARY KEY,
    username      VARCHAR(50)    NOT NULL UNIQUE,
    email         VARCHAR(255)   NOT NULL UNIQUE,
    password_hash VARCHAR(255)   NOT NULL,
    join_date     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total         DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);

-- Subtype: Administrator
CREATE TABLE "Administrator" (
    user_id        INT          PRIMARY KEY REFERENCES "User"(user_id) ON DELETE CASCADE,
    role_level     VARCHAR(50),
    note           TEXT
);

-- Subtype: LocalSupplier
CREATE TABLE "LocalSupplier" (
    user_id        INT          PRIMARY KEY REFERENCES "User"(user_id) ON DELETE CASCADE,
    address        VARCHAR(255) NOT NULL,
    location_name  VARCHAR(100) NOT NULL
);

-- Subtype: RecipeCreator
CREATE TABLE "RecipeCreator" (
    user_id INT PRIMARY KEY REFERENCES "User"(user_id) ON DELETE CASCADE,
    total   DECIMAL(10, 2) NOT NULL DEFAULT 0.00
);

-- Subtype: VerifiedChef
CREATE TABLE "VerifiedChef" (
    user_id           INT         PRIMARY KEY REFERENCES "RecipeCreator"(user_id) ON DELETE CASCADE,
    verification_date DATE        NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'active'
);

-- Subtype: HomeCook
CREATE TABLE "HomeCook" (
    user_id    INT  PRIMARY KEY REFERENCES "RecipeCreator"(user_id) ON DELETE CASCADE
);

CREATE TABLE "VerifiedChefApplication" (
    application_id          SERIAL       PRIMARY KEY,
    user_id                 INT          NOT NULL REFERENCES "HomeCook"(user_id) ON DELETE CASCADE,
    full_name               VARCHAR(120) NOT NULL,
    biography               TEXT,
    cooking_experience      TEXT,
    education               TEXT,
    certificates            TEXT,
    awards                  TEXT,
    professional_experience TEXT,
    portfolio_url           VARCHAR(255),
    cv_file_path            VARCHAR(255),
    certificate_file_path   VARCHAR(255),
    cv_text                 TEXT,
    status                  VARCHAR(20)  NOT NULL DEFAULT 'pending',
    admin_note              TEXT,
    submitted_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at             TIMESTAMP,
    reviewed_by             INT          REFERENCES "Administrator"(user_id) ON DELETE SET NULL,
    CONSTRAINT verified_chef_application_status_check
        CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE UNIQUE INDEX one_pending_verified_chef_application_per_user
    ON "VerifiedChefApplication"(user_id)
    WHERE status = 'pending';

-- =============================================================
-- INGREDIENT & SUBSTITUTION
-- =============================================================

CREATE TABLE "Ingredient" (
    ingredient_id       SERIAL          PRIMARY KEY,
    name                VARCHAR(100)    NOT NULL,
    allowed_units       TEXT            NOT NULL DEFAULT 'kg,g,pc',
    parent_ingredient_id INT             REFERENCES "Ingredient"(ingredient_id) ON DELETE SET NULL
);

CREATE TABLE "SuggestedSubstitution" (
    substitution_no     SERIAL          PRIMARY KEY,
    from_ingredient_id  INT             NOT NULL REFERENCES "Ingredient"(ingredient_id),
    to_ingredient_id    INT             NOT NULL REFERENCES "Ingredient"(ingredient_id),
    confidence_score    DECIMAL(5, 2)   NOT NULL,
    note                TEXT
);

-- =============================================================
-- RECIPE
-- =============================================================

CREATE TABLE "Recipe" (
    recipe_id       SERIAL          PRIMARY KEY,
    creator_id      INT             NOT NULL REFERENCES "RecipeCreator"(user_id) ON DELETE CASCADE,
    title           VARCHAR(255)    NOT NULL,
    description     TEXT,
    preparation_steps TEXT,
    media_url       TEXT,
    cook_time_min   INT             NOT NULL,
    visibility      VARCHAR(20)     NOT NULL DEFAULT 'public',
    creation_time   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    difficulty_level VARCHAR(20)    NOT NULL,
    dietary_tag     VARCHAR(50),
    base_servings   INT             NOT NULL DEFAULT 1
);

CREATE TABLE "Recipe_Ingredient" (
    recipe_id     INT            NOT NULL REFERENCES "Recipe"(recipe_id)         ON DELETE CASCADE,
    ingredient_id INT            NOT NULL REFERENCES "Ingredient"(ingredient_id) ON DELETE CASCADE,
    qty           DECIMAL(10, 3) NOT NULL,
    unit          VARCHAR(20)    NOT NULL,
    PRIMARY KEY (recipe_id, ingredient_id)
);

-- =============================================================
-- SUPPLIER INVENTORY
-- =============================================================

CREATE TABLE "SupplierInventory" (
    inventory_id   SERIAL         PRIMARY KEY,
    supplier_id    INT            NOT NULL REFERENCES "LocalSupplier"(user_id)    ON DELETE CASCADE,
    ingredient_id  INT            NOT NULL REFERENCES "Ingredient"(ingredient_id) ON DELETE CASCADE,
    unit           VARCHAR(20)    NOT NULL,
    last_updated   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    price          DECIMAL(10, 2) NOT NULL,
    package_size   DECIMAL(10, 3) NOT NULL,
    available_qty  DECIMAL(10, 3) NOT NULL
);

-- =============================================================
-- CART & ORDER
-- =============================================================

CREATE TABLE "Cart" (
    cart_id        SERIAL         PRIMARY KEY,
    user_id        INT            NOT NULL REFERENCES "User"(user_id)     ON DELETE CASCADE,
    recipe_id      INT            REFERENCES "Recipe"(recipe_id) ON DELETE SET NULL,
    status         VARCHAR(20)    NOT NULL DEFAULT 'active',
    target_servings INT           NOT NULL DEFAULT 1,
    creation_time  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CartItem" (
    item_no       SERIAL         PRIMARY KEY,
    cart_id       INT            NOT NULL REFERENCES "Cart"(cart_id)                 ON DELETE CASCADE,
    inventory_id  INT            NOT NULL REFERENCES "SupplierInventory"(inventory_id) ON DELETE RESTRICT,
    qty           DECIMAL(10, 3) NOT NULL,
    unit_price    DECIMAL(10, 2) NOT NULL
);

CREATE TABLE "Order" (
    order_id      SERIAL         PRIMARY KEY,
    cart_id       INT            NOT NULL UNIQUE REFERENCES "Cart"(cart_id) ON DELETE RESTRICT,
    order_date    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount  DECIMAL(10, 2) NOT NULL,
    status        VARCHAR(30)    NOT NULL DEFAULT 'pending'
);

-- =============================================================
-- COMMENT
-- =============================================================

CREATE TABLE "Comment" (
    comment_id        SERIAL      PRIMARY KEY,
    user_id           INT         NOT NULL REFERENCES "User"(user_id)      ON DELETE CASCADE,
    recipe_id         INT         NOT NULL REFERENCES "Recipe"(recipe_id)  ON DELETE CASCADE,
    comment_text      TEXT        NOT NULL,
    creation_time     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    parent_comment_id INT         REFERENCES "Comment"(comment_id) ON DELETE CASCADE,
    rating            SMALLINT    CHECK (rating >= 1 AND rating <= 5),
    review_text       TEXT,
    rated_at          TIMESTAMP,
    cooked_at         TIMESTAMP,
    servings          INT
);

-- =============================================================
-- AI SUGGESTION
-- =============================================================

CREATE TABLE "AISuggestion" (
    suggestion_id     SERIAL      PRIMARY KEY,
    user_id           INT         NOT NULL REFERENCES "User"(user_id)     ON DELETE CASCADE,
    recipe_id         INT         REFERENCES "Recipe"(recipe_id) ON DELETE SET NULL,
    creation_time     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    suggestion_type   VARCHAR(50) NOT NULL,
    prompt_text       TEXT        NOT NULL,
    constraints_json  JSONB,
    rationale_text    TEXT        NOT NULL
);

-- =============================================================
-- KITCHEN CHALLENGE
-- =============================================================

CREATE TABLE "KitchenChallenge" (
    challenge_id  SERIAL       PRIMARY KEY,
    creator_id    INT          REFERENCES "VerifiedChef"(user_id) ON DELETE SET NULL,
    winner_id     INT          REFERENCES "User"(user_id) ON DELETE SET NULL,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    image_url     TEXT,
    start_date    DATE         NOT NULL,
    end_date      DATE         NOT NULL
);

CREATE TABLE "KitchenChallenge_Recipe" (
    challenge_id INT NOT NULL REFERENCES "KitchenChallenge"(challenge_id) ON DELETE CASCADE,
    recipe_id    INT NOT NULL REFERENCES "Recipe"(recipe_id)              ON DELETE CASCADE,
    PRIMARY KEY (challenge_id, recipe_id)
);

CREATE TABLE "HomeCook_Challenge" (
    user_id      INT       NOT NULL REFERENCES "HomeCook"(user_id)               ON DELETE CASCADE,
    challenge_id INT       NOT NULL REFERENCES "KitchenChallenge"(challenge_id)  ON DELETE CASCADE,
    joined_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, challenge_id)
);

CREATE TABLE "ChallengeSubmission" (
    submission_id SERIAL       PRIMARY KEY,
    user_id       INT          NOT NULL REFERENCES "User"(user_id) ON DELETE CASCADE,
    challenge_id  INT          NOT NULL REFERENCES "KitchenChallenge"(challenge_id) ON DELETE CASCADE,
    recipe_id     INT          NOT NULL REFERENCES "Recipe"(recipe_id) ON DELETE CASCADE,
    photo_url     TEXT         NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by   INT          REFERENCES "User"(user_id) ON DELETE SET NULL,
    review_note   TEXT,
    reviewed_at   TIMESTAMP,
    UNIQUE (user_id, challenge_id, recipe_id)
);

CREATE TABLE "ChallengeReward" (
    reward_id     SERIAL    PRIMARY KEY,
    challenge_id  INT       NOT NULL REFERENCES "KitchenChallenge"(challenge_id) ON DELETE CASCADE,
    user_id       INT       NOT NULL REFERENCES "User"(user_id) ON DELETE CASCADE,
    reward_points INT       NOT NULL DEFAULT 0,
    awarded_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (challenge_id, user_id)
);

-- =============================================================
-- MEAL LIST
-- =============================================================

CREATE TABLE "MealList" (
    meal_list_id  SERIAL       PRIMARY KEY,
    user_id       INT          NOT NULL REFERENCES "User"(user_id) ON DELETE CASCADE,
    name          VARCHAR(255) NOT NULL,
    description   TEXT,
    created_date  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MealListItem" (
    meal_list_item_id SERIAL      PRIMARY KEY,
    meal_list_id      INT         NOT NULL REFERENCES "MealList"(meal_list_id) ON DELETE CASCADE,
    recipe_id         INT         NOT NULL REFERENCES "Recipe"(recipe_id)     ON DELETE CASCADE,
    added_date        TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================
-- DEFAULT ADMIN ACCOUNT
-- Credentials: email=admin@mealdeal.com  password=admin123
-- =============================================================

DO $$
DECLARE
    v_user_id INT;
BEGIN
    INSERT INTO "User" (username, email, password_hash, join_date)
    VALUES (
        'admin',
        'admin@mealdeal.com',
        '$2b$10$S0x5rolgosRgc9M2kkCWDOAW0q0Ov41bDIktEwBxB5QPVKo4TuxNS',
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING user_id INTO v_user_id;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO "Administrator" (user_id, role_level, note)
        VALUES (v_user_id, 'superadmin', 'Default admin account');
    END IF;
END $$;
