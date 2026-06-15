export const GRADE_OPTIONS = ['', 'A', 'AB', 'B', 'BC', 'C', 'D', 'E'];

export const TS_COURSE_CATALOG = [
  { semester: 1, code: 'WU611011', name: 'Latihan Dasar Kedisiplinan dan Kepemimpinan', type: 'K', sks: 2 },
  { semester: 1, code: 'TS611011', name: 'Bahasa Inggris', type: 'K', sks: 2 },
  { semester: 1, code: 'TS611012', name: 'Matematika 1', type: 'K', sks: 4 },
  { semester: 1, code: 'TS611013', name: 'Fisika 1', type: 'K', sks: 4 },
  { semester: 1, code: 'TS611014', name: 'Kimia', type: 'K', sks: 3 },
  { semester: 1, code: 'TS613011', name: 'Pengantar Rekayasa Sipil', type: 'K', sks: 2 },
  { semester: 1, code: 'TS613012', name: 'Computer Aided Design (CAD)', type: 'S', sks: 2 },
  { semester: 1, code: 'TS613013', name: 'Praktik Kimia', type: 'P', sks: 1 },

  { semester: 2, code: 'WU621021', name: 'Bahasa Indonesia', type: 'K', sks: 2 },
  { semester: 2, code: 'WN621021', name: 'Pendidikan Kewarganegaraan', type: 'K', sks: 2 },
  { semester: 2, code: 'TS621021', name: 'Matematika 2', type: 'K', sks: 3 },
  { semester: 2, code: 'TS621022', name: 'Fisika 2', type: 'K', sks: 3 },
  { semester: 2, code: 'TS621023', name: 'Pemetaan Lahan Terapan', type: 'K', sks: 2 },
  { semester: 2, code: 'TS621024', name: 'Teori Kekuatan Bahan', type: 'K', sks: 2 },
  { semester: 2, code: 'TS621025', name: 'Sistem Transportasi', type: 'K', sks: 2 },
  { semester: 2, code: 'TS621026', name: 'Hidrologi', type: 'K', sks: 2 },
  { semester: 2, code: 'TS623021', name: 'Praktik Fisika', type: 'P', sks: 1 },
  { semester: 2, code: 'TS623022', name: 'Praktik Pemetaan Lahan Terapan', type: 'P', sks: 1 },

  { semester: 3, code: 'TS611031', name: 'Matematika 3', type: 'K', sks: 3 },
  { semester: 3, code: 'TS611032', name: 'Analisis Rekayasa 1', type: 'K', sks: 2 },
  { semester: 3, code: 'TS611033', name: 'Struktur Beton 1', type: 'K', sks: 2 },
  { semester: 3, code: 'TS611034', name: 'Struktur Baja 1', type: 'K', sks: 2 },
  { semester: 3, code: 'TS611035', name: 'Geometrik Lintasan', type: 'K', sks: 2 },
  { semester: 3, code: 'TS611036', name: 'Rekayasa Lalu Lintas', type: 'K', sks: 2 },
  { semester: 3, code: 'TS611037', name: 'Geoteknik 1', type: 'K', sks: 2 },
  { semester: 3, code: 'TS611038', name: 'Hidraulika', type: 'K', sks: 2 },
  { semester: 3, code: 'TS611039', name: 'Metode dan Peralatan Konstruksi', type: 'K', sks: 2 },
  { semester: 3, code: 'TS613031', name: 'Praktik Hidraulika', type: 'P', sks: 1 },
  { semester: 3, code: 'TS613032', name: 'Praktik Rekayasa Lalu Lintas', type: 'P', sks: 1 },

  { semester: 4, code: 'TS621041', name: 'Matematika 4', type: 'K', sks: 3 },
  { semester: 4, code: 'TS621042', name: 'Analisis Rekayasa 2', type: 'K', sks: 2 },
  { semester: 4, code: 'TS621043', name: 'Struktur Beton 2', type: 'K', sks: 2 },
  { semester: 4, code: 'TS621044', name: 'Struktur Baja 2', type: 'K', sks: 2 },
  { semester: 4, code: 'TS621045', name: 'Perancangan Perkerasan Jalan Raya', type: 'K', sks: 2 },
  { semester: 4, code: 'TS621046', name: 'Geoteknik 2', type: 'K', sks: 2 },
  { semester: 4, code: 'TS621047', name: 'Perancangan Sistem Drainase', type: 'K', sks: 2 },
  { semester: 4, code: 'TS621048', name: 'Aplikasi Ketekniksipilan 1', type: 'S', sks: 2 },
  { semester: 4, code: 'TS623041', name: 'Praktik Geoteknik', type: 'P', sks: 1 },
  { semester: 4, code: 'TS623042', name: 'Praktik Bahan Perkerasan Jalan Raya', type: 'P', sks: 1 },
  { semester: 4, code: 'TS623043', name: 'Praktik Geoteknik 2', type: 'P', sks: 1 },

  { semester: 5, code: 'TS611051', name: 'Dinamika Struktur dan Rekayasa Gempa', type: 'K', sks: 2 },
  { semester: 5, code: 'TS611052', name: 'Perancangan Jalan Raya', type: 'K', sks: 2 },
  { semester: 5, code: 'TS611053', name: 'Perancangan Fondasi 2', type: 'K', sks: 2 },
  { semester: 5, code: 'TS611054', name: 'Rekayasa Sungai dan Rawa', type: 'K', sks: 2 },
  { semester: 5, code: 'TS611055', name: 'Perancangan Sistem Pengairan', type: 'K', sks: 2 },
  { semester: 5, code: 'TS611056', name: 'Manajemen Rekayasa Konstruksi', type: 'K', sks: 2 },
  { semester: 5, code: 'TS611057', name: 'Ekonomi Rekayasa', type: 'K', sks: 2 },
  { semester: 5, code: 'TS613051', name: 'Aplikasi Ketekniksipilan 2', type: 'S', sks: 2 },
  { semester: 5, code: 'TS612XXX', name: 'Pilihan 1', type: 'K', sks: 2, elective: true },

  { semester: 6, code: 'TS603061', name: 'Praktik Kerja', type: 'P', sks: 2 },
  { semester: 6, code: 'TS621061', name: 'Metode Penelitian', type: 'K', sks: 2 },
  { semester: 6, code: 'TS621062', name: 'Perancangan Bangunan Gedung', type: 'K', sks: 2 },
  { semester: 6, code: 'TS621063', name: 'Perancangan Jembatan', type: 'K', sks: 2 },
  { semester: 6, code: 'TS621064', name: 'Rekayasa Bandar Udara', type: 'K', sks: 2 },
  { semester: 6, code: 'TS621065', name: 'Pengelolaan Sumber Daya Air dan Lahan', type: 'K', sks: 2 },
  { semester: 6, code: 'TS621066', name: 'Perancangan Bangunan Air', type: 'K', sks: 2 },
  { semester: 6, code: 'TS621067', name: 'Administrasi Proyek', type: 'K', sks: 2 },
  { semester: 6, code: 'TS613052', name: 'Pengantar Building Information Modeling (BIM)', type: 'S', sks: 2 },
  { semester: 6, code: 'TS622XXX', name: 'Pilihan 2', type: 'K', sks: 2, elective: true },

  { semester: 7, code: 'WN611071', name: 'Pendidikan Agama', type: 'K', sks: 2 },
  { semester: 7, code: 'WN611072', name: 'Pendidikan Pancasila', type: 'K', sks: 2 },
  { semester: 7, code: 'TS603071', name: 'Capstone Design: Proyek Konstruksi', type: 'S', sks: 6 },
  { semester: 7, code: 'TS611071', name: 'Rekayasa Lingkungan', type: 'K', sks: 2 },
  { semester: 7, code: 'TS612XXX', name: 'Pilihan 3', type: 'K', sks: 3, elective: true },

  { semester: 8, code: 'WN621081', name: 'Pendidikan Kewarganegaraan', type: 'K', sks: 2 },
  { semester: 8, code: 'TS603081', name: 'Karya Ilmiah', type: 'S', sks: 4 },
  { semester: 8, code: 'TS621082', name: 'Kewirausahaan', type: 'K', sks: 2 },
  { semester: 8, code: 'TS622XXX', name: 'Pilihan 4', type: 'K', sks: 2, elective: true }
];

