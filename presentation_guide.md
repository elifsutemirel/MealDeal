# MealDeal Database Presentation Guide

Bu doküman, DB TA sunumu sırasında en çok sorulabilecek fonksiyonel akışları ve bu akışların hangi dosyalardan geçtiğini özetler.

---

## 1. Kullanıcı Kaydı (Registration)
Kullanıcının sisteme ilk girişi ve rollerin atanması.

*   **Frontend:** `/Users/elifsutemirel/Documents/GitHub/MealDeal/src/components/Auth/AuthView.jsx`
    *   `handleSubmit` fonksiyonu verileri toplar.
*   **Backend:** `/Users/elifsutemirel/Documents/GitHub/MealDeal/server.js`
    *   `app.post('/api/auth/register', ...)` endpoint'i isteği karşılar.
*   **SQL Mantığı:** `/Users/elifsutemirel/Documents/GitHub/MealDeal/auth_queries.sql`
*   **Veritabanı Müdahalesi:**
    1.  `"User"` tablosuna temel bilgiler eklenir.
    2.  Seçilen role göre `"HomeCook"` veya `"LocalSupplier"` tablolarına kayıt atılır.
    *   **Not:** Veri bütünlüğü için `BEGIN/COMMIT` (Transaction) kullanılır.

---

## 2. Giriş Yapma (Login)
Kimlik doğrulama ve rol tabanlı yetkilendirme.

*   **Frontend:** `/Users/elifsutemirel/Documents/GitHub/MealDeal/src/components/Auth/AuthView.jsx`
*   **Backend:** `/Users/elifsutemirel/Documents/GitHub/MealDeal/server.js`
    *   `app.post('/api/auth/login', ...)` endpoint'i çalışır.
*   **SQL Mantığı:** `/Users/elifsutemirel/Documents/GitHub/MealDeal/auth_queries.sql` içindeki `SELECT` sorgusu.
*   **Veritabanı Müdahalesi:** 
    *   `"User"` tablosundan şifre (hash) ve rol bilgisi (`LEFT JOIN` ile tüm alt tablolar taranarak) çekilir.
    *   `bcrypt.compare` ile şifre doğrulanır.

---

## 3. Onaylı Şef Başvurusu ve Onayı (Chef Request & Approval)
Bir kullanıcının şef rütbesine yükseltilme süreci.

*   **Başvuru:** 
    *   **Frontend:** `src/components/Dashboard/BecomeChefView.jsx`
    *   **Backend:** `server.js` -> `app.post('/api/verified-chef-applications')`
*   **Onay (Admin Tarafı):**
    *   **Backend:** `server.js` -> `app.patch('/api/admin/verified-chef-applications/:id/status')`
*   **KRİTİK - Trigger:** `/Users/elifsutemirel/Documents/GitHub/MealDeal/schema.sql`
    *   **Trigger Adı:** `trg_promote_to_verified_chef`
    *   **Görevi:** Admin statüyü 'approved' yaptığı anda, bu trigger otomatik olarak kullanıcıyı `"RecipeCreator"` ve `"VerifiedChef"` tablolarına ekler.

---

## 4. Tarif Oluşturma (Recipe Creation)
Bir şefin sisteme yeni tarif ve malzeme listesi eklemesi.

*   **Frontend:** `/Users/elifsutemirel/Documents/GitHub/MealDeal/src/components/Recipes/RecipeCreateView.jsx`
*   **Backend:** `/Users/elifsutemirel/Documents/GitHub/MealDeal/server.js`
    *   `app.post('/api/recipes', ...)` endpoint'i çalışır.
*   **SQL Mantığı:** `/Users/elifsutemirel/Documents/GitHub/MealDeal/functionality_queries.sql`
*   **Veritabanı Müdahalesi:**
    1.  Tarif ana bilgileri `"Recipe"` tablosuna eklenir.
    2.  Tarif içindeki malzemeler `"Recipe_Ingredient"` (Many-to-Many) tablosuna her bir malzeme için ayrı ayrı kaydedilir.

---

## 5. Önemli Veritabanı Nesneleri (Sunumda Gösterilecekler)

### Görünümler (Views) - `schema.sql` içinde:
*   **`vw_RecipeFullDetails`**: Tarif başlığı, şef ismi ve ortalama puanı birleştirir.
*   **`vw_SupplierStockOverview`**: Hangi tedarikçide ne kadar stok kaldığını özetler.

### Tetikleyiciler (Triggers) - `schema.sql` içinde:
*   **`trg_update_inventory_on_order`**: Sipariş gelince stoğu otomatik düşürür.
*   **`trg_update_user_total_on_order`**: Harcamaları anlık hesaplar.

---

**Sunum İpucu:** TA size "Karmaşık JOIN'leri nerede yaptın?" derse `server.js` içindeki Login sorgusunu veya `vw_RecipeFullDetails` view'ını gösterebilirsiniz.
