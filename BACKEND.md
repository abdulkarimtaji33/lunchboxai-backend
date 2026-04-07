# LunchBox AI backend — reference

Node.js **Express 5** API with **MySQL** (`mysql2`), **JWT** auth, **Passport** (Google/Facebook web OAuth), **Firebase Admin** (FCM push), **OpenAI** + **OpenRouter** for vision/image generation, **Sharp** for images, **Nodemailer** for password reset.

**Node built-ins used:** `path`, `fs`, `crypto`, `fetch` (saving generated images from `http(s)` URLs).

---

## `package.json`

| Field | Value |
|--------|--------|
| `name` | `lunchboxai` |
| `version` | `1.0.0` |
| `main` | `server.js` |
| `type` | `commonjs` |

**Scripts**

| Script | Command | Purpose |
|--------|---------|---------|
| `start` | `node server.js` | Production start |
| `dev` | `nodemon server.js` | Dev with reload |

**Dependencies (runtime)**

| Package | Role |
|---------|------|
| `bcryptjs` | Password hashing |
| `cors` | Cross-origin middleware |
| `dotenv` | Load `.env` |
| `express` | HTTP app and router |
| `firebase-admin` | FCM send; optional init via JSON env or `GOOGLE_APPLICATION_CREDENTIALS` |
| `google-auth-library` | `OAuth2Client.verifyIdToken` for mobile Google Sign-In |
| `joi` | Request body validation schemas |
| `jsonwebtoken` | Sign/verify JWT |
| `multer` | Multipart uploads (lunchbox sessions, child lunchbox photos) |
| `mysql2` | MySQL pool and migrations |
| `nodemailer` | SMTP for password reset |
| `openai` | Official SDK; used against OpenAI API and OpenRouter (`baseURL`) |
| `passport` | OAuth middleware (no sessions; JWT after callback) |
| `passport-facebook` | Facebook OAuth strategy |
| `passport-google-oauth20` | Google OAuth web strategy |
| `sharp` | Resize/compress images for APIs; PNG for image edit |

**DevDependencies**

| Package | Role |
|---------|------|
| `nodemon` | Restart server in `npm run dev` |

**`package-lock.json`** — locks exact transitive dependency versions for reproducible installs (not hand-edited).

---

## Entry and ops

### `server.js`