export const TS_ELECTIVE_OPTIONS = [
  { semester: 5, code: 'TS612051', name: 'Struktur Beton Prategang', type: 'K', sks: 2 },
  { semester: 5, code: 'TS612052', name: 'Studi Pengembangan Wilayah', type: 'K', sks: 2 },
  { semester: 5, code: 'TS612053', name: 'Geoteknik Lanjut', type: 'K', sks: 2 },
  { semester: 5, code: 'TS612054', name: 'Mitigasi Bencana Hidrometeorologis', type: 'K', sks: 2 },
  { semester: 5, code: 'TS612055', name: 'Hukum Kontrak Konstruksi', type: 'K', sks: 2 },
  { semester: 6, code: 'TS622061', name: 'Struktur Kayu', type: 'K', sks: 2 },
  { semester: 6, code: 'TS622062', name: 'Rekayasa Jalan Rel', type: 'K', sks: 2 },
  { semester: 6, code: 'TS622063', name: 'Geologi Teknik', type: 'K', sks: 2 },
  { semester: 6, code: 'TS622064', name: 'Angkutan Sedimen', type: 'K', sks: 2 },
  { semester: 6, code: 'TS622065', name: 'Penjadwalan Proyek', type: 'K', sks: 2 },
  { semester: 7, code: 'TS612071', name: 'Struktur Baja Lanjut', type: 'K', sks: 3 },
  { semester: 7, code: 'TS612072', name: 'Pemodelan Transportasi', type: 'K', sks: 3 },
  { semester: 7, code: 'TS612073', name: 'Dinamika Tanah dan Fondasi Mesin', type: 'K', sks: 3 },
  { semester: 7, code: 'TS612074', name: 'Pemodelan Hidraulik', type: 'K', sks: 3 },
  { semester: 7, code: 'TS612075', name: 'Analisis Sistem dan Pengambilan Keputusan', type: 'K', sks: 3 },
  { semester: 8, code: 'TS622081', name: 'Struktur Beton Lanjut', type: 'K', sks: 2 },
  { semester: 8, code: 'TS622082', name: 'Keselamatan Jalan Raya', type: 'K', sks: 2 },
  { semester: 8, code: 'TS622083', name: 'Mekanika Batuan', type: 'K', sks: 2 },
  { semester: 8, code: 'TS622084', name: 'Hidro Informatika', type: 'K', sks: 2 },
  { semester: 8, code: 'TS622085', name: 'Rekayasa Nilai Proyek', type: 'K', sks: 2 }
];

export const coursesForSemester = semester => TS_COURSE_CATALOG
  .filter(course => Number(course.semester) === Number(semester));

export const requiredCoursesForSemester = semester => coursesForSemester(semester)
  .filter(course => !course.elective);

export const electiveCoursesForSemester = semester => coursesForSemester(semester)
  .filter(course => course.elective);

export const electiveOptionsForSemester = semester => TS_ELECTIVE_OPTIONS
  .filter(course => Number(course.semester) === Number(semester));

export const repeatableCourseOptions = () => TS_COURSE_CATALOG
  .filter(course => !course.elective)
  .map(course => ({ ...course, group: `Semester ${course.semester}` }));

export const defaultAcademicYearForSemester = (cohort, semester) => {
  const cohortYear = Number(String(cohort || '').match(/\d{4}/)?.[0] || 0);
  const semesterNumber = Number(semester || 0);
  if (!cohortYear || !semesterNumber) return '';
  const startYear = cohortYear + Math.max(0, Math.floor((semesterNumber - 1) / 2));
  return `${startYear}/${startYear + 1}`;
};
