(() => {
  const STUDENTS_KEY = "sipilcare_students";
  const SESSION_KEY = "sipilcare_student_session";
  const currentPage = location.pathname.split("/").pop() || "index.html";
  const isStudentLogin = currentPage === "student-login.html";
  const isAdminLogin = currentPage === "login.html";
  const isAdminPanel = currentPage === "panel-hms-sipil-2026.html";

  const getStudents = () => JSON.parse(localStorage.getItem(STUDENTS_KEY) || "{}");
  const saveStudents = (students) => localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  const showToast = (message) => {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2600);
  };
  const isValidNim = (nim) => /^[0-9]{8,14}$/.test(nim);
  const nextUrl = () => new URLSearchParams(location.search).get("next") || "index.html";

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
    const submit = document.getElementById("studentSubmit");
    let mode = "login";

    const setMode = (nextMode) => {
      mode = nextMode;
      tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
      nameInput.hidden = mode !== "register";
      newPasswordInput.hidden = mode !== "reset";
      passwordInput.hidden = mode === "reset";
      nameInput.required = mode === "register";
      newPasswordInput.required = mode === "reset";
      passwordInput.required = mode !== "reset";
      submit.textContent = mode === "login" ? "Login" : mode === "register" ? "Daftar Akun" : "Reset Password";
    };

    tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const nim = nimInput.value.trim();
      const password = passwordInput.value;
      const newPassword = newPasswordInput.value;
      const students = getStudents();

      if (!isValidNim(nim)) {
        showToast("NIM harus berupa angka 8-14 digit.");
        return;
      }

      if (mode === "register") {
        if (students[nim]) {
          showToast("NIM sudah terdaftar. Silakan login.");
          return;
        }
        if (password.length < 6) {
          showToast("Password minimal 6 karakter.");
          return;
        }
        students[nim] = {
          nim,
          name: nameInput.value.trim() || "Mahasiswa UNJANI",
          password
        };
        saveStudents(students);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ nim, name: students[nim].name }));
        location.href = nextUrl();
        return;
      }

      if (mode === "reset") {
        if (!students[nim]) {
          showToast("NIM belum terdaftar.");
          return;
        }
        if (newPassword.length < 6) {
          showToast("Password baru minimal 6 karakter.");
          return;
        }
        students[nim].password = newPassword;
        saveStudents(students);
        showToast("Password berhasil direset. Silakan login.");
        form.reset();
        setMode("login");
        return;
      }

      if (!students[nim] || students[nim].password !== password) {
        showToast("NIM atau password salah.");
        return;
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ nim, name: students[nim].name }));
      location.href = nextUrl();
    });
  });
})();


