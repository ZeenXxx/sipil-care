import { app } from './firebase-config.js';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getMessaging, getToken, deleteToken, onMessage } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";
import {
  ACADEMIC_SETTINGS_COLLECTION,
  ACADEMIC_SETTINGS_DOC,
  ADMIN_PRACTICUM_SCOPE_COLLECTION,
  PRACTICUM_ATTENDANCE_RECORD_COLLECTION,
  PRACTICUM_ATTENDANCE_SESSION_COLLECTION,
  PRACTICUM_COURSES,
  PRACTICUM_ROSTER_COLLECTION,
  academicYearForCohortSemester,
  academicPeriodLabel,
  courseCategory,
  courseFromCategory,
  courseKind,
  defaultAcademicPeriod,
  normalizeCohortYear,
  normalizeAcademicSettings,
  resolveAcademicPeriod,
  sameCohort,
  semesterForPracticumResource,
  slugifyAcademic,
  targetCohortForPracticumResource,
  targetCohortForSemester
} from './academic-period.js?v=4';

if (window.SIPILCARE_ADMIN_READY) await window.SIPILCARE_ADMIN_READY;

const db = getFirestore(app);
const adminRootPrefix = location.pathname.includes('/pages/admin/') ? '../../' : '';

const resourceForm = document.getElementById('resourceForm');
const resourceId = document.getElementById('resourceId');
const resourceTitle = document.getElementById('resourceTitle');
const resourceCategory = document.getElementById('resourceCategory');
const resourceDescription = document.getElementById('resourceDescription');
const resourceAuthor = document.getElementById('resourceAuthor');
const resourceDate = document.getElementById('resourceDate');
const resourceThumb = document.getElementById('resourceThumb');
const resourceType = document.getElementById('resourceType');
const resourceFile = document.getElementById('resourceFile');

const softwareForm = document.getElementById('softwareForm');
const softwareTitle = document.getElementById('softwareTitle');
const softwareCategory = document.getElementById('softwareCategory');
const softwareDescription = document.getElementById('softwareDescription');
const softwareAuthor = document.getElementById('softwareAuthor');
const softwareDate = document.getElementById('softwareDate');
const softwareThumb = document.getElementById('softwareThumb');
const softwareFile = document.getElementById('softwareFile');
const softwareSearch = document.getElementById('softwareSearch');
const softwareFilter = document.getElementById('softwareFilter');
const softwareTable = document.getElementById('softwareTable');

const practicumForm = document.getElementById('practicumForm');
const practicumId = document.getElementById('practicumId');
const practicumTitle = document.getElementById('practicumTitle');
const practicumCategory = document.getElementById('practicumCategory');
const practicumTargetCohort = document.getElementById('practicumTargetCohort');
const practicumDescription = document.getElementById('practicumDescription');
const practicumAuthor = document.getElementById('practicumAuthor');
const practicumDate = document.getElementById('practicumDate');
const practicumThumb = document.getElementById('practicumThumb');
const practicumType = document.getElementById('practicumType');
const practicumFile = document.getElementById('practicumFile');
const practicumSearch = document.getElementById('practicumSearch');
const practicumFilter = document.getElementById('practicumFilter');
const practicumTable = document.getElementById('practicumTable');
const practicumBackfillTargets = document.getElementById('practicumBackfillTargets');
const practicumRosterForm = document.getElementById('practicumRosterForm');
const rosterCategory = document.getElementById('rosterCategory');
const rosterTargetCohort = document.getElementById('rosterTargetCohort');
const rosterAcademicYear = document.getElementById('rosterAcademicYear');
const rosterClassName = document.getElementById('rosterClassName');
const rosterRows = document.getElementById('rosterRows');
const attendanceSessionForm = document.getElementById('attendanceSessionForm');
const attendanceCategory = document.getElementById('attendanceCategory');
const attendanceTargetCohort = document.getElementById('attendanceTargetCohort');
const attendanceAcademicYear = document.getElementById('attendanceAcademicYear');
const attendanceClassName = document.getElementById('attendanceClassName');
const attendanceModuleNumber = document.getElementById('attendanceModuleNumber');
const attendanceModuleTitle = document.getElementById('attendanceModuleTitle');
const attendanceDate = document.getElementById('attendanceDate');
const attendanceOpenAt = document.getElementById('attendanceOpenAt');
const attendanceCloseAt = document.getElementById('attendanceCloseAt');
const attendanceCode = document.getElementById('attendanceCode');
const attendanceStatus = document.getElementById('attendanceStatus');
const attendanceSearch = document.getElementById('attendanceSearch');
const attendanceSessionFilter = document.getElementById('attendanceSessionFilter');
const attendanceExport = document.getElementById('attendanceExport');
const rosterExport = document.getElementById('rosterExport');
const sessionExport = document.getElementById('sessionExport');
const attendanceRecapTable = document.getElementById('attendanceRecapTable');
const attendanceSessionTable = document.getElementById('attendanceSessionTable');
const rosterTotalCount = document.getElementById('rosterTotalCount');
const attendanceSessionCount = document.getElementById('attendanceSessionCount');
const attendanceRecordCount = document.getElementById('attendanceRecordCount');

const videoForm = document.getElementById('videoForm');
const videoTitle = document.getElementById('videoTitle');
const videoThumb = document.getElementById('videoThumb');
const videoDescription = document.getElementById('videoDescription');
const videoCategoryInput = document.getElementById('videoCategoryInput');
const videoChannel = document.getElementById('videoChannel');
const videoYoutube = document.getElementById('videoYoutube');
const videoSearch = document.getElementById('videoSearch');
const videoFilter = document.getElementById('videoFilter');
const videoTable = document.getElementById('videoTable');

const announcementForm = document.getElementById('announcementForm');
const announcementId = document.getElementById('announcementId');
const announcementPhotoUrl = document.getElementById('announcementPhotoUrl');
const announcementPhotoPath = document.getElementById('announcementPhotoPath');
const announcementTitle = document.getElementById('announcementTitle');
const announcementType = document.getElementById('announcementType');
const announcementDate = document.getElementById('announcementDate');
const announcementDescription = document.getElementById('announcementDescription');
const announcementImage = document.getElementById('announcementImage');
const announcementSearch = document.getElementById('announcementSearch');
const announcementFilter = document.getElementById('announcementFilter');
const announcementTable = document.getElementById('announcementTable');
const messageSearch = document.getElementById('messageSearch');
const messageFilter = document.getElementById('messageFilter');
const messageTable = document.getElementById('messageTable');
const liveChatSearch = document.getElementById('liveChatSearch');
const liveChatNotifyBtn = document.getElementById('liveChatNotifyBtn');
const liveChatNotifyStatus = document.getElementById('liveChatNotifyStatus');
const liveChatThreads = document.getElementById('liveChatThreads');
const studentActivitySearch = document.getElementById('studentActivitySearch');
const studentActivityFilter = document.getElementById('studentActivityFilter');
const studentActivityCohortFilter = document.getElementById('studentActivityCohortFilter');
const studentActivityRefresh = document.getElementById('studentActivityRefresh');
const studentActivityTable = document.getElementById('studentActivityTable');
const studentTotalCount = document.getElementById('studentTotalCount');
const studentOnlineCount = document.getElementById('studentOnlineCount');
const studentLastSync = document.getElementById('studentLastSync');
const adminActivitySearch = document.getElementById('adminActivitySearch');
const adminActivityFilter = document.getElementById('adminActivityFilter');
const adminActivityRefresh = document.getElementById('adminActivityRefresh');
const adminActivityTable = document.getElementById('adminActivityTable');
const adminTotalCount = document.getElementById('adminTotalCount');
const adminOnlineCount = document.getElementById('adminOnlineCount');
const adminLastSync = document.getElementById('adminLastSync');
const auditSearch = document.getElementById('auditSearch');
const auditFilter = document.getElementById('auditFilter');
const auditTable = document.getElementById('auditTable');
const auditTotalCount = document.getElementById('auditTotalCount');
const accessLogSearch = document.getElementById('accessLogSearch');
const accessLogFilter = document.getElementById('accessLogFilter');
const accessLogActionFilter = document.getElementById('accessLogActionFilter');
const accessLogRefresh = document.getElementById('accessLogRefresh');
const accessLogDeleteAll = document.getElementById('accessLogDeleteAll');
const accessLogTable = document.getElementById('accessLogTable');
const accessTotalCount = document.getElementById('accessTotalCount');
const accessDownloadCount = document.getElementById('accessDownloadCount');
const accessVideoCount = document.getElementById('accessVideoCount');
const auditDeleteAll = document.getElementById('auditDeleteAll');
const adminAccountSection = document.getElementById('admin-accounts');
const adminAccountForm = document.getElementById('adminAccountForm');
const adminAccountOriginalUsername = document.getElementById('adminAccountOriginalUsername');
const adminAccountUsername = document.getElementById('adminAccountUsername');
const adminAccountName = document.getElementById('adminAccountName');
const adminAccountPassword = document.getElementById('adminAccountPassword');
const adminAccountRole = document.getElementById('adminAccountRole');
const adminAccountActive = document.getElementById('adminAccountActive');
const adminAccountPracticumScopes = document.getElementById('adminAccountPracticumScopes');
const adminAccountSubmit = document.getElementById('adminAccountSubmit');
const adminAccountCancel = document.getElementById('adminAccountCancel');
const adminAccountRefresh = document.getElementById('adminAccountRefresh');
const adminAccountSearch = document.getElementById('adminAccountSearch');
const adminAccountTable = document.getElementById('adminAccountTable');
const adminRoleForm = document.getElementById('adminRoleForm');
const adminRoleOriginal = document.getElementById('adminRoleOriginal');
const adminRoleKey = document.getElementById('adminRoleKey');
const adminRoleLabel = document.getElementById('adminRoleLabel');
const adminRoleActive = document.getElementById('adminRoleActive');
const adminRolePages = document.getElementById('adminRolePages');
const adminRolePermissions = document.getElementById('adminRolePermissions');
const adminRoleSubmit = document.getElementById('adminRoleSubmit');
const adminRoleCancel = document.getElementById('adminRoleCancel');
const adminRoleRefresh = document.getElementById('adminRoleRefresh');
const adminRoleTable = document.getElementById('adminRoleTable');
const studentCohortForm = document.getElementById('studentCohortForm');
const studentCohortInput = document.getElementById('studentCohortInput');
const studentCohortLabel = document.getElementById('studentCohortLabel');
const studentCohortDeleteSelect = document.getElementById('studentCohortDeleteSelect');
const studentCohortDelete = document.getElementById('studentCohortDelete');
const studentCohortList = document.getElementById('studentCohortList');
const studentBulkForm = document.getElementById('studentBulkForm');
const studentBulkCohort = document.getElementById('studentBulkCohort');
const studentBulkRows = document.getElementById('studentBulkRows');
const studentBulkPreviewBtn = document.getElementById('studentBulkPreviewBtn');
const studentBulkSubmit = document.getElementById('studentBulkSubmit');
const studentBulkPreviewTable = document.getElementById('studentBulkPreviewTable');
const studentAccountSearch = document.getElementById('studentAccountSearch');
const studentAccountCohortFilter = document.getElementById('studentAccountCohortFilter');
const studentAccountStatusFilter = document.getElementById('studentAccountStatusFilter');
const studentAccountRefresh = document.getElementById('studentAccountRefresh');
const studentAccountTable = document.getElementById('studentAccountTable');
const studentEditForm = document.getElementById('studentEditForm');
const studentEditOriginalNim = document.getElementById('studentEditOriginalNim');
const studentEditNim = document.getElementById('studentEditNim');
const studentEditName = document.getElementById('studentEditName');
const studentEditCohort = document.getElementById('studentEditCohort');
const studentEditActive = document.getElementById('studentEditActive');
const studentEditResetDefault = document.getElementById('studentEditResetDefault');
const studentEditSubmit = document.getElementById('studentEditSubmit');
const studentEditCancel = document.getElementById('studentEditCancel');

const resourceTable = document.getElementById('resourceTable');
const adminSearch = document.getElementById('adminSearch');
const adminFilter = document.getElementById('adminFilter');
const adminStats = document.getElementById('adminStats');
const dashboardHealthGrid = document.getElementById('dashboardHealthGrid');
const practicumOverviewSummary = document.getElementById('practicumOverviewSummary');
const practicumIssueList = document.getElementById('practicumIssueList');
const adminPermissionTitle = document.getElementById('adminPermissionTitle');
const adminPermissionSummary = document.getElementById('adminPermissionSummary');
const adminPermissionChips = document.getElementById('adminPermissionChips');
const clientErrorList = document.getElementById('clientErrorList');
const clientErrorRefresh = document.getElementById('clientErrorRefresh');
const clientErrorClear = document.getElementById('clientErrorClear');
const academicSettingsForm = document.getElementById('academicSettingsForm');
const academicOverrideEnabled = document.getElementById('academicOverrideEnabled');
const academicYearStart = document.getElementById('academicYearStart');
const academicTerm = document.getElementById('academicTerm');
const academicOverrideNote = document.getElementById('academicOverrideNote');
const academicSettingsSummary = document.getElementById('academicSettingsSummary');
const toastEl = document.getElementById('toast');
const submitButton = resourceForm?.querySelector('button[type="submit"]');
const adminSidebar = document.querySelector('.admin-sidebar');
const adminNav = document.querySelector('.admin-nav');
const adminNavLinks = [...document.querySelectorAll('.admin-nav a[href^="#"]')];
const on = (element, event, handler) => element?.addEventListener(event, handler);

let resources = [];
let practicumModules = [];
let practicumRosters = [];
let practicumAttendanceSessions = [];
let practicumAttendanceRecords = [];
let videos = [];
let announcements = [];
let contactMessages = [];
let liveChatMessages = [];
let students = [];
let adminActivities = [];
let auditLogs = [];
let accessLogs = [];
let adminAccounts = [];
let adminRoles = [];
let adminPracticumScopes = {};
let studentAccounts = [];
let studentCohorts = [];
let academicSettings = {};
let studentBulkPreviewRows = [];
let editingDocId = null;
let editingVideoDocId = null;
let editingSoftwareDocId = null;
let editingPracticumDocId = null;
let editingAnnouncementDocId = null;
let supabaseClient = null;
let adminActivityListening = false;
const ANNOUNCEMENT_BUCKET = 'sipilcare';
const ADMIN_PUSH_TOKEN_COLLECTION = 'admin_push_tokens';
const ADMIN_LIVE_CHAT_LAST_SEEN_KEY = 'sipilcare_admin_live_chat_last_seen';
const ADMIN_PUSH_ENABLED_KEY = 'sipilcare_admin_push_enabled';
const ADMIN_PUSH_TOKEN_ID_KEY = 'sipilcare_admin_push_token_id';
const ADMIN_AUDIT_COLLECTION = 'admin_audit_logs';
const ADMIN_ACTIVITY_COLLECTION = 'admin_activity';
const RESOURCE_ACCESS_LOG_COLLECTION = 'resource_access_logs';
const ACADEMIC_SETTINGS_PATH = `${ACADEMIC_SETTINGS_COLLECTION}/${ACADEMIC_SETTINGS_DOC}`;
const STUDENT_ONLINE_WINDOW = 2 * 60 * 1000;
const ADMIN_ONLINE_WINDOW = 2 * 60 * 1000;
const ADMIN_LOGIN_TRACKED_KEY = 'sipilcare_admin_login_tracked';
const ADMIN_SESSION_KEY = 'sipilcare_admin_session';
const ADMIN_PROFILE_KEY = 'sipilcare_admin_profile';
const CLIENT_ERROR_KEY = 'sipilcare_client_errors';
const ADMIN_GUIDE_PAGE = 'guide.html';
const ADMIN_ALL_PAGES = ['dashboard.html', 'guide.html', 'resources.html', 'announcements.html', 'messages.html', 'admin-accounts.html', 'student-accounts.html'];
let liveChatSnapshotReady = false;
const practicumCategories = [
  'Computer Aided Design (CAD)-S',
  'Praktik Kimia-P',
  'Praktik Fisika-P',
  'Praktik Pemetaan Lahan Terapan-P',
  'Praktik Hidraulika-P',
  'Praktik Rekayasa Lalu Lintas-P',
  'Aplikasi Ketekniksipilan 1-S',
  'Praktik Bahan Perkerasan Jalan Raya-P',
  'Praktik Geoteknik-P',
  'Aplikasi Ketekniksipilan 2-S',
  'Pengantar Building Information Modeling (BIM)-S'
];

const isPracticumResource = item => practicumCategories.includes(item?.category);

const getAdminProfile = () => {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_PROFILE_KEY) || '{}');
  } catch {
    return {};
  }
};

const withAdminGuidePage = pages => [...new Set([...(Array.isArray(pages) ? pages : []), ADMIN_GUIDE_PAGE])];

const readClientErrors = () => {
  try {
    return JSON.parse(localStorage.getItem(CLIENT_ERROR_KEY) || '[]');
  } catch {
    return [];
  }
};

const writeClientErrors = errors => {
  localStorage.setItem(CLIENT_ERROR_KEY, JSON.stringify(errors.slice(0, 30)));
};

const recordClientError = payload => {
  const errors = readClientErrors();
  const entry = {
    type: payload.type || 'error',
    message: String(payload.message || 'Error browser tidak diketahui').slice(0, 240),
    source: String(payload.source || '').slice(0, 240),
    stack: String(payload.stack || '').slice(0, 500),
    page: location.pathname,
    time: new Date().toISOString()
  };
  writeClientErrors([entry, ...errors]);
};

window.SIPILCARE_LOG_CLIENT_ERROR = recordClientError;
window.addEventListener('error', event => {
  recordClientError({
    type: 'javascript',
    message: event.message,
    source: `${event.filename || 'inline'}:${event.lineno || 0}:${event.colno || 0}`,
    stack: event.error?.stack
  });
});
window.addEventListener('unhandledrejection', event => {
  recordClientError({
    type: 'promise',
    message: event.reason?.message || event.reason,
    source: 'unhandledrejection',
    stack: event.reason?.stack
  });
});

const closeAdminMobileNav = () => {
  adminSidebar?.classList.remove('admin-nav-open');
  document.body.classList.remove('admin-nav-open');
  document.querySelector('.admin-menu-toggle')?.classList.remove('active');
  document.querySelector('.admin-menu-toggle')?.setAttribute('aria-expanded', 'false');
};

const setupAdminMobileNav = () => {
  if (!adminSidebar || !adminNav || adminSidebar.querySelector('.admin-menu-toggle')) return;
  const button = document.createElement('button');
  button.className = 'admin-menu-toggle';
  button.type = 'button';
  button.setAttribute('aria-label', 'Buka menu admin');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span></span>';
  adminSidebar.insertBefore(button, adminNav);

  button.addEventListener('click', () => {
    const open = !adminSidebar.classList.contains('admin-nav-open');
    adminSidebar.classList.toggle('admin-nav-open', open);
    document.body.classList.toggle('admin-nav-open', open);
    button.classList.toggle('active', open);
    button.setAttribute('aria-expanded', String(open));
  });
  adminNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeAdminMobileNav));
  document.getElementById('logoutBtn')?.addEventListener('click', closeAdminMobileNav);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeAdminMobileNav();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeAdminMobileNav();
  });
};

const requirePermission = (permission, label) => {
  if (hasPermission(permission)) return true;
  toast(`Akses ${label} tidak tersedia untuk role ${currentAdmin().roleLabel}.`);
  return false;
};

const navHashPermissions = {
  'student-activity': 'dashboard',
  'academic-settings': 'dashboard',
  'admin-activity': 'dashboard',
  'client-error-log': 'dashboard',
  'access-history': 'audit',
  'audit-log': 'audit'
};

const navPagePermissions = {
  'dashboard.html': 'dashboard',
  'resources.html': ['resources', 'practicum_studio', 'software', 'videos'],
  'announcements.html': 'announcements',
  'messages.html': 'messages',
  'admin-accounts.html': 'admin_accounts',
  'student-accounts.html': 'student_accounts'
};

const canSeeAdminNavLink = link => {
  const admin = currentAdmin();
  if (admin.role === 'developer') return true;

  const href = link.getAttribute('href') || '';
  const page = href.split('#')[0] || location.pathname.split('/').pop();
  const hash = href.includes('#') ? href.split('#')[1] : '';
  const pageAllowed = page ? admin.allowedPages.includes(page) : true;
  const pagePermission = navPagePermissions[page];
  const hashPermission = navHashPermissions[hash];

  if (page && !pageAllowed) return false;
  if (Array.isArray(pagePermission) && !pagePermission.some(permission => hasPermission(permission))) return false;
  if (pagePermission && !Array.isArray(pagePermission) && !hasPermission(pagePermission)) return false;
  if (hashPermission && !hasPermission(hashPermission)) return false;
  return true;
};

const applyAdminRoleUI = () => {
  const admin = currentAdmin();
  document.documentElement.dataset.adminRole = admin.role;
  document.querySelectorAll('.admin-brand small').forEach(item => {
    item.textContent = `${admin.roleLabel} Panel`;
  });
  document.querySelectorAll('.admin-nav a').forEach(link => {
    const hidden = !canSeeAdminNavLink(link);
    link.hidden = hidden;
    link.style.display = hidden ? 'none' : '';
  });
  document.querySelectorAll('[data-developer-only="true"]').forEach(item => {
    if (item.closest('.admin-nav')) return;
    item.hidden = !canManageAdminAccounts();
  });
  document.querySelectorAll('[data-student-account-only="true"]').forEach(item => {
    if (item.closest('.admin-nav')) return;
    item.hidden = !canManageStudentAccounts();
  });
  document.querySelectorAll('[data-log-delete-only="true"]').forEach(item => {
    item.hidden = !canDeleteDashboardLogs();
  });
  document.querySelectorAll('[data-admin-permission]').forEach(item => {
    const permissions = item.dataset.adminPermission.split(',').map(value => value.trim()).filter(Boolean);
    item.hidden = permissions.length ? !permissions.some(permission => hasPermission(permission)) : false;
  });
  renderAdminPermissionSummary();
};

const applyAdminRoleUIAfterSession = async () => {
  try {
    if (window.SIPILCARE_ADMIN_READY?.then) {
      await window.SIPILCARE_ADMIN_READY;
    }
  } catch {
    return;
  }
  applyAdminRoleUI();
};

