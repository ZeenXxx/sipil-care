# SIPIL CARE Admin Login Supabase

Login admin sekarang membaca akun dari tabel Supabase `admins`. Role dan permissions tidak lagi hardcoded di frontend/backend.

## 1. Buat Tabel `admins`

Jalankan SQL ini di Supabase SQL Editor:

```sql
create table if not exists public.admins (
  username text primary key,
  name text not null,
  password_hash text not null,
  role text not null,
  role_label text not null,
  allowed_pages jsonb not null default '[]'::jsonb,
  permissions jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz
);

alter table public.admins enable row level security;

drop policy if exists "admins can login" on public.admins;
create policy "admins can login"
on public.admins
for select
to anon
using (is_active = true);

create table if not exists public.admin_sessions (
  token_hash text primary key,
  username text not null references public.admins(username) on delete cascade,
  created_at timestamptz default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text,
  is_active boolean not null default true
);

alter table public.admin_sessions enable row level security;

drop policy if exists "admin sessions can be read" on public.admin_sessions;
create policy "admin sessions can be read"
on public.admin_sessions
for select
to anon
using (true);

drop policy if exists "admin sessions can be created" on public.admin_sessions;
create policy "admin sessions can be created"
on public.admin_sessions
for insert
to anon
with check (true);

drop policy if exists "admin sessions can be refreshed" on public.admin_sessions;
create policy "admin sessions can be refreshed"
on public.admin_sessions
for update
to anon
using (true)
with check (true);

drop policy if exists "admin sessions can be deleted" on public.admin_sessions;
create policy "admin sessions can be deleted"
on public.admin_sessions
for delete
to anon
using (true);
```

## 2. Seed Akun Admin Saat Ini

Password masih sama seperti akun lama. Hash di bawah memakai SHA-256.

```sql
insert into public.admins (
  username,
  name,
  password_hash,
  role,
  role_label,
  allowed_pages,
  permissions,
  is_active
)
values
(
  'developer',
  'Developer SIPIL CARE',
  'ee41ac44a8b7a0b29a49ec758a6cb252ba5f0855e76165c13a42cecbef8a13a4',
  'developer',
  'Developer',
  '["dashboard.html","resources.html","announcements.html","messages.html"]'::jsonb,
  '["dashboard","resources","announcements","messages","audit","admin_accounts"]'::jsonb,
  true
),
(
  'adminsipil',
  'Developer SIPIL CARE',
  'ee41ac44a8b7a0b29a49ec758a6cb252ba5f0855e76165c13a42cecbef8a13a4',
  'admin_sipil',
  'Admin SIPIL CARE',
  '["resources.html","announcements.html","messages.html"]'::jsonb,
  '["resources","announcements","messages"]'::jsonb,
  true
),
(
  'pendprof',
  'PENDPROF HMS',
  'd1ed6959bc776e804c4904f048ceb7fb8d37dc63dc345fe247f9b496776470fa',
  'pendprof_hms',
  'PENDPROF HMS',
  '["resources.html","messages.html"]'::jsonb,
  '["resources","messages"]'::jsonb,
  true
),
(
  'eksternalhms',
  'Eksternal HMS',
  '8d0c0390b1974cddc2c7e9d49ebd7f9efaf47ae9cdc344cedbec91e772b54a08',
  'eksternal_hms',
  'Eksternal HMS',
  '["announcements.html","messages.html"]'::jsonb,
  '["announcements","messages"]'::jsonb,
  true
)
on conflict (username) do update set
  name = excluded.name,
  password_hash = excluded.password_hash,
  role = excluded.role,
  role_label = excluded.role_label,
  allowed_pages = excluded.allowed_pages,
  permissions = excluded.permissions,
  is_active = excluded.is_active,
  updated_at = now();
```

## 3. Konfigurasi

Pastikan `js/student-config.js` berisi:

```js
window.SIPILCARE_AUTH_CONFIG = {
  mode: "supabase",
  supabaseUrl: "https://PROJECT_ID.supabase.co",
  supabaseAnonKey: "ISI_ANON_KEY",
  tableName: "students",
  adminTableName: "admins",
  adminSessionTableName: "admin_sessions"
};
```

## Catatan

Sesi admin memakai tabel `admin_sessions`. Browser hanya menyimpan token acak untuk mengecek sesi tersebut ke Supabase. Jika admin tidak membuka halaman admin selama 30 menit, `last_seen_at`/`expires_at` di database dianggap kedaluwarsa dan admin harus login ulang.

Manajemen akun admin di dashboard tidak lagi menulis langsung ke tabel `admins`. Panel memakai RPC Supabase berikut agar database memvalidasi sesi developer dari tabel `admin_sessions`:

- `sipilcare_list_admin_accounts`
- `sipilcare_save_admin_account`
- `sipilcare_delete_admin_account`

RPC tersebut sudah diterapkan ke project Supabase `sipil-care`. Jika project Supabase dibuat ulang, jalankan ulang migration RPC admin account management dari riwayat migration Supabase.

Untuk membersihkan sesi lama secara manual:

```sql
delete from public.admin_sessions
where expires_at < now() or last_seen_at < now() - interval '30 minutes';
```
