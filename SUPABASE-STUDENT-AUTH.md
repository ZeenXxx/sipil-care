# SIPIL CARE Student Login Lintas Device

Login berbasis `localStorage` hanya tersimpan di browser/device yang sama. Agar NIM dan password bisa dipakai di device lain, aktifkan mode Supabase.

## 1. Buat Project Supabase

1. Buka Supabase dan buat project baru.
2. Ambil `Project URL` dan `anon public key` dari Project Settings > API.

## 2. Buat Tabel `students`

Jalankan SQL ini di Supabase SQL Editor:

```sql
drop table if exists public.students;

create table if not exists public.students (
  nim text primary key,
  name text not null,
  password_hash text not null,
  recovery_code_hash text not null,
  created_at timestamptz default now(),
  updated_at timestamptz
);

alter table public.students enable row level security;

create policy "students can register"
on public.students
for insert
to anon
with check (true);

create policy "students can login by nim"
on public.students
for select
to anon
using (true);

create policy "students can reset password"
on public.students
for update
to anon
using (true)
with check (true);
```

Catatan: policy di atas cocok untuk prototype. Untuk produksi yang benar-benar aman, buat backend/serverless function agar password hash tidak bisa dibaca langsung dari client.

## 3. Aktifkan Mode Cloud

Edit file:

```txt
js/student-config.js
```

Ubah menjadi:

```js
window.SIPILCARE_AUTH_CONFIG = {
  mode: "supabase",
  supabaseUrl: "https://PROJECT_ID.supabase.co",
  supabaseAnonKey: "ISI_ANON_KEY",
  tableName: "students"
};
```

Setelah itu commit dan deploy ulang ke Vercel.

## 4. Cara Login Mahasiswa

- Daftar: isi NIM, password, nama, dan kode pemulihan.
- Login di device lain: pakai NIM dan password yang sama.
- Reset password: isi NIM, kode pemulihan, dan password baru.

## Penting

Karena website ini static dan kontennya sensitif, pembatasan akses frontend tidak cukup untuk keamanan final. Untuk perlindungan sungguhan, file resource juga harus disimpan di storage privat dan hanya diberikan lewat backend setelah login valid.