const adminRoleTemplates = {
  developer: {
    role: 'developer',
    roleLabel: 'Developer',
    allowedPages: ['dashboard.html', 'guide.html', 'resources.html', 'announcements.html', 'messages.html', 'admin-accounts.html', 'student-accounts.html'],
    permissions: ['dashboard', 'resources', 'practicum_studio', 'software', 'videos', 'announcements', 'messages', 'audit', 'admin_accounts', 'student_accounts', 'log_delete']
  },
  admin_sipil: {
    role: 'admin_sipil',
    roleLabel: 'Admin SIPIL CARE',
    allowedPages: ['dashboard.html', 'guide.html', 'resources.html', 'announcements.html', 'messages.html'],
    permissions: ['dashboard', 'resources', 'practicum_studio', 'software', 'videos', 'announcements', 'messages', 'audit']
  },
  pendprof_hms: {
    role: 'pendprof_hms',
    roleLabel: 'PENDPROF HMS',
    allowedPages: ['guide.html', 'resources.html', 'messages.html'],
    permissions: ['resources', 'messages']
  },
  aslab_hms: {
    role: 'aslab_hms',
    roleLabel: 'Admin Aslab',
    allowedPages: ['guide.html', 'resources.html', 'messages.html'],
    permissions: ['practicum_studio', 'messages']
  },
  asdos_hms: {
    role: 'asdos_hms',
    roleLabel: 'Admin Asdos',
    allowedPages: ['guide.html', 'resources.html', 'messages.html'],
    permissions: ['practicum_studio', 'messages']
  },
  eksternal_hms: {
    role: 'eksternal_hms',
    roleLabel: 'Eksternal HMS',
    allowedPages: ['guide.html', 'announcements.html', 'messages.html'],
    permissions: ['announcements', 'messages']
  }
};

const normalizePracticumScopeList = value => {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];
  const allowed = new Set(PRACTICUM_COURSES.map(courseCategory));
  return [...new Set(raw.map(item => String(item || '').trim()).filter(item => allowed.has(item)))];
};

const adminScopeFor = username => {
  const key = String(username || '').trim().toLowerCase();
  const scopeDoc = adminPracticumScopes[key] || adminPracticumScopes[username] || {};
  return normalizePracticumScopeList(scopeDoc.scopes || scopeDoc.practicumScopes || scopeDoc.practicum_scopes);
};

const currentAdmin = () => {
  const profile = getAdminProfile();
  const role = profile.role || 'developer';
  const template = adminRoleTemplates[role] || {};
  const profilePages = Array.isArray(profile.allowedPages) ? profile.allowedPages : [];
  const profilePermissions = Array.isArray(profile.permissions) ? profile.permissions : [];
  const username = profile.username || 'developer';
  const profileScopes = normalizePracticumScopeList(profile.practicumScopes || profile.practicum_scopes || profile.practicum_scope);
  const dbScopes = adminScopeFor(username);

  return {
    username,
    name: profile.name || 'Developer SIPIL CARE',
    role,
    roleLabel: profile.roleLabel || template.roleLabel || 'Developer',
    allowedPages: role === 'developer'
      ? ADMIN_ALL_PAGES
      : withAdminGuidePage(profilePages.length ? profilePages : template.allowedPages || [ADMIN_GUIDE_PAGE]),
    permissions: role === 'developer'
      ? ['dashboard', 'resources', 'practicum_studio', 'software', 'videos', 'announcements', 'messages', 'audit', 'admin_accounts', 'student_accounts', 'log_delete']
      : profilePermissions.length ? profilePermissions : template.permissions || [],
    practicumScopes: role === 'developer' ? [] : dbScopes.length ? dbScopes : profileScopes
  };
};

const hasPermission = permission => currentAdmin().role === 'developer' || currentAdmin().permissions.includes(permission);
const canManageAdminAccounts = () => currentAdmin().role === 'developer' || hasPermission('admin_accounts');
const canManageStudentAccounts = () => currentAdmin().role === 'developer' || hasPermission('student_accounts');
const canDeleteDashboardLogs = () => currentAdmin().role === 'developer' || hasPermission('log_delete');
const canAccessPracticumCategory = category => {
  const admin = currentAdmin();
  if (admin.role === 'developer') return true;
  const scopes = normalizePracticumScopeList(admin.practicumScopes);
  return !scopes.length || scopes.includes(category);
};
const scopedPracticumCourses = () => PRACTICUM_COURSES.filter(course => canAccessPracticumCategory(courseCategory(course)));
const scopeLabel = scopes => {
  const normalized = normalizePracticumScopeList(scopes);
  if (!normalized.length) return 'Semua praktikum';
  return normalized.map(category => courseFromCategory(category)?.title || category.replace(/-[PS]$/, '')).join(', ');
};

const adminPageOptions = [
  { value: 'dashboard.html', label: 'Dashboard', permission: 'dashboard' },
  { value: 'guide.html', label: 'Panduan Admin' },
  { value: 'resources.html', label: 'Resources / Upload Materi' },
  { value: 'announcements.html', label: 'Pemberitahuan', permission: 'announcements' },
  { value: 'messages.html', label: 'Pesan Mahasiswa', permission: 'messages' },
  { value: 'admin-accounts.html', label: 'Akun Admin', permission: 'admin_accounts' },
  { value: 'student-accounts.html', label: 'Akun Mahasiswa', permission: 'student_accounts' }
];

const adminPermissionOptions = [
  { value: 'dashboard', label: 'Lihat dashboard' },
  { value: 'resources', label: 'Upload & kelola resource umum' },
  { value: 'practicum_studio', label: 'Upload & kelola Praktikum/Studio' },
  { value: 'software', label: 'Upload & kelola software' },
  { value: 'videos', label: 'Upload & kelola video' },
  { value: 'announcements', label: 'Kelola pemberitahuan' },
  { value: 'messages', label: 'Kelola pesan dan live chat' },
  { value: 'audit', label: 'Lihat audit log' },
  { value: 'admin_accounts', label: 'Kelola akun admin' },
  { value: 'student_accounts', label: 'Kelola akun mahasiswa' },
  { value: 'log_delete', label: 'Hapus log dashboard' }
];

const normalizeAdminRole = role => {
  const template = adminRoleTemplates[role?.role] || {};
  return {
    role: role?.role || template.role || 'admin_sipil',
    roleLabel: role?.role_label || role?.roleLabel || template.roleLabel || role?.role || 'Admin',
    allowedPages: withAdminGuidePage(Array.isArray(role?.allowed_pages)
      ? role.allowed_pages
      : Array.isArray(role?.allowedPages)
        ? role.allowedPages
        : template.allowedPages || []),
    permissions: Array.isArray(role?.permissions) ? role.permissions : template.permissions || [],
    isActive: role?.is_active !== false,
    isSystem: role?.is_system === true || role?.isSystem === true || role?.role === 'developer'
  };
};

const fallbackAdminRoles = () => Object.values(adminRoleTemplates).map(role => ({
  role: role.role,
  roleLabel: role.roleLabel,
  allowedPages: role.allowedPages,
  permissions: role.permissions,
  isActive: true,
  isSystem: role.role === 'developer'
}));

const allAdminRoles = () => (adminRoles.length ? adminRoles : fallbackAdminRoles()).map(normalizeAdminRole);

const activeAdminRoles = includeRole => allAdminRoles().filter(role => role.isActive || role.role === includeRole || role.role === adminAccountRole?.value);

const getAdminRoleTemplate = role => allAdminRoles().find(item => item.role === role)
  || normalizeAdminRole(adminRoleTemplates[role])
  || normalizeAdminRole(adminRoleTemplates.admin_sipil);

const auditActionLabels = {
  CREATE_RESOURCE: 'Tambah resource',
  UPDATE_RESOURCE: 'Edit resource',
  DELETE_RESOURCE: 'Hapus resource',
  CREATE_SOFTWARE: 'Tambah software',
  UPDATE_SOFTWARE: 'Edit software',
  DELETE_SOFTWARE: 'Hapus software',
  CREATE_PRACTICUM: 'Tambah praktikum/studio',
  UPDATE_PRACTICUM: 'Edit praktikum/studio',
  DELETE_PRACTICUM: 'Hapus praktikum/studio',
  BACKFILL_PRACTICUM_TARGETS: 'Rapikan target angkatan praktikum',
  EXPORT_PRACTICUM_BACKUP: 'Export backup praktikum',
  IMPORT_PRACTICUM_ROSTER: 'Import praktikan',
  DELETE_PRACTICUM_ROSTER: 'Hapus praktikan',
  CREATE_ATTENDANCE_SESSION: 'Tambah sesi absen',
  UPDATE_ATTENDANCE_SESSION: 'Update sesi absen',
  RESET_ATTENDANCE_SESSION: 'Reset record sesi absen',
  DELETE_ATTENDANCE_SESSION: 'Hapus sesi absen',
  CREATE_VIDEO: 'Tambah video',
  UPDATE_VIDEO: 'Edit video',
  DELETE_VIDEO: 'Hapus video',
  CREATE_ANNOUNCEMENT: 'Tambah pemberitahuan',
  UPDATE_ANNOUNCEMENT: 'Edit pemberitahuan',
  DELETE_ANNOUNCEMENT: 'Hapus pemberitahuan',
  REPLY_MESSAGE: 'Balas pesan',
  DELETE_MESSAGE: 'Hapus pesan',
  REPLY_LIVE_CHAT: 'Balas live chat',
  DELETE_LIVE_CHAT_THREAD: 'Hapus thread live chat',
  DELETE_ACCESS_LOGS: 'Hapus semua history akses',
  CREATE_ADMIN_ACCOUNT: 'Tambah akun admin',
  UPDATE_ADMIN_ACCOUNT: 'Update akun admin',
  DELETE_ADMIN_ACCOUNT: 'Hapus akun admin',
  CREATE_ADMIN_ROLE: 'Tambah role admin',
  UPDATE_ADMIN_ROLE: 'Update role admin',
  DELETE_ADMIN_ROLE: 'Hapus role admin',
  CREATE_STUDENT_COHORT: 'Tambah angkatan mahasiswa',
  DELETE_STUDENT_COHORT: 'Hapus angkatan mahasiswa',
  IMPORT_STUDENT_ACCOUNTS: 'Import akun mahasiswa',
  UPDATE_STUDENT_ACCOUNT: 'Update akun mahasiswa',
  DELETE_STUDENT_ACCOUNT: 'Hapus akun mahasiswa',
  RESET_STUDENT_ACCOUNT: 'Reset akun mahasiswa',
  UPDATE_ACADEMIC_SETTINGS: 'Update kalender akademik'
};

async function writeAuditLog({ action, targetType, targetId = '', targetTitle = '', detail = '', metadata = {} }) {
  try {
    const admin = currentAdmin();
    await addDoc(collection(db, ADMIN_AUDIT_COLLECTION), {
      action,
      actionLabel: auditActionLabels[action] || action,
      targetType,
      targetId,
      targetTitle,
      detail,
      metadata,
      adminUsername: admin.username,
      adminName: admin.name,
      adminRole: admin.role,
      adminRoleLabel: admin.roleLabel,
      page: location.pathname,
      userAgent: navigator.userAgent,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

const selectedPracticumMeta = () => {
  return selectedCourseFrom(practicumCategory);
};


const updateNotificationStatus = message => {
  if (liveChatNotifyStatus) liveChatNotifyStatus.textContent = message;
};

const isAdminPushEnabled = () => localStorage.getItem(ADMIN_PUSH_ENABLED_KEY) === 'true';

const syncNotificationButton = () => {
  if (!liveChatNotifyBtn) return;
  const enabled = isAdminPushEnabled();
  liveChatNotifyBtn.textContent = enabled ? 'Nonaktifkan Notifikasi' : 'Aktifkan Notifikasi';
  liveChatNotifyBtn.classList.toggle('danger', enabled);
  updateNotificationStatus(enabled
    ? 'Notifikasi admin aktif di device ini.'
    : 'Aktifkan notifikasi agar admin mendapat pemberitahuan chat baru.');
};

const safeTokenDocId = token => token.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 900);

const showAdminLiveChatNotification = item => {
  const title = 'Live chat baru - SIPIL CARE';
  const body = `${item.senderName || 'Mahasiswa'}${item.nim ? ` (${item.nim})` : ''}: ${item.message || 'Mengirim pesan baru.'}`;
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: `${adminRootPrefix}assets/images/logo-hms.png`,
      tag: `sipilcare-live-chat-${item.threadId || item.docId}`
    });
  }
  toast(body);
};

async function enableAdminPushNotifications() {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    updateNotificationStatus('Browser ini belum mendukung push notification.');
    toast('Browser ini belum mendukung push notification.');
    return;
  }

  const vapidKey = window.SIPILCARE_PUSH_CONFIG?.vapidKey || '';
  if (!vapidKey || vapidKey.includes('ISI_')) {
    updateNotificationStatus('VAPID key FCM belum diisi di js/push-config.js.');
    toast('Isi VAPID key FCM terlebih dahulu di js/push-config.js.');
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    updateNotificationStatus('Izin notifikasi belum diberikan.');
    toast('Izin notifikasi belum diberikan oleh browser.');
    return;
  }

  try {
    liveChatNotifyBtn.disabled = true;
    const registration = await navigator.serviceWorker.register(`${adminRootPrefix}firebase-messaging-sw.js`);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    });

    if (!token) throw new Error('Token FCM tidak tersedia.');

    const tokenDocId = safeTokenDocId(token);
    await setDoc(doc(db, ADMIN_PUSH_TOKEN_COLLECTION, tokenDocId), {
      token,
      role: 'admin',
      enabled: true,
      userAgent: navigator.userAgent,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    localStorage.setItem(ADMIN_PUSH_ENABLED_KEY, 'true');
    localStorage.setItem(ADMIN_PUSH_TOKEN_ID_KEY, tokenDocId);
    syncNotificationButton();
    toast('Notifikasi live chat admin aktif.');

    onMessage(messaging, payload => {
      toast(payload.notification?.body || 'Ada live chat baru.');
    });
  } catch (error) {
    console.error('Enable admin push notification failed:', error);
    updateNotificationStatus('Notifikasi gagal diaktifkan. Cek console atau VAPID key.');
    toast('Notifikasi gagal diaktifkan.');
  } finally {
    liveChatNotifyBtn.disabled = false;
  }
}
async function disableAdminPushNotifications() {
  try {
    liveChatNotifyBtn.disabled = true;
    const tokenDocId = localStorage.getItem(ADMIN_PUSH_TOKEN_ID_KEY);
    if (tokenDocId) {
      await setDoc(doc(db, ADMIN_PUSH_TOKEN_COLLECTION, tokenDocId), {
        enabled: false,
        disabledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    const vapidKey = window.SIPILCARE_PUSH_CONFIG?.vapidKey || '';
    if ('serviceWorker' in navigator && vapidKey && !vapidKey.includes('ISI_')) {
      const registration = await navigator.serviceWorker.getRegistration('firebase-messaging-sw.js');
      if (registration) {
        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration
        }).catch(() => '');
        if (token) await deleteToken(messaging).catch(() => false);
      }
    }

    localStorage.removeItem(ADMIN_PUSH_ENABLED_KEY);
    localStorage.removeItem(ADMIN_PUSH_TOKEN_ID_KEY);
    syncNotificationButton();
    toast('Notifikasi live chat admin dinonaktifkan di device ini.');
  } catch (error) {
    console.error('Disable admin push notification failed:', error);
    toast('Gagal menonaktifkan notifikasi.');
  } finally {
    liveChatNotifyBtn.disabled = false;
  }
}

const toggleAdminPushNotifications = () => {
  if (isAdminPushEnabled()) {
    disableAdminPushNotifications();
  } else {
    enableAdminPushNotifications();
  }
};
const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const toast = message => {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2800);
};

const parseDateValue = value => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = value => {
  const date = parseDateValue(value);
  return date ? date.toLocaleString('id-ID') : '-';
};