- Loads `dotenv`, builds Express app: `cors`, `express.json`, `express.urlencoded`, static dirs `/uploads`, `/avatars`, `/allergens`, `/base_lunchboxes`.
- `passport.initialize()` (no session store).
- **`GET /health`** — inline handler: `{ status: 'ok', timestamp }`.
- Mounts API routers under `/api/*` (see [Routes](#http-routes-full-paths)).
- 404 JSON handler; `errorHandler` last.
- **`async function start()`** — `testConnection()`, then `app.listen(env.port)`.

### `run-migration.js`

CLI migration runner (not imported by the server).

| Function | Signature | Purpose |
|----------|-----------|---------|
| `ensureTrackingTable` | `async (conn)` | Creates `_migrations` if missing |
| `getApplied` | `async (conn)` | `Set` of applied filenames |
| `runFile` | `async (conn, filepath, filename)` | Strip `--` lines, split `;`, execute statements, record migration |
| `main` | `async ()` | Connect, list/run pending `.sql` in `src/config/migrations/` |

Flags: `--list`, `--force`, `--file <name>`.

### `ecosystem.config.js`

**PM2** config: app name `lunchboxai-api`, `server.js`, `cwd` `/var/www/lunchboxai`, `PORT` 5100 in production env.

---

## Config

### `src/config/env.js`

Exports one object: `port`, `db` (`host`, `port`, `user`, `password`, `database`), `jwt` (`secret`, `expiresIn`), `openai.apiKey`, `openrouter.apiKey`, `google` (`clientId`, `clientSecret`, `callbackUrl`, `allowedAudiences`), `facebook` (`appId`, `appSecret`), `appBaseUrl`, `frontendUrl`, `broadcastSecret`, `smtp` (`host`, `port`, `secure`, `user`, `pass`, `from`). Values from `process.env` with defaults.

### `src/config/database.js`

- **`mysql2/promise` `createPool`** — connection pool (limit 10).
- **`async function testConnection()`** — get/release one connection, logs success.
- Exports `pool` and `testConnection`.

### `src/config/constants.js`

Exports: `UPLOAD_DIR`, `MAX_FILE_SIZE`, `ALLOWED_IMAGE_TYPES`, `DEFAULT_FOOD_COUNT`.

### `src/config/passport.js`

Registers **Google** (`passport-google-oauth20`) and **Facebook** (`passport-facebook`) strategies when env credentials exist. Verifiers call `User.findByProvider` / `User.createSocial`. Exports configured `passport` instance.

### `src/config/firebaseAdmin.js`

| Function | Signature | Purpose |
|----------|-----------|---------|
| `getFirebaseAdmin` | `()` | Lazy singleton; init from `FIREBASE_SERVICE_ACCOUNT_JSON` or default credentials file |
| `getMessaging` | `()` | Returns FCM messaging or `null` |

---

## Middleware

### `src/middleware/authMiddleware.js`

| Export | Signature | Purpose |
|--------|-----------|---------|
| `authenticate` | `(req, res, next)` | Requires `Authorization: Bearer <jwt>`; sets `req.user` via `verifyToken` |

### `src/middleware/errorHandler.js`

| Export | Signature | Purpose |
|--------|-----------|---------|
| default | `(err, req, res, next)` | Logs error; `MulterError` → 400; else `err.statusCode` or 500 JSON |

### `src/middleware/broadcastSecret.js`

| Export | Signature | Purpose |
|--------|-----------|---------|
| `requireBroadcastSecret` | `(req, res, next)` | Requires `BROADCAST_SECRET` configured and matching header `X-Broadcast-Secret` |

### `src/middleware/uploadMiddleware.js`

- Ensures `UPLOAD_DIR` exists; **multer** disk storage with unique filenames; JPEG/PNG/WebP only; max size from constants.
- **`upload`** — `fields`: `lunchbox` (1), `ingredients` (5).
- **`uploadSingle`** — single field `image` (child lunchbox upload).

---

## Utils

### `src/utils/helpers.js`

| Function | Signature | Purpose |
|----------|-----------|---------|
| `generateToken` | `(payload)` | JWT sign with env secret/expiry |
| `verifyToken` | `(token)` | JWT verify |
| `successResponse` | `(res, data, message?, statusCode?)` | Legacy `{ success, message, data }` wrapper |
| `errorResponse` | `(res, message?, statusCode?, errors?)` | Legacy error JSON |
| `calculateAge` | `(dob)` | Age from date |
| `formatResponse` | `(data)` | `{ success: true, data }` |
| `formatError` | `(message, code?)` | `{ success: false, error: { code, message } }` |
| `paginate` | `(page, limit)` | `{ page, limit, offset }` capped (limit max 100, default 20) |

### `src/utils/validators.js`

Joi schemas: `registerSchema`, `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `googleIdTokenSchema`, `childSchema`, `childUpdateSchema`, `childAllergenSchema`, `foodItemSchema`, `nutritionGoalSchema`.

| Function | Signature | Purpose |
|----------|-----------|---------|
| `validate` | `(schema)` | Returns Express middleware: validates `req.body`, 400 on failure |

*(Note: `foodItemSchema` / `nutritionGoalSchema` are defined but not wired in route files.)*

---

## Controllers (handlers are `(req, res, next)` unless noted)

### `src/controllers/authController.js`

| Function | Purpose |
|----------|---------|
| `signToken(userId)` | Internal: JWT for user id |
| `register` | Local signup; bcrypt hash; `User.createLocal` |
| `login` | Email/password; bcrypt compare |
| `getProfile` | Current user from `User.findById` |
| `updateProfile` | Patch name (`full_name` or `name`) |
| `googleMobileLogin` | Verify Google ID token; upsert social user; return JWT |
| `handleOAuthCallback` | After Passport OAuth: redirect to `frontendUrl/auth/callback?token=` |
| `forgotPassword` | Create hashed reset token; email via SMTP (generic message if no user) |
| `resetPassword` | Validate token hash; update password; clear tokens |

### `src/controllers/allergenController.js`

| Function | Purpose |
|----------|---------|
| `listAllergens` | All allergens with absolute `image_url` for icons |

### `src/controllers/foodItemController.js`

| Function | Purpose |
|----------|---------|
| `listFoodItems` | Query `include_inactive` |
| `createFoodItem` | Insert food item |
| `updateFoodItem` | Patch by `:id` |
| `deleteFoodItem` | Delete by `:id` |

### `src/controllers/nutritionGoalController.js`

| Function | Purpose |
|----------|---------|
| `listNutritionGoals` | Query `include_inactive` |
| `createNutritionGoal` | Insert goal |
| `updateNutritionGoal` | Patch by `:id` |
| `deleteNutritionGoal` | Delete by `:id` |

### `src/controllers/childController.js`

| Function | Purpose |
|----------|---------|
| `enrichChild(child, baseUrl)` | Adds avatar and allergen image URLs |
| `addChild` | Create child; allergens; school rules |
| `listChildren` | User’s children enriched |
| `updateChild` | Patch; optional `setSchoolRules` / `setAllergens` |
| `deleteChild` | Delete |
| `addAllergen` | Add one allergen link; returns allergen list |
| `removeAllergen` | Remove link |

### `src/controllers/childLunchboxController.js`

| Function | Purpose |
|----------|---------|
| `enrichLunchboxes(lunchboxes, baseUrl)` | Full URLs for images |
| `listLunchboxes` | Child’s saved lunchbox images |
| `addLunchbox` | `uploadSingle` — save image, create row |
| `removeLunchbox` | Delete row and file; clear default if needed |
| `setDefault` | Set child’s `default_lunchbox_id` |

### `src/controllers/avatarController.js`

| Function | Purpose |
|----------|---------|
| `listAvatars` | All active avatars with `image_url` |

### `src/controllers/baseLunchboxController.js`

| Function | Purpose |
|----------|---------|
| `getBaseLunchboxes` | Active preset containers from DB |

### `src/controllers/lunchboxController.js`

| Function | Purpose |
|----------|---------|
| `createSession` | Multipart: AI pipeline (OpenRouter vision + OpenAI image gen or edit); DB session/results; rollback/cleanup on failure |
| `createSessionOpenRouter` | Similar but image gen via OpenRouter `gpt-5-image-mini`; requires uploaded lunchbox file |
| `getHistory` | Paginated sessions for user; optional `child_id` |
| `getSession` | One session with ingredients + result |
| `deleteSession` | Delete DB rows and associated files |
| `planSession` | `PATCH` planned date (`planned_at`) |
| `setFlag` | `is_favorite` or `save_for_later` boolean |

### `src/controllers/notificationController.js`

Internal: `parseUseAi`, `parseNotificationsEnabled`, `ANDROID_NOTIFICATION_CHANNEL_ID`.

| Function | Purpose |
|----------|---------|
| `registerToken` | Upsert FCM token + optional `notifications_enabled` |
| `patchToken` | Update `notifications_enabled` for token |
| `unregisterToken` | Remove token for user |
| `broadcast` | Admin: send FCM to all enabled tokens (plain or AI-generated body); batches of 500 |

---

## Models (data access)

### `src/models/User.js`

Object with methods: `findById`, `findByEmail`, `findByEmailInsensitive`, `findByProvider`, `create` (legacy bcrypt password), `createSocial`, `createLocal`, `updateProfile`, `updatePasswordHash`, `comparePassword`.

### `src/models/PasswordResetToken.js`

`deleteForUser`, `create`, `findValidByHash`, `deleteByHash`.

### `src/models/Allergen.js`

`findAll`, `findById`, `create`, `update`, `deleteById`.

### `src/models/FoodItem.js`

`findAll`, `findById`, `create`, `update`, `deleteById`, `getRandomActive(count)` — random names for AI prompts.

### `src/models/NutritionGoal.js`

`findAll`, `findById`, `findByKey`, `create`, `update`, `deleteById`.

### `src/models/Child.js`

`create`, `findByUser`, `findByIdAndUser`, `attachRelations`, `update`, `deleteById`, `addAllergen`, `removeAllergen`, `getAllergens`, `setAllergens`, `setSchoolRules`, `normalizeChild`.

### `src/models/ChildLunchbox.js`

`findByChild`, `create`, `findById`, `deleteById`, `setDefault`, `clearDefault`.

### `src/models/LunchBox.js`

`createSession`, `setPlanDate`, `insertIngredientImages`, `insertSessionAllergenOverrides`, `updateStatus`, `attachResult`, `findByUser`, `findByIdAndUser`, `getFilePaths`, `resolveAllergens`, `deleteById`, `normalizeSession`, `normalizeResult`, `setSessionFlag`.

### `src/models/BaseLunchbox.js`

`findAll`, `findById`, `normalize` (adds `image_url`).

### `src/models/Avatar.js`

`findAll`, `findById`.

### `src/models/SchoolRule.js`

`findAll`, `findById`.

### `src/models/FcmToken.js`

`upsert`, `setEnabled`, `removeByToken`, `getAllTokens`.

---

## Services

### `src/services/aiService.js`

Uses **OpenRouter** client (`openai` package, `baseURL` OpenRouter) for `identifyIngredients` and **`analyzeLunchbox`** model `gpt-4o`; also `openai/gpt-4o` for ingredient listing.

| Export | Purpose |
|--------|---------|
| `parseLunchboxDescription` | Extract compartment count, shape, orientation from text |
| `ageFromDob` | Years from date |
| `parseNutritionGoalKeys` | Parse override string/array |
| `nutritionGoalsTextFromKeys` | Resolve labels from DB |
| `buildSessionAiContext` | Multi-line string for prompts (child, allergens, overrides) |
| `buildImageBlock` | Resize + base64 data URL for vision |
| `identifyIngredients` | Vision on ingredient photos → comma list |
| `analyzeLunchbox` | Vision on lunchbox → description + parsed geometry |

### `src/services/imageGenService.js`

| Export | Purpose |
|--------|---------|
| `detectAspectRatio` | Map image dimensions to supported ratio string |
| `generateFilledLunchbox` | OpenAI **direct** `images.generate` (`gpt-image-1`) + OpenRouter verification |
| `generateFilledLunchboxEdit` | OpenAI **direct** `images.edit` (`gpt-image-1.5`) with Sharp PNG input |
| `generateFilledLunchboxOpenRouter` | OpenRouter chat with `openai/gpt-5-image-mini` multimodal output |

Internal: `sessionPreferencesBlock`, `COVER_AND_LID_RULES`, verification via OpenRouter `openai/gpt-4o`.

### `src/services/imageService.js`

| Export | Purpose |
|--------|---------|
| `buildPublicFileUrl` | Join `appBaseUrl` + relative path |
| `saveGeneratedLunchboxImage` | Write PNG from base64/data URL/URL fetch to `uploads/` |
| `resizeForApi` | Sharp resize JPEG for vision APIs |
| `getMimeTypeFromPath` | Extension → MIME |
| `deleteFile`, `deleteFiles` | Best-effort unlink |

### `src/services/emailService.js`

| Export | Purpose |
|--------|---------|
| `getTransporter` | Lazy nodemailer SMTP from `env.smtp` |
| `sendPasswordResetEmail` | HTML/text reset link |

### `src/services/googleAuthService.js`

| Export | Purpose |
|--------|---------|
| `verifyGoogleIdToken(idToken, audience)` | Returns JWT payload |

### `src/services/notificationAiService.js`

| Export | Purpose |
|--------|---------|
| `generateMarketingNotification(hint)` | OpenRouter `gpt-4o-mini` → JSON title/body for push |

---

## Routes modules (relative to mount prefix)

Each file exports `router` (Express `Router`).

### `src/routes/authRoutes.js` — mount `/api/auth`

| Method | Path | Middleware | Handler |
|--------|------|------------|---------|
| POST | `/register` | `validate(registerSchema)` | `register` |
| POST | `/login` | `validate(loginSchema)` | `login` |
| POST | `/forgot-password` | `validate(forgotPasswordSchema)` | `forgotPassword` |
| POST | `/reset-password` | `validate(resetPasswordSchema)` | `resetPassword` |
| POST | `/google/mobile` | `validate(googleIdTokenSchema)` | `googleMobileLogin` |
| GET | `/me` | `authenticate` | `getProfile` |
| PATCH | `/me` | `authenticate` | `updateProfile` |
| GET | `/google` | `passport.authenticate('google', …)` | — |
| GET | `/google/callback` | `passport.authenticate` + `handleOAuthCallback` | — |
| GET | `/facebook` | `passport.authenticate('facebook', …)` | — |
| GET | `/facebook/callback` | `passport.authenticate` + `handleOAuthCallback` | — |
| GET | `/failed` | — | Inline 401 JSON |

### `src/routes/allergenRoutes.js` — `/api/allergens`

| Method | Path | Handler |
|--------|------|---------|
| GET | `/` | `listAllergens` |

### `src/routes/foodItemRoutes.js` — `/api/food-items`

| Method | Path | Middleware | Handler |
|--------|------|------------|---------|
| GET | `/` | — | `listFoodItems` |
| POST | `/` | `authenticate` | `createFoodItem` |
| PATCH | `/:id` | `authenticate` | `updateFoodItem` |
| DELETE | `/:id` | `authenticate` | `deleteFoodItem` |

### `src/routes/nutritionGoalRoutes.js` — `/api/nutrition-goals`

| Method | Path | Middleware | Handler |
|--------|------|------------|---------|
| GET | `/` | — | `listNutritionGoals` |
| POST | `/` | `authenticate` | `createNutritionGoal` |
| PATCH | `/:id` | `authenticate` | `updateNutritionGoal` |
| DELETE | `/:id` | `authenticate` | `deleteNutritionGoal` |

### `src/routes/childRoutes.js` — `/api/children`

Router uses `authenticate` for all routes.

| Method | Path | Extra | Handler |
|--------|------|-------|---------|
| POST | `/` | `validate(childSchema)` | `addChild` |
| GET | `/` | — | `listChildren` |
| PATCH | `/:id` | `validate(childUpdateSchema)` | `updateChild` |
| DELETE | `/:id` | — | `deleteChild` |
| POST | `/:id/allergens` | `validate(childAllergenSchema)` | `addAllergen` |
| DELETE | `/:id/allergens/:allergenId` | — | `removeAllergen` |
| GET | `/:id/lunchboxes` | — | `listLunchboxes` |
| POST | `/:id/lunchboxes` | `uploadSingle` | `addLunchbox` |
| DELETE | `/:id/lunchboxes/:lunchboxId` | — | `removeLunchbox` |
| PATCH | `/:id/lunchboxes/:lunchboxId/set-default` | — | `setDefault` |

### `src/routes/avatarRoutes.js` — `/api/avatars`

All `authenticate`.

| Method | Path | Handler |
|--------|------|---------|
| GET | `/` | `listAvatars` |

### `src/routes/schoolRuleRoutes.js` — `/api/school-rules`

| Method | Path | Handler |
|--------|------|---------|
| GET | `/` | Inline async: `SchoolRule.findAll()` + `formatResponse` |

### `src/routes/lunchboxRoutes.js` — `/api/lunchbox`

All `authenticate`.

| Method | Path | Middleware | Handler |
|--------|------|------------|---------|
| POST | `/sessions` | `upload` | `createSession` |
| POST | `/sessions/openrouter` | `upload` | `createSessionOpenRouter` |
| GET | `/sessions` | — | `getHistory` |
| GET | `/sessions/:id` | — | `getSession` |
| DELETE | `/sessions/:id` | — | `deleteSession` |
| PATCH | `/sessions/:id/plan` | — | `planSession` |
| PATCH | `/sessions/:id/flag` | — | `setFlag` |

### `src/routes/baseLunchboxRoutes.js` — `/api/base-lunchboxes`

All `authenticate`.

| Method | Path | Handler |
|--------|------|---------|
| GET | `/` | `getBaseLunchboxes` |

### `src/routes/notificationRoutes.js` — `/api/notifications`

| Method | Path | Middleware | Handler |
|--------|------|------------|---------|
| POST | `/token` | `authenticate` | `registerToken` |
| PATCH | `/token` | `authenticate` | `patchToken` |
| DELETE | `/token` | `authenticate` | `unregisterToken` |
| POST | `/broadcast` | `requireBroadcastSecret` | `broadcast` |

---

## HTTP routes (full paths)

| Method | Full path |
|--------|-----------|
| GET | `/health` |
| POST | `/api/auth/register` |
| POST | `/api/auth/login` |
| POST | `/api/auth/forgot-password` |
| POST | `/api/auth/reset-password` |
| POST | `/api/auth/google/mobile` |
| GET | `/api/auth/me` |
| PATCH | `/api/auth/me` |
| GET | `/api/auth/google` |
| GET | `/api/auth/google/callback` |
| GET | `/api/auth/facebook` |
| GET | `/api/auth/facebook/callback` |
| GET | `/api/auth/failed` |
| GET | `/api/allergens` |
| GET | `/api/food-items` |
| POST | `/api/food-items` |
| PATCH | `/api/food-items/:id` |
| DELETE | `/api/food-items/:id` |
| GET | `/api/nutrition-goals` |
| POST | `/api/nutrition-goals` |
| PATCH | `/api/nutrition-goals/:id` |
| DELETE | `/api/nutrition-goals/:id` |
| POST | `/api/children` |
| GET | `/api/children` |
| PATCH | `/api/children/:id` |
| DELETE | `/api/children/:id` |
| POST | `/api/children/:id/allergens` |
| DELETE | `/api/children/:id/allergens/:allergenId` |
| GET | `/api/children/:id/lunchboxes` |
| POST | `/api/children/:id/lunchboxes` |
| DELETE | `/api/children/:id/lunchboxes/:lunchboxId` |
| PATCH | `/api/children/:id/lunchboxes/:lunchboxId/set-default` |
| GET | `/api/avatars` |
| GET | `/api/school-rules` |
| POST | `/api/lunchbox/sessions` |
| POST | `/api/lunchbox/sessions/openrouter` |
| GET | `/api/lunchbox/sessions` |
| GET | `/api/lunchbox/sessions/:id` |
| DELETE | `/api/lunchbox/sessions/:id` |
| PATCH | `/api/lunchbox/sessions/:id/plan` |
| PATCH | `/api/lunchbox/sessions/:id/flag` |
| GET | `/api/base-lunchboxes` |
| POST | `/api/notifications/token` |
| PATCH | `/api/notifications/token` |
| DELETE | `/api/notifications/token` |
| POST | `/api/notifications/broadcast` |

Static: `GET` files under `/uploads`, `/avatars`, `/allergens`, `/base_lunchboxes` from project root folders.

---

## Database artifacts

### `schema.sql`

Full MySQL DDL for the app: tables including `users`, `children`, `allergens`, `child_allergens`, `avatars`, `school_rules`, `child_school_rules`, `food_items`, `nutrition_goals`, `child_nutrition_goals`, `child_lunchboxes`, `base_lunchboxes`, `lunchbox_sessions`, `ingredient_images`, `lunchbox_results`, `session_allergen_overrides`, `password_reset_tokens`, `user_fcm_tokens`, `_migrations`.

### `src/config/migrations/*.sql`

| File | Purpose |
|------|---------|
| `001_create_user_fcm_tokens.sql` | FCM token table |
| `003_password_reset_tokens.sql` | Password reset hashes |
| `004_add_notifications_enabled_if_missing.sql` | `notifications_enabled` column |
| `add_session_flags.sql` | `is_favorite`, `save_for_later` on sessions |
| `create_base_lunchboxes.sql` | Table + seed rows |
| `update_base_lunchboxes_image_path.sql` | Column rename/update paths |
| `widen_nutrition_goal_override.sql` | Widen `nutrition_goal_override` column |

---

## Other repo files (non-JS runtime)

| File | Purpose |
|------|---------|
| `.env` / `.env.example` | Local/env template (secrets; not documented here) |
| `google-services.json` | Android Firebase client config (for mobile app; not used by server code directly) |
| `lunchboxai-15abb-firebase-adminsdk-*.json` | Service account key for Firebase Admin when not using env JSON |
| `LunchBoxAI.postman_collection.json` | Postman API collection for manual testing |

---

## Dependency graph (conceptual)

- **HTTP** → routes → controllers → models → `database` pool.
- **Auth:** JWT in `authMiddleware` / `authController.signToken`; Passport only for OAuth web redirects.
- **AI:** `lunchboxController` → `aiService` + `imageGenService` + `imageService` + `LunchBox` / `Child` / `BaseLunchbox` / `FoodItem` (random names) / `NutritionGoal`.
- **Push:** `notificationController` → `firebaseAdmin` + `FcmToken` + optional `notificationAiService`.
