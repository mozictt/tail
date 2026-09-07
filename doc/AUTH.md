# Dokumentasi: Sistem Autentikasi (Auth, Refresh Token, Logout)

> Dibuat berdasarkan sesi pengembangan — 07 September 2026

---

## 1. Arsitektur Overview

```
Browser (Nuxt Frontend)
    │
    ├── useApi.ts               → HTTP client global (ofetch) + interceptor 401
    ├── stores/auth.ts          → Pinia store utama: state, login, logout, refresh
    ├── composables/useAuth.ts  → Helper composable (dipakai di layout tertentu)
    └── middleware/auth.global.ts → Guard navigasi halaman
```

---

## 2. Aturan Cookie

Semua data sesi disimpan dalam cookie dengan nama berikut. **Wajib konsisten** di seluruh codebase.

| Kunci Cookie | Tipe | Keterangan |
|---|---|---|
| `token` | string | JWT Access Token |
| `refreshToken` | string | JWT Refresh Token |
| `id_user` | string | ID user yang login |
| `id_role` | string | ID role user |
| `role` | string | Nama role user |
| `username` | string | Username user |
| `slug` | string | Slug tenant user |
| `tenant_id` | string | ID tenant |
| `is_master_tenant` | "true"/"false" | Apakah master tenant |
| `is_impersonated` | "true"/"false" | Apakah sedang switch user |
| `impersonator_info` | JSON string | Info akun asli saat switch user |

> ⚠️ **Jangan** gunakan nama berbeda seperti `access_token` atau `refresh_token` — akan menyebabkan data tidak tersinkronisasi.

---

## 3. Konfigurasi JWT

### Backend (`/backend/.env`)

```env
JWT_EXPIRES_IN=15m          # Access token: 15 menit
JWT_REFRESH_EXPIRES_IN=7d   # Refresh token: 7 hari
```

> ⚠️ Jangan set `JWT_EXPIRES_IN` terlalu pendek (< 5 menit) karena akan konflik dengan buffer pre-emptive refresh di frontend.

### Frontend — Buffer Pre-emptive Refresh

**Berlaku di 2 file:**

- `app/stores/auth.ts` — action `isTokenExpired` (baris ~120)
- `app/composables/useAuth.ts` — fungsi `isTokenExpired` (baris ~12)

```typescript
// Buffer: refresh dilakukan 30 detik SEBELUM token benar-benar expired
return payload.exp < now + 30;
```

**Aturan penentuan nilai buffer:**

```
Buffer yang aman = JWT_EXPIRES_IN (dalam detik) / 30

Contoh: JWT_EXPIRES_IN=15m → 900 detik → buffer 30 detik sudah cukup aman
```

---

## 4. Alur Refresh Token

```
useApi.ts — onRequest (sebelum setiap request):
  ├── Jika token ADA dan isTokenExpired = true:
  │     └── Panggil refreshTokenAsync()
  │           ├── Berhasil → token baru, lanjut request
  │           └── Gagal → logout() + redirect /login
  │
  └── Jika token ADA → pasang Authorization: Bearer <token>

useApi.ts — onResponseError (jika backend kembalikan error):
  └── Jika status 401:
        ├── Pesan mengandung "Logged out" / "tidak berlaku" / tidak ada refreshToken:
        │     → BLACKLISTED → langsung logout() tanpa coba refresh
        └── Bukan blacklisted:
              └── Coba refreshTokenAsync()
                    ├── Berhasil → (caller retry sendiri)
                    └── Gagal → logout() + throw error
```

---

## 5. Aturan Logout

### Frontend (`stores/auth.ts` — action `logout`)

1. **Hit API backend** `POST /auth/logout` dengan:
   - Header: `Authorization: Bearer <token>`
   - Body: `{ refreshToken, userId }`
2. Di blok `finally` (selalu dijalankan meski API gagal):
   - Reset semua state Pinia (token, role, username, dll)
   - Reset store lain: `menuStore.$reset()`, `masterStore.clearTargetTenant()`, `companyProfileStore.$reset()`
   - Hapus semua cookie via `clearAllCookies()`
   - Redirect ke `/login`

> ✅ Menggunakan `try/catch/finally` agar pengguna selalu bisa logout meski backend down.

### Backend (`POST /auth/logout`)

1. Set `refreshToken = null` di database user
2. Hapus semua key Redis terkait userId (`*:<userId>`)
3. Masukkan access token ke Redis Blacklist (`blacklist_token:<token>`) dengan TTL = sisa waktu token

### Deteksi Token Blacklisted (Backend — `JwtAuthGuard`)

```typescript
const isBlacklisted = await this.redis.get(`blacklist_token:${token}`);
if (isBlacklisted) {
  throw new UnauthorizedException('Token sudah tidak berlaku (Logged out)');
}
```

Response saat token blacklisted:
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Token sudah tidak berlaku (Logged out)"
}
```

---

## 6. Aturan Company Profile Store

File: `app/stores/company-profile.ts`

**Aturan:** `fetchProfile()` **hanya boleh dipanggil setelah user login**.

```typescript
async fetchProfile(force = false) {
  const auth = useAuthStore();
  if (!auth.isLoggedIn || !auth.token) return; // Guard: jangan hit API sebelum login
  ...
}
```

> Jangan panggil `fetchProfile()` di halaman `/login` atau di `onMounted` halaman publik manapun.

---

## 7. Endpoint Auth Backend

| Method | Path | Auth | Keterangan |
|---|---|---|---|
| POST | `/auth/login` | Public | Login, kembalikan `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | Public | Refresh token, body: `{ userId, refreshToken }` |
| POST | `/auth/logout` | Bearer Token | Logout, invalidasi token di Redis |
| POST | `/auth/switch-user` | Bearer + Master | Switch ke akun tenant anak |
| POST | `/auth/switch-back` | Bearer | Kembali ke akun master |

### Response `/auth/refresh` (berhasil):
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

> ⚠️ Response **tidak** dibungkus dalam `data`. Parsing langsung dari `res.accessToken`, **bukan** `res.data.accessToken`.

---

## 8. Checklist Developer

- [ ] Nama cookie konsisten: gunakan `"token"` dan `"refreshToken"` (bukan `access_token`)
- [ ] Setiap perubahan `JWT_EXPIRES_IN` → sesuaikan buffer `isTokenExpired` di frontend
- [ ] `fetchProfile()` hanya dipanggil setelah `auth.isLoggedIn === true`
- [ ] Logout selalu hit `POST /auth/logout` sebelum clear cookie
- [ ] `refreshTokenAsync()` wajib `throw error` saat gagal agar caller tahu
- [ ] Jangan set `JWT_EXPIRES_IN` lebih kecil dari `2 × buffer isTokenExpired`