const formatDateTimeShort = value => {
  const date = parseDateValue(value);
  if (!date) return '-';
  const d = date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const t = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${d} ${t}`;
};

const formatRelativeTime = value => {
  const date = parseDateValue(value);
  if (!date) return 'Belum pernah login';
  const diff = Date.now() - date.getTime();
  if (diff < 60 * 1000) return 'Baru saja';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} menit lalu`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} jam lalu`;
  return `${Math.floor(diff / 86400000)} hari lalu`;
};

const permissionLabelMap = () => adminPermissionOptions.reduce((labels, item) => {
  labels[item.value] = item.label;
  return labels;
}, {});

function renderAdminPermissionSummary() {
  if (!adminPermissionTitle && !adminPermissionSummary && !adminPermissionChips) return;
  const admin = currentAdmin();
  const labels = permissionLabelMap();
  const permissions = admin.role === 'developer'
    ? [...new Set([...admin.permissions, ...adminPermissionOptions.map(item => item.value)])]
    : admin.permissions;

  if (adminPermissionTitle) {
    adminPermissionTitle.textContent = `${admin.roleLabel} (${admin.username})`;
  }
  if (adminPermissionSummary) {
    adminPermissionSummary.textContent = `${admin.allowedPages.length} halaman aktif - ${permissions.length} permission tersedia.`;
  }
  if (adminPermissionChips) {
    adminPermissionChips.innerHTML = permissions.length
      ? permissions.slice(0, 8).map(permission => `<span>${escapeText(labels[permission] || permission)}</span>`).join('')
      : '<span>Permission belum tersedia</span>';
  }
}

function renderClientErrors() {
  if (!clientErrorList) return;
  const errors = readClientErrors().slice(0, 8);
  clientErrorList.innerHTML = errors.length
    ? errors.map(item => `
      <article class="client-error-item">
        <strong>${escapeText(item.message || item.type || 'Error browser')}</strong>
        <small>${escapeText(item.page || location.pathname)} - ${escapeText(formatDateTime(item.time))}</small>
        <code>${escapeText(item.source || item.stack || '-')}</code>
      </article>
    `).join('')
    : '<div class="empty">Belum ada error browser yang terekam di device ini.</div>';
}

function renderDashboardHealth() {
  if (!dashboardHealthGrid) return;
  const academicResources = resources.filter(r => r.category !== 'Software' && !isPracticumResource(r));
  const softwareResources = resources.filter(r => r.category === 'Software');
  const clientErrors = readClientErrors();
  const items = [
    `${academicResources.length} resource umum`,
    `${softwareResources.length} software`,
    `${practicumModules.length} praktikum/studio`,
    `${videos.length} video`,
    `${students.filter(isStudentOnline).length} mahasiswa online`,
    `${adminActivities.filter(isAdminOnline).length} admin online`,
    `${accessLogs.length + auditLogs.length} log dashboard`,
    `${clientErrors.length} error browser lokal`
  ];
  dashboardHealthGrid.innerHTML = items.map(item => `<span>${escapeText(item)}</span>`).join('');
}

function practicumScopeItems(items) {
  return items.filter(item => canAccessPracticumCategory(item.category));
}

function practicumNeedsTarget(item) {
  return !targetCohortForPracticumResource(item);
}

function renderPracticumOverview() {
  if (!practicumOverviewSummary && !practicumIssueList) return;
  const scopedModules = practicumScopeItems(practicumModules);
  const scopedRosters = practicumScopeItems(practicumRosters).filter(item => item.isActive !== false);
  const scopedSessions = practicumScopeItems(practicumAttendanceSessions);
  const openSessions = scopedSessions.filter(item => item.status !== 'closed');
  const missingTargets = [
    ...scopedModules.filter(practicumNeedsTarget).map(item => ({ type: 'Modul', label: item.title || item.category || item.docId })),
    ...scopedRosters.filter(practicumNeedsTarget).map(item => ({ type: 'Roster', label: `${item.nim || '-'} ${item.course || item.category || ''}`.trim() })),
    ...scopedSessions.filter(practicumNeedsTarget).map(item => ({ type: 'Sesi', label: attendanceSessionLabel(item) || item.docId }))
  ];
  const rosterKeys = new Set(scopedRosters.map(item => [item.category, targetCohortForPracticumResource(item), item.academicYear, item.classKey || slugifyAcademic(item.className)].join('|')));
  const sessionsWithoutRoster = scopedSessions.filter(item => !rosterKeys.has([item.category, targetCohortForPracticumResource(item), item.academicYear, item.classKey || slugifyAcademic(item.className)].join('|')));
  const cohorts = [...new Set([
    ...scopedModules.map(targetCohortForPracticumResource),
    ...scopedRosters.map(targetCohortForPracticumResource),
    ...scopedSessions.map(targetCohortForPracticumResource)
  ].filter(Boolean))].sort();

  if (practicumOverviewSummary) {
    practicumOverviewSummary.innerHTML = `
      <article><span>Target angkatan</span><strong>${cohorts.length}</strong></article>
      <article><span>Modul</span><strong>${scopedModules.length}</strong></article>
      <article><span>Roster aktif</span><strong>${scopedRosters.length}</strong></article>
      <article><span>Sesi aktif</span><strong>${openSessions.length}</strong></article>
      <article><span>Perlu dirapikan</span><strong>${missingTargets.length}</strong></article>
    `;
  }

  if (practicumIssueList) {
    const issues = [
      ...missingTargets.slice(0, 5).map(item => ({
        title: `${item.type} belum punya target angkatan`,
        detail: item.label || 'Data lama'
      })),
      ...sessionsWithoutRoster.slice(0, 5).map(item => ({
        title: 'Sesi belum punya roster cocok',
        detail: `${item.course || item.category || '-'} - Angkatan ${targetCohortForPracticumResource(item) || '-'} - Kelas ${item.className || '-'}`
      }))
    ];
    practicumIssueList.innerHTML = issues.length
      ? issues.map(item => `
        <article class="client-error-item">
          <strong>${escapeText(item.title)}</strong>
          <small>${escapeText(item.detail)}</small>
        </article>
      `).join('')
      : '<div class="empty">Data praktikum terlihat rapi. Tidak ada target angkatan atau roster yang perlu dicek cepat.</div>';
  }
}

function renderAcademicSettingsForm() {
  if (!academicSettingsForm) return;
  const normalized = normalizeAcademicSettings(academicSettings);
  const automatic = defaultAcademicPeriod();
  const active = resolveAcademicPeriod(academicSettings);

  if (academicOverrideEnabled) academicOverrideEnabled.checked = normalized.overrideEnabled;
  if (academicYearStart) academicYearStart.value = normalized.overrideAcademicYearStart || automatic.academicYearStart;
  if (academicTerm) academicTerm.value = normalized.overrideTerm || automatic.term;
  if (academicOverrideNote) academicOverrideNote.value = normalized.overrideNote || '';

  if (academicSettingsSummary) {
    const mode = active.mode === 'override' ? 'Override admin aktif' : 'Mode otomatis aktif';
    const updated = normalized.updatedAt
      ? `Terakhir disimpan ${formatDateTime(normalized.updatedAt)} oleh ${normalized.updatedBy || 'admin'}.`
      : 'Belum ada override yang disimpan.';

    academicSettingsSummary.innerHTML = `
      <article>
        <span>Periode aktif</span>
        <strong>${escapeText(academicPeriodLabel(active))}</strong>
      </article>
      <article>
        <span>Jadwal otomatis</span>
        <strong>Ganjil: September-Januari. Genap: Februari-Juli.</strong>
      </article>
      <article>
        <span>Status</span>
        <strong>${escapeText(mode)}</strong>
        <small>${escapeText(updated)}</small>
      </article>
    `;
  }
}

const sha256 = async value => {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('');
};

const adminTableName = () => window.SIPILCARE_AUTH_CONFIG?.adminTableName || 'admins';
const adminSessionTableName = () => window.SIPILCARE_AUTH_CONFIG?.adminSessionTableName || 'admin_sessions';

const adminSessionTokenHash = async () => {
  let session = {};
  try {
    session = JSON.parse(localStorage.getItem(ADMIN_SESSION_KEY) || '{}');
  } catch {
    session = {};
  }
  if (!session.token) throw new Error('Sesi admin tidak ditemukan. Silakan login ulang.');
  return sha256(session.token);
};

const defaultStudentPassword = nim => `${nim}@Sipil`;
const defaultStudentRecovery = (angkatan, nim) => `${angkatan}_${String(nim || '').slice(-3)}`;
const isValidStudentNim = nim => /^[0-9]{8,14}$/.test(String(nim || '').trim());
const normalizeCohort = value => String(value || '').trim().replace(/[^0-9A-Za-z_-]/g, '');

const parseStudentRows = text => {
  const rows = [];
  const errors = [];
  String(text || '').split(/\r?\n/).forEach((line, index) => {
    const cleaned = line.trim();
    if (!cleaned) return;

    let nim = '';
    let name = '';
    if (cleaned.includes('\t')) {
      const parts = cleaned.split('\t').map(item => item.trim()).filter(Boolean);
      nim = parts.shift() || '';
      name = parts.join(' ');
    } else if (cleaned.includes(',')) {
      const parts = cleaned.split(',').map(item => item.trim()).filter(Boolean);
      nim = parts.shift() || '';
      name = parts.join(' ');
    } else if (cleaned.includes(';')) {
      const parts = cleaned.split(';').map(item => item.trim()).filter(Boolean);
      nim = parts.shift() || '';
      name = parts.join(' ');
    } else {
      const match = cleaned.match(/^(\d{8,14})\s+(.+)$/);
      nim = match?.[1] || '';
      name = match?.[2] || '';
    }

    if (!isValidStudentNim(nim) || !name) {
      errors.push(`Baris ${index + 1} tidak valid.`);
      return;
    }
    rows.push({ nim, name });
  });

  const seen = new Set();
  const uniqueRows = rows.filter(row => {
    if (seen.has(row.nim)) return false;
    seen.add(row.nim);
    return true;
  });

  return { rows: uniqueRows, errors };
};

const buildStudentPayload = async (rows, angkatan) => {
  const normalizedCohort = normalizeCohort(angkatan);
  const payload = [];
  for (const row of rows) {
    payload.push({
      nim: row.nim,
      name: row.name,
      angkatan: normalizedCohort,
      password_hash: await sha256(defaultStudentPassword(row.nim)),
      recovery_code_hash: await sha256(defaultStudentRecovery(normalizedCohort, row.nim))
    });
  }
  return payload;
};

const normalizeAdminAccount = account => {
  const template = getAdminRoleTemplate(account.role);
  return {
    ...account,
    roleLabel: account.role_label || account.roleLabel || template.roleLabel,
    allowedPages: withAdminGuidePage(Array.isArray(account.allowed_pages) ? account.allowed_pages : template.allowedPages),
    permissions: Array.isArray(account.permissions) ? account.permissions : template.permissions,
    practicumScopes: adminScopeFor(account.username),
    isActive: account.is_active !== false
  };
};

const resetAdminAccountForm = () => {
  if (!adminAccountForm) return;
  adminAccountForm.reset();
  if (adminAccountOriginalUsername) adminAccountOriginalUsername.value = '';
  if (adminAccountActive) adminAccountActive.checked = true;
  if (adminAccountPassword) adminAccountPassword.required = true;
  if (adminAccountSubmit) adminAccountSubmit.textContent = 'Simpan Akun';
  renderAdminRoleOptions();
  setCheckedValues(adminAccountPracticumScopes, []);
};

const normalizeRoleKey = value => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9_]+/g, '_')
  .replace(/^_+|_+$/g, '');

const checkedValues = container => [...(container?.querySelectorAll('input[type="checkbox"]:checked') || [])]
  .map(input => input.value);

const setCheckedValues = (container, values = []) => {
  const selected = new Set(values);
  container?.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.checked = selected.has(input.value);
  });
};

const syncRolePermissionsFromPages = () => {
  if (!adminRolePages || !adminRolePermissions) return;
  const selectedPages = checkedValues(adminRolePages);
  const selectedPermissions = new Set(checkedValues(adminRolePermissions));
  adminPageOptions.forEach(page => {
    if (selectedPages.includes(page.value) && page.permission) selectedPermissions.add(page.permission);
  });
  setCheckedValues(adminRolePermissions, [...selectedPermissions]);
};

const renderAdminRoleChecklist = () => {
  if (adminRolePages) {
    adminRolePages.innerHTML = adminPageOptions.map(item => `
      <label class="admin-mini-check"><input type="checkbox" value="${escapeText(item.value)}"> ${escapeText(item.label)}</label>
    `).join('');
  }
  if (adminRolePermissions) {
    adminRolePermissions.innerHTML = adminPermissionOptions.map(item => `
      <label class="admin-mini-check"><input type="checkbox" value="${escapeText(item.value)}"> ${escapeText(item.label)}</label>
    `).join('');
  }
  if (adminAccountPracticumScopes) {
    adminAccountPracticumScopes.innerHTML = PRACTICUM_COURSES.map(course => {
      const category = courseCategory(course);
      return `<label class="admin-mini-check"><input type="checkbox" value="${escapeText(category)}"> Semester ${course.semester} - ${escapeText(course.title)}</label>`;
    }).join('');
  }
};

const renderAdminRoleOptions = includeRole => {
  if (!adminAccountRole) return;
  const current = adminAccountRole.value;
  const roles = activeAdminRoles(includeRole);
  adminAccountRole.innerHTML = roles
    .map(role => `<option value="${escapeText(role.role)}">${escapeText(role.roleLabel)}</option>`)
    .join('');
  if (includeRole && roles.some(role => role.role === includeRole)) adminAccountRole.value = includeRole;
  else if (roles.some(role => role.role === current)) adminAccountRole.value = current;
  else if (roles.some(role => role.role === 'admin_sipil')) adminAccountRole.value = 'admin_sipil';
};

const resetAdminRoleForm = () => {
  if (!adminRoleForm) return;
  adminRoleForm.reset();
  if (adminRoleOriginal) adminRoleOriginal.value = '';
  if (adminRoleActive) adminRoleActive.checked = true;
  setCheckedValues(adminRolePages, []);
  setCheckedValues(adminRolePermissions, []);
  if (adminRoleSubmit) adminRoleSubmit.textContent = 'Simpan Role';
};

const resetStudentEditForm = () => {
  if (!studentEditForm) return;
  studentEditForm.reset();
  if (studentEditOriginalNim) studentEditOriginalNim.value = '';
  if (studentEditActive) studentEditActive.checked = true;
  if (studentEditResetDefault) studentEditResetDefault.checked = false;
  if (studentEditSubmit) studentEditSubmit.textContent = 'Simpan Mahasiswa';
};

const deleteFirestoreDocs = async (collectionName, docIds) => {
  const ids = docIds.filter(Boolean);
  for (let start = 0; start < ids.length; start += 450) {
    const batch = writeBatch(db);
    ids.slice(start, start + 450).forEach(id => batch.delete(doc(db, collectionName, id)));
    await batch.commit();
  }
};

const isStudentOnline = student => {
  const lastSeen = parseDateValue(student.last_seen_at);
  return Boolean(lastSeen && Date.now() - lastSeen.getTime() <= STUDENT_ONLINE_WINDOW);
};

const isAdminOnline = admin => {
  const lastSeen = parseDateValue(admin.last_seen_at);
  return Boolean(lastSeen && Date.now() - lastSeen.getTime() <= ADMIN_ONLINE_WINDOW);
};

const setLoading = active => {
  if (submitButton) submitButton.disabled = active;
};

const isValidUrl = value => /^https?:\/\//i.test(value.trim());

async function loadSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const config = window.SIPILCARE_AUTH_CONFIG;
  if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
    throw new Error('Konfigurasi Supabase belum tersedia.');
  }

  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Gagal memuat Supabase client.'));
      document.head.appendChild(script);
    });
  }

  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  return supabaseClient;
}

async function uploadAnnouncementPhoto(file) {
  if (!file) {
    return {
      photoUrl: announcementPhotoUrl?.value || '',
      photoPath: announcementPhotoPath?.value || ''
    };
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('File pemberitahuan harus berupa gambar.');
  }

  const supabase = await loadSupabaseClient();
  const ext = file.name.split('.').pop() || 'jpg';
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const photoPath = `home/${Date.now()}-${id}.${ext}`;
  const { error } = await supabase.storage.from(ANNOUNCEMENT_BUCKET).upload(photoPath, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (error) throw error;

  const { data } = supabase.storage.from(ANNOUNCEMENT_BUCKET).getPublicUrl(photoPath);
  return {
    photoUrl: data.publicUrl,
    photoPath
  };
}

function validateResourceForm() {
  if (!resourceTitle.value.trim() || !resourceDescription.value.trim() || !resourceAuthor.value.trim() || !resourceDate.value) {
    toast('Lengkapi Judul, Deskripsi, Author, dan Tanggal.');
    return false;
  }
  if (!resourceFile.value.trim() || !isValidUrl(resourceFile.value)) {
    toast('Masukkan link file resource yang valid (http/https).');
    return false;
  }
  return true;
}

function validatePracticumForm() {
  const meta = selectedPracticumMeta();
  const targetAngkatan = selectedTargetCohort(practicumTargetCohort, meta);
  if (!meta.category || !canAccessPracticumCategory(meta.category)) {
    toast('Akun ini tidak memiliki scope untuk praktikum/studio yang dipilih.');
    return false;
  }
  if (!targetAngkatan) {
    toast('Isi target angkatan modul praktikum/studio.');
    return false;
  }
  if (!practicumTitle.value.trim() || !practicumDescription.value.trim() || !practicumAuthor.value.trim() || !practicumDate.value) {
    toast('Lengkapi Judul, Deskripsi, Author, dan Tanggal modul praktikum/studio.');
    return false;
  }
  if (!practicumFile.value.trim() || !isValidUrl(practicumFile.value)) {
    toast('Masukkan link file modul praktikum/studio yang valid (http/https).');
    return false;
  }
  return true;
}
function validateVideoForm() {
  if (!videoTitle.value.trim() || !videoDescription.value.trim() || !videoCategoryInput.value.trim() || !videoChannel.value.trim() || !videoYoutube.value.trim()) {
    toast('Lengkapi semua field video.');
    return false;
  }
  if (!isValidUrl(videoYoutube.value)) {
    toast('Link YouTube harus dimulai dengan http:// atau https://');
    return false;
  }
  return true;
}

function validateAnnouncementForm() {
  if (!announcementTitle.value.trim() || !announcementDescription.value.trim() || !announcementDate.value) {
    toast('Lengkapi judul, tanggal, dan isi pemberitahuan.');
    return false;
  }
  return true;
}

function stats() {
  if (!adminStats) return;
  const academicResources = resources.filter(r => r.category !== 'Software' && !isPracticumResource(r));
  const softwareResources = resources.filter(r => r.category === 'Software');
  adminStats.innerHTML = `
    <div class="admin-stat"><b>${academicResources.length}</b><span>Resource</span></div>
    <div class="admin-stat"><b>${softwareResources.length}</b><span>Software</span></div>
    <div class="admin-stat"><b>${practicumModules.length}</b><span>Praktikum/Studio</span></div>
    <div class="admin-stat"><b>${videos.length}</b><span>Video</span></div>
    <div class="admin-stat"><b>${accessLogs.length}</b><span>History Akses</span></div>
    <div class="admin-stat"><b>${contactMessages.length}</b><span>Pesan Mahasiswa</span></div>
    <div class="admin-stat"><b>${adminActivities.filter(isAdminOnline).length}</b><span>Admin Online</span></div>
    <div class="admin-stat"><b>${auditLogs.length}</b><span>Audit Log</span></div>
  `;
  renderDashboardHealth();
  renderPracticumOverview();
  renderAdminPermissionSummary();
  renderClientErrors();
}

function filters() {
  if (!adminFilter) return;
  adminFilter.innerHTML = '<option value="All">All</option>' +
    [...new Set(resources.filter(r => r.category !== 'Software' && !isPracticumResource(r)).map(r => r.category))].map(c => `<option>${escapeText(c)}</option>`).join('');
}

function softwareFilters() {
  if (!softwareFilter) return;
  const softwareCats = [...new Set(resources.filter(r => r.category === 'Software').map(r => r.type || 'Software'))];
  softwareFilter.innerHTML = '<option value="All">All</option>' + softwareCats.map(c => `<option>${escapeText(c)}</option>`).join('');
}


function practicumFilters() {
  if (!practicumFilter) return;
  const cats = [...new Set(practicumModules.filter(item => canAccessPracticumCategory(item.category)).map(item => item.category))];
  const current = practicumFilter.value || 'All';
  practicumFilter.innerHTML = '<option value="All">All</option>' + cats.map(c => `<option>${escapeText(c)}</option>`).join('');
  practicumFilter.value = current === 'All' || cats.includes(current) ? current : 'All';
}

function practicumTableRender() {
  const q = (practicumSearch?.value || '').toLowerCase();
  const cat = practicumFilter?.value || 'All';
  const rows = practicumModules
    .filter(item => canAccessPracticumCategory(item.category))
    .filter(item => (cat === 'All' || item.category === cat) &&
      [item.title, item.category, item.course, item.description, item.author].join(' ').toLowerCase().includes(q))
    .map(item => `
      <tr>
        <td>${escapeText(item.title)}</td>
        <td>${escapeText(item.category)}</td>
        <td>${escapeText(targetCohortForPracticumResource(item) || 'Legacy')}</td>
        <td>Semester ${escapeText(item.semester || '-')}</td>
        <td>${escapeText(item.kind === 'P' ? 'Praktikum' : 'Studio')} / ${escapeText(item.type || 'PDF')}</td>
        <td>${escapeText(item.date)}</td>
        <td><button class="action-btn" data-edit="${item.docId}">Edit</button><button class="action-btn danger" data-del="${item.docId}">Delete</button></td>
      </tr>
    `)
    .join('');
  if (practicumTable) practicumTable.innerHTML = rows || '<tr><td colspan="7">Belum ada modul praktikum/studio.</td></tr>';
}

function practicumCourseOptions() {
  const courses = scopedPracticumCourses();
  const html = courses.length ? courses.map(course => {
    const category = courseCategory(course);
    return `<option value="${escapeText(category)}" data-semester="${course.semester}" data-kind="${course.type}">Semester ${course.semester} - ${escapeText(category)}</option>`;
  }).join('') : '<option value="">Tidak ada scope praktikum</option>';

  [practicumCategory, rosterCategory, attendanceCategory].forEach(select => {
    if (!select) return;
    const current = select.value;
    select.innerHTML = html;
    if (current && [...select.options].some(option => option.value === current)) select.value = current;
  });
  syncAllPracticumTargetDefaults();
}

const normalizeClassName = value => String(value || '').trim().replace(/\s+/g, ' ');
const rosterDocId = row => [
  slugifyAcademic(row.category),
  slugifyAcademic(row.academicYear),
  slugifyAcademic(row.className),
  row.nim
].join('_');

function selectedCourseFrom(select) {
  const fallback = scopedPracticumCourses()[0] || PRACTICUM_COURSES[0];
  const selectedCategory = select?.value || courseCategory(fallback);
  const category = canAccessPracticumCategory(selectedCategory) ? selectedCategory : courseCategory(fallback);
  const course = courseFromCategory(category) || fallback;
  return {
    category,
    course: course.title,
    semester: course.semester,
    kind: course.type
  };
}

const targetCohortSuggestion = meta => targetCohortForSemester(meta?.semester, academicSettings);

function applyPracticumTargetDefaults(select, cohortInput, academicYearInput, force = false) {
  const meta = selectedCourseFrom(select);
  const suggestedCohort = targetCohortSuggestion(meta);
  const currentCohort = normalizeCohortYear(cohortInput?.value);
  const nextCohort = currentCohort || suggestedCohort;
  if (cohortInput && (force || !currentCohort)) cohortInput.value = suggestedCohort || '';
  if (academicYearInput && (force || !String(academicYearInput.value || '').trim())) {
    academicYearInput.value = academicYearForCohortSemester(nextCohort || suggestedCohort, meta.semester);
  }
}

function syncAllPracticumTargetDefaults(force = false) {
  applyPracticumTargetDefaults(practicumCategory, practicumTargetCohort, null, force);
  applyPracticumTargetDefaults(rosterCategory, rosterTargetCohort, rosterAcademicYear, force);
  applyPracticumTargetDefaults(attendanceCategory, attendanceTargetCohort, attendanceAcademicYear, force);
}

function refreshAcademicYearFromTarget(select, cohortInput, academicYearInput) {
  if (!academicYearInput) return;
  const meta = selectedCourseFrom(select);
  academicYearInput.value = academicYearForCohortSemester(selectedTargetCohort(cohortInput, meta), meta.semester);
}

function selectedTargetCohort(input, meta) {
  return normalizeCohortYear(input?.value) || targetCohortSuggestion(meta);
}

function matchesTargetCohort(item, targetAngkatan) {
  const target = normalizeCohortYear(targetAngkatan);
  const itemTarget = targetCohortForPracticumResource(item);
  return !target || !itemTarget || sameCohort(itemTarget, target);
}

function expectedAcademicYearFor(meta, targetAngkatan) {
  return academicYearForCohortSemester(targetAngkatan, meta?.semester);
}

function confirmAcademicYearIfNeeded(inputYear, meta, targetAngkatan) {
  const expected = expectedAcademicYearFor(meta, targetAngkatan);
  if (!inputYear || !expected || inputYear === expected) return true;
  return confirm(`Tahun akademik ${inputYear} tidak sesuai dengan angkatan ${targetAngkatan} semester ${meta.semester}. Rekomendasi sistem: ${expected}. Tetap simpan?`);
}

function buildPracticumBackfill(collectionName, items) {
  const now = new Date().toISOString();
  return items
    .filter(item => item.docId)
    .map(item => {
      const targetAngkatan = targetCohortForPracticumResource(item);
      const semester = semesterForPracticumResource(item);
      if (!targetAngkatan || !semester) return null;
      const payload = {};
      if (!normalizeCohortYear(item.targetAngkatan || item.targetCohort || item.angkatanTarget)) payload.targetAngkatan = targetAngkatan;
      if (!item.academicYear) payload.academicYear = expectedAcademicYearFor({ semester }, targetAngkatan);
      if (!Object.keys(payload).length) return null;
      return {
        collectionName,
        docId: item.docId,
        payload: {
          ...payload,
          normalizedAt: now,
          normalizedBy: currentAdmin().username
        }
      };
    })
    .filter(Boolean);
}

async function commitFirestoreUpdates(updates) {
  for (let start = 0; start < updates.length; start += 450) {
    const batch = writeBatch(db);
    updates.slice(start, start + 450).forEach(item => {
      batch.update(doc(db, item.collectionName, item.docId), item.payload);
    });
    await batch.commit();
  }
}

function parsePracticumRosterRows(text, fallbackClassName) {
  const rows = [];
  const errors = [];

  String(text || '').split(/\r?\n/).forEach((line, index) => {
    const cleaned = line.trim();
    if (!cleaned) return;
    const parts = cleaned.includes('\t') || cleaned.includes(',') || cleaned.includes(';')
      ? cleaned.split(/[\t,;]+/).map(item => item.trim()).filter(Boolean)
      : cleaned.split(/\s+/).map(item => item.trim()).filter(Boolean);
    const nim = parts.shift() || '';
    if (!/^[0-9]{8,14}$/.test(nim) || !parts.length) {
      errors.push(`Baris ${index + 1} tidak valid.`);
      return;
    }

    let group = '';
    if (parts.length > 1 && /^([A-Z]|\d{1,2})$/i.test(parts[parts.length - 1])) {
      group = parts.pop();
    }

    rows.push({
      nim,
      name: parts.join(' '),
      group,
      className: fallbackClassName
    });
  });

  const seen = new Set();
  return {
    rows: rows.filter(row => {
      if (seen.has(row.nim)) return false;
      seen.add(row.nim);
      return true;
    }),
    errors
  };
}

function attendanceSessionLabel(session) {
  return [
    session.moduleNumber,
    session.moduleTitle,
    session.className ? `Kelas ${session.className}` : '',
    session.date
  ].filter(Boolean).join(' - ');
}

function attendanceSessionOptions() {
  if (!attendanceSessionFilter) return;
  const current = attendanceSessionFilter.value || 'All';
  const sessions = practicumAttendanceSessions.filter(session => canAccessPracticumCategory(session.category));
  attendanceSessionFilter.innerHTML = '<option value="All">Semua sesi</option>' + sessions.map(session => (
    `<option value="${escapeText(session.docId)}">${escapeText(attendanceSessionLabel(session))}</option>`
  )).join('');
  attendanceSessionFilter.value = current === 'All' || sessions.some(session => session.docId === current) ? current : 'All';
}

function attendanceRecapRows() {
  const q = (attendanceSearch?.value || '').toLowerCase();
  const sessionId = attendanceSessionFilter?.value || 'All';
  const recordByKey = new Map(practicumAttendanceRecords.map(record => [`${record.sessionId}_${record.nim}`, record]));
  const selectedSessions = practicumAttendanceSessions.filter(session => canAccessPracticumCategory(session.category) && (sessionId === 'All' || session.docId === sessionId));
  const rows = [];

  if (!selectedSessions.length) {
    return practicumRosters
      .filter(roster => roster.isActive !== false && canAccessPracticumCategory(roster.category))
      .map(roster => ({ session: null, roster, record: null }))
      .filter(({ roster }) => [
        roster.nim,
        roster.name,
        roster.className,
        roster.group,
        roster.course,
        roster.category,
        roster.targetAngkatan,
        roster.academicYear
      ].join(' ').toLowerCase().includes(q));
  }

  selectedSessions.forEach(session => {
    practicumRosters
      .filter(roster => roster.isActive !== false
        && canAccessPracticumCategory(roster.category)
        && roster.category === session.category
        && matchesTargetCohort(roster, session.targetAngkatan || session.targetCohort)
        && (roster.classKey || slugifyAcademic(roster.className)) === (session.classKey || slugifyAcademic(session.className))
        && roster.academicYear === session.academicYear)
      .forEach(roster => {
        const record = recordByKey.get(`${session.docId}_${roster.nim}`);
        rows.push({ session, roster, record });
      });
  });

  return rows.filter(({ session, roster, record }) => [
    roster.nim,
    roster.name,
    roster.className,
    roster.group,
    session.course,
    session.category,
    session.targetAngkatan,
    session.moduleNumber,
    session.moduleTitle,
    record?.status
  ].join(' ').toLowerCase().includes(q));
}

function attendanceRecapRender() {
  practicumCourseOptions();
  attendanceSessionOptions();
  const scopedSessionIds = new Set(practicumAttendanceSessions.filter(item => canAccessPracticumCategory(item.category)).map(item => item.docId));
  if (rosterTotalCount) rosterTotalCount.textContent = practicumRosters.filter(item => item.isActive !== false && canAccessPracticumCategory(item.category)).length;
  if (attendanceSessionCount) attendanceSessionCount.textContent = scopedSessionIds.size;
  if (attendanceRecordCount) attendanceRecordCount.textContent = practicumAttendanceRecords.filter(item => scopedSessionIds.has(item.sessionId)).length;
  if (!attendanceRecapTable) return;

  const rows = attendanceRecapRows().map(({ session, roster, record }) => {
    const status = record ? '<span class="student-status online">Hadir</span>' : '<span class="student-status never">Belum absen</span>';
    return `
      <tr>
        <td><b>${escapeText(roster.nim)}</b><br><span class="small-text">${escapeText(roster.name)}</span></td>
        <td>${escapeText(roster.className)}${roster.group ? `<br><span class="small-text">Kelompok ${escapeText(roster.group)}</span>` : ''}</td>
        <td>${escapeText(session?.course || roster.course || roster.category)}<br><span class="small-text">Angkatan ${escapeText(targetCohortForPracticumResource(session || roster) || '-')} &middot; ${escapeText(session?.academicYear || roster.academicYear)}</span></td>
        <td><b>${escapeText(session?.moduleNumber || 'Belum ada sesi')}</b><br><span class="small-text">${escapeText(session?.moduleTitle || 'Buat sesi absen untuk mulai rekap hadir.')}</span></td>
        <td>${session ? status : '<span class="student-status never">Roster</span>'}</td>
        <td>${escapeText(record ? formatDateTime(record.attendedAt || record.createdAt) : '-')}</td>
        <td>
          ${session ? `<button class="action-btn" data-toggle-attendance="${escapeText(session.docId)}" type="button">${session.status === 'closed' ? 'Aktifkan' : 'Tutup'}</button>
          <button class="action-btn danger" data-del-attendance-session="${escapeText(session.docId)}" type="button">Hapus Sesi</button>` : ''}
          <button class="action-btn danger" data-del-roster="${escapeText(roster.docId)}" type="button">Hapus Praktikan</button>
        </td>
      </tr>
    `;
  }).join('');

  attendanceRecapTable.innerHTML = rows || '<tr><td colspan="7">Belum ada data praktikan atau sesi absen yang cocok.</td></tr>';
}

function attendanceSessionTableRender() {
  if (!attendanceSessionTable) return;
  const recordCounts = practicumAttendanceRecords.reduce((map, record) => {
    map[record.sessionId] = (map[record.sessionId] || 0) + 1;
    return map;
  }, {});
  const rows = practicumAttendanceSessions
    .filter(session => canAccessPracticumCategory(session.category))
    .map(session => `
      <tr>
        <td><b>${escapeText(session.course || session.category)}</b><br><span class="small-text">${escapeText(session.category || '-')}</span></td>
        <td>${escapeText(session.className || '-')}<br><span class="small-text">Angkatan ${escapeText(targetCohortForPracticumResource(session) || '-')} &middot; ${escapeText(session.academicYear || '-')}</span></td>
        <td><b>${escapeText(session.moduleNumber || '-')}</b><br><span class="small-text">${escapeText(session.moduleTitle || '-')}</span></td>
        <td>${escapeText(session.date || '-')}<br><span class="small-text">${escapeText([session.openAt, session.closeAt].filter(Boolean).join(' - ') || '-')}</span></td>
        <td><span class="badge">${escapeText(session.status === 'closed' ? 'Ditutup' : 'Aktif')}</span></td>
        <td>${recordCounts[session.docId] || 0} record</td>
        <td>
          <button class="action-btn" data-toggle-attendance-session="${escapeText(session.docId)}" type="button">${session.status === 'closed' ? 'Aktifkan' : 'Tutup'}</button>
          <button class="action-btn" data-reset-attendance-session="${escapeText(session.docId)}" type="button">Reset Absen</button>
          <button class="action-btn danger" data-delete-attendance-session="${escapeText(session.docId)}" type="button">Hapus Sesi</button>
        </td>
      </tr>
    `).join('');

  attendanceSessionTable.innerHTML = rows || '<tr><td colspan="7">Belum ada sesi absen untuk scope praktikum akun ini.</td></tr>';
}

const csvEscape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;

function downloadCsv(filename, rows) {
  const blob = new Blob([`\ufeff${rows.map(row => row.map(csvEscape).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportAttendanceCsv() {
  const rows = attendanceRecapRows();
  const csvRows = [[
    'NIM',
    'Nama',
    'Kelas',
    'Kelompok',
    'Praktikum',
    'Tahun Akademik',
    'Angkatan Target',
    'Modul',
    'Judul Modul',
    'Status',
    'Waktu Absen'
  ]].concat(rows.map(({ session, roster, record }) => [
    roster.nim,
    roster.name,
    roster.className,
    roster.group || '',
    session?.course || roster.course || roster.category,
    session?.academicYear || roster.academicYear,
    targetCohortForPracticumResource(session || roster) || '',
    session?.moduleNumber || '',
    session?.moduleTitle || '',
    session ? record ? 'Hadir' : 'Belum absen' : 'Roster',
    record ? formatDateTime(record.attendedAt || record.createdAt) : ''
  ]));
  downloadCsv(`rekap-absensi-praktikum-${Date.now()}.csv`, csvRows);
}

function exportRosterCsv() {
  const rows = practicumScopeItems(practicumRosters)
    .filter(item => item.isActive !== false)
    .map(item => [
      item.nim,
      item.name,
      item.group || '',
      item.course || item.category,
      item.category,
      targetCohortForPracticumResource(item),
      item.academicYear,
      item.className,
      item.importedAt,
      item.importedBy
    ]);
  downloadCsv(`backup-roster-praktikum-${Date.now()}.csv`, [[
    'NIM',
    'Nama',
    'Kelompok',
    'Praktikum',
    'Kategori',
    'Angkatan Target',
    'Tahun Akademik',
    'Kelas',
    'Diimport Pada',
    'Diimport Oleh'
  ], ...rows]);
  writeAuditLog({
    action: 'EXPORT_PRACTICUM_BACKUP',
    targetType: 'practicum_roster',
    targetTitle: 'Backup roster praktikum',
    detail: `${rows.length} baris roster diexport.`
  }).catch(error => console.warn('Audit export roster failed:', error));
}

function exportSessionCsv() {
  const recordCounts = practicumAttendanceRecords.reduce((map, record) => {
    map[record.sessionId] = (map[record.sessionId] || 0) + 1;
    return map;
  }, {});
  const rows = practicumScopeItems(practicumAttendanceSessions).map(item => [
    item.docId,
    item.course || item.category,
    item.category,
    targetCohortForPracticumResource(item),
    item.academicYear,
    item.className,
    item.moduleNumber,
    item.moduleTitle,
    item.date,
    item.openAt,
    item.closeAt,
    item.status,
    recordCounts[item.docId] || 0,
    item.createdAt,
    item.createdBy
  ]);
  downloadCsv(`backup-sesi-absen-praktikum-${Date.now()}.csv`, [[
    'ID Sesi',
    'Praktikum',
    'Kategori',
    'Angkatan Target',
    'Tahun Akademik',
    'Kelas',
    'Modul',
    'Judul Modul',
    'Tanggal',
    'Buka',
    'Tutup',
    'Status',
    'Jumlah Record',
    'Dibuat Pada',
    'Dibuat Oleh'
  ], ...rows]);
  writeAuditLog({
    action: 'EXPORT_PRACTICUM_BACKUP',
    targetType: 'practicum_attendance_session',
    targetTitle: 'Backup sesi absen',
    detail: `${rows.length} sesi absen diexport.`
  }).catch(error => console.warn('Audit export session failed:', error));
}

async function toggleAttendanceSession(sessionId) {
  const session = practicumAttendanceSessions.find(item => item.docId === sessionId);
  if (!session) return;
  if (!canAccessPracticumCategory(session.category)) {
    toast('Akun ini tidak memiliki akses ke sesi absen tersebut.');
    return;
  }
  const nextStatus = session.status === 'closed' ? 'open' : 'closed';
  await updateDoc(doc(db, PRACTICUM_ATTENDANCE_SESSION_COLLECTION, sessionId), {
    status: nextStatus,
    updatedAt: new Date().toISOString(),
    updatedBy: currentAdmin().username
  });
  await writeAuditLog({
    action: 'UPDATE_ATTENDANCE_SESSION',
    targetType: 'practicum_attendance_session',
    targetId: sessionId,
    targetTitle: attendanceSessionLabel(session),
    detail: `Status sesi absen diubah menjadi ${nextStatus}.`
  });
  toast(nextStatus === 'open' ? 'Sesi absen diaktifkan.' : 'Sesi absen ditutup.');
}

async function resetAttendanceSession(sessionId) {
  const session = practicumAttendanceSessions.find(item => item.docId === sessionId);
  if (!session) return;
  if (!canAccessPracticumCategory(session.category)) {
    toast('Akun ini tidak memiliki akses ke sesi absen tersebut.');
    return;
  }
  const records = practicumAttendanceRecords.filter(record => record.sessionId === sessionId);
  if (!records.length) {
    toast('Sesi ini belum memiliki record absen.');
    return;
  }
  const batch = writeBatch(db);
  records.forEach(record => batch.delete(doc(db, PRACTICUM_ATTENDANCE_RECORD_COLLECTION, record.docId)));
  await batch.commit();
  await writeAuditLog({
    action: 'RESET_ATTENDANCE_SESSION',
    targetType: 'practicum_attendance_session',
    targetId: sessionId,
    targetTitle: attendanceSessionLabel(session),
    detail: `${records.length} record hadir pada sesi absen direset.`
  });
  toast('Record absen sesi ini berhasil direset.');
}

async function deleteAttendanceSession(sessionId) {
  const session = practicumAttendanceSessions.find(item => item.docId === sessionId);
  if (session && !canAccessPracticumCategory(session.category)) {
    toast('Akun ini tidak memiliki akses ke sesi absen tersebut.');
    return;
  }
  const batch = writeBatch(db);
  practicumAttendanceRecords.filter(record => record.sessionId === sessionId).forEach(record => {
    batch.delete(doc(db, PRACTICUM_ATTENDANCE_RECORD_COLLECTION, record.docId));
  });
  batch.delete(doc(db, PRACTICUM_ATTENDANCE_SESSION_COLLECTION, sessionId));
  await batch.commit();
  await writeAuditLog({
    action: 'DELETE_ATTENDANCE_SESSION',
    targetType: 'practicum_attendance_session',
    targetId: sessionId,
    targetTitle: session ? attendanceSessionLabel(session) : sessionId,
    detail: 'Sesi absen dan record hadirnya dihapus.'
  });
  toast('Sesi absen berhasil dihapus.');
}

async function backfillPracticumTargets() {
  if (!requirePermission('practicum_studio', 'Rapikan Data Praktikum')) return;
  const updates = [
    ...buildPracticumBackfill('practicum_studio_modules', practicumScopeItems(practicumModules)),
    ...buildPracticumBackfill(PRACTICUM_ROSTER_COLLECTION, practicumScopeItems(practicumRosters)),
    ...buildPracticumBackfill(PRACTICUM_ATTENDANCE_SESSION_COLLECTION, practicumScopeItems(practicumAttendanceSessions)),
    ...buildPracticumBackfill(PRACTICUM_ATTENDANCE_RECORD_COLLECTION, practicumScopeItems(practicumAttendanceRecords))
  ];

  if (!updates.length) {
    toast('Data lama praktikum sudah rapi. Tidak ada yang perlu diperbarui.');
    return;
  }
  if (!confirm(`Rapikan ${updates.length} data lama praktikum/studio di server?`)) return;

  try {
    if (practicumBackfillTargets) practicumBackfillTargets.disabled = true;
    await commitFirestoreUpdates(updates);
    await writeAuditLog({
      action: 'BACKFILL_PRACTICUM_TARGETS',
      targetType: 'practicum_studio',
      targetTitle: 'Target angkatan praktikum',
      detail: `${updates.length} dokumen praktikum/studio lama dirapikan.`
    });
    toast(`${updates.length} data lama berhasil dirapikan.`);
  } catch (error) {
    console.error('Backfill practicum targets error:', error);
    toast('Gagal merapikan data lama praktikum.');
  } finally {
    if (practicumBackfillTargets) practicumBackfillTargets.disabled = false;
  }
}

function videoFilters() {
  if (!videoFilter) return;
  videoFilter.innerHTML = '<option value="All">All</option>' +
    [...new Set(videos.map(v => v.category))].map(c => `<option>${escapeText(c)}</option>`).join('');
}

function announcementFilters() {
  if (!announcementFilter) return;
  announcementFilter.innerHTML = '<option value="All">All</option>' +
    [...new Set(announcements.map(item => item.type || 'Pemberitahuan'))].map(c => `<option>${escapeText(c)}</option>`).join('');
}

function table() {
  if (!resourceTable) return;
  const q = (adminSearch?.value || '').toLowerCase();
  const cat = adminFilter?.value || 'All';
  const rows = resources
    .filter(r => r.category !== 'Software' && !isPracticumResource(r))
    .filter(r => (cat === 'All' || r.category === cat) &&
      [r.title, r.category, r.description, r.author].join(' ').toLowerCase().includes(q))
    .map(r => `
      <tr>
        <td>${escapeText(r.title)}</td>
        <td>${escapeText(r.category)}</td>
        <td>${escapeText(r.type)}</td>
        <td>${escapeText(r.date)}</td>
        <td><button class="action-btn" data-edit="${r.docId}">Edit</button><button class="action-btn danger" data-del="${r.docId}">Delete</button></td>
      </tr>
    `)
    .join('');
  resourceTable.innerHTML = rows || '<tr><td colspan="5">Tidak ada resource.</td></tr>';
}

function softwareTableRender() {
  const q = (softwareSearch?.value || '').toLowerCase();
  const cat = softwareFilter?.value || 'All';
  const rows = resources
    .filter(r => r.category === 'Software')
    .filter(r => (cat === 'All' || (r.type || r.element || r.category) === cat) &&
      [r.title, (r.type || r.element || r.category), r.description, r.author].join(' ').toLowerCase().includes(q))
    .map(r => `
      <tr>
        <td>${escapeText(r.title)}</td>
        <td>${escapeText(r.category)}</td>
        <td>${escapeText(r.type || r.element || 'Software')}</td>
        <td>${escapeText(r.date)}</td>
        <td><button class="action-btn" data-edit="${r.docId}">Edit</button><button class="action-btn danger" data-del="${r.docId}">Delete</button></td>
      </tr>
    `)
    .join('');
  if (softwareTable) softwareTable.innerHTML = rows || '<tr><td colspan="5">Tidak ada software.</td></tr>';
}

function videoTableRender() {
  const q = (videoSearch?.value || '').toLowerCase();
  const cat = videoFilter?.value || 'All';
  const rows = videos
    .filter(v => (cat === 'All' || v.category === cat) &&
      [v.title, v.category, v.description].join(' ').toLowerCase().includes(q))
    .map(v => `
      <tr>
        <td>${escapeText(v.title)}</td>
        <td>${escapeText(v.category)}</td>
        <td>${escapeText(v.channel || v.duration || 'Channel')}</td>
        <td><button class="action-btn" data-edit="${v.docId}">Edit</button><button class="action-btn danger" data-del="${v.docId}">Delete</button></td>
      </tr>
    `)
    .join('');
  if (videoTable) videoTable.innerHTML = rows || '<tr><td colspan="4">Tidak ada video.</td></tr>';
}

function announcementTableRender() {
  const q = (announcementSearch?.value || '').toLowerCase();
  const type = announcementFilter?.value || 'All';
  const rows = announcements
    .filter(item => (type === 'All' || item.type === type) &&
      [item.title, item.type, item.description].join(' ').toLowerCase().includes(q))
    .map(item => `
      <tr>
        <td>${escapeText(item.title)}</td>
        <td>${escapeText(item.type)}</td>
        <td>${escapeText(item.date)}</td>
        <td>${item.photoUrl ? '<span class="badge">Ada foto</span>' : '<span class="badge">Tanpa foto</span>'}</td>
        <td><button class="action-btn" data-edit="${item.docId}">Edit</button><button class="action-btn danger" data-del="${item.docId}">Delete</button></td>
      </tr>
    `)
    .join('');
  if (announcementTable) announcementTable.innerHTML = rows || '<tr><td colspan="5">Belum ada pemberitahuan.</td></tr>';
}

function messageTableRender() {
  const q = (messageSearch?.value || '').toLowerCase();
  const status = messageFilter?.value || 'All';
  const rows = contactMessages
    .filter(item => (status === 'All' || item.status === status) &&
      [item.name, item.nim, item.email, item.category, item.subject, item.message, item.reply].join(' ').toLowerCase().includes(q))
    .map(item => `
      <tr>
        <td><b>${escapeText(item.name)}</b><br><span class="small-text">${escapeText(item.nim)} &middot; ${escapeText(item.email)}</span></td>
        <td>${escapeText(item.category)}</td>
        <td>${escapeText(item.subject)}</td>
        <td class="message-preview">${escapeText(item.message)}${item.reply ? `<div class="message-reply">Balasan: ${escapeText(item.reply)}</div>` : ''}</td>
        <td><span class="badge">${item.status === 'answered' ? 'Sudah dibalas' : 'Belum dibalas'}</span></td>
        <td><button class="action-btn" data-reply-message="${item.docId}">Balas</button><button class="action-btn danger" data-del-message="${item.docId}">Delete</button></td>
      </tr>
    `)
    .join('');
  if (messageTable) messageTable.innerHTML = rows || '<tr><td colspan="6">Belum ada pesan mahasiswa.</td></tr>';
}

function liveChatRender() {
  if (!liveChatThreads) return;
  const q = (liveChatSearch?.value || '').toLowerCase();
  const grouped = liveChatMessages.reduce((acc, item) => {
    if (!acc[item.threadId]) acc[item.threadId] = [];
    acc[item.threadId].push(item);
    return acc;
  }, {});
  const threads = Object.entries(grouped)
    .map(([threadId, messages]) => ({
      threadId,
      messages: messages.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))),
      latest: messages[messages.length - 1]
    }))
    .sort((a, b) => String(b.latest.createdAt).localeCompare(String(a.latest.createdAt)))
    .filter(thread => [thread.latest.senderName, thread.latest.nim, thread.latest.message, thread.threadId].join(' ').toLowerCase().includes(q));

  liveChatThreads.innerHTML = threads.map(thread => `
    <article class="chat-thread">
      <h4>${escapeText(thread.latest.senderName || 'Mahasiswa')} ${thread.latest.nim ? `(${escapeText(thread.latest.nim)})` : ''}</h4>
      <p><b>Pesan terbaru:</b> ${escapeText(thread.latest.message)}</p>
      <p><b>Jumlah chat:</b> ${thread.messages.length} &middot; <b>Terakhir:</b> ${new Date(thread.latest.createdAt).toLocaleString('id-ID')}</p>
      <button class="action-btn" data-reply-chat="${escapeText(thread.threadId)}">Balas Chat</button>
      <button class="action-btn danger" data-close-chat="${escapeText(thread.threadId)}">Hapus Thread</button>
    </article>
  `).join('') || '<div class="empty">Belum ada live chat.</div>';
}

