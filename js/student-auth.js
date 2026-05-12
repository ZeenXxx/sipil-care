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

  const remoteFindStudent = async (nim) => {
    const db = await getSupabase();
    const { data, error } = await db
      .from(CONFIG.tableName || "students")
      .select("nim,name,password_hash,recovery_code_hash")
      .eq("nim", nim)
      .maybeSingle();
    if (error) throw error;
    return data;
  };

  const remoteRegister = async ({ nim, name, password, recoveryCode }) => {
    const existing = await remoteFindStudent(nim);
    if (existing) throw new Error("NIM sudah terdaftar. Silakan login.");
    const db = await getSupabase();
    const { error } = await db.from(CONFIG.tableName || "students").insert({
      nim,
      name,
      password_hash: await sha256(password),
      recovery_code_hash: await sha256(recoveryCode),
      created_at: new Date().toISOString()
    });
    if (error) throw error;
  };

  const remoteLogin = async ({ nim, password }) => {
    const student = await remoteFindStudent(nim);
    if (!student || student.password_hash !== await sha256(password)) {
      throw new Error("NIM atau password salah.");
    }
    return student;
  };

  const remoteReset = async ({ nim, newPassword, recoveryCode }) => {
    const student = await remoteFindStudent(nim);
    if (!student) throw new Error("NIM belum terdaftar.");
    if (student.recovery_code_hash !== await sha256(recoveryCode)) {
      throw new Error("Kode pemulihan salah.");
    }
    const db = await getSupabase();
    const { error } = await db
      .from(CONFIG.tableName || "students")
      .update({ password_hash: await sha256(newPassword), updated_at: new Date().toISOString() })
      .eq("nim", nim);
    if (error) throw error;
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
    const nameInput = document.getElementById("studentName");
    const newPasswordInput = document.getElementById("studentNewPassword");
    const recoveryInput = document.getElementById("studentRecoveryCode");
    const submit = document.getElementById("studentSubmit");
    const modeLabel = document.getElementById("storageModeLabel");
    let mode = "login";

    if (modeLabel) {
      modeLabel.textContent = usingSupabase
        ? "Mode cloud aktif: akun dapat dipakai lintas device."
        : "Mode lokal aktif: isi Supabase config agar akun terbaca lintas device.";
    }

    const setMode = (nextMode) => {
      mode = nextMode;
      tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
      nameInput.hidden = mode !== "register";
      newPasswordInput.hidden = mode !== "reset";
      recoveryInput.hidden = mode === "login";
      passwordInput.hidden = mode === "reset";
      nameInput.required = mode === "register";
      newPasswordInput.required = mode === "reset";
      recoveryInput.required = mode !== "login";
      passwordInput.required = mode !== "reset";
      submit.textContent = mode === "login" ? "Login" : mode === "register" ? "Daftar Akun" : "Reset Password";
    };

    tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      const nim = nimInput.value.trim();
      const password = passwordInput.value;
      const newPassword = newPasswordInput.value;
      const recoveryCode = recoveryInput.value.trim();

      try {
        if (!isValidNim(nim)) throw new Error("NIM harus berupa angka 8-14 digit.");

        if (usingSupabase) {
          if (mode === "register") {
            if (password.length < 6) throw new Error("Password minimal 6 karakter.");
            if (recoveryCode.length < 6) throw new Error("Kode pemulihan minimal 6 karakter.");
            await remoteRegister({ nim, name: nameInput.value.trim() || "Mahasiswa UNJANI", password, recoveryCode });
            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ nim, name: nameInput.value.trim() || "Mahasiswa UNJANI" }));
            location.href = nextUrl();
            return;
          }
          if (mode === "reset") {
            if (newPassword.length < 6) throw new Error("Password baru minimal 6 karakter.");
            await remoteReset({ nim, newPassword, recoveryCode });
            showToast("Password berhasil direset. Silakan login.");
            form.reset();
            setMode("login");
            return;
          }
          const student = await remoteLogin({ nim, password });
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ nim, name: student.name }));
          location.href = nextUrl();
          return;
        }

        const students = getStudents();
        if (mode === "register") {
          if (students[nim]) throw new Error("NIM sudah terdaftar. Silakan login.");
          if (password.length < 6) throw new Error("Password minimal 6 karakter.");
          if (recoveryCode.length < 6) throw new Error("Kode pemulihan minimal 6 karakter.");
          students[nim] = {
            nim,
            name: nameInput.value.trim() || "Mahasiswa UNJANI",
            password,
            recoveryCode
          };
          saveStudents(students);
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ nim, name: students[nim].name }));
          location.href = nextUrl();
          return;
        }
        if (mode === "reset") {
          if (!students[nim]) throw new Error("NIM belum terdaftar.");
          if (students[nim].recoveryCode !== recoveryCode) throw new Error("Kode pemulihan salah.");
          if (newPassword.length < 6) throw new Error("Password baru minimal 6 karakter.");
          students[nim].password = newPassword;
          saveStudents(students);
          showToast("Password berhasil direset. Silakan login.");
          form.reset();
          setMode("login");
          return;
        }
        if (!students[nim] || students[nim].password !== password) throw new Error("NIM atau password salah.");
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
