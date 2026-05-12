# Supabase Storage untuk Foto Pemberitahuan

Fitur pemberitahuan di panel HMS menyimpan metadata ke Firestore collection `announcements`, sedangkan foto disimpan ke Supabase Storage bucket `announcements`.

Jalankan SQL ini di Supabase SQL Editor jika bucket belum ada:

```sql
insert into storage.buckets (id, name, public)
values ('announcements', 'announcements', true)
on conflict (id) do update set public = true;
```

Tambahkan policy Storage agar foto dapat diupload dari panel dan dibaca di halaman awal:

```sql
create policy "Public read announcement photos"
on storage.objects
for select
to anon
using (bucket_id = 'announcements');

create policy "Upload announcement photos"
on storage.objects
for insert
to anon
with check (bucket_id = 'announcements');
```

Catatan penting: karena website ini tanpa backend, anon key Supabase tetap terlihat di browser. Untuk produksi yang lebih aman, upload foto sebaiknya dipindahkan ke backend/serverless function agar hanya admin yang benar-benar bisa mengunggah file.