function studentActivityRender() {
  if (!studentActivityTable) return;

  const q = (studentActivitySearch?.value || '').toLowerCase();
  const status = studentActivityFilter?.value || 'All';
  const cohort = studentActivityCohortFilter?.value || 'All';
  const onlineCount = students.filter(isStudentOnline).length;

  if (studentActivityCohortFilter) {
    const current = studentActivityCohortFilter.value || 'All';
    const cohorts = [...new Set(students.map(student => student.angkatan).filter(Boolean))].sort().reverse();
    studentActivityCohortFilter.innerHTML = '<option value="All">Semua angkatan</option>' +
      cohorts.map(item => `<option value="${escapeText(item)}">${escapeText(item)}</option>`).join('');
    studentActivityCohortFilter.value = cohorts.includes(current) ? current : 'All';
  }
  if (studentTotalCount) studentTotalCount.textContent = students.length;
  if (studentOnlineCount) studentOnlineCount.textContent = onlineCount;

  const rows = students
    .filter(student => {
      const online = isStudentOnline(student);
      const never = !student.last_seen_at;
      if (status === 'online' && !online) return false;
      if (status === 'offline' && (online || never)) return false;
      if (status === 'never' && !never) return false;
      if (cohort !== 'All' && student.angkatan !== cohort) return false;
      return [student.nim, student.name, student.angkatan, student.last_page].join(' ').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const aOnline = isStudentOnline(a);
      const bOnline = isStudentOnline(b);
      if (aOnline !== bOnline) return aOnline ? -1 : 1;
      return String(b.last_seen_at || '').localeCompare(String(a.last_seen_at || ''));
    })
    .map(student => {
      const online = isStudentOnline(student);
      const statusLabel = online ? 'Online' : student.last_seen_at ? 'Offline' : 'Belum login';
      const statusClass = online ? 'online' : student.last_seen_at ? 'offline' : 'never';
      return `
        <tr>
          <td><span class="student-status ${statusClass}">${statusLabel}</span></td>
          <td><b>${escapeText(student.nim)}</b></td>
          <td>${escapeText(student.name || 'Mahasiswa SIPIL CARE')}</td>
          <td>${escapeText(student.angkatan || '-')}</td>
          <td style="white-space:nowrap">${escapeText(formatRelativeTime(student.last_seen_at))}<br><span class="small-text">${escapeText(formatDateTimeShort(student.last_seen_at))}</span></td>
          <td>${escapeText(student.last_page || '-')}</td>
          <td style="white-space:nowrap">${escapeText(formatDateTimeShort(student.last_login_at))}</td>
        </tr>
      `;
    })
    .join('');

  studentActivityTable.innerHTML = rows || '<tr><td colspan="7">Tidak ada mahasiswa yang cocok dengan pencarian.</td></tr>';
}

function adminActivityRender() {
  if (!adminActivityTable) return;

  const q = (adminActivitySearch?.value || '').toLowerCase();
  const status = adminActivityFilter?.value || 'All';
  const onlineCount = adminActivities.filter(isAdminOnline).length;

  if (adminTotalCount) adminTotalCount.textContent = adminActivities.length;
  if (adminOnlineCount) adminOnlineCount.textContent = onlineCount;

  const rows = adminActivities
    .filter(admin => {
      const online = isAdminOnline(admin);
      const never = !admin.last_seen_at;
      if (status === 'online' && !online) return false;
      if (status === 'offline' && (online || never)) return false;
      if (status === 'never' && !never) return false;
      return [
        admin.username,
        admin.name,
        admin.roleLabel,
        admin.role,
        admin.last_page
      ].join(' ').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const aOnline = isAdminOnline(a);
      const bOnline = isAdminOnline(b);
      if (aOnline !== bOnline) return aOnline ? -1 : 1;
      return String(b.last_seen_at || '').localeCompare(String(a.last_seen_at || ''));
    })
    .map(admin => {
      const online = isAdminOnline(admin);
      const statusLabel = online ? 'Online' : admin.last_seen_at ? 'Offline' : 'Belum login';
      const statusClass = online ? 'online' : admin.last_seen_at ? 'offline' : 'never';
      return `
        <tr>
          <td><span class="student-status ${statusClass}">${statusLabel}</span></td>
          <td><b>${escapeText(admin.name || admin.username)}</b><br><span class="small-text">${escapeText(admin.username || '-')}</span></td>
          <td>${escapeText(admin.roleLabel || admin.role || '-')}</td>
          <td style="white-space:nowrap">${escapeText(formatRelativeTime(admin.last_seen_at))}<br><span class="small-text">${escapeText(formatDateTimeShort(admin.last_seen_at))}</span></td>
          <td>${escapeText(admin.last_page || '-')}</td>
          <td style="white-space:nowrap">${escapeText(formatDateTimeShort(admin.last_login_at))}</td>
        </tr>
      `;
    })
    .join('');

  adminActivityTable.innerHTML = rows || '<tr><td colspan="6">Tidak ada admin yang cocok dengan pencarian.</td></tr>';
}

const accessTypeLabels = {
  resource: 'Resources',
  software: 'Software',
  practicum: 'Praktikum/Studio',
  video: 'Videos'
};

const accessActionLabels = {
  view: 'View',
  download: 'Download'
};

function accessLogFilters() {
  if (accessLogFilter) {
    accessLogFilter.innerHTML = '<option value="All">Semua konten</option>' +
      Object.entries(accessTypeLabels).map(([value, label]) => `<option value="${value}">${escapeText(label)}</option>`).join('');
  }
  if (accessLogActionFilter) {
    accessLogActionFilter.innerHTML = '<option value="All">Semua aksi</option>' +
      Object.entries(accessActionLabels).map(([value, label]) => `<option value="${value}">${escapeText(label)}</option>`).join('');
  }
}

function accessLogRender() {
  if (!accessLogTable) return;

  const q = (accessLogSearch?.value || '').toLowerCase();
  const type = accessLogFilter?.value || 'All';
  const action = accessLogActionFilter?.value || 'All';
  const showDelete = canDeleteDashboardLogs();
  const filtered = accessLogs.filter(item => {
    const contentType = item.contentType || (item.source === 'videos' ? 'video' : item.category === 'Software' ? 'software' : item.source || 'resource');
    const itemAction = item.action || 'download';
    if (type !== 'All' && contentType !== type) return false;
    if (action !== 'All' && itemAction !== action) return false;
    return [
      item.nim,
      item.name,
      item.resourceTitle,
      item.category,
      item.type,
      item.fileHost,
      accessTypeLabels[contentType],
      accessActionLabels[itemAction]
    ].join(' ').toLowerCase().includes(q);
  });

  if (accessTotalCount) accessTotalCount.textContent = filtered.length;
  if (accessDownloadCount) accessDownloadCount.textContent = accessLogs.filter(item => (item.action || 'download') === 'download').length;
  if (accessVideoCount) accessVideoCount.textContent = accessLogs.filter(item => (item.contentType || item.source) === 'video').length;

  accessLogTable.innerHTML = filtered.map(item => {
    const contentType = item.contentType || (item.source === 'videos' ? 'video' : item.category === 'Software' ? 'software' : item.source || 'resource');
    const itemAction = item.action || 'download';
    const createdAt = item.createdAt || item.accessedAt;
    return `
      <tr>
        <td>${escapeText(formatDateTime(createdAt))}<br><span class="small-text">${escapeText(formatRelativeTime(createdAt))}</span></td>
        <td><b>${escapeText(item.name || 'Mahasiswa')}</b><br><span class="small-text">NIM ${escapeText(item.nim || '-')}</span></td>
        <td><span class="badge">${escapeText(accessTypeLabels[contentType] || contentType)}</span></td>
        <td><span class="badge">${escapeText(accessActionLabels[itemAction] || item.actionLabel || itemAction)}</span></td>
        <td>${escapeText(item.resourceTitle || item.resourceId || '-')}<br><span class="small-text">${escapeText([item.category, item.type].filter(Boolean).join(' / ') || '-')}</span></td>
        <td>${escapeText(item.fileHost || '-')}</td>
        ${showDelete ? `<td><button class="action-btn danger" data-del-access-log="${escapeText(item.docId)}" type="button">Hapus</button></td>` : ''}
      </tr>
    `;
  }).join('') || `<tr><td colspan="${showDelete ? 7 : 6}">Belum ada history akses yang cocok.</td></tr>`;
}

function auditFilters() {
  if (!auditFilter) return;
  const actions = [...new Set(auditLogs.map(item => item.actionLabel || item.action).filter(Boolean))];
  auditFilter.innerHTML = '<option value="All">Semua aksi</option>' +
    actions.map(action => `<option>${escapeText(action)}</option>`).join('');
}

function auditTableRender() {
  if (!auditTable) return;
  const q = (auditSearch?.value || '').toLowerCase();
  const action = auditFilter?.value || 'All';
  const showDelete = canDeleteDashboardLogs();
  const filtered = auditLogs.filter(item => {
    const label = item.actionLabel || item.action || '';
    if (action !== 'All' && label !== action) return false;
    return [
      item.adminName,
      item.adminUsername,
      item.adminRoleLabel,
      label,
      item.targetType,
      item.targetTitle,
      item.detail
    ].join(' ').toLowerCase().includes(q);
  });

  if (auditTotalCount) auditTotalCount.textContent = filtered.length;
  auditTable.innerHTML = filtered.map(item => `
    <tr>
      <td>${escapeText(formatDateTime(item.createdAt))}</td>
      <td><b>${escapeText(item.adminName || item.adminUsername)}</b><br><span class="small-text">${escapeText(item.adminRoleLabel || item.adminRole || '-')}</span></td>
      <td><span class="badge">${escapeText(item.actionLabel || item.action)}</span></td>
      <td>${escapeText(item.targetType || '-')}</td>
      <td>${escapeText(item.targetTitle || item.targetId || '-')}</td>
      <td class="message-preview">${escapeText(item.detail || '-')}</td>
      ${showDelete ? `<td><button class="action-btn danger" data-del-audit-log="${escapeText(item.docId)}" type="button">Hapus</button></td>` : ''}
    </tr>
  `).join('') || `<tr><td colspan="${showDelete ? 7 : 6}">Belum ada aktivitas admin yang cocok.</td></tr>`;
}

function adminRoleTableRender() {
  if (!adminRoleTable) return;
  if (!canManageAdminAccounts()) {
    adminRoleTable.innerHTML = '<tr><td colspan="5">Menu ini hanya tersedia untuk Developer.</td></tr>';
    return;
  }

  const accountCounts = adminAccounts.reduce((map, account) => {
    map[account.role] = (map[account.role] || 0) + 1;
    return map;
  }, {});

  const rows = (adminRoles.length ? adminRoles : fallbackAdminRoles())
    .map(normalizeAdminRole)
    .sort((a, b) => (a.role === 'developer' ? -1 : b.role === 'developer' ? 1 : a.roleLabel.localeCompare(b.roleLabel)))
    .map(role => {
      const usedCount = accountCounts[role.role] || 0;
      const deleteDisabled = role.role === 'developer' || usedCount > 0;
      return `
        <tr>
          <td><b>${escapeText(role.roleLabel)}</b><br><span class="small-text">${escapeText(role.role)}${usedCount ? ` &middot; ${usedCount} akun` : ''}</span></td>
          <td>${role.isActive ? '<span class="badge">Aktif</span>' : '<span class="badge">Nonaktif</span>'}</td>
          <td>${escapeText(role.allowedPages.join(', ') || '-')}</td>
          <td>${escapeText(role.permissions.join(', ') || '-')}</td>
          <td>
            <button class="action-btn" data-edit-admin-role="${escapeText(role.role)}" type="button">Edit</button>
            <button class="action-btn danger" data-del-admin-role="${escapeText(role.role)}" type="button" ${deleteDisabled ? 'disabled' : ''}>Hapus</button>
          </td>
        </tr>
      `;
    })
    .join('');

  adminRoleTable.innerHTML = rows || '<tr><td colspan="5">Belum ada role admin.</td></tr>';
}

function adminAccountTableRender() {
  if (!adminAccountTable) return;
  if (!canManageAdminAccounts()) {
    adminAccountTable.innerHTML = '<tr><td colspan="7">Menu ini hanya tersedia untuk Developer.</td></tr>';
    return;
  }

  const q = (adminAccountSearch?.value || '').toLowerCase();
  const rows = adminAccounts
    .map(normalizeAdminAccount)
    .filter(account => [
      account.username,
      account.name,
      account.roleLabel,
      account.role
    ].join(' ').toLowerCase().includes(q))
    .map(account => {
      const isSelf = account.username === currentAdmin().username;
      return `
        <tr>
          <td><b>${escapeText(account.name || account.username)}</b><br><span class="small-text">${escapeText(account.username)}</span></td>
          <td>${escapeText(account.roleLabel)}</td>
          <td>${account.isActive ? '<span class="badge">Aktif</span>' : '<span class="badge">Nonaktif</span>'}</td>
          <td>${escapeText(account.allowedPages.join(', '))}</td>
          <td>${escapeText(account.permissions.join(', '))}</td>
          <td>${escapeText(scopeLabel(account.practicumScopes))}</td>
          <td>
            <button class="action-btn" data-edit-admin-account="${escapeText(account.username)}" type="button">Edit</button>
            <button class="action-btn danger" data-del-admin-account="${escapeText(account.username)}" type="button" ${isSelf ? 'disabled' : ''}>Hapus</button>
          </td>
        </tr>
      `;
    })
    .join('');

  adminAccountTable.innerHTML = rows || '<tr><td colspan="7">Belum ada akun admin yang cocok.</td></tr>';
  adminRoleTableRender();
}

function studentCohortOptions() {
  const options = studentCohorts
    .map(item => item.angkatan)
    .filter(Boolean)
    .sort()
    .reverse();
  const html = '<option value="">Pilih angkatan</option>' +
    options.map(item => `<option value="${escapeText(item)}">${escapeText(item)}</option>`).join('');

  [studentBulkCohort, studentEditCohort].forEach(select => {
    if (!select) return;
    const current = select.value;
    select.innerHTML = html;
    if (options.includes(current)) select.value = current;
  });

  if (studentCohortDeleteSelect) {
    const current = studentCohortDeleteSelect.value;
    studentCohortDeleteSelect.innerHTML = html;
    if (options.includes(current)) studentCohortDeleteSelect.value = current;
  }

  if (studentAccountCohortFilter) {
    const current = studentAccountCohortFilter.value || 'All';
    studentAccountCohortFilter.innerHTML = '<option value="All">Semua angkatan</option>' +
      options.map(item => `<option value="${escapeText(item)}">${escapeText(item)}</option>`).join('');
    studentAccountCohortFilter.value = options.includes(current) ? current : 'All';
  }
}

function studentCohortRender() {
  if (!studentCohortList) return;
  studentCohortOptions();
  studentCohortList.innerHTML = studentCohorts.map(item => `
    <article>
      <span>${escapeText(item.label || item.angkatan)}</span>
      <strong>${escapeText(item.angkatan)}</strong>
      <small>${Number(item.student_count || 0)} akun &middot; ${Number(item.online_count || 0)} online</small>
    </article>
  `).join('') || '<div class="empty">Belum ada angkatan.</div>';
}

function studentBulkPreviewRender() {
  if (!studentBulkPreviewTable) return;
  const cohort = normalizeCohort(studentBulkCohort?.value);
  studentBulkPreviewTable.innerHTML = studentBulkPreviewRows.map(item => `
    <tr>
      <td><b>${escapeText(item.nim)}</b></td>
      <td>${escapeText(item.name)}</td>
      <td>${escapeText(cohort || '-')}</td>
      <td>${escapeText(defaultStudentPassword(item.nim))}</td>
      <td>${escapeText(cohort ? defaultStudentRecovery(cohort, item.nim) : '-')}</td>
    </tr>
  `).join('') || '<tr><td colspan="5">Belum ada preview mahasiswa.</td></tr>';
}

function studentAccountTableRender() {
  if (!studentAccountTable) return;
  if (!canManageStudentAccounts()) {
    studentAccountTable.innerHTML = '<tr><td colspan="7">Menu ini hanya tersedia untuk Developer.</td></tr>';
    return;
  }

  const q = (studentAccountSearch?.value || '').toLowerCase();
  const cohort = studentAccountCohortFilter?.value || 'All';
  const status = studentAccountStatusFilter?.value || 'All';
  const rows = studentAccounts
    .filter(student => {
      if (cohort !== 'All' && student.angkatan !== cohort) return false;
      if (status === 'active' && student.is_active === false) return false;
      if (status === 'inactive' && student.is_active !== false) return false;
      return [student.nim, student.name, student.angkatan].join(' ').toLowerCase().includes(q);
    })
    .sort((a, b) => String(b.angkatan || '').localeCompare(String(a.angkatan || '')) || String(a.nim).localeCompare(String(b.nim)))
    .map(student => {
      const online = isStudentOnline(student);
      const statusLabel = student.is_active === false ? 'Nonaktif' : online ? 'Online' : student.last_seen_at ? 'Offline' : 'Belum login';
      const statusClass = student.is_active === false ? 'never' : online ? 'online' : student.last_seen_at ? 'offline' : 'never';
      return `
        <tr>
          <td><span class="student-status ${statusClass}">${statusLabel}</span></td>
          <td><b>${escapeText(student.nim)}</b></td>
          <td>${escapeText(student.name || '-')}</td>
          <td>${escapeText(student.angkatan || '-')}</td>
          <td>${escapeText(formatDateTime(student.last_login_at))}</td>
          <td>${escapeText(student.must_change_password ? 'Belum diganti' : 'Sudah diganti')}</td>
          <td>
            <button class="action-btn" data-edit-student-account="${escapeText(student.nim)}" type="button">Edit</button>
            <button class="action-btn" data-reset-student-account="${escapeText(student.nim)}" type="button">Reset PW</button>
            <button class="action-btn danger" data-del-student-account="${escapeText(student.nim)}" type="button">Hapus</button>
          </td>
        </tr>
      `;
    }).join('');

  studentAccountTable.innerHTML = rows || '<tr><td colspan="7">Belum ada akun mahasiswa yang cocok.</td></tr>';
}

const render = () => {
  stats();
  filters();
  table();
  softwareFilters();
  softwareTableRender();
  practicumFilters();
  practicumTableRender();
  attendanceRecapRender();
  attendanceSessionTableRender();
  videoFilters();
  videoTableRender();
  announcementFilters();
  announcementTableRender();
  messageTableRender();
  liveChatRender();
  studentActivityRender();
  adminActivityRender();
  accessLogFilters();
  accessLogRender();
  auditFilters();
  auditTableRender();
  adminRoleTableRender();
  adminAccountTableRender();
  studentCohortRender();
  studentBulkPreviewRender();
  studentAccountTableRender();
};

const resetForm = () => {
  if (!resourceForm) return;
  resourceForm.reset();
  editingDocId = null;
  if (resourceId) resourceId.value = '';
  if (submitButton) submitButton.textContent = 'Simpan Resource';
};

const resetSoftwareForm = () => {
  if (!softwareForm) return;
  softwareForm.reset();
  editingSoftwareDocId = null;
  const btn = softwareForm.querySelector('button[type="submit"]');
  if (btn) btn.textContent = 'Simpan Software';
};


const resetPracticumForm = () => {
  if (!practicumForm) return;
  practicumForm.reset();
  if (practicumId) practicumId.value = '';
  if (practicumTargetCohort) practicumTargetCohort.value = '';
  applyPracticumTargetDefaults(practicumCategory, practicumTargetCohort, null, true);
  editingPracticumDocId = null;
  const btn = practicumForm.querySelector('button[type="submit"]');
  if (btn) btn.textContent = 'Simpan Modul Praktikum/Studio';
};
const resetVideoForm = () => {
  if (!videoForm) return;
  videoForm.reset();
  editingVideoDocId = null;
};

const resetAnnouncementForm = () => {
  if (!announcementForm) return;
  announcementForm.reset();
  if (announcementId) announcementId.value = '';
  if (announcementPhotoUrl) announcementPhotoUrl.value = '';
  if (announcementPhotoPath) announcementPhotoPath.value = '';
  editingAnnouncementDocId = null;
  const btn = announcementForm.querySelector('button[type="submit"]');
  if (btn) btn.textContent = 'Simpan Pemberitahuan';
};

on(resourceForm, 'submit', async e => {
  e.preventDefault();
  if (!requirePermission('resources', 'Resources')) return;
  if (!validateResourceForm()) return;

  setLoading(true);

  try {
    const data = {
      title: resourceTitle.value.trim(),
      category: resourceCategory.value,
      description: resourceDescription.value.trim(),
      author: resourceAuthor.value.trim(),
      date: resourceDate.value,
      thumbnail: resourceThumb.value.trim() || resourceCategory.value.slice(0, 2).toUpperCase(),
      type: resourceType.value,
      file: resourceFile.value.trim()
    };

    if (editingDocId) {
      await updateDoc(doc(db, 'resources', editingDocId), data);
      await writeAuditLog({
        action: 'UPDATE_RESOURCE',
        targetType: 'resource',
        targetId: editingDocId,
        targetTitle: data.title,
        detail: `Resource kategori ${data.category} diperbarui.`
      });
      toast('Resource berhasil diperbarui.');
    } else {
      const created = await addDoc(collection(db, 'resources'), data);
      await writeAuditLog({
        action: 'CREATE_RESOURCE',
        targetType: 'resource',
        targetId: created.id,
        targetTitle: data.title,
        detail: `Resource kategori ${data.category} ditambahkan.`
      });
      toast('Resource berhasil diupload.');
    }

    resetForm();
  } catch (err) {
    console.error('Save error:', err);
    toast('Gagal menyimpan resource. Coba ulang kembali.');
  } finally {
    setLoading(false);
  }
});

on(softwareForm, 'submit', async e => {
  e.preventDefault();
  if (!requirePermission('software', 'Software')) return;
  if (!softwareTitle.value.trim() || !softwareDescription.value.trim() || !softwareAuthor.value.trim() || !softwareDate.value) {
    toast('Lengkapi Judul, Deskripsi, Author, dan Tanggal.');
    return;
  }
  if (!softwareFile.value.trim() || !isValidUrl(softwareFile.value)) {
    toast('Masukkan link file software yang valid (http/https).');
    return;
  }

  setLoading(true);
  try {
    const data = {
      title: softwareTitle.value.trim(),
      category: 'Software',
      type: softwareCategory.value,
      element: softwareCategory.value,
      description: softwareDescription.value.trim(),
      author: softwareAuthor.value.trim(),
      date: softwareDate.value,
      thumbnail: softwareThumb.value.trim() || 'SW',
      file: softwareFile.value.trim()
    };

    if (editingSoftwareDocId) {
      await updateDoc(doc(db, 'resources', editingSoftwareDocId), data);
      await writeAuditLog({
        action: 'UPDATE_SOFTWARE',
        targetType: 'software',
        targetId: editingSoftwareDocId,
        targetTitle: data.title,
        detail: `Software kategori ${data.type} diperbarui.`
      });
      toast('Software berhasil diperbarui.');
    } else {
      const created = await addDoc(collection(db, 'resources'), data);
      await writeAuditLog({
        action: 'CREATE_SOFTWARE',
        targetType: 'software',
        targetId: created.id,
        targetTitle: data.title,
        detail: `Software kategori ${data.type} ditambahkan.`
      });
      toast('Software berhasil diupload.');
    }

    resetSoftwareForm();
  } catch (err) {
    console.error('Save software error:', err);
    toast('Gagal menyimpan software. Coba ulang kembali.');
  } finally {
    setLoading(false);
  }
});


on(practicumForm, 'submit', async e => {
  e.preventDefault();
  if (!requirePermission('practicum_studio', 'Praktikum & Studio')) return;
  if (!validatePracticumForm()) return;

  setLoading(true);
  try {
    const meta = selectedPracticumMeta();
    const targetAngkatan = selectedTargetCohort(practicumTargetCohort, meta);
    const data = {
      title: practicumTitle.value.trim(),
      category: meta.category,
      course: meta.course,
      semester: meta.semester,
      kind: meta.kind,
      targetAngkatan,
      academicYear: academicYearForCohortSemester(targetAngkatan, meta.semester),
      description: practicumDescription.value.trim(),
      author: practicumAuthor.value.trim(),
      date: practicumDate.value,
      thumbnail: practicumThumb.value.trim() || meta.kind,
      type: practicumType.value,
      file: practicumFile.value.trim()
    };

    if (editingPracticumDocId) {
      await updateDoc(doc(db, 'practicum_studio_modules', editingPracticumDocId), data);
      await writeAuditLog({
        action: 'UPDATE_PRACTICUM',
        targetType: 'practicum_studio',
        targetId: editingPracticumDocId,
        targetTitle: data.title,
        detail: `Modul ${data.category} untuk angkatan ${targetAngkatan} diperbarui.`
      });
      toast('Modul praktikum/studio berhasil diperbarui.');
    } else {
      const created = await addDoc(collection(db, 'practicum_studio_modules'), data);
      await writeAuditLog({
        action: 'CREATE_PRACTICUM',
        targetType: 'practicum_studio',
        targetId: created.id,
        targetTitle: data.title,
        detail: `Modul ${data.category} untuk angkatan ${targetAngkatan} ditambahkan.`
      });
      toast('Modul praktikum/studio berhasil diupload.');
    }

    resetPracticumForm();
  } catch (err) {
    console.error('Save practicum/studio error:', err);
    toast('Gagal menyimpan modul praktikum/studio. Coba ulang kembali.');
  } finally {
    setLoading(false);
  }
});

on(practicumRosterForm, 'submit', async e => {
  e.preventDefault();
  if (!requirePermission('practicum_studio', 'Data Praktikan')) return;

  const academicYear = String(rosterAcademicYear?.value || '').trim();
  const className = normalizeClassName(rosterClassName?.value);
  const meta = selectedCourseFrom(rosterCategory);
  const targetAngkatan = selectedTargetCohort(rosterTargetCohort, meta);
  const parsed = parsePracticumRosterRows(rosterRows?.value, className);

  if (!meta.category || !canAccessPracticumCategory(meta.category)) {
    toast('Akun ini tidak memiliki scope untuk data praktikan tersebut.');
    return;
  }
  if (!targetAngkatan) {
    toast('Isi target angkatan data praktikan.');
    return;
  }
  if (!academicYear || !className || !parsed.rows.length) {
    toast('Isi tahun akademik, kelas, dan data praktikan dengan benar.');
    return;
  }
  if (!confirmAcademicYearIfNeeded(academicYear, meta, targetAngkatan)) return;
  if (parsed.errors.length) {
    toast(`${parsed.errors[0]} Pastikan format: NIM Nama Kelompok.`);
    return;
  }

  try {
    const submit = practicumRosterForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    parsed.rows.forEach(row => {
      const payload = {
        ...meta,
        nim: row.nim,
        name: row.name,
        group: row.group,
        targetAngkatan,
        className,
        classKey: slugifyAcademic(className),
        academicYear,
        isActive: true,
        importedAt: now,
        importedBy: currentAdmin().username
      };
      batch.set(doc(db, PRACTICUM_ROSTER_COLLECTION, rosterDocId(payload)), payload, { merge: true });
    });
    await batch.commit();
    await writeAuditLog({
      action: 'IMPORT_PRACTICUM_ROSTER',
      targetType: 'practicum_roster',
      targetId: `${meta.category} ${targetAngkatan} ${academicYear} ${className}`,
      targetTitle: `${meta.course} - Angkatan ${targetAngkatan} - Kelas ${className}`,
      detail: `${parsed.rows.length} praktikan diimport untuk ${meta.course}, angkatan ${targetAngkatan}, kelas ${className}, tahun akademik ${academicYear}.`
    });
    rosterRows.value = '';
    toast(`${parsed.rows.length} praktikan berhasil diimport.`);
  } catch (error) {
    console.error('Import practicum roster error:', error);
    toast('Gagal import data praktikan.');
  } finally {
    const submit = practicumRosterForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = false;
  }
});

on(attendanceSessionForm, 'submit', async e => {
  e.preventDefault();
  if (!requirePermission('practicum_studio', 'Sesi Absen')) return;

  const meta = selectedCourseFrom(attendanceCategory);
  const targetAngkatan = selectedTargetCohort(attendanceTargetCohort, meta);
  const academicYear = String(attendanceAcademicYear?.value || '').trim();
  const className = normalizeClassName(attendanceClassName?.value);
  const moduleNumber = String(attendanceModuleNumber?.value || '').trim();
  const moduleTitle = String(attendanceModuleTitle?.value || '').trim();
  const date = attendanceDate?.value || '';
  const openAt = attendanceOpenAt?.value || '';
  const closeAt = attendanceCloseAt?.value || '';

  if (!meta.category || !canAccessPracticumCategory(meta.category)) {
    toast('Akun ini tidak memiliki scope untuk sesi absen tersebut.');
    return;
  }
  if (!targetAngkatan) {
    toast('Isi target angkatan sesi absen.');
    return;
  }
  if (!academicYear || !className || !moduleNumber || !moduleTitle || !date || !openAt || !closeAt) {
    toast('Lengkapi praktikum, kelas, modul, tanggal, jam buka, dan jam tutup absen.');
    return;
  }
  if (!confirmAcademicYearIfNeeded(academicYear, meta, targetAngkatan)) return;

  const rosterCount = practicumRosters.filter(item => item.isActive !== false && item.category === meta.category && matchesTargetCohort(item, targetAngkatan) && item.academicYear === academicYear && item.className === className).length;
  if (!rosterCount && !confirm('Belum ada data praktikan untuk kelas ini. Tetap buat sesi absen?')) return;

  try {
    const submit = attendanceSessionForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    const payload = {
      ...meta,
      targetAngkatan,
      academicYear,
      className,
      classKey: slugifyAcademic(className),
      moduleNumber,
      moduleTitle,
      date,
      openAt,
      closeAt,
      code: String(attendanceCode?.value || '').trim(),
      status: attendanceStatus?.value || 'open',
      createdAt: new Date().toISOString(),
      createdBy: currentAdmin().username
    };
    const created = await addDoc(collection(db, PRACTICUM_ATTENDANCE_SESSION_COLLECTION), payload);
    await writeAuditLog({
      action: 'CREATE_ATTENDANCE_SESSION',
      targetType: 'practicum_attendance_session',
      targetId: created.id,
      targetTitle: `${payload.course} - ${payload.moduleNumber}`,
      detail: `Sesi absen ${payload.moduleNumber} ${payload.moduleTitle}, angkatan ${targetAngkatan}, kelas ${payload.className}, dibuat.`
    });
    attendanceModuleNumber.value = '';
    attendanceModuleTitle.value = '';
    attendanceCode.value = '';
    toast('Sesi absen berhasil dibuat.');
  } catch (error) {
    console.error('Create attendance session error:', error);
    toast('Gagal membuat sesi absen.');
  } finally {
    const submit = attendanceSessionForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = false;
  }
});

on(videoForm, 'submit', async e => {
  e.preventDefault();
  if (!requirePermission('videos', 'Video')) return;
  if (!validateVideoForm()) return;

  setLoading(true);

  try {
    const data = {
      title: videoTitle.value.trim(),
      thumbnail: videoThumb.value.trim() || 'VI',
      description: videoDescription.value.trim(),
      category: videoCategoryInput.value.trim(),
      channel: videoChannel.value.trim(),
      duration: videoChannel.value.trim(),
      youtube: videoYoutube.value.trim()
    };

    if (editingVideoDocId) {
      await updateDoc(doc(db, 'videos', editingVideoDocId), data);
      await writeAuditLog({
        action: 'UPDATE_VIDEO',
        targetType: 'video',
        targetId: editingVideoDocId,
        targetTitle: data.title,
        detail: `Video kategori ${data.category} diperbarui.`
      });
      toast('Video berhasil diperbarui.');
    } else {
      const created = await addDoc(collection(db, 'videos'), data);
      await writeAuditLog({
        action: 'CREATE_VIDEO',
        targetType: 'video',
        targetId: created.id,
        targetTitle: data.title,
        detail: `Video kategori ${data.category} ditambahkan.`
      });
      toast('Video berhasil diupload.');
    }

    resetVideoForm();
  } catch (err) {
    console.error('Save video error:', err);
    toast('Gagal menyimpan video. Coba ulang kembali.');
  } finally {
    setLoading(false);
  }
});

on(announcementForm, 'submit', async e => {
  e.preventDefault();
  if (!requirePermission('announcements', 'Pemberitahuan')) return;
  if (!validateAnnouncementForm()) return;

  const button = announcementForm.querySelector('button[type="submit"]');
  if (button) button.disabled = true;

  try {
    const uploaded = await uploadAnnouncementPhoto(announcementImage.files[0]);
    const data = {
      title: announcementTitle.value.trim(),
      type: announcementType.value,
      date: announcementDate.value,
      description: announcementDescription.value.trim(),
      photoUrl: uploaded.photoUrl || '',
      photoPath: uploaded.photoPath || '',
      updatedAt: new Date().toISOString()
    };

    if (editingAnnouncementDocId) {
      await updateDoc(doc(db, 'announcements', editingAnnouncementDocId), data);
      await writeAuditLog({
        action: 'UPDATE_ANNOUNCEMENT',
        targetType: 'announcement',
        targetId: editingAnnouncementDocId,
        targetTitle: data.title,
        detail: `Pemberitahuan tipe ${data.type} diperbarui.`
      });
      toast('Pemberitahuan berhasil diperbarui.');
    } else {
      const created = await addDoc(collection(db, 'announcements'), {
        ...data,
        createdAt: new Date().toISOString()
      });
      await writeAuditLog({
        action: 'CREATE_ANNOUNCEMENT',
        targetType: 'announcement',
        targetId: created.id,
        targetTitle: data.title,
        detail: `Pemberitahuan tipe ${data.type} ditambahkan.`
      });
      toast('Pemberitahuan berhasil diupload.');
    }

    resetAnnouncementForm();
  } catch (err) {
    console.error('Save announcement error:', err);
    toast(err.message || 'Gagal menyimpan pemberitahuan.');
  } finally {
    if (button) button.disabled = false;
  }
});

on(resourceTable, 'click', async e => {
  const docId = e.target.dataset.del || e.target.dataset.edit;
  if (!docId) return;
  if (!requirePermission('resources', 'Resources')) return;

  if (e.target.dataset.del) {
    if (confirm('Yakin hapus resource ini?')) {
      try {
        const item = resources.find(r => r.docId === docId);
        await deleteDoc(doc(db, 'resources', docId));
        await writeAuditLog({
          action: 'DELETE_RESOURCE',
          targetType: 'resource',
          targetId: docId,
          targetTitle: item?.title || docId,
          detail: `Resource kategori ${item?.category || '-'} dihapus.`
        });
        toast('Resource berhasil dihapus.');
      } catch (err) {
        console.error('Delete error:', err);
        toast('Gagal menghapus resource.');
      }
    }
  }

  if (e.target.dataset.edit) {
    const resource = resources.find(r => r.docId === docId);
    if (resource && resource.category !== 'Software') {
      resourceId.value = docId;
      resourceTitle.value = resource.title;
      resourceCategory.value = resource.category;
      resourceDescription.value = resource.description;
      resourceAuthor.value = resource.author;
      resourceDate.value = resource.date;
      resourceThumb.value = resource.thumbnail;
      resourceType.value = resource.type;
      resourceFile.value = resource.file;
      editingDocId = docId;
      if (submitButton) submitButton.textContent = 'Update Resource';
      resourceForm.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

on(softwareTable, 'click', async e => {
  const docId = e.target.dataset.del || e.target.dataset.edit;
  if (!docId) return;
  if (!requirePermission('software', 'Software')) return;

  if (e.target.dataset.del) {
    if (confirm('Yakin hapus software ini?')) {
      try {
        const item = resources.find(r => r.docId === docId);
        await deleteDoc(doc(db, 'resources', docId));
        await writeAuditLog({
          action: 'DELETE_SOFTWARE',
          targetType: 'software',
          targetId: docId,
          targetTitle: item?.title || docId,
          detail: `Software kategori ${item?.type || item?.element || '-'} dihapus.`
        });
        toast('Software berhasil dihapus.');
      } catch (err) {
        console.error('Delete software error:', err);
        toast('Gagal menghapus software.');
      }
    }
  }

  if (e.target.dataset.edit) {
    const item = resources.find(r => r.docId === docId);
    if (item) {
      softwareTitle.value = item.title;
      softwareCategory.value = item.type || item.element || 'Struktur';
      softwareDescription.value = item.description;
      softwareAuthor.value = item.author;
      softwareDate.value = item.date;
      softwareThumb.value = item.thumbnail;
      softwareFile.value = item.file;
      editingSoftwareDocId = docId;
      softwareForm.scrollIntoView({ behavior: 'smooth' });
    }
  }
});


on(practicumTable, 'click', async e => {
  const docId = e.target.dataset.del || e.target.dataset.edit;
  if (!docId) return;
  if (!requirePermission('practicum_studio', 'Praktikum & Studio')) return;

  if (e.target.dataset.del) {
    if (confirm('Yakin hapus modul praktikum/studio ini?')) {
      try {
        const item = practicumModules.find(module => module.docId === docId);
        if (item && !canAccessPracticumCategory(item.category)) {
          toast('Akun ini tidak memiliki akses ke modul praktikum/studio tersebut.');
          return;
        }
        await deleteDoc(doc(db, 'practicum_studio_modules', docId));
        await writeAuditLog({
          action: 'DELETE_PRACTICUM',
          targetType: 'practicum_studio',
          targetId: docId,
          targetTitle: item?.title || docId,
          detail: `Modul ${item?.category || '-'} dihapus.`
        });
        toast('Modul praktikum/studio berhasil dihapus.');
      } catch (err) {
        console.error('Delete practicum/studio error:', err);
        toast('Gagal menghapus modul praktikum/studio.');
      }
    }
  }

  if (e.target.dataset.edit) {
    const item = practicumModules.find(module => module.docId === docId);
    if (item) {
      if (!canAccessPracticumCategory(item.category)) {
        toast('Akun ini tidak memiliki akses ke modul praktikum/studio tersebut.');
        return;
      }
      practicumId.value = docId;
      practicumTitle.value = item.title || '';
      practicumCategory.value = item.category || 'Computer Aided Design (CAD)-S';
      practicumTargetCohort.value = targetCohortForPracticumResource(item) || targetCohortSuggestion(selectedCourseFrom(practicumCategory));
      practicumDescription.value = item.description || '';
      practicumAuthor.value = item.author || '';
      practicumDate.value = item.date || '';
      practicumThumb.value = item.thumbnail || '';
      practicumType.value = item.type || 'PDF';
      practicumFile.value = item.file || '';
      editingPracticumDocId = docId;
      const btn = practicumForm.querySelector('button[type="submit"]');
      if (btn) btn.textContent = 'Update Modul Praktikum/Studio';
      practicumForm.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

on(attendanceRecapTable, 'click', async e => {
  const rosterId = e.target.dataset.delRoster;
  const sessionId = e.target.dataset.delAttendanceSession || e.target.dataset.toggleAttendance;
  if (!rosterId && !sessionId) return;
  if (!requirePermission('practicum_studio', 'Absensi Praktikum')) return;

  if (rosterId) {
    if (!confirm('Yakin hapus praktikan ini dari roster?')) return;
    try {
      const item = practicumRosters.find(roster => roster.docId === rosterId);
      if (item && !canAccessPracticumCategory(item.category)) {
        toast('Akun ini tidak memiliki akses ke data praktikan tersebut.');
        return;
      }
      await deleteDoc(doc(db, PRACTICUM_ROSTER_COLLECTION, rosterId));
      await writeAuditLog({
        action: 'DELETE_PRACTICUM_ROSTER',
        targetType: 'practicum_roster',
        targetId: rosterId,
        targetTitle: item?.name || rosterId,
        detail: `Praktikan ${item?.nim || rosterId} dihapus dari ${item?.course || item?.category || 'roster'}, kelas ${item?.className || '-'}.`
      });
      toast('Praktikan berhasil dihapus dari roster.');
    } catch (error) {
      console.error('Delete practicum roster error:', error);
      toast('Gagal menghapus praktikan.');
    }
    return;
  }

  if (e.target.dataset.toggleAttendance) {
    try {
      await toggleAttendanceSession(sessionId);
    } catch (error) {
      console.error('Toggle attendance session error:', error);
      toast('Gagal mengubah status sesi absen.');
    }
    return;
  }

  if (e.target.dataset.delAttendanceSession) {
    if (!confirm('Yakin hapus sesi absen ini? Record hadir untuk sesi ini juga akan dihapus.')) return;
    try {
      await deleteAttendanceSession(sessionId);
    } catch (error) {
      console.error('Delete attendance session error:', error);
      toast('Gagal menghapus sesi absen.');
    }
  }
});

on(attendanceSessionTable, 'click', async e => {
  const button = e.target.closest('[data-toggle-attendance-session], [data-reset-attendance-session], [data-delete-attendance-session]');
  if (!button) return;
  if (!requirePermission('practicum_studio', 'Sesi Absen')) return;

  const sessionId = button.dataset.toggleAttendanceSession || button.dataset.resetAttendanceSession || button.dataset.deleteAttendanceSession;
  if (!sessionId) return;

  try {
    button.disabled = true;
    if (button.dataset.toggleAttendanceSession) {
      await toggleAttendanceSession(sessionId);
      return;
    }
    if (button.dataset.resetAttendanceSession) {
      if (!confirm('Yakin reset record absen sesi ini? Sesi tetap ada, tetapi data hadir mahasiswa untuk sesi ini akan dihapus.')) return;
      await resetAttendanceSession(sessionId);
      return;
    }
    if (button.dataset.deleteAttendanceSession) {
      if (!confirm('Yakin hapus sesi absen ini? Record hadir untuk sesi ini juga akan dihapus.')) return;
      await deleteAttendanceSession(sessionId);
    }
  } catch (error) {
    console.error('Attendance session table action error:', error);
    toast('Gagal memproses sesi absen.');
  } finally {
    button.disabled = false;
  }
});

on(videoTable, 'click', async e => {
  const docId = e.target.dataset.del || e.target.dataset.edit;
  if (!docId) return;
  if (!requirePermission('videos', 'Video')) return;

  if (e.target.dataset.del) {
    if (confirm('Yakin hapus video ini?')) {
      try {
        const item = videos.find(video => video.docId === docId);
        await deleteDoc(doc(db, 'videos', docId));
        await writeAuditLog({
          action: 'DELETE_VIDEO',
          targetType: 'video',
          targetId: docId,
          targetTitle: item?.title || docId,
          detail: `Video kategori ${item?.category || '-'} dihapus.`
        });
        toast('Video berhasil dihapus.');
      } catch (err) {
        console.error('Delete video error:', err);
        toast('Gagal menghapus video.');
      }
    }
  }

  if (e.target.dataset.edit) {
    const video = videos.find(v => v.docId === docId);
    if (video) {
      videoTitle.value = video.title;
      videoThumb.value = video.thumbnail;
      videoDescription.value = video.description;
      videoCategoryInput.value = video.category;
      videoChannel.value = video.channel || video.duration || '';
      videoYoutube.value = video.youtube;
      editingVideoDocId = docId;
      videoForm.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

on(announcementTable, 'click', async e => {
  const docId = e.target.dataset.del || e.target.dataset.edit;
  if (!docId) return;
  if (!requirePermission('announcements', 'Pemberitahuan')) return;

  if (e.target.dataset.del) {
    if (confirm('Yakin hapus pemberitahuan ini?')) {
      try {
        const item = announcements.find(announcement => announcement.docId === docId);
        await deleteDoc(doc(db, 'announcements', docId));
        await writeAuditLog({
          action: 'DELETE_ANNOUNCEMENT',
          targetType: 'announcement',
          targetId: docId,
          targetTitle: item?.title || docId,
          detail: `Pemberitahuan tipe ${item?.type || '-'} dihapus.`
        });
        toast('Pemberitahuan berhasil dihapus.');
      } catch (err) {
        console.error('Delete announcement error:', err);
        toast('Gagal menghapus pemberitahuan.');
      }
    }
  }

  if (e.target.dataset.edit) {
    const item = announcements.find(announcement => announcement.docId === docId);
    if (item) {
      announcementId.value = docId;
      announcementTitle.value = item.title || '';
      announcementType.value = item.type || 'Info HMS';
      announcementDate.value = item.date || '';
      announcementDescription.value = item.description || '';
      announcementPhotoUrl.value = item.photoUrl || '';
      announcementPhotoPath.value = item.photoPath || '';
      editingAnnouncementDocId = docId;
      const btn = announcementForm.querySelector('button[type="submit"]');
      if (btn) btn.textContent = 'Update Pemberitahuan';
      announcementForm.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

on(messageTable, 'click', async e => {
  const replyId = e.target.dataset.replyMessage;
  const deleteId = e.target.dataset.delMessage;
  if (!replyId && !deleteId) return;
  if (!requirePermission('messages', 'Pesan Mahasiswa')) return;

  if (replyId) {
    const item = contactMessages.find(message => message.docId === replyId);
    const reply = prompt(`Balasan untuk ${item?.name || 'mahasiswa'}:`, item?.reply || '');
    if (reply === null) return;
    try {
      await updateDoc(doc(db, 'contact_messages', replyId), {
        reply: reply.trim(),
        status: reply.trim() ? 'answered' : 'new',
        updatedAt: new Date().toISOString()
      });
      await writeAuditLog({
        action: 'REPLY_MESSAGE',
        targetType: 'contact_message',
        targetId: replyId,
        targetTitle: item?.subject || item?.name || replyId,
        detail: `Pesan dari ${item?.name || 'mahasiswa'} ${reply.trim() ? 'dibalas' : 'dikosongkan balasannya'}.`
      });
      toast('Balasan pesan berhasil disimpan.');
    } catch (err) {
      console.error('Reply message error:', err);
      toast('Gagal menyimpan balasan.');
    }
  }

  if (deleteId && confirm('Yakin hapus pesan mahasiswa ini?')) {
    try {
      const item = contactMessages.find(message => message.docId === deleteId);
      await deleteDoc(doc(db, 'contact_messages', deleteId));
      await writeAuditLog({
        action: 'DELETE_MESSAGE',
        targetType: 'contact_message',
        targetId: deleteId,
        targetTitle: item?.subject || item?.name || deleteId,
        detail: `Pesan dari ${item?.name || 'mahasiswa'} dihapus.`
      });
      toast('Pesan berhasil dihapus.');
    } catch (err) {
      console.error('Delete message error:', err);
      toast('Gagal menghapus pesan.');
    }
  }
});

on(liveChatThreads, 'click', async e => {
  const replyThread = e.target.dataset.replyChat;
  const closeThread = e.target.dataset.closeChat;
  if (!replyThread && !closeThread) return;
  if (!requirePermission('messages', 'Live Chat')) return;

  if (replyThread) {
    const reply = prompt('Balasan live chat dari HMS UNJANI / PENDPROF HMS:');
    if (!reply?.trim()) return;
    const latest = liveChatMessages.findLast ? liveChatMessages.findLast(item => item.threadId === replyThread) : [...liveChatMessages].reverse().find(item => item.threadId === replyThread);
    try {
      await addDoc(collection(db, 'live_chat_messages'), {
        threadId: replyThread,
        sender: 'admin',
        senderName: 'HMS UNJANI / PENDPROF HMS',
        nim: latest?.nim || '',
        message: reply.trim(),
        createdAt: new Date().toISOString()
      });
      await writeAuditLog({
        action: 'REPLY_LIVE_CHAT',
        targetType: 'live_chat',
        targetId: replyThread,
        targetTitle: latest?.senderName || latest?.nim || replyThread,
        detail: `Live chat untuk ${latest?.senderName || latest?.nim || 'mahasiswa'} dibalas.`
      });
      toast('Balasan live chat terkirim.');
    } catch (err) {
      console.error('Reply chat error:', err);
      toast('Gagal mengirim balasan chat.');
    }
  }

  if (closeThread && confirm('Yakin hapus semua chat pada thread ini?')) {
    const items = liveChatMessages.filter(item => item.threadId === closeThread);
    try {
      await Promise.all(items.map(item => deleteDoc(doc(db, 'live_chat_messages', item.docId))));
      await writeAuditLog({
        action: 'DELETE_LIVE_CHAT_THREAD',
        targetType: 'live_chat',
        targetId: closeThread,
        targetTitle: items[0]?.senderName || items[0]?.nim || closeThread,
        detail: `${items.length} pesan live chat dihapus dari thread ini.`
      });
      toast('Thread live chat berhasil dihapus.');
    } catch (err) {
      console.error('Delete chat thread error:', err);
      toast('Gagal menghapus thread live chat.');
    }
  }
});

on(accessLogTable, 'click', async e => {
  if (!canDeleteDashboardLogs()) return;
  const button = e.target.closest('[data-del-access-log]');
  const docId = button?.dataset.delAccessLog;
  if (!docId) return;

  const item = accessLogs.find(log => log.docId === docId);
  const label = item?.resourceTitle || item?.resourceId || docId;
  if (!confirm(`Yakin hapus history akses "${label}" dari server?`)) return;

  try {
    button.disabled = true;
    await deleteDoc(doc(db, RESOURCE_ACCESS_LOG_COLLECTION, docId));
    toast('History akses berhasil dihapus dari server.');
  } catch (error) {
    console.error('Delete access log error:', error);
    toast('Gagal menghapus history akses.');
  } finally {
    button.disabled = false;
  }
});

on(accessLogDeleteAll, 'click', async () => {
  if (!canDeleteDashboardLogs()) {
    toast('Akses hapus log hanya tersedia untuk Developer.');
    return;
  }
  if (!accessLogs.length) {
    toast('Belum ada history akses untuk dihapus.');
    return;
  }
  if (!confirm(`Yakin hapus semua ${accessLogs.length} history akses dari server?`)) return;

  try {
    accessLogDeleteAll.disabled = true;
    await deleteFirestoreDocs(RESOURCE_ACCESS_LOG_COLLECTION, accessLogs.map(item => item.docId));
    await writeAuditLog({
      action: 'DELETE_ACCESS_LOGS',
      targetType: 'resource_access_logs',
      targetTitle: 'Semua history akses',
      detail: `${accessLogs.length} history akses dihapus dari server.`
    });
    toast('Semua history akses berhasil dihapus dari server.');
  } catch (error) {
    console.error('Delete all access logs error:', error);
    toast('Gagal menghapus semua history akses.');
  } finally {
    accessLogDeleteAll.disabled = false;
  }
});

on(auditTable, 'click', async e => {
  if (!canDeleteDashboardLogs()) return;
  const button = e.target.closest('[data-del-audit-log]');
  const docId = button?.dataset.delAuditLog;
  if (!docId) return;

  const item = auditLogs.find(log => log.docId === docId);
  const label = item?.actionLabel || item?.action || docId;
  if (!confirm(`Yakin hapus audit log "${label}" dari server?`)) return;

  try {
    button.disabled = true;
    await deleteDoc(doc(db, ADMIN_AUDIT_COLLECTION, docId));
    toast('Audit log berhasil dihapus dari server.');
  } catch (error) {
    console.error('Delete audit log error:', error);
    toast('Gagal menghapus audit log.');
  } finally {
    button.disabled = false;
  }
});

on(auditDeleteAll, 'click', async () => {
  if (!canDeleteDashboardLogs()) {
    toast('Akses hapus log hanya tersedia untuk Developer.');
    return;
  }
  if (!auditLogs.length) {
    toast('Belum ada audit log untuk dihapus.');
    return;
  }
  if (!confirm(`Yakin hapus semua ${auditLogs.length} audit log dari server?`)) return;

  try {
    auditDeleteAll.disabled = true;
    await deleteFirestoreDocs(ADMIN_AUDIT_COLLECTION, auditLogs.map(item => item.docId));
    toast('Semua audit log berhasil dihapus dari server.');
  } catch (error) {
    console.error('Delete all audit logs error:', error);
    toast('Gagal menghapus semua audit log.');
  } finally {
    auditDeleteAll.disabled = false;
  }
});

on(adminRolePages, 'change', syncRolePermissionsFromPages);

on(adminRoleTable, 'click', async e => {
  if (!canManageAdminAccounts()) {
    toast('Menu role admin hanya tersedia untuk Developer.');
    return;
  }

  const editButton = e.target.closest('[data-edit-admin-role]');
  const deleteButton = e.target.closest('[data-del-admin-role]');
  const roleKey = editButton?.dataset.editAdminRole || deleteButton?.dataset.delAdminRole;
  if (!roleKey) return;

  const role = (adminRoles.length ? adminRoles : fallbackAdminRoles()).map(normalizeAdminRole).find(item => item.role === roleKey);
  if (!role) return;

  if (editButton) {
    adminRoleOriginal.value = role.role;
    adminRoleKey.value = role.role;
    adminRoleLabel.value = role.roleLabel;
    adminRoleActive.checked = role.isActive;
    setCheckedValues(adminRolePages, role.allowedPages);
    setCheckedValues(adminRolePermissions, role.permissions);
    adminRoleSubmit.textContent = 'Update Role';
    adminRoleKey.focus();
    return;
  }

  if (deleteButton) {
    if (role.role === 'developer') {
      toast('Role Developer tidak bisa dihapus.');
      return;
    }
    if (adminAccounts.some(account => account.role === role.role)) {
      toast('Role masih dipakai akun admin. Pindahkan akun ke role lain dulu.');
      return;
    }
    if (!confirm(`Yakin hapus role "${role.roleLabel}"?`)) return;
    try {
      deleteButton.disabled = true;
      const supabase = await loadSupabaseClient();
      const { data, error } = await supabase.rpc('sipilcare_delete_admin_role', {
        p_session_token_hash: await adminSessionTokenHash(),
        p_role: role.role
      });
      if (error) throw error;
      if (data !== true) throw new Error('Role admin tidak terhapus di database.');
      await writeAuditLog({
        action: 'DELETE_ADMIN_ROLE',
        targetType: 'admin_role',
        targetId: role.role,
        targetTitle: role.roleLabel,
        detail: `Role admin ${role.roleLabel} dihapus.`
      });
      toast('Role admin berhasil dihapus.');
      resetAdminRoleForm();
      await loadAdminRoles();
      await loadAdminAccounts();
    } catch (error) {
      console.error('Delete admin role error:', error);
      toast(error.message || 'Gagal menghapus role admin. Pastikan SQL admin_roles sudah dijalankan.');
    } finally {
      deleteButton.disabled = false;
    }
  }
});

on(adminRoleForm, 'submit', async e => {
  e.preventDefault();
  if (!canManageAdminAccounts()) {
    toast('Menu role admin hanya tersedia untuk Developer.');
    return;
  }

  const originalRole = normalizeRoleKey(adminRoleOriginal.value);
  const role = normalizeRoleKey(adminRoleKey.value);
  const roleLabelValue = adminRoleLabel.value.trim();
  const allowedPages = checkedValues(adminRolePages);
  const permissions = checkedValues(adminRolePermissions);

  if (!role || !roleLabelValue) {
    toast('Lengkapi kode role dan nama role.');
    return;
  }
  if (!allowedPages.length) {
    toast('Pilih minimal satu halaman untuk role ini.');
    return;
  }
  if (!permissions.length) {
    toast('Pilih minimal satu permission untuk role ini.');
    return;
  }
  if (originalRole === 'developer' && role !== 'developer') {
    toast('Kode role Developer tidak bisa diganti.');
    return;
  }

  try {
    adminRoleSubmit.disabled = true;
    const supabase = await loadSupabaseClient();
    const { data, error } = await supabase.rpc('sipilcare_save_admin_role', {
      p_session_token_hash: await adminSessionTokenHash(),
      p_original_role: originalRole || null,
      p_role: role,
      p_role_label: roleLabelValue,
      p_allowed_pages: allowedPages,
      p_permissions: permissions,
      p_is_active: adminRoleActive.checked
    });
    if (error) throw error;
    const savedRole = Array.isArray(data) ? data[0] : data;
    if (!savedRole?.role) throw new Error('Role admin tidak tersimpan di database.');
    await writeAuditLog({
      action: originalRole ? 'UPDATE_ADMIN_ROLE' : 'CREATE_ADMIN_ROLE',
      targetType: 'admin_role',
      targetId: role,
      targetTitle: roleLabelValue,
      detail: `Role admin ${roleLabelValue} disimpan dengan ${allowedPages.length} halaman dan ${permissions.length} permission.`
    });
    toast(originalRole ? 'Role admin berhasil diperbarui.' : 'Role admin berhasil ditambahkan.');
    resetAdminRoleForm();
    await loadAdminRoles();
    await loadAdminAccounts();
  } catch (error) {
    console.error('Save admin role error:', error);
    toast(error.message || 'Gagal menyimpan role admin. Pastikan SQL admin_roles sudah dijalankan.');
  } finally {
    adminRoleSubmit.disabled = false;
  }
});

on(adminRoleCancel, 'click', () => resetAdminRoleForm());
on(adminRoleRefresh, 'click', () => loadAdminRoles({ manual: true }));

on(adminAccountTable, 'click', async e => {
  if (!canManageAdminAccounts()) {
    toast('Menu akun admin hanya tersedia untuk Developer.');
    return;
  }

  const editButton = e.target.closest('[data-edit-admin-account]');
  const deleteButton = e.target.closest('[data-del-admin-account]');
  const usernameValue = editButton?.dataset.editAdminAccount || deleteButton?.dataset.delAdminAccount;
  if (!usernameValue) return;

  const account = adminAccounts.find(item => item.username === usernameValue);
  if (!account) return;

  if (editButton) {
    const normalized = normalizeAdminAccount(account);
    adminAccountOriginalUsername.value = normalized.username;
    adminAccountUsername.value = normalized.username;
    adminAccountName.value = normalized.name || '';
    renderAdminRoleOptions(normalized.role || 'admin_sipil');
    adminAccountActive.checked = normalized.isActive;
    setCheckedValues(adminAccountPracticumScopes, normalized.practicumScopes);
    adminAccountPassword.value = '';
    adminAccountPassword.required = false;
    adminAccountSubmit.textContent = 'Update Akun';
    adminAccountUsername.focus();
    return;
  }

  if (deleteButton) {
    if (usernameValue === currentAdmin().username) {
      toast('Akun yang sedang dipakai tidak bisa dihapus.');
      return;
    }
    if (!confirm(`Yakin hapus akun admin "${usernameValue}" dan semua sesi loginnya?`)) return;
    try {
      deleteButton.disabled = true;
      const supabase = await loadSupabaseClient();
      const { data, error } = await supabase.rpc('sipilcare_delete_admin_account', {
        p_session_token_hash: await adminSessionTokenHash(),
        p_username: usernameValue
      });
      if (error) throw error;
      if (data !== true) throw new Error('Akun admin tidak terhapus di database.');
      await deleteDoc(doc(db, ADMIN_PRACTICUM_SCOPE_COLLECTION, usernameValue)).catch(scopeError => {
        console.warn('Delete admin practicum scope failed:', scopeError);
      });
      await writeAuditLog({
        action: 'DELETE_ADMIN_ACCOUNT',
        targetType: 'admin_account',
        targetId: usernameValue,
        targetTitle: account.name || usernameValue,
        detail: `Akun admin ${usernameValue} dihapus oleh developer.`
      });
      toast('Akun admin berhasil dihapus.');
      await loadAdminAccounts();
    } catch (error) {
      console.error('Delete admin account error:', error);
      toast('Gagal menghapus akun admin.');
    } finally {
      deleteButton.disabled = false;
    }
  }
});

on(adminAccountForm, 'submit', async e => {
  e.preventDefault();
  if (!canManageAdminAccounts()) {
    toast('Menu akun admin hanya tersedia untuk Developer.');
    return;
  }

  const originalUsername = adminAccountOriginalUsername.value.trim().toLowerCase();
  const usernameValue = adminAccountUsername.value.trim().toLowerCase();
  const passwordValue = adminAccountPassword.value;
  const roleTemplate = getAdminRoleTemplate(adminAccountRole.value);
  const practicumScopes = checkedValues(adminAccountPracticumScopes);

  if (!usernameValue || !adminAccountName.value.trim()) {
    toast('Lengkapi username dan nama admin.');
    return;
  }
  if (!originalUsername && !passwordValue) {
    toast('Password wajib diisi untuk akun baru.');
    return;
  }
  if (originalUsername === currentAdmin().username && usernameValue !== originalUsername) {
    toast('Username akun yang sedang dipakai tidak bisa diganti dari sesi aktif.');
    return;
  }

  try {
    adminAccountSubmit.disabled = true;
    const supabase = await loadSupabaseClient();
    const { data, error } = await supabase.rpc('sipilcare_save_admin_account', {
      p_session_token_hash: await adminSessionTokenHash(),
      p_original_username: originalUsername || null,
      p_username: usernameValue,
      p_name: adminAccountName.value.trim(),
      p_password_hash: passwordValue ? await sha256(passwordValue) : null,
      p_role: roleTemplate.role,
      p_role_label: roleTemplate.roleLabel,
      p_allowed_pages: roleTemplate.allowedPages,
      p_permissions: roleTemplate.permissions,
      p_is_active: adminAccountActive.checked
    });
    if (error) throw error;
    const savedAccount = Array.isArray(data) ? data[0] : data;
    if (!savedAccount?.username) throw new Error('Akun admin tidak tersimpan di database.');
    if (originalUsername && originalUsername !== usernameValue) {
      await deleteDoc(doc(db, ADMIN_PRACTICUM_SCOPE_COLLECTION, originalUsername)).catch(scopeError => {
        console.warn('Delete old admin practicum scope failed:', scopeError);
      });
    }
    await setDoc(doc(db, ADMIN_PRACTICUM_SCOPE_COLLECTION, usernameValue), {
      username: usernameValue,
      scopes: practicumScopes,
      updatedAt: new Date().toISOString(),
      updatedBy: currentAdmin().username
    }, { merge: true });

    await writeAuditLog({
      action: originalUsername ? 'UPDATE_ADMIN_ACCOUNT' : 'CREATE_ADMIN_ACCOUNT',
      targetType: 'admin_account',
      targetId: usernameValue,
      targetTitle: savedAccount.name || adminAccountName.value.trim(),
      detail: `Akun admin ${usernameValue} disimpan dengan role ${roleTemplate.roleLabel} dan scope ${scopeLabel(practicumScopes)}.`
    });
    toast(originalUsername ? 'Akun admin berhasil diperbarui.' : 'Akun admin berhasil ditambahkan.');
    resetAdminAccountForm();
    await loadAdminAccounts();
  } catch (error) {
    console.error('Save admin account error:', error);
    toast(error.message || 'Gagal menyimpan akun admin.');
  } finally {
    adminAccountSubmit.disabled = false;
  }
});

on(adminAccountCancel, 'click', () => resetAdminAccountForm());
on(adminAccountRefresh, 'click', () => loadAdminAccounts({ manual: true }));
on(adminAccountSearch, 'input', () => adminAccountTableRender());

on(studentCohortForm, 'submit', async e => {
  e.preventDefault();
  if (!canManageStudentAccounts()) {
    toast('Menu akun mahasiswa hanya tersedia untuk Developer.');
    return;
  }

  const angkatan = normalizeCohort(studentCohortInput.value);
  if (!angkatan) {
    toast('Isi angkatan terlebih dahulu.');
    return;
  }

  try {
    const supabase = await loadSupabaseClient();
    const { error } = await supabase.rpc('sipilcare_save_student_cohort', {
      p_session_token_hash: await adminSessionTokenHash(),
      p_angkatan: angkatan,
      p_label: studentCohortLabel.value.trim() || angkatan
    });
    if (error) throw error;
    await writeAuditLog({
      action: 'CREATE_STUDENT_COHORT',
      targetType: 'student_cohort',
      targetId: angkatan,
      targetTitle: studentCohortLabel.value.trim() || angkatan,
      detail: `Angkatan ${angkatan} disimpan.`
    });
    studentCohortForm.reset();
    toast('Angkatan berhasil disimpan.');
    await loadStudentAccountData();
  } catch (error) {
    console.error('Save student cohort error:', error);
    toast(error.message || 'Gagal menyimpan angkatan.');
  }
});

on(studentCohortDelete, 'click', async () => {
  if (!canManageStudentAccounts()) {
    toast('Menu akun mahasiswa hanya tersedia untuk Developer.');
    return;
  }

  const angkatan = studentCohortDeleteSelect?.value;
  if (!angkatan) {
    toast('Pilih angkatan yang akan dihapus.');
    return;
  }
  const cohort = studentCohorts.find(item => item.angkatan === angkatan);
  const count = Number(cohort?.student_count || 0);
  if (!confirm(`Yakin hapus angkatan ${angkatan} beserta ${count} akun mahasiswa di dalamnya?`)) return;

  try {
    studentCohortDelete.disabled = true;
    const supabase = await loadSupabaseClient();
    const { data, error } = await supabase.rpc('sipilcare_delete_student_cohort', {
      p_session_token_hash: await adminSessionTokenHash(),
      p_angkatan: angkatan
    });
    if (error) throw error;
    await writeAuditLog({
      action: 'DELETE_STUDENT_COHORT',
      targetType: 'student_cohort',
      targetId: angkatan,
      targetTitle: angkatan,
      detail: `Angkatan ${angkatan} dan ${data || count} akun mahasiswa dihapus.`
    });
    toast('Angkatan berhasil dihapus.');
    await loadStudentAccountData();
  } catch (error) {
    console.error('Delete student cohort error:', error);
    toast(error.message || 'Gagal menghapus angkatan.');
  } finally {
    studentCohortDelete.disabled = false;
  }
});

on(studentBulkPreviewBtn, 'click', () => {
  const parsed = parseStudentRows(studentBulkRows?.value);
  studentBulkPreviewRows = parsed.rows;
  studentBulkPreviewRender();
  if (parsed.errors.length) toast(`${parsed.errors.length} baris dilewati karena format tidak valid.`);
});

on(studentBulkForm, 'submit', async e => {
  e.preventDefault();
  if (!canManageStudentAccounts()) {
    toast('Menu akun mahasiswa hanya tersedia untuk Developer.');
    return;
  }

  const angkatan = normalizeCohort(studentBulkCohort?.value);
  if (!angkatan) {
    toast('Pilih angkatan terlebih dahulu.');
    return;
  }
  const parsed = parseStudentRows(studentBulkRows?.value);
  studentBulkPreviewRows = parsed.rows;
  studentBulkPreviewRender();
  if (!studentBulkPreviewRows.length) {
    toast('Belum ada data mahasiswa yang valid.');
    return;
  }

  try {
    studentBulkSubmit.disabled = true;
    const payload = await buildStudentPayload(studentBulkPreviewRows, angkatan);
    const supabase = await loadSupabaseClient();
    const { data, error } = await supabase.rpc('sipilcare_import_student_accounts', {
      p_session_token_hash: await adminSessionTokenHash(),
      p_angkatan: angkatan,
      p_students: payload
    });
    if (error) throw error;
    await writeAuditLog({
      action: 'IMPORT_STUDENT_ACCOUNTS',
      targetType: 'student_account',
      targetId: angkatan,
      targetTitle: `Angkatan ${angkatan}`,
      detail: `${data || payload.length} akun mahasiswa diimport untuk angkatan ${angkatan}.`
    });
    toast(`${data || payload.length} akun mahasiswa berhasil disimpan.`);
    studentBulkForm.reset();
    studentBulkPreviewRows = [];
    studentBulkPreviewRender();
    await loadStudentAccountData();
    await loadStudentActivity({ manual: false });
  } catch (error) {
    console.error('Import student accounts error:', error);
    toast(error.message || 'Gagal import akun mahasiswa.');
  } finally {
    studentBulkSubmit.disabled = false;
  }
});

on(studentAccountTable, 'click', async e => {
  if (!canManageStudentAccounts()) {
    toast('Menu akun mahasiswa hanya tersedia untuk Developer.');
    return;
  }

  const editButton = e.target.closest('[data-edit-student-account]');
  const resetButton = e.target.closest('[data-reset-student-account]');
  const deleteButton = e.target.closest('[data-del-student-account]');
  const nim = editButton?.dataset.editStudentAccount || resetButton?.dataset.resetStudentAccount || deleteButton?.dataset.delStudentAccount;
  if (!nim) return;

  const student = studentAccounts.find(item => item.nim === nim);
  if (!student) return;

  if (editButton) {
    studentEditOriginalNim.value = student.nim;
    studentEditNim.value = student.nim;
    studentEditName.value = student.name || '';
    studentEditCohort.value = student.angkatan || '';
    studentEditActive.checked = student.is_active !== false;
    studentEditResetDefault.checked = false;
    studentEditSubmit.textContent = 'Update Mahasiswa';
    studentEditNim.focus();
    return;
  }

  if (resetButton) {
    if (!confirm(`Reset password mahasiswa ${nim} ke ${defaultStudentPassword(nim)}?`)) return;
    try {
      resetButton.disabled = true;
      const angkatan = student.angkatan || studentEditCohort?.value || '';
      const supabase = await loadSupabaseClient();
      const { error } = await supabase.rpc('sipilcare_save_student_account', {
        p_session_token_hash: await adminSessionTokenHash(),
        p_original_nim: nim,
        p_nim: nim,
        p_name: student.name || 'Mahasiswa SIPIL CARE',
        p_angkatan: angkatan,
        p_is_active: student.is_active !== false,
        p_password_hash: await sha256(defaultStudentPassword(nim)),
        p_recovery_code_hash: await sha256(defaultStudentRecovery(angkatan, nim))
      });
      if (error) throw error;
      await writeAuditLog({
        action: 'RESET_STUDENT_ACCOUNT',
        targetType: 'student_account',
        targetId: nim,
        targetTitle: student.name || nim,
        detail: `Password mahasiswa ${nim} direset ke default.`
      });
      toast('Password mahasiswa berhasil direset.');
      await loadStudentAccountData();
    } catch (error) {
      console.error('Reset student password error:', error);
      toast(error.message || 'Gagal reset password mahasiswa.');
    } finally {
      resetButton.disabled = false;
    }
    return;
  }

  if (deleteButton) {
    if (!confirm(`Yakin hapus akun mahasiswa ${nim}?`)) return;
    try {
      deleteButton.disabled = true;
      const supabase = await loadSupabaseClient();
      const { error } = await supabase.rpc('sipilcare_delete_student_account', {
        p_session_token_hash: await adminSessionTokenHash(),
        p_nim: nim
      });
      if (error) throw error;
      await writeAuditLog({
        action: 'DELETE_STUDENT_ACCOUNT',
        targetType: 'student_account',
        targetId: nim,
        targetTitle: student.name || nim,
        detail: `Akun mahasiswa ${nim} dihapus.`
      });
      toast('Akun mahasiswa berhasil dihapus.');
      await loadStudentAccountData();
      await loadStudentActivity({ manual: false });
    } catch (error) {
      console.error('Delete student account error:', error);
      toast(error.message || 'Gagal menghapus akun mahasiswa.');
    } finally {
      deleteButton.disabled = false;
    }
  }
});

on(studentEditForm, 'submit', async e => {
  e.preventDefault();
  if (!canManageStudentAccounts()) {
    toast('Menu akun mahasiswa hanya tersedia untuk Developer.');
    return;
  }

  const originalNim = studentEditOriginalNim.value.trim();
  const nim = studentEditNim.value.trim();
  const name = studentEditName.value.trim();
  const angkatan = normalizeCohort(studentEditCohort.value);
  if (!isValidStudentNim(nim) || !name || !angkatan) {
    toast('Lengkapi NIM, nama, dan angkatan mahasiswa.');
    return;
  }

  try {
    studentEditSubmit.disabled = true;
    const resetDefault = studentEditResetDefault.checked || !originalNim;
    const supabase = await loadSupabaseClient();
    const { error } = await supabase.rpc('sipilcare_save_student_account', {
      p_session_token_hash: await adminSessionTokenHash(),
      p_original_nim: originalNim || null,
      p_nim: nim,
      p_name: name,
      p_angkatan: angkatan,
      p_is_active: studentEditActive.checked,
      p_password_hash: resetDefault ? await sha256(defaultStudentPassword(nim)) : null,
      p_recovery_code_hash: await sha256(defaultStudentRecovery(angkatan, nim))
    });
    if (error) throw error;
    await writeAuditLog({
      action: 'UPDATE_STUDENT_ACCOUNT',
      targetType: 'student_account',
      targetId: nim,
      targetTitle: name,
      detail: `Akun mahasiswa ${nim} diperbarui.`
    });
    toast(originalNim ? 'Akun mahasiswa berhasil diperbarui.' : 'Akun mahasiswa berhasil ditambahkan.');
    resetStudentEditForm();
    await loadStudentAccountData();
    await loadStudentActivity({ manual: false });
  } catch (error) {
    console.error('Save student account error:', error);
    toast(error.message || 'Gagal menyimpan akun mahasiswa.');
  } finally {
    studentEditSubmit.disabled = false;
  }
});

on(academicSettingsForm, 'submit', async e => {
  e.preventDefault();
  if (!requirePermission('dashboard', 'Pengaturan kalender akademik')) return;

  const overrideEnabled = academicOverrideEnabled?.checked === true;
  const year = Number(academicYearStart?.value);
  const term = academicTerm?.value;

  if (overrideEnabled && (!Number.isInteger(year) || year < 2020 || year > 2100 || !['odd', 'even'].includes(term))) {
    toast('Isi tahun akademik dan semester override dengan benar.');
    return;
  }

  const admin = currentAdmin();
  const payload = {
    overrideEnabled,
    overrideAcademicYearStart: overrideEnabled ? year : null,
    overrideTerm: overrideEnabled ? term : null,
    overrideNote: String(academicOverrideNote?.value || '').trim(),
    autoOddPeriod: 'September-Januari',
    autoEvenPeriod: 'Februari-Juli',
    updatedAt: new Date().toISOString(),
    updatedBy: admin.username
  };

  try {
    const submit = academicSettingsForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    await setDoc(doc(db, ACADEMIC_SETTINGS_COLLECTION, ACADEMIC_SETTINGS_DOC), payload, { merge: true });
    await writeAuditLog({
      action: 'UPDATE_ACADEMIC_SETTINGS',
      targetType: 'academic_settings',
      targetId: ACADEMIC_SETTINGS_PATH,
      targetTitle: 'Kalender akademik Praktikum & Studio',
      detail: overrideEnabled
        ? `Override kalender akademik disimpan: ${academicPeriodLabel(resolveAcademicPeriod(payload))}.`
        : 'Override kalender akademik dimatikan. Sistem kembali ke mode otomatis.'
    });
    toast('Pengaturan kalender akademik berhasil disimpan.');
  } catch (error) {
    console.error('Save academic settings error:', error);
    toast('Gagal menyimpan pengaturan kalender akademik.');
  } finally {
    const submit = academicSettingsForm.querySelector('button[type="submit"]');
    if (submit) submit.disabled = false;
  }
});

on(studentEditCancel, 'click', () => resetStudentEditForm());
on(studentAccountSearch, 'input', () => studentAccountTableRender());
on(studentAccountCohortFilter, 'change', () => studentAccountTableRender());
on(studentAccountStatusFilter, 'change', () => studentAccountTableRender());
on(studentAccountRefresh, 'click', () => loadStudentAccountData({ manual: true }));

on(adminSearch, 'input', () => render());
on(adminFilter, 'change', () => render());
on(softwareSearch, 'input', () => softwareTableRender());
on(softwareFilter, 'change', () => softwareTableRender());
on(practicumSearch, 'input', () => practicumTableRender());
on(practicumFilter, 'change', () => practicumTableRender());
on(practicumBackfillTargets, 'click', () => backfillPracticumTargets());
on(practicumCategory, 'change', () => applyPracticumTargetDefaults(practicumCategory, practicumTargetCohort, null, true));
on(rosterCategory, 'change', () => applyPracticumTargetDefaults(rosterCategory, rosterTargetCohort, rosterAcademicYear, true));
on(attendanceCategory, 'change', () => applyPracticumTargetDefaults(attendanceCategory, attendanceTargetCohort, attendanceAcademicYear, true));
on(rosterTargetCohort, 'change', () => refreshAcademicYearFromTarget(rosterCategory, rosterTargetCohort, rosterAcademicYear));
on(attendanceTargetCohort, 'change', () => refreshAcademicYearFromTarget(attendanceCategory, attendanceTargetCohort, attendanceAcademicYear));
on(attendanceSearch, 'input', () => attendanceRecapRender());
on(attendanceSessionFilter, 'change', () => attendanceRecapRender());
on(attendanceExport, 'click', () => exportAttendanceCsv());
on(rosterExport, 'click', () => exportRosterCsv());
on(sessionExport, 'click', () => exportSessionCsv());
on(videoSearch, 'input', () => videoTableRender());
on(videoFilter, 'change', () => videoTableRender());
on(announcementSearch, 'input', () => announcementTableRender());
on(announcementFilter, 'change', () => announcementTableRender());
on(messageSearch, 'input', () => messageTableRender());
on(messageFilter, 'change', () => messageTableRender());
on(liveChatSearch, 'input', () => liveChatRender());
on(liveChatNotifyBtn, 'click', () => toggleAdminPushNotifications());
on(studentActivitySearch, 'input', () => studentActivityRender());
on(studentActivityFilter, 'change', () => studentActivityRender());
on(studentActivityCohortFilter, 'change', () => studentActivityRender());
on(studentActivityRefresh, 'click', () => loadStudentActivity({ manual: true }));
on(adminActivitySearch, 'input', () => adminActivityRender());
on(adminActivityFilter, 'change', () => adminActivityRender());
on(adminActivityRefresh, 'click', () => loadAdminActivity({ manual: true }));
on(accessLogSearch, 'input', () => accessLogRender());
on(accessLogFilter, 'change', () => accessLogRender());
on(accessLogActionFilter, 'change', () => accessLogRender());
on(accessLogRefresh, 'click', () => accessLogRender());
on(auditSearch, 'input', () => auditTableRender());
on(auditFilter, 'change', () => auditTableRender());
on(clientErrorRefresh, 'click', () => {
  renderClientErrors();
  renderDashboardHealth();
  toast('Catatan error browser diperbarui.');
});
on(clientErrorClear, 'click', () => {
  localStorage.removeItem(CLIENT_ERROR_KEY);
  renderClientErrors();
  renderDashboardHealth();
  toast('Catatan error browser dibersihkan.');
});
renderAdminRoleChecklist();
renderAdminRoleOptions();
syncNotificationButton();
setupAdminMobileNav();
applyAdminRoleUIAfterSession();

const setActiveAdminNav = id => {
  adminNavLinks.forEach(link => {
    const active = link.getAttribute('href') === `#${id}`;
    link.classList.toggle('active', active);
    if (active && window.matchMedia('(max-width: 900px)').matches && adminNav && adminNav.offsetParent !== null) {
      adminNav.scrollTo({
        left: Math.max(0, link.offsetLeft - 16),
        behavior: 'smooth'
      });
    }
  });
};

if (adminNavLinks.length && 'IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible?.target?.id) setActiveAdminNav(visible.target.id);
  }, { rootMargin: '-20% 0px -55% 0px', threshold: [0.12, 0.28, 0.5] });

  adminNavLinks.forEach(link => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) sectionObserver.observe(target);
  });
}

async function loadStudentActivity(options = {}) {
  if (!studentActivityTable) return;
  try {
    if (studentActivityRefresh) studentActivityRefresh.disabled = true;
    const supabase = await loadSupabaseClient();
    const table = window.SIPILCARE_AUTH_CONFIG?.tableName || 'students';
    const { data, error } = await supabase
      .from(table)
      .select('nim,name,angkatan,is_active,last_seen_at,last_login_at,last_page,updated_at')
      .order('nim', { ascending: true });

    if (error) throw error;
    students = data || [];
    if (studentLastSync) studentLastSync.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    studentActivityRender();
    if (options.manual) toast('Data mahasiswa berhasil diperbarui.');
  } catch (error) {
    console.error('Load student activity failed:', error);
    if (/last_seen_at|last_login_at|last_page/i.test(error.message || '')) {
      studentActivityTable.innerHTML = '<tr><td colspan="6">Kolom tracking mahasiswa belum ada di Supabase. Jalankan SQL alter table yang ada di dokumentasi.</td></tr>';
    } else {
      toast('Gagal memuat data mahasiswa dari Supabase.');
    }
  } finally {
    if (studentActivityRefresh) studentActivityRefresh.disabled = false;
  }
}

async function loadAdminRoles(options = {}) {
  if (!adminRoleTable && !adminAccountRole) return;
  if (!canManageAdminAccounts()) return;

  try {
    if (adminRoleRefresh) adminRoleRefresh.disabled = true;
    const supabase = await loadSupabaseClient();
    const { data, error } = await supabase.rpc('sipilcare_list_admin_roles', {
      p_session_token_hash: await adminSessionTokenHash()
    });
    if (error) throw error;
    adminRoles = (data || []).map(normalizeAdminRole);
    renderAdminRoleOptions();
    adminRoleTableRender();
    adminAccountTableRender();
    if (options.manual) toast('Data role admin berhasil diperbarui.');
  } catch (error) {
    console.error('Load admin roles failed:', error);
    adminRoles = fallbackAdminRoles();
    renderAdminRoleOptions();
    adminRoleTableRender();
    if (adminRoleTable) {
      adminRoleTable.insertAdjacentHTML('beforeend', '<tr><td colspan="5">RPC role admin belum tersedia. Jalankan SQL admin_roles di dokumentasi agar role baru bisa tersimpan di database.</td></tr>');
    }
    if (options.manual) toast('Role custom belum aktif di Supabase. Cek SQL admin_roles.');
  } finally {
    if (adminRoleRefresh) adminRoleRefresh.disabled = false;
  }
}

async function loadAdminAccounts(options = {}) {
  if (!adminAccountTable || !canManageAdminAccounts()) return;
  try {
    if (adminAccountRefresh) adminAccountRefresh.disabled = true;
    const supabase = await loadSupabaseClient();
    const { data, error } = await supabase.rpc('sipilcare_list_admin_accounts', {
      p_session_token_hash: await adminSessionTokenHash()
    });

    if (error) throw error;
    adminAccounts = data || [];
    adminAccountTableRender();
    if (options.manual) toast('Data akun admin berhasil diperbarui.');
  } catch (error) {
    console.error('Load admin accounts failed:', error);
    adminAccountTable.innerHTML = '<tr><td colspan="7">Gagal memuat akun admin dari Supabase. Cek policy tabel admins.</td></tr>';
    if (options.manual) toast('Gagal memuat akun admin dari Supabase.');
  } finally {
    if (adminAccountRefresh) adminAccountRefresh.disabled = false;
  }
}

async function loadStudentAccountData(options = {}) {
  if (!studentAccountTable && !studentCohortList && !studentBulkCohort) return;
  if (!canManageStudentAccounts()) return;

  try {
    if (studentAccountRefresh) studentAccountRefresh.disabled = true;
    const supabase = await loadSupabaseClient();
    const sessionHash = await adminSessionTokenHash();
    const [cohortResult, accountResult] = await Promise.all([
      supabase.rpc('sipilcare_list_student_cohorts', { p_session_token_hash: sessionHash }),
      supabase.rpc('sipilcare_list_student_accounts', { p_session_token_hash: sessionHash })
    ]);

    if (cohortResult.error) throw cohortResult.error;
    if (accountResult.error) throw accountResult.error;
    studentCohorts = cohortResult.data || [];
    studentAccounts = accountResult.data || [];
    studentCohortRender();
    studentAccountTableRender();
    if (options.manual) toast('Data akun mahasiswa berhasil diperbarui.');
  } catch (error) {
    console.error('Load student account data failed:', error);
    if (studentAccountTable) studentAccountTable.innerHTML = '<tr><td colspan="7">Gagal memuat akun mahasiswa dari Supabase.</td></tr>';
    if (studentCohortList) studentCohortList.innerHTML = '<div class="empty">Gagal memuat angkatan.</div>';
    if (options.manual) toast(error.message || 'Gagal memuat akun mahasiswa.');
  } finally {
    if (studentAccountRefresh) studentAccountRefresh.disabled = false;
  }
}

loadStudentActivity();
setInterval(() => loadStudentActivity(), 30000);
loadAdminRoles();
loadAdminAccounts();
loadStudentAccountData();

async function updateAdminPresence() {
  const admin = currentAdmin();
  const now = new Date().toISOString();
  const loginTrackedFor = localStorage.getItem(ADMIN_LOGIN_TRACKED_KEY);
  const data = {
    username: admin.username,
    name: admin.name,
    role: admin.role,
    roleLabel: admin.roleLabel,
    allowedPages: admin.allowedPages,
    permissions: admin.permissions,
    practicumScopes: admin.practicumScopes,
    last_seen_at: now,
    last_page: location.pathname,
    userAgent: navigator.userAgent,
    updatedAt: now
  };

  if (loginTrackedFor !== admin.username) {
    data.last_login_at = now;
    localStorage.setItem(ADMIN_LOGIN_TRACKED_KEY, admin.username);
  }

  try {
    await setDoc(doc(db, ADMIN_ACTIVITY_COLLECTION, admin.username), data, { merge: true });
  } catch (error) {
    console.error('Update admin presence failed:', error);
  }
}

async function loadAdminActivity(options = {}) {
  if (!adminActivityTable) return;
  if (options.manual) {
    await updateAdminPresence();
    adminActivityRender();
    toast('Data admin berhasil diperbarui.');
    return;
  }
  if (adminActivityListening) return;
  adminActivityListening = true;
  const adminActivityQuery = query(collection(db, ADMIN_ACTIVITY_COLLECTION), orderBy('last_seen_at', 'desc'));
  onSnapshot(adminActivityQuery, snapshot => {
    adminActivities = snapshot.docs.map(documentSnapshot => ({
      docId: documentSnapshot.id,
      ...documentSnapshot.data()
    }));
    if (adminLastSync) adminLastSync.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    adminActivityRender();
    stats();
  }, err => {
    console.error('Firestore admin activity error:', err);
    adminActivityTable.innerHTML = '<tr><td colspan="6">Gagal memuat aktivitas admin.</td></tr>';
  });
}

updateAdminPresence();
setInterval(() => updateAdminPresence(), 30000);
loadAdminActivity();

const adminPracticumScopeQuery = query(collection(db, ADMIN_PRACTICUM_SCOPE_COLLECTION));
onSnapshot(adminPracticumScopeQuery, snapshot => {
  adminPracticumScopes = snapshot.docs.reduce((map, documentSnapshot) => {
    map[String(documentSnapshot.id || '').toLowerCase()] = {
      docId: documentSnapshot.id,
      ...documentSnapshot.data()
    };
    return map;
  }, {});

  const profile = getAdminProfile();
  if (profile.username) {
    const scopes = adminScopeFor(profile.username);
    localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify({
      ...profile,
      practicumScopes: scopes
    }));
  }

  applyAdminRoleUI();
  adminAccountTableRender();
  practicumCourseOptions();
  practicumFilters();
  practicumTableRender();
  renderPracticumOverview();
  attendanceRecapRender();
  attendanceSessionTableRender();
  updateAdminPresence();
}, err => {
  console.error('Firestore admin practicum scope error:', err);
});

const resourcesQuery = query(collection(db, 'resources'), orderBy('date', 'desc'));
onSnapshot(resourcesQuery, snapshot => {
  resources = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  render();
}, err => {
  console.error('Firestore error:', err);
  toast('Gagal memuat resource dari Firebase.');
});


const practicumQuery = query(collection(db, 'practicum_studio_modules'), orderBy('date', 'desc'));
onSnapshot(practicumQuery, snapshot => {
  practicumModules = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  render();
}, err => {
  console.error('Firestore practicum/studio error:', err);
  toast('Gagal memuat modul praktikum/studio dari Firebase.');
});

const practicumRosterQuery = query(collection(db, PRACTICUM_ROSTER_COLLECTION), orderBy('importedAt', 'desc'));
onSnapshot(practicumRosterQuery, snapshot => {
  practicumRosters = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  attendanceRecapRender();
  attendanceSessionTableRender();
  renderPracticumOverview();
}, err => {
  console.error('Firestore practicum roster error:', err);
  toast('Gagal memuat data praktikan.');
});

const attendanceSessionQuery = query(collection(db, PRACTICUM_ATTENDANCE_SESSION_COLLECTION), orderBy('date', 'desc'));
onSnapshot(attendanceSessionQuery, snapshot => {
  practicumAttendanceSessions = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  attendanceRecapRender();
  attendanceSessionTableRender();
  renderPracticumOverview();
}, err => {
  console.error('Firestore attendance session error:', err);
  toast('Gagal memuat sesi absen praktikum.');
});

const attendanceRecordQuery = query(collection(db, PRACTICUM_ATTENDANCE_RECORD_COLLECTION), orderBy('attendedAt', 'desc'));
onSnapshot(attendanceRecordQuery, snapshot => {
  practicumAttendanceRecords = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  attendanceRecapRender();
  attendanceSessionTableRender();
  renderPracticumOverview();
}, err => {
  console.error('Firestore attendance record error:', err);
  toast('Gagal memuat rekap absensi praktikum.');
});

onSnapshot(doc(db, ACADEMIC_SETTINGS_COLLECTION, ACADEMIC_SETTINGS_DOC), snapshot => {
  academicSettings = snapshot.exists() ? snapshot.data() : {};
  renderAcademicSettingsForm();
  syncAllPracticumTargetDefaults();
  renderPracticumOverview();
}, err => {
  console.error('Firestore academic settings error:', err);
  if (academicSettingsSummary) {
    academicSettingsSummary.innerHTML = '<article><strong>Gagal memuat kalender akademik.</strong><small>Coba refresh dashboard admin.</small></article>';
  }
});

const videosQuery = query(collection(db, 'videos'), orderBy('title'));
onSnapshot(videosQuery, snapshot => {
  videos = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  render();
}, err => {
  console.error('Firestore videos error:', err);
  toast('Gagal memuat video dari Firebase.');
});

const announcementsQuery = query(collection(db, 'announcements'), orderBy('date', 'desc'));
onSnapshot(announcementsQuery, snapshot => {
  announcements = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  render();
}, err => {
  console.error('Firestore announcements error:', err);
  toast('Gagal memuat pemberitahuan dari Firebase.');
});

const contactMessagesQuery = query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc'));
onSnapshot(contactMessagesQuery, snapshot => {
  contactMessages = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  render();
}, err => {
  console.error('Firestore contact messages error:', err);
  toast('Gagal memuat pesan mahasiswa.');
});

const liveChatQuery = query(collection(db, 'live_chat_messages'), orderBy('createdAt', 'desc'));
onSnapshot(liveChatQuery, snapshot => {
  const latestStudentMessage = snapshot.docChanges()
    .filter(change => change.type === 'added')
    .map(change => ({ docId: change.doc.id, ...change.doc.data() }))
    .filter(item => item.sender === 'student')
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];

  liveChatMessages = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  render();

  if (latestStudentMessage) {
    const lastSeen = localStorage.getItem(ADMIN_LIVE_CHAT_LAST_SEEN_KEY) || '';
    const messageTime = latestStudentMessage.createdAt || '';
    if (liveChatSnapshotReady && messageTime > lastSeen) showAdminLiveChatNotification(latestStudentMessage);
    if (messageTime > lastSeen) localStorage.setItem(ADMIN_LIVE_CHAT_LAST_SEEN_KEY, messageTime);
  }
  liveChatSnapshotReady = true;
}, err => {
  console.error('Firestore live chat error:', err);
  toast('Gagal memuat live chat.');
});

const accessLogQuery = query(collection(db, RESOURCE_ACCESS_LOG_COLLECTION), orderBy('accessedAt', 'desc'));
onSnapshot(accessLogQuery, snapshot => {
  accessLogs = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  accessLogRender();
  stats();
}, err => {
  console.error('Firestore access log error:', err);
  if (accessLogTable) accessLogTable.innerHTML = '<tr><td colspan="6">Gagal memuat history akses.</td></tr>';
});

const auditQuery = query(collection(db, ADMIN_AUDIT_COLLECTION), orderBy('createdAt', 'desc'));
onSnapshot(auditQuery, snapshot => {
  auditLogs = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  render();
}, err => {
  console.error('Firestore audit log error:', err);
  if (auditTable) auditTable.innerHTML = '<tr><td colspan="6">Gagal memuat audit log admin.</td></tr>';
});
