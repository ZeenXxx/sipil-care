(() => {
  const CONFIG = window.SIPILCARE_AUTH_CONFIG || { mode: "local" };
  const STUDENTS_KEY = "sipilcare_students";
  const SESSION_KEY = "sipilcare_student_session";
  const currentPage = location.pathname.split("/").pop() || "index.html";
  const isStudentLogin = currentPage === "student-login.html";
  const isAdminLogin = currentPage === "login.html";
  const isAdminPanel = currentPage === "panel-hms-sipil-2026.html";
  const usingSupabase = CONFIG.mode === "supabase" && CONFIG.supabaseUrl && CONFIG.supabaseAnonKey;

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
      .select("nim,name,password_hash,must_change_password")
      .eq("nim", nim)
      .maybeSingle();
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

  if (!isStudentLogin && !isAdminLogin && !isAdminPanel) {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      const currentFile = location.pathname.split("/").pop() || "index.html";
      const nextTarget = location.pathname.includes("/pages/") ? "pages/" + currentFile : currentFile;
      const next = encodeURIComponent(nextTarget);
      const prefix = location.pathname.includes("/pages/") ? "../" : "";
      location.replace(prefix + "student-login.html?next=" + next);
      return;
    }

    window.addEventListener("DOMContentLoaded", () => {
      const nav = document.querySelector(".nav-links");
      if (!nav || nav.querySelector("[data-student-logout]")) return;
      const logout = document.createElement("button");
      logout.className = "student-logout";
      logout.type = "button";
      logout.dataset.studentLogout = "true";
      logout.textContent = "Logout";
      logout.addEventListener("click", () => {
        sessionStorage.removeItem(SESSION_KEY);
        const prefix = location.pathname.includes("/pages/") ? "../" : "";
        location.href = prefix + "student-login.html";
      });
      nav.appendChild(logout);
    });
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
    let mode = "login";

    if (modeLabel) {
      modeLabel.textContent = usingSupabase
        ? "Mode cloud aktif: hanya NIM yang sudah dibuat admin HMS yang bisa login."
        : "Mode lokal hanya untuk demo. Aktifkan Supabase agar akun lintas device dan pre-provisioned.";
    }

    const setMode = (nextMode) => {
      mode = nextMode;
      tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
      newPasswordInput.hidden = mode !== "change";
      newPasswordInput.required = mode === "change";
      passwordInput.placeholder = mode === "change" ? "Password saat ini / password awal" : "Password";
      submit.textContent = mode === "login" ? "Login" : "Ubah Password";
    };

    tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

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
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ nim, name: student.name }));
            showToast("Password berhasil diubah. Mengalihkan ke halaman utama...");
            setTimeout(() => location.href = nextUrl(), 700);
            return;
          }
          const student = await remoteLogin({ nim, password });
          if (student.must_change_password) {
            showToast("Silakan ubah password awal terlebih dahulu.");
            setMode("change");
            return;
          }
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ nim, name: student.name }));
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
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ nim, name: students[nim].name }));
          location.href = nextUrl();
          return;
        }
        if (!students[nim] || students[nim].password !== password) {
          throw new Error("NIM atau password salah. Akun harus dibuat admin terlebih dahulu.");
        }
        if (students[nim].mustChangePassword) {
          showToast("Silakan ubah password awal terlebih dahulu.");
          setMode("change");
          return;
        }
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ nim, name: students[nim].name }));
        location.href = nextUrl();
      } catch (error) {
        showToast(error.message || "Terjadi kesalahan login.");
      } finally {
        submit.disabled = false;
      }
    });
  });
})();
