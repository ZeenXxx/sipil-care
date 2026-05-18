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
  '["dashboard.html","resources.html","announcements.html","messages.html","admin-accounts.html","student-accounts.html"]'::jsonb,
  '["dashboard","resources","practicum_studio","software","videos","announcements","messages","audit","admin_accounts","student_accounts","log_delete"]'::jsonb,
  true
),
(
  'adminsipil',
  'Developer SIPIL CARE',
  'ee41ac44a8b7a0b29a49ec758a6cb252ba5f0855e76165c13a42cecbef8a13a4',
  'admin_sipil',
  'Admin SIPIL CARE',
  '["dashboard.html","resources.html","announcements.html","messages.html"]'::jsonb,
  '["dashboard","resources","practicum_studio","software","videos","announcements","messages","audit"]'::jsonb,
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

## 4. Akun Mahasiswa

Manajemen akun mahasiswa memakai tabel `students` yang sudah ditambah kolom `angkatan` dan `is_active`, plus tabel `student_cohorts`.

```sql
alter table public.students
  add column if not exists angkatan text,
  add column if not exists is_active boolean not null default true;

create table if not exists public.student_cohorts (
  angkatan text primary key,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz
);

alter table public.student_cohorts enable row level security;
```

Panel developer memakai RPC berikut:

- `sipilcare_list_student_cohorts`
- `sipilcare_list_student_accounts`
- `sipilcare_save_student_cohort`
- `sipilcare_delete_student_cohort`
- `sipilcare_import_student_accounts`
- `sipilcare_save_student_account`
- `sipilcare_delete_student_account`

Default akun mahasiswa:

- Password awal: `NIM@Sipil`
- Recovery: `angkatan_3-angka-terakhir-NIM`

## Catatan

Sesi admin memakai tabel `admin_sessions`. Browser hanya menyimpan token acak untuk mengecek sesi tersebut ke Supabase. Jika admin tidak membuka halaman admin selama 30 menit, `last_seen_at`/`expires_at` di database dianggap kedaluwarsa dan admin harus login ulang.

Manajemen akun admin di dashboard tidak lagi menulis langsung ke tabel `admins`. Panel memakai RPC Supabase berikut agar database memvalidasi sesi developer dari tabel `admin_sessions`:

- `sipilcare_list_admin_accounts`
- `sipilcare_save_admin_account`
- `sipilcare_delete_admin_account`
- `sipilcare_list_admin_roles`
- `sipilcare_save_admin_role`
- `sipilcare_delete_admin_role`

RPC admin dan mahasiswa dasar sudah diterapkan ke project Supabase `sipil-care`. Untuk fitur role custom, jalankan SQL bagian **Role Admin Custom** di bawah. Jika project Supabase dibuat ulang, jalankan ulang migration RPC dari riwayat migration Supabase.

## 5. Role Admin Custom

Jalankan SQL ini jika ingin developer bisa membuat role baru dan mengatur halaman/permission dari dashboard.

```sql
create table if not exists public.admin_roles (
  role text primary key,
  role_label text not null,
  allowed_pages jsonb not null default '[]'::jsonb,
  permissions jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  is_system boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz
);

alter table public.admin_roles enable row level security;

insert into public.admin_roles (role, role_label, allowed_pages, permissions, is_active, is_system)
values
('developer', 'Developer', '["dashboard.html","resources.html","announcements.html","messages.html","admin-accounts.html","student-accounts.html"]'::jsonb, '["dashboard","resources","practicum_studio","software","videos","announcements","messages","audit","admin_accounts","student_accounts","log_delete"]'::jsonb, true, true),
('admin_sipil', 'Admin SIPIL CARE', '["dashboard.html","resources.html","announcements.html","messages.html"]'::jsonb, '["dashboard","resources","practicum_studio","software","videos","announcements","messages","audit"]'::jsonb, true, false),
('pendprof_hms', 'PENDPROF HMS', '["resources.html","messages.html"]'::jsonb, '["resources","messages"]'::jsonb, true, false),
('aslab_hms', 'Admin Aslab', '["resources.html","messages.html"]'::jsonb, '["practicum_studio","messages"]'::jsonb, true, false),
('asdos_hms', 'Admin Asdos', '["resources.html","messages.html"]'::jsonb, '["practicum_studio","messages"]'::jsonb, true, false),
('eksternal_hms', 'Eksternal HMS', '["announcements.html","messages.html"]'::jsonb, '["announcements","messages"]'::jsonb, true, false)
on conflict (role) do update set
  role_label = excluded.role_label,
  allowed_pages = excluded.allowed_pages,
  permissions = excluded.permissions,
  is_active = excluded.is_active,
  is_system = excluded.is_system,
  updated_at = now();

create or replace function public.sipilcare_is_admin_manager(p_session_token_hash text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_sessions s
    join public.admins a on a.username = s.username
    where s.token_hash = p_session_token_hash
      and s.is_active = true
      and s.expires_at > now()
      and a.is_active = true
      and (a.role = 'developer' or a.permissions ? 'admin_accounts')
  );
$$;

create or replace function public.sipilcare_list_admin_roles(p_session_token_hash text)
returns table (
  role text,
  role_label text,
  allowed_pages jsonb,
  permissions jsonb,
  is_active boolean,
  is_system boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.sipilcare_is_admin_manager(p_session_token_hash) then
    raise exception 'Akses role admin ditolak.';
  end if;

  return query
  select r.role, r.role_label, r.allowed_pages, r.permissions, r.is_active, r.is_system, r.created_at, r.updated_at
  from public.admin_roles r
  order by case when r.role = 'developer' then 0 else 1 end, r.role_label;
end;
$$;

create or replace function public.sipilcare_save_admin_role(
  p_session_token_hash text,
  p_original_role text,
  p_role text,
  p_role_label text,
  p_allowed_pages jsonb,
  p_permissions jsonb,
  p_is_active boolean
)
returns table (
  role text,
  role_label text,
  allowed_pages jsonb,
  permissions jsonb,
  is_active boolean,
  is_system boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := lower(regexp_replace(trim(p_role), '[^a-z0-9_]+', '_', 'g'));
  v_original text := nullif(lower(regexp_replace(trim(coalesce(p_original_role, '')), '[^a-z0-9_]+', '_', 'g')), '');
  v_system boolean := coalesce(v_original, v_role) = 'developer';
begin
  if not public.sipilcare_is_admin_manager(p_session_token_hash) then
    raise exception 'Akses simpan role admin ditolak.';
  end if;
  if v_role = '' or trim(p_role_label) = '' then
    raise exception 'Kode role dan nama role wajib diisi.';
  end if;
  if v_original = 'developer' and v_role <> 'developer' then
    raise exception 'Role Developer tidak bisa diganti kodenya.';
  end if;

  if v_original is not null and v_original <> v_role then
    update public.admin_roles ar set role = v_role where ar.role = v_original;
    update public.admins a set role = v_role where a.role = v_original;
  end if;

  insert into public.admin_roles (role, role_label, allowed_pages, permissions, is_active, is_system, updated_at)
  values (v_role, trim(p_role_label), p_allowed_pages, p_permissions, case when v_role = 'developer' then true else p_is_active end, v_system, now())
  on conflict on constraint admin_roles_pkey do update set
    role_label = excluded.role_label,
    allowed_pages = excluded.allowed_pages,
    permissions = excluded.permissions,
    is_active = excluded.is_active,
    is_system = excluded.is_system,
    updated_at = now();

  update public.admins a
  set role_label = trim(p_role_label),
      allowed_pages = p_allowed_pages,
      permissions = p_permissions,
      updated_at = now()
  where a.role = v_role;

  delete from public.admin_sessions s
  where s.username in (select a.username from public.admins a where a.role = v_role);

  return query
  select r.role, r.role_label, r.allowed_pages, r.permissions, r.is_active, r.is_system
  from public.admin_roles r
  where r.role = v_role;
end;
$$;

create or replace function public.sipilcare_delete_admin_role(
  p_session_token_hash text,
  p_role text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := lower(trim(p_role));
begin
  if not public.sipilcare_is_admin_manager(p_session_token_hash) then
    raise exception 'Akses hapus role admin ditolak.';
  end if;
  if v_role = 'developer' then
    raise exception 'Role Developer tidak bisa dihapus.';
  end if;
  if exists (select 1 from public.admins a where a.role = v_role) then
    raise exception 'Role masih dipakai akun admin.';
  end if;

  delete from public.admin_roles ar where ar.role = v_role and ar.is_system = false;
  return found;
end;
$$;

create or replace function public.sipilcare_save_admin_account(
  p_session_token_hash text,
  p_original_username text,
  p_username text,
  p_name text,
  p_password_hash text,
  p_role text,
  p_role_label text,
  p_allowed_pages jsonb,
  p_permissions jsonb,
  p_is_active boolean
)
returns table (
  username text,
  name text,
  role text,
  role_label text,
  allowed_pages jsonb,
  permissions jsonb,
  is_active boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := lower(trim(p_username));
  v_original text := nullif(lower(trim(coalesce(p_original_username, ''))), '');
  v_password text;
begin
  if not public.sipilcare_is_admin_manager(p_session_token_hash) then
    raise exception 'Akses simpan akun admin ditolak.';
  end if;
  if v_username = '' or trim(p_name) = '' then
    raise exception 'Username dan nama wajib diisi.';
  end if;

  if v_original is not null then
    select a.password_hash into v_password from public.admins a where a.username = v_original;
  end if;
  v_password := coalesce(p_password_hash, v_password);
  if v_password is null then
    raise exception 'Password wajib diisi untuk akun baru.';
  end if;

  if v_original is not null and v_original <> v_username then
    delete from public.admin_sessions s where s.username = v_original;
    update public.admins a set username = v_username where a.username = v_original;
  end if;

  insert into public.admins (username, name, password_hash, role, role_label, allowed_pages, permissions, is_active, updated_at)
  values (v_username, trim(p_name), v_password, p_role, p_role_label, p_allowed_pages, p_permissions, p_is_active, now())
  on conflict on constraint admins_pkey do update set
    name = excluded.name,
    password_hash = excluded.password_hash,
    role = excluded.role,
    role_label = excluded.role_label,
    allowed_pages = excluded.allowed_pages,
    permissions = excluded.permissions,
    is_active = excluded.is_active,
    updated_at = now();

  delete from public.admin_sessions s where s.username = v_username;

  return query
  select a.username, a.name, a.role, a.role_label, a.allowed_pages, a.permissions, a.is_active
  from public.admins a
  where a.username = v_username;
end;
$$;
```

Untuk membersihkan sesi lama secara manual:

```sql
delete from public.admin_sessions
where expires_at < now() or last_seen_at < now() - interval '30 minutes';
```
