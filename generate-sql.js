const crypto = require("crypto");

function sha256(text) {
  return crypto
    .createHash("sha256")
    .update(text)
    .digest("hex");
}

const input = `
2350031001 Arjuna Rizq Bernadine Heriyanto
2350031002 Muhamad Daffa Ananda
2350031003 Putri Aurelia
2350031004 Jessica Rahmawati
2350031005 Agni Indriyani
2350031006 Helmi Putra Pamungkas
2350031007 Muhammad Fadhil Saputra
2350031008 Ripki Rauni
2350031009 Resti Sofiatul Badriyah
2350031010 Muhammad Ariel Ardiansyah
2350031011 Nadya Cahya Aulia
2350031012 Muhammad Iqbal Faishol
2350031013 Syalindra Nazwa Sabila
2350031014 Radju Francisco Sequeira
2350031015 Nicholas Subarja
2350031016 Teguh Pirmansyah
2350031017 Carol Dies Felicio Lingga
2350031018 Muhamad Ikbal Bayehaqi
2350031019 Muhamad Raka Aditya Nugraha Sonjaya
2350031020 Arief Tediansyah
2350031021 Taufik Ramdani
2350031022 Sa'adah Roihan
2350031023 Abdurrahman Fritzy
2350031024 Rendy Muhammad Ramdhani
2350031025 Abyan Muhammad Fathulbirri
2350031026 Archelaus Lerek
2350031027 Muhammad Hanafie
2350031028 Muhamad Agung Santoso
2350031029 Naila Nurrisya Maulida
2350031030 Aditya Novito Pratama
2350031031 Royyan Almuyassar
2350031032 Muhammad Farhan Rizqy Maulana
2350031033 Muhammad Fajar Adhitya
2350031034 Iqbal Maulana
2350031035 Muhammad Sheva Ramadhan
2350031036 Ananda Adelia Putri
2350031037 Muhammad Rivaldi
2350031038 Ridwan Priyoga
2350031039 Karin Nina
2350031040 Kikin Ahmad Fadilah
`;

const rows = input
  .trim()
  .split("\n")
  .map(line => line.trim())
  .filter(Boolean);

const values = rows.map(row => {

  const parts = row.split(/\s+/);

  const nim = parts.shift();

  const name = parts
    .join(" ")
    .replace(/'/g, "''");

  const defaultPassword = `${nim}@Sipil`;

  const passwordHash = sha256(defaultPassword);

  const recoveryHash = sha256(nim);

  return `('${nim}', '${name}', '${passwordHash}', '${recoveryHash}', true)`;

});

const sql = `
alter table public.students
add column if not exists must_change_password boolean default true;

insert into public.students (
  nim,
  name,
  password_hash,
  recovery_code_hash,
  must_change_password
)
values
${values.join(",\n")}
on conflict (nim) do update set
  name = excluded.name,
  password_hash = excluded.password_hash,
  recovery_code_hash = excluded.recovery_code_hash,
  must_change_password = true,
  updated_at = now();
`;

console.log(sql);