(() => {
  const CONFIG = window.SIPILCARE_AUTH_CONFIG || { mode: "local" };
  const STUDENTS_KEY = "sipilcare_students";
  const SESSION_KEY = "sipilcare_student_session";
  const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
  const currentPage = location.pathname.split("/").pop() || "index.html";
  const isStudentLogin = currentPage === "student-login.html";
  const isAdminLogin = currentPage === "login.html";
  const isAdminPanel = currentPage === "panel-hms-sipil-2026.html";
  const isHomePage = currentPage === "index.html" && !location.pathname.includes("/pages/");
  const usingSupabase = CONFIG.mode === "supabase" && CONFIG.supabaseUrl && CONFIG.supabaseAnonKey;
  const HMS_INSTAGRAM = "https://www.instagram.com/hmsunjani";
  const HMS_YOUTUBE = "https://youtube.com/@hmsunjani1986?si=d_lPiLa4u7yzBDYE";

  let supabaseClient = null;

  const getStudents = () => JSON.parse(localStorage.getItem(STUDENTS_KEY) || "{}");
  const saveStudents = (students) => localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  const showToast = (message) => {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3200);
  };
  const isValidNim = (nim) => /^[0-9]{8,14}$/.test(nim);
  const nextUrl = () => new URLSearchParams(location.search).get("next") || "index.html";
  const queryMode = () => new URLSearchParams(location.search).get("mode") || "login";

  const readSession = () => {
    try {
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session?.nim || !session?.lastSeenAt) return null;
      if (Date.now() - session.lastSeenAt > SESSION_TTL) {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      session.lastSeenAt = Date.now();
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return session;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  };

  const saveSession = (student) => {
    const session = {
      nim: student.nim,
      name: student.name,
      lastSeenAt: Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const sha256 = async (value) => {
    const data = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  const loadSupabaseScript = () => new Promise((resolve, reject) => {
    if (window.supabase) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  const getSupabase = async () => {
    if (!usingSupabase) return null;
    if (supabaseClient) return supabaseClient;
    await loadSupabaseScript();
    supabaseClient = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    return supabaseClient;
  };

  const tableName = () => CONFIG.tableName || "students";

  const remoteFindStudent = async (nim) => {
    const db = await getSupabase();
    const { data, error } = await db
      .from(tableName())
      .select("nim,name,password_hash,recovery_code_hash,must_change_password")
      .eq("nim", nim)
      .maybeSingle();
    if (error && /recovery_code_hash/i.test(error.message || "")) {
      const fallback = await db
        .from(tableName())
        .select("nim,name,password_hash,must_change_password")
        .eq("nim", nim)
        .maybeSingle();
      if (fallback.error) throw fallback.error;
      return { ...fallback.data, recovery_code_hash: "" };
    }
    if (error) throw error;
    return data;
  };

  const remoteLogin = async ({ nim, password }) => {
    const student = await remoteFindStudent(nim);
    if (!student || student.password_hash !== await sha256(password)) {
      throw new Error("NIM atau password salah. Pastikan akun sudah dibuat oleh admin HMS.");
    }
    return student;
  };

  const remoteChangePassword = async ({ nim, currentPassword, newPassword }) => {
    const student = await remoteLogin({ nim, password: currentPassword });
    const db = await getSupabase();
    const { error } = await db
      .from(tableName())
      .update({
        password_hash: await sha256(newPassword),
        must_change_password: false,
        updated_at: new Date().toISOString()
      })
      .eq("nim", nim);
    if (error) throw error;
    return student;
  };

  const remoteResetPassword = async ({ nim, recoveryCode, newPassword }) => {
    const student = await remoteFindStudent(nim);
    if (!student || student.recovery_code_hash !== await sha256(recoveryCode)) {
      throw new Error("NIM atau kode pemulihan salah.");
    }
    const db = await getSupabase();
    const { error } = await db
      .from(tableName())
      .update({
        password_hash: await sha256(newPassword),
        must_change_password: false,
        updated_at: new Date().toISOString()
      })
      .eq("nim", nim);
    if (error) throw error;
    return student;
  };

  const addStudentNavActions = () => {
    const nav = document.querySelector(".nav-links");
    if (!nav || nav.querySelector("[data-student-nav-action]")) return;
    const session = readSession();
    const currentFile = location.pathname.split("/").pop() || "index.html";
    const nextTarget = location.pathname.includes("/pages/") ? "pages/" + currentFile : currentFile;
    const prefix = location.pathname.includes("/pages/") ? "../" : "";

    if (!session) {
      const login = document.createElement("a");
      login.className = "student-login-link";
      login.dataset.studentNavAction = "true";
      login.href = `${prefix}student-login.html?next=${encodeURIComponent(nextTarget)}`;
      login.textContent = "Login";
      nav.appendChild(login);
      return;
    }

    const passwordButton = document.createElement("button");
    passwordButton.className = "student-password";
    passwordButton.type = "button";
    passwordButton.dataset.studentNavAction = "true";
    passwordButton.textContent = "Ganti Password";
    passwordButton.addEventListener("click", () => {
      location.href = `${prefix}student-login.html?mode=change&next=${encodeURIComponent(nextTarget)}`;
    });
    const instagram = document.createElement("a");
    instagram.className = "student-social";
    instagram.href = HMS_INSTAGRAM;
    instagram.target = "_blank";
    instagram.rel = "noopener";
    instagram.textContent = "Instagram HMS";
    const youtube = document.createElement("a");
    youtube.className = "student-social";
    youtube.href = HMS_YOUTUBE;
    youtube.target = "_blank";
    youtube.rel = "noopener";
    youtube.textContent = "YouTube HMS";
    const logout = document.createElement("button");
    logout.className = "student-logout";
    logout.type = "button";
    logout.dataset.studentLogout = "true";
    logout.textContent = "Logout";
    logout.addEventListener("click", () => {
      clearSession();
      location.href = prefix + "student-login.html";
    });
    nav.appendChild(instagram);
    nav.appendChild(youtube);
    nav.appendChild(passwordButton);
    nav.appendChild(logout);
  };

  if (!isStudentLogin && !isAdminLogin && !isAdminPanel) {
    if (!readSession() && !isHomePage) {
      const currentFile = location.pathname.split("/").pop() || "index.html";
      const nextTarget = location.pathname.includes("/pages/") ? "pages/" + currentFile : currentFile;
      const next = encodeURIComponent(nextTarget);
      const prefix = location.pathname.includes("/pages/") ? "../" : "";
      location.replace(prefix + "student-login.html?next=" + next);
      return;
    }

    window.addEventListener("DOMContentLoaded", addStudentNavActions);
    return;
  }

  if (!isStudentLogin) return;

  window.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("studentLoginForm");
    const tabs = document.querySelectorAll(".student-tab");
    const nimInput = document.getElementById("studentNim");
    const passwordInput = document.getElementById("studentPassword");
    const newPasswordInput = document.getElementById("studentNewPassword");
    const submit = document.getElementById("studentSubmit");
    const modeLabel = document.getElementById("storageModeLabel");
    const helpText = document.getElementById("studentHelpText");
    const session = readSession();
    let mode = ["login", "change", "recover"].includes(queryMode()) ? queryMode() : "login";

    if (modeLabel) {
      modeLabel.textContent = usingSupabase
        ? "Mode cloud aktif: hanya NIM yang sudah dibuat admin HMS yang bisa login."
        : "Mode lokal hanya untuk demo. Aktifkan Supabase agar akun lintas device dan pre-provisioned.";
    }

    const setMode = (nextMode) => {
      mode = nextMode;
      tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
      newPasswordInput.hidden = mode === "login";
      newPasswordInput.required = mode !== "login";
      passwordInput.placeholder = mode === "change"
        ? "Password saat ini / password awal"
        : mode === "recover"
          ? "Kode pemulihan"
          : "Password";
      passwordInput.autocomplete = mode === "login" ? "current-password" : "one-time-code";
      submit.textContent = mode === "login"
        ? "Login"
        : mode === "recover"
          ? "Reset Password"
          : "Ubah Password";
      if (helpText) {
        helpText.textContent = mode === "recover"
          ? "Masukkan NIM, kode pemulihan, dan password baru. Kode pemulihan diberikan oleh admin sejak akun dibuat."
          : mode === "change"
            ? "Gunakan password saat ini untuk mengganti password. Jika lupa, pilih Lupa Password."
            : "Masuk dengan NIM dan password. Sesi login tersimpan 7 hari sejak terakhir membuka website.";
      }
    };

    tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
    if (session?.nim && mode === "change") {
      nimInput.value = session.nim;
    }
    setMode(mode);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      const nim = nimInput.value.trim();
      const password = passwordInput.value;
      const newPassword = newPasswordInput.value;

      try {
        if (!isValidNim(nim)) throw new Error("NIM harus berupa angka 8-14 digit.");

        if (usingSupabase) {
          if (mode === "change") {
            if (newPassword.length < 6) throw new Error("Password baru minimal 6 karakter.");
            const student = await remoteChangePassword({ nim, currentPassword: password, newPassword });
            saveSession(student);
            showToast("Password berhasil diubah. Mengalihkan ke halaman utama...");
            setTimeout(() => location.href = nextUrl(), 700);
            return;
          }
          if (mode === "recover") {
            if (newPassword.length < 6) throw new Error("Password baru minimal 6 karakter.");
            const student = await remoteResetPassword({ nim, recoveryCode: password, newPassword });
            saveSession(student);
            showToast("Password berhasil direset. Mengalihkan ke halaman utama...");
            setTimeout(() => location.href = nextUrl(), 700);
            return;
          }
          const student = await remoteLogin({ nim, password });
          saveSession(student);
          location.href = nextUrl();
          return;
        }

        const students = getStudents();
        if (mode === "change") {
          if (!students[nim]) throw new Error("NIM belum tersedia. Akun harus dibuat admin.");
          if (students[nim].password !== password) throw new Error("Password saat ini salah.");
          if (newPassword.length < 6) throw new Error("Password baru minimal 6 karakter.");
          students[nim].password = newPassword;
          students[nim].mustChangePassword = false;
          saveStudents(students);
          saveSession({ nim, name: students[nim].name });
          location.href = nextUrl();
          return;
        }
        if (mode === "recover") {
          if (!students[nim]) throw new Error("NIM belum tersedia. Akun harus dibuat admin.");
          if (students[nim].recoveryCode !== password) throw new Error("Kode pemulihan salah.");
          if (newPassword.length < 6) throw new Error("Password baru minimal 6 karakter.");
          students[nim].password = newPassword;
          students[nim].mustChangePassword = false;
          saveStudents(students);
          saveSession({ nim, name: students[nim].name });
          location.href = nextUrl();
          return;
        }
        if (!students[nim] || students[nim].password !== password) {
          throw new Error("NIM atau password salah. Akun harus dibuat admin terlebih dahulu.");
        }
        saveSession({ nim, name: students[nim].name });
        location.href = nextUrl();
      } catch (error) {
        showToast(error.message || "Terjadi kesalahan login.");
      } finally {
        submit.disabled = false;
      }
    });
  });
})();
