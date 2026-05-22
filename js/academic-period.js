export const ACADEMIC_SETTINGS_COLLECTION = 'site_settings';
export const ACADEMIC_SETTINGS_DOC = 'academic_period';
export const PRACTICUM_ROSTER_COLLECTION = 'practicum_rosters';
export const PRACTICUM_ATTENDANCE_SESSION_COLLECTION = 'practicum_attendance_sessions';
export const PRACTICUM_ATTENDANCE_RECORD_COLLECTION = 'practicum_attendance_records';

export const PRACTICUM_COURSES = [
  { semester: 1, title: 'Computer Aided Design (CAD)', type: 'S' },
  { semester: 1, title: 'Praktik Kimia', type: 'P' },
  { semester: 2, title: 'Praktik Fisika', type: 'P' },
  { semester: 2, title: 'Praktik Pemetaan Lahan Terapan', type: 'P' },
  { semester: 3, title: 'Praktik Hidraulika', type: 'P' },
  { semester: 3, title: 'Praktik Rekayasa Lalu Lintas', type: 'P' },
  { semester: 4, title: 'Aplikasi Ketekniksipilan 1', type: 'S' },
  { semester: 4, title: 'Praktik Bahan Perkerasan Jalan Raya', type: 'P' },
  { semester: 4, title: 'Praktik Geoteknik', type: 'P' },
  { semester: 5, title: 'Aplikasi Ketekniksipilan 2', type: 'S' },
  { semester: 6, title: 'Pengantar Building Information Modeling (BIM)', type: 'S' }
];

const TERM_LABELS = {
  odd: 'Ganjil',
  even: 'Genap'
};

export const normalizeText = value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();

export const courseCategory = course => `${course.title}-${course.type}`;

export const courseKind = type => type === 'P' ? 'Praktikum' : 'Studio';

export const slugifyAcademic = value => String(value || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'praktikum';

export const courseFromCategory = category => {
  const normalized = normalizeText(category);
  return PRACTICUM_COURSES.find(course => {
    const target = normalizeText(course.title);
    const withSuffix = normalizeText(courseCategory(course));
    return normalized === target || normalized === withSuffix;
  }) || null;
};

export const matchesPracticumCourse = (resource, course) => {
  const category = normalizeText(resource?.category);
  const title = normalizeText(resource?.title);
  const type = normalizeText(resource?.type);
  const courseValue = normalizeText(resource?.course);
  const target = normalizeText(course.title);
  const withSuffix = normalizeText(courseCategory(course));

  return category === target
    || category === withSuffix
    || courseValue === target
    || courseValue === withSuffix
    || title.includes(target)
    || type === target
    || type === withSuffix;
};

export const semesterForPracticumResource = resource => {
  const explicitSemester = Number(resource?.semester);
  if (Number.isFinite(explicitSemester) && explicitSemester > 0) return explicitSemester;

  const matchedCourse = PRACTICUM_COURSES.find(course => matchesPracticumCourse(resource, course));
  return matchedCourse?.semester || null;
};

export const defaultAcademicPeriod = (date = new Date()) => {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  if (month >= 9) {
    return { academicYearStart: year, term: 'odd', mode: 'auto' };
  }

  if (month <= 1) {
    return { academicYearStart: year - 1, term: 'odd', mode: 'auto' };
  }

  return { academicYearStart: year - 1, term: 'even', mode: 'auto' };
};

export const normalizeAcademicSettings = settings => {
  const overrideTerm = settings?.overrideTerm || settings?.term || '';
  const year = Number(settings?.overrideAcademicYearStart || settings?.academicYearStart || 0);

  return {
    overrideEnabled: settings?.overrideEnabled === true,
    overrideAcademicYearStart: Number.isFinite(year) ? year : 0,
    overrideTerm: overrideTerm === 'odd' || overrideTerm === 'even' ? overrideTerm : '',
    overrideNote: String(settings?.overrideNote || settings?.note || '').trim(),
    updatedAt: settings?.updatedAt || '',
    updatedBy: settings?.updatedBy || ''
  };
};

export const resolveAcademicPeriod = (settings = {}, date = new Date()) => {
  const automatic = defaultAcademicPeriod(date);
  const normalized = normalizeAcademicSettings(settings);

  if (normalized.overrideEnabled && normalized.overrideAcademicYearStart && normalized.overrideTerm) {
    return {
      academicYearStart: normalized.overrideAcademicYearStart,
      term: normalized.overrideTerm,
      mode: 'override',
      note: normalized.overrideNote,
      updatedAt: normalized.updatedAt,
      updatedBy: normalized.updatedBy
    };
  }

  return automatic;
};

export const cohortYear = value => {
  const match = String(value || '').match(/\d{2,4}/);
  if (!match) return null;
  const year = Number(match[0]);
  if (!Number.isFinite(year)) return null;
  return year < 100 ? 2000 + year : year;
};

export const semesterForCohort = (angkatan, settings = {}, date = new Date()) => {
  const cohort = cohortYear(angkatan);
  if (!cohort) return null;

  const period = resolveAcademicPeriod(settings, date);
  const semester = (period.academicYearStart - cohort) * 2 + (period.term === 'odd' ? 1 : 2);
  return Math.max(1, semester);
};

export const academicPeriodLabel = period => {
  const year = Number(period?.academicYearStart || defaultAcademicPeriod().academicYearStart);
  const term = period?.term === 'odd' ? 'odd' : 'even';
  const mode = period?.mode === 'override' ? 'override admin' : 'otomatis';
  return `Tahun akademik ${year}/${year + 1} - Semester ${TERM_LABELS[term]} (${mode})`;
};

export const semesterAccessLabel = (semester, angkatan, settings = {}, date = new Date()) => {
  const period = resolveAcademicPeriod(settings, date);
  const cohort = cohortYear(angkatan);
  return `Semester ${semester || '-'} aktif untuk angkatan ${cohort || '-'} berdasarkan ${academicPeriodLabel(period)}.`;
};
