# SIPIL CARE Student Login Lintas Device

Login mahasiswa sekarang memakai konsep akun pre-provisioned: mahasiswa tidak bisa membuat akun sendiri. Admin/HMS harus membuat akun terlebih dahulu berisi NIM dan password awal acak. Setelah mahasiswa login pertama, mereka dapat mengubah password sendiri.

## 1. Buat Project Supabase

1. Buka Supabase dan buat project baru.
2. Ambil `Project URL` dan `anon public key` dari Project Settings > API.
3. Masukkan ke `js/student-config.js`.

## 2. Buat Tabel `students`

Jalankan SQL ini di Supabase SQL Editor:

```sql
drop table if exists public.students;

create table public.students (
  nim text primary key,
  name text not null,
  password_hash text not null,
  must_change_password boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz
);

alter table public.students enable row level security;

create policy "students can login by nim"
on public.students
for select
to anon
using (true);

create policy "students can change own password"
on public.students
for update
to anon
using (true)
with check (true);
```

Tidak ada policy `insert` untuk anon. Artinya pengunjung website tidak bisa membuat akun sendiri dari halaman public.

## 3. Generate Hash Password Awal

Password tidak disimpan mentah. Gunakan SHA-256 hash.

Contoh di browser console atau Node.js:

```js
async function hash(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

await hash("A7K9Q2M1");
```

## 4. Tambahkan Akun Mahasiswa

Contoh insert akun:

```sql
insert into public.students (nim, name, password_hash, must_change_password)
values
('2350031020', 'Nama Mahasiswa 1', 'ISI_HASH_PASSWORD_AWAL', true),
('2350031021', 'Nama Mahasiswa 2', 'ISI_HASH_PASSWORD_AWAL', true);
```

Berikan NIM dan password awal acak ke mahasiswa. Saat login pertama, sistem akan meminta mereka mengubah password.

## 5. Aktifkan Mode Supabase

Edit file:

```txt
js/student-config.js
```

Isi seperti ini:

```js
window.SIPILCARE_AUTH_CONFIG = {
  mode: "supabase",
  supabaseUrl: "https://PROJECT_ID.supabase.co",
  supabaseAnonKey: "ISI_ANON_KEY",
  tableName: "students"
};
```

## Catatan Keamanan

Ini lebih baik daripada registrasi bebas, tetapi website static tetap bukan sistem keamanan final. Untuk perlindungan serius, resource sensitif sebaiknya disimpan di private storage dan aksesnya diberikan lewat backend/serverless function setelah login valid.
