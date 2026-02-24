
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const STORAGE_KEY = "attendance_app_v3";
const LEGACY_STORAGE_KEY = "attendance_app_v2";
const CLOUD_SETTINGS_KEY = "attendance_cloud_settings_v1";
const CLOUD_TABLE = "attendance_state";
const CLOUD_APP_ID = "attendance_app_v2_default";
const USERS_KEY = "attendance_users_v1";
const SESSION_KEY = "attendance_session_v1";

let classes = [];
let currentClassId = "";
let recordsExpanded = false;

let currentSession = null;
let authMode = "login";

let supabase = null;
let cloudConnected = false;
let cloudSyncTimer = null;
let cloudSyncInFlight = false;

const authPage = document.getElementById("auth-page");
const appShell = document.getElementById("app-shell");
const authForm = document.getElementById("auth-form");
const authNameWrap = document.getElementById("auth-name-wrap");
const authNameInput = document.getElementById("auth-name");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authRoleSelect = document.getElementById("auth-role");
const authSubmitBtn = document.getElementById("auth-submit");
const authMessage = document.getElementById("auth-message");
const authTitle = document.getElementById("auth-title");
const forgotPasswordLink = document.getElementById("forgot-password-link");
const switchToSignupLink = document.getElementById("switch-to-signup-link");
const switchToLoginLink = document.getElementById("switch-to-login-link");

const navLinks = Array.from(document.querySelectorAll(".nav-link"));
const pages = Array.from(document.querySelectorAll(".dashboard-page"));
const sidebarToggleBtn = document.getElementById("sidebar-toggle");
const userBadge = document.getElementById("user-badge");
const logoutBtn = document.getElementById("logout-btn");

const classForm = document.getElementById("class-form");
const classNameInput = document.getElementById("class-name");
const classSectionInput = document.getElementById("class-section");
const classSelect = document.getElementById("class-select");
const deleteClassBtn = document.getElementById("delete-class");
const classMessage = document.getElementById("class-message");

const form = document.getElementById("student-form");
const nameInput = document.getElementById("student-name");
const list = document.getElementById("student-list");
const emptyState = document.getElementById("empty-state");

const totalEl = document.getElementById("total");
const presentEl = document.getElementById("present");
const absentEl = document.getElementById("absent");
const percentageEl = document.getElementById("percentage");

const dateInput = document.getElementById("attendance-date");
const markAllPresentBtn = document.getElementById("mark-all-present");
const markAllAbsentBtn = document.getElementById("mark-all-absent");
const saveRecordBtn = document.getElementById("save-record");
const actionMessage = document.getElementById("action-message");

const reportStartInput = document.getElementById("report-start");
const reportEndInput = document.getElementById("report-end");
const reportDaysInput = document.getElementById("report-days");
const exportRangeCsvBtn = document.getElementById("export-range-csv");
const exportStudentCsvBtn = document.getElementById("export-student-csv");
const reportMessage = document.getElementById("report-message");

const recordList = document.getElementById("record-list");
const recordEmpty = document.getElementById("record-empty");
const recordsDropdownToggle = document.getElementById("records-dropdown-toggle");

const individualBody = document.getElementById("individual-body");
const individualEmpty = document.getElementById("individual-empty");

const cloudUrlInput = document.getElementById("cloud-url");
const cloudKeyInput = document.getElementById("cloud-key");
const saveCloudConfigBtn = document.getElementById("save-cloud-config");
const uploadCloudBtn = document.getElementById("upload-cloud");
const downloadCloudBtn = document.getElementById("download-cloud");
const clearCloudConfigBtn = document.getElementById("clear-cloud-config");
const cloudStatus = document.getElementById("cloud-status");

const loaded = loadData();
classes = loaded.classes;
currentClassId = loaded.currentClassId;

if (!currentClassId && classes.length > 0) {
  currentClassId = classes[0].id;
}

if (classes.length === 0) {
  const firstClass = createClass("Class 1", "A");
  classes.push(firstClass);
  currentClassId = firstClass.id;
}

dateInput.value = todayISO();
reportEndInput.value = todayISO();
setCloudInputs(loadCloudSettings());
setupAuthEvents();
setupNavigationEvents();
setupAppEvents();
setupLayoutEvents();

const savedSession = loadSession();
if (savedSession) {
  currentSession = savedSession;
  showApp();
} else {
  showAuth();
}

function setupAuthEvents() {
  authForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = authEmailInput.value.trim().toLowerCase();
    const password = authPasswordInput.value;
    const role = authRoleSelect.value;

    if (!email || !password || !role) {
      setAuthMessage("Please complete all required fields.");
      return;
    }

    if (authMode === "signup") {
      const name = authNameInput.value.trim();
      if (!name) {
        setAuthMessage("Please enter your full name.");
        return;
      }
      signup(name, email, password, role);
      return;
    }

    login(email, password, role);
  });

  forgotPasswordLink.addEventListener("click", (event) => {
    event.preventDefault();
    setAuthMessage("Password reset is not available yet. Please create a new account.");
  });

  switchToSignupLink.addEventListener("click", (event) => {
    event.preventDefault();
    authMode = "signup";
    renderAuthMode();
    authNameInput.focus();
  });

  switchToLoginLink.addEventListener("click", (event) => {
    event.preventDefault();
    authMode = "login";
    renderAuthMode();
    authEmailInput.focus();
  });

  logoutBtn.addEventListener("click", () => {
    currentSession = null;
    localStorage.removeItem(SESSION_KEY);
    showAuth();
  });
}

function setupNavigationEvents() {
  navLinks.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.page;
      if (!target) return;
      openPanel(target);
    });
  });
}

function setupLayoutEvents() {
  if (!sidebarToggleBtn) return;

  sidebarToggleBtn.addEventListener("click", () => {
    const collapsed = appShell.classList.toggle("sidebar-collapsed");
    sidebarToggleBtn.setAttribute("aria-pressed", collapsed ? "true" : "false");
    sidebarToggleBtn.setAttribute("aria-label", collapsed ? "Show sidebar" : "Hide sidebar");
    sidebarToggleBtn.setAttribute("title", collapsed ? "Show sidebar" : "Hide sidebar");
  });
}
function setupAppEvents() {
  classForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isTeacher()) return;

    const className = classNameInput.value.trim();
    const section = classSectionInput.value.trim();

    if (!className || !section) return;

    const created = createClass(className, section);
    classes.push(created);
    currentClassId = created.id;
    classNameInput.value = "";
    classSectionInput.value = "";
    setClassMessage(`Added ${created.className} - ${created.section}.`, "success");
    render();
  });

  classSelect.addEventListener("change", () => {
    currentClassId = classSelect.value;
    recordsExpanded = false;
    setMessage("");
    setReportMessage("");
    render();
  });

  deleteClassBtn.addEventListener("click", () => {
    if (!isTeacher()) return;

    const current = getCurrentClass();
    if (!current) return;

    const ok = window.confirm(`Delete ${current.className} - ${current.section}? This removes all its students and records.`);
    if (!ok) return;

    classes = classes.filter((entry) => entry.id !== current.id);

    if (classes.length === 0) {
      const firstClass = createClass("Class 1", "A");
      classes.push(firstClass);
      currentClassId = firstClass.id;
    } else {
      currentClassId = classes[0].id;
    }

    setClassMessage("Class deleted.", "success");
    setMessage("");
    render();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isTeacher()) return;

    const current = getCurrentClass();
    if (!current) return;

    const name = nameInput.value.trim();
    if (!name) return;

    current.students.push({
      id: crypto.randomUUID(),
      name,
      currentPresent: true,
    });

    nameInput.value = "";
    setMessage("");
    render();
  });

  markAllPresentBtn.addEventListener("click", () => {
    if (!isTeacher()) return;

    const current = getCurrentClass();
    if (!current || current.students.length === 0) {
      setMessage("Add students before using bulk actions.", "error");
      return;
    }

    current.students.forEach((student) => {
      student.currentPresent = true;
    });

    setMessage("All students marked present.", "success");
    render();
  });

  markAllAbsentBtn.addEventListener("click", () => {
    if (!isTeacher()) return;

    const current = getCurrentClass();
    if (!current || current.students.length === 0) {
      setMessage("Add students before using bulk actions.", "error");
      return;
    }

    current.students.forEach((student) => {
      student.currentPresent = false;
    });

    setMessage("All students marked absent.", "success");
    render();
  });

  saveRecordBtn.addEventListener("click", () => {
    if (!isTeacher()) return;

    const current = getCurrentClass();
    if (!current || current.students.length === 0) {
      setMessage("Add students before saving a date record.", "error");
      return;
    }

    const date = dateInput.value || todayISO();

    const record = {
      date,
      entries: current.students.map((student) => ({
        studentId: student.id,
        name: student.name,
        present: student.currentPresent,
      })),
    };

    const index = current.records.findIndex((entry) => entry.date === date);
    if (index === -1) {
      current.records.push(record);
    } else {
      current.records[index] = record;
    }

    current.records.sort((a, b) => (a.date < b.date ? 1 : -1));
    recordsExpanded = false;
    setMessage(`Saved attendance for ${date}.`, "success");
    render();
  });

  recordsDropdownToggle.addEventListener("click", () => {
    recordsExpanded = !recordsExpanded;
    renderRecords(getCurrentClass());
  });

  exportRangeCsvBtn.addEventListener("click", () => {
    const current = getCurrentClass();
    if (!current) return;

    const resolved = resolveReportWindow();
    if (!resolved.ok) {
      setReportMessage(resolved.message, "error");
      return;
    }

    const filtered = filterRecordsByWindow(current.records, resolved.startDate, resolved.endDate);
    if (filtered.length === 0) {
      setReportMessage("No records found for selected window.", "error");
      return;
    }

    const stats = buildStudentStatsForRecords(filtered);
    if (stats.length === 0) {
      setReportMessage("No student attendance stats available for selected window.", "error");
      return;
    }

    const csv = buildRangeCsv(current, stats, resolved.startDate, resolved.endDate);
    downloadCsv(
      csv,
      `attendance-report-${slugify(current.className)}-${slugify(current.section)}-${resolved.startDate}-to-${resolved.endDate}.csv`
    );
    setReportMessage(`Exported summary for ${stats.length} student(s).`, "success");
  });

  exportStudentCsvBtn.addEventListener("click", () => {
    const current = getCurrentClass();
    if (!current) return;

    const stats = buildStudentStats(current);
    if (stats.length === 0) {
      setReportMessage("No student attendance stats available yet.", "error");
      return;
    }

    const csv = buildStudentSummaryCsv(current, stats);
    downloadCsv(csv, `student-summary-${slugify(current.className)}-${slugify(current.section)}.csv`);
    setReportMessage("Student summary exported.", "success");
  });

  saveCloudConfigBtn.addEventListener("click", async () => {
    const settings = {
      url: cloudUrlInput.value.trim(),
      key: cloudKeyInput.value.trim(),
    };

    if (!settings.url || !settings.key) {
      setCloudStatus("Enter both Supabase URL and anon key.", "error");
      return;
    }

    saveCloudSettings(settings);
    await tryConnectCloud({ autoPull: false });
  });

  uploadCloudBtn.addEventListener("click", async () => {
    const connected = await ensureCloudConnected();
    if (!connected) return;

    const ok = await uploadLocalToCloud({ silent: false });
    if (ok) {
      setCloudStatus("Local data uploaded to cloud.", "connected");
    }
  });

  downloadCloudBtn.addEventListener("click", async () => {
    const connected = await ensureCloudConnected();
    if (!connected) return;

    const payload = await fetchCloudState();
    if (!payload) {
      setCloudStatus("No cloud record found for this app.", "error");
      return;
    }

    applyLoadedPayload(payload);
    setMessage("Downloaded cloud data to local app.", "success");
    setCloudStatus("Cloud data downloaded.", "connected");
    render();
  });

  clearCloudConfigBtn.addEventListener("click", () => {
    localStorage.removeItem(CLOUD_SETTINGS_KEY);
    cloudUrlInput.value = "";
    cloudKeyInput.value = "";
    supabase = null;
    cloudConnected = false;
    setCloudStatus("Cloud disconnected. Local storage still active.");
  });
}

function renderAuthMode() {
  const signup = authMode === "signup";

  authTitle.textContent = signup ? "Create Account" : "Welcome Back";
  authNameWrap.classList.toggle("hidden", !signup);
  authNameInput.required = signup;
  authSubmitBtn.textContent = signup ? "Create Account" : "Login";
  switchToSignupLink.classList.toggle("hidden", signup);
  switchToLoginLink.classList.toggle("hidden", !signup);
  authMessage.textContent = "";
}

function showAuth() {
  authPage.classList.remove("hidden");
  appShell.classList.add("hidden");
  renderAuthMode();
}

function showApp() {
  authPage.classList.add("hidden");
  appShell.classList.remove("hidden");
  userBadge.textContent = `${currentSession?.role || "user"}: ${currentSession?.name || currentSession?.email || ""}`;
  applyRolePermissions();
  openPanel("page-core");
  render();
  void tryConnectCloud({ autoPull: true });
}

function signup(name, email, password, role) {
  const users = loadUsers();
  const exists = users.some((user) => user.email === email && user.role === role);

  if (exists) {
    setAuthMessage("An account with this email and role already exists.");
    return;
  }

  users.push({ name, email, password, role });
  saveUsers(users);

  currentSession = { name, email, role };
  saveSession(currentSession);
  authForm.reset();
  authRoleSelect.value = role;
  showApp();
}

function login(email, password, role) {
  const users = loadUsers();
  const matched = users.find((user) => user.email === email && user.password === password && user.role === role);

  if (!matched) {
    setAuthMessage("Invalid email/password/role combination.");
    return;
  }

  currentSession = {
    name: matched.name,
    email: matched.email,
    role: matched.role,
  };

  saveSession(currentSession);
  authForm.reset();
  authRoleSelect.value = role;
  showApp();
}
function setAuthMessage(message) {
  authMessage.textContent = message;
}

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (user) =>
        user &&
        typeof user.name === "string" &&
        typeof user.email === "string" &&
        typeof user.password === "string" &&
        (user.role === "teacher" || user.role === "student")
    );
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.role !== "teacher" && parsed.role !== "student") return null;

    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      role: parsed.role,
    };
  } catch {
    return null;
  }
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function isTeacher() {
  return currentSession?.role === "teacher";
}

function applyRolePermissions() {
  const teacherMode = isTeacher();

  document.querySelectorAll("[data-teacher-only]").forEach((el) => {
    el.classList.toggle("hidden", !teacherMode);
    if ("disabled" in el) {
      el.disabled = !teacherMode;
    }
  });

  if (!teacherMode) {
    setMessage("Student mode: view access enabled.");
  }
}

function openPanel(pageId) {
  navLinks.forEach((button) => {
    button.classList.toggle("active", button.dataset.page === pageId);
  });

  pages.forEach((page) => {
    page.classList.toggle("active-page", page.id === pageId);
  });
}

function getCurrentClass() {
  return classes.find((entry) => entry.id === currentClassId) || null;
}

function createClass(className, section) {
  return {
    id: crypto.randomUUID(),
    className,
    section,
    students: [],
    records: [],
  };
}

function loadData() {
  const fromNew = readStorage(STORAGE_KEY);
  if (fromNew) {
    return normalizeLoadedState(fromNew);
  }

  const fromLegacy = readStorage(LEGACY_STORAGE_KEY);
  if (fromLegacy) {
    return migrateLegacyState(fromLegacy);
  }

  return { classes: [], currentClassId: "" };
}

function readStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function normalizeLoadedState(raw) {
  const normalizedClasses = sanitizeClasses(raw.classes);
  const normalizedCurrentClassId =
    typeof raw.currentClassId === "string" && normalizedClasses.some((entry) => entry.id === raw.currentClassId)
      ? raw.currentClassId
      : normalizedClasses[0]?.id || "";

  return {
    classes: normalizedClasses,
    currentClassId: normalizedCurrentClassId,
  };
}

function migrateLegacyState(raw) {
  const legacyStudents = sanitizeLegacyStudents(raw.students);
  const legacyRecords = sanitizeLegacyRecords(raw.records);
  const defaultClass = createClass("Class 1", "A");

  defaultClass.students = legacyStudents.map((student) => ({
    id: student.id,
    name: student.name,
    currentPresent: student.present,
  }));

  legacyRecords.forEach((record) => {
    const entries = [];

    if (Array.isArray(record.students)) {
      record.students.forEach((entry) => {
        if (!entry || typeof entry.name !== "string" || typeof entry.present !== "boolean") return;

        let student = defaultClass.students.find((item) => item.name === entry.name);
        if (!student) {
          student = {
            id: crypto.randomUUID(),
            name: entry.name,
            currentPresent: false,
          };
          defaultClass.students.push(student);
        }

        entries.push({
          studentId: student.id,
          name: student.name,
          present: entry.present,
        });
      });
    }

    if (entries.length > 0 && typeof record.date === "string") {
      defaultClass.records.push({
        date: record.date,
        entries,
      });
    }
  });

  defaultClass.records.sort((a, b) => (a.date < b.date ? 1 : -1));

  return {
    classes: [defaultClass],
    currentClassId: defaultClass.id,
  };
}

function sanitizeClasses(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const students = sanitizeStudents(entry.students);
      const records = sanitizeRecords(entry.records, students);

      return {
        id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
        className:
          typeof entry.className === "string" && entry.className.trim().length > 0
            ? entry.className.trim()
            : "Untitled Class",
        section:
          typeof entry.section === "string" && entry.section.trim().length > 0
            ? entry.section.trim()
            : "-",
        students,
        records,
      };
    });
}

function sanitizeStudents(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
      name: typeof entry.name === "string" ? entry.name.trim() : "",
      currentPresent:
        typeof entry.currentPresent === "boolean"
          ? entry.currentPresent
          : typeof entry.present === "boolean"
          ? entry.present
          : true,
    }))
    .filter((entry) => entry.name.length > 0);
}

function sanitizeRecords(value, students) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry) => entry && typeof entry.date === "string")
    .map((entry) => {
      const entries = Array.isArray(entry.entries)
        ? entry.entries
            .filter(
              (item) =>
                item &&
                typeof item.studentId === "string" &&
                typeof item.name === "string" &&
                typeof item.present === "boolean"
            )
            .map((item) => ({
              studentId: item.studentId,
              name: item.name,
              present: item.present,
            }))
        : [];

      if (entries.length === 0 && Array.isArray(entry.students)) {
        entry.students.forEach((legacyStudent) => {
          if (
            !legacyStudent ||
            typeof legacyStudent.name !== "string" ||
            typeof legacyStudent.present !== "boolean"
          ) {
            return;
          }

          let matched = students.find((student) => student.name === legacyStudent.name);
          if (!matched) {
            matched = {
              id: crypto.randomUUID(),
              name: legacyStudent.name,
              currentPresent: false,
            };
            students.push(matched);
          }

          entries.push({
            studentId: matched.id,
            name: matched.name,
            present: legacyStudent.present,
          });
        });
      }

      return {
        date: entry.date,
        entries,
      };
    })
    .filter((entry) => entry.entries.length > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

function sanitizeLegacyStudents(value) {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (entry) =>
      entry &&
      typeof entry.id === "string" &&
      typeof entry.name === "string" &&
      typeof entry.present === "boolean"
  );
}

function sanitizeLegacyRecords(value) {
  if (!Array.isArray(value)) return [];

  return value.filter((entry) => entry && typeof entry.date === "string");
}
function saveData() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      classes,
      currentClassId,
      version: 3,
    })
  );
}

function toggleStatus(studentId) {
  if (!isTeacher()) return;

  const current = getCurrentClass();
  if (!current) return;

  const student = current.students.find((entry) => entry.id === studentId);
  if (!student) return;

  student.currentPresent = !student.currentPresent;
  setMessage("");
  render();
}

function removeStudent(studentId) {
  if (!isTeacher()) return;

  const current = getCurrentClass();
  if (!current) return;

  const index = current.students.findIndex((entry) => entry.id === studentId);
  if (index === -1) return;

  current.students.splice(index, 1);
  setMessage("");
  render();
}

function calculateSummary(students) {
  const total = students.length;
  const present = students.filter((student) => student.currentPresent).length;
  const absent = total - present;
  const percentage = total === 0 ? 0 : (present / total) * 100;

  return { total, present, absent, percentage };
}

function summarizeRecord(record) {
  const total = record.entries.length;
  const present = record.entries.filter((entry) => entry.present).length;
  const absent = total - present;
  const percentage = total === 0 ? 0 : (present / total) * 100;

  return { total, present, absent, percentage };
}

function setMessage(message, kind = "") {
  actionMessage.textContent = message;
  actionMessage.classList.remove("success", "error");
  if (kind) actionMessage.classList.add(kind);
}

function setClassMessage(message, kind = "") {
  classMessage.textContent = message;
  classMessage.classList.remove("success", "error");
  if (kind) classMessage.classList.add(kind);
}

function setReportMessage(message, kind = "") {
  reportMessage.textContent = message;
  reportMessage.classList.remove("success", "error");
  if (kind) reportMessage.classList.add(kind);
}

function setCloudStatus(message, kind = "") {
  cloudStatus.textContent = message;
  cloudStatus.classList.remove("connected", "error");
  if (kind) {
    cloudStatus.classList.add(kind);
  }
}

function resolveReportWindow() {
  const endDate = reportEndInput.value || todayISO();
  const daysRaw = reportDaysInput.value.trim();

  if (daysRaw) {
    const days = Number(daysRaw);
    if (!Number.isInteger(days) || days <= 0) {
      return { ok: false, message: "Last N Days must be a positive whole number." };
    }

    const startDate = shiftIsoDate(endDate, -(days - 1));
    return { ok: true, startDate, endDate };
  }

  const startDate = reportStartInput.value || "0001-01-01";
  if (startDate > endDate) {
    return { ok: false, message: "Start date cannot be after end date." };
  }

  return { ok: true, startDate, endDate };
}

function shiftIsoDate(isoDate, daysOffset) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  date.setDate(date.getDate() + daysOffset);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function filterRecordsByWindow(records, startDate, endDate) {
  return records.filter((record) => record.date >= startDate && record.date <= endDate);
}

function buildStudentStatsForRecords(records) {
  const statsMap = new Map();

  records.forEach((record) => {
    record.entries.forEach((entry) => {
      if (!statsMap.has(entry.studentId)) {
        statsMap.set(entry.studentId, {
          studentId: entry.studentId,
          name: entry.name,
          presentDays: 0,
          absentDays: 0,
          totalDays: 0,
        });
      }

      const stat = statsMap.get(entry.studentId);
      stat.totalDays += 1;
      if (entry.present) {
        stat.presentDays += 1;
      } else {
        stat.absentDays += 1;
      }
    });
  });

  return Array.from(statsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function buildRangeCsv(currentClass, stats, startDate, endDate) {
  const rows = [[
    "Class",
    "Section",
    "Start Date",
    "End Date",
    "Student",
    "Present Days",
    "Absent Days",
    "Total Days",
    "Attendance %",
  ]];

  stats.forEach((entry) => {
    const percentage = entry.totalDays === 0 ? 0 : (entry.presentDays / entry.totalDays) * 100;

    rows.push([
      currentClass.className,
      currentClass.section,
      startDate,
      endDate,
      entry.name,
      String(entry.presentDays),
      String(entry.absentDays),
      String(entry.totalDays),
      percentage.toFixed(1),
    ]);
  });

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function buildStudentStats(currentClass) {
  const statsMap = new Map();

  currentClass.students.forEach((student) => {
    statsMap.set(student.id, {
      studentId: student.id,
      name: student.name,
      presentDays: 0,
      absentDays: 0,
      totalDays: 0,
    });
  });

  currentClass.records.forEach((record) => {
    record.entries.forEach((entry) => {
      if (!statsMap.has(entry.studentId)) {
        statsMap.set(entry.studentId, {
          studentId: entry.studentId,
          name: entry.name,
          presentDays: 0,
          absentDays: 0,
          totalDays: 0,
        });
      }

      const stat = statsMap.get(entry.studentId);
      stat.totalDays += 1;
      if (entry.present) {
        stat.presentDays += 1;
      } else {
        stat.absentDays += 1;
      }
    });
  });

  return Array.from(statsMap.values())
    .filter((entry) => entry.totalDays > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildStudentSummaryCsv(currentClass, stats) {
  const rows = [["Class", "Section", "Student", "Present Days", "Absent Days", "Total Days", "Attendance %"]];

  stats.forEach((entry) => {
    const percentage = entry.totalDays === 0 ? 0 : (entry.presentDays / entry.totalDays) * 100;

    rows.push([
      currentClass.className,
      currentClass.section,
      entry.name,
      String(entry.presentDays),
      String(entry.absentDays),
      String(entry.totalDays),
      percentage.toFixed(1),
    ]);
  });

  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/\"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "value";
}
function renderClassSelector() {
  classSelect.innerHTML = "";

  classes.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = `${entry.className} - ${entry.section}`;
    classSelect.appendChild(option);
  });

  if (!classes.some((entry) => entry.id === currentClassId) && classes.length > 0) {
    currentClassId = classes[0].id;
  }

  classSelect.value = currentClassId;
}

function renderRecords(current) {
  recordList.innerHTML = "";

  if (!current || current.records.length === 0) {
    recordEmpty.style.display = "block";
    recordsDropdownToggle.classList.add("hidden");
    return;
  }

  recordEmpty.style.display = "none";
  const hasOlderRecords = current.records.length > 1;

  if (hasOlderRecords) {
    recordsDropdownToggle.classList.remove("hidden");
    recordsDropdownToggle.textContent = recordsExpanded
      ? "Hide Older Records"
      : `Show Older Records (${current.records.length - 1})`;
  } else {
    recordsDropdownToggle.classList.add("hidden");
  }

  const visibleRecords = recordsExpanded ? current.records : current.records.slice(0, 1);

  visibleRecords.forEach((record) => {
    const summary = summarizeRecord(record);

    const item = document.createElement("li");
    item.className = "record-item";

    const title = document.createElement("strong");
    title.textContent = record.date;

    const meta = document.createElement("span");
    meta.className = "record-meta";
    meta.textContent = `Present ${summary.present}/${summary.total} (${summary.percentage.toFixed(1)}%)`;

    item.append(title, meta);
    recordList.appendChild(item);
  });
}

function renderIndividualStats(current) {
  individualBody.innerHTML = "";

  if (!current) {
    individualEmpty.style.display = "block";
    return;
  }

  const stats = buildStudentStats(current);

  if (stats.length === 0) {
    individualEmpty.style.display = "block";
    return;
  }

  individualEmpty.style.display = "none";

  stats.forEach((entry) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = entry.name;

    const presentCell = document.createElement("td");
    presentCell.textContent = String(entry.presentDays);

    const absentCell = document.createElement("td");
    absentCell.textContent = String(entry.absentDays);

    const totalCell = document.createElement("td");
    totalCell.textContent = String(entry.totalDays);

    const percentageCell = document.createElement("td");
    const percentage = entry.totalDays === 0 ? 0 : (entry.presentDays / entry.totalDays) * 100;
    percentageCell.textContent = `${percentage.toFixed(1)}%`;

    row.append(nameCell, presentCell, absentCell, totalCell, percentageCell);
    individualBody.appendChild(row);
  });
}

function render() {
  saveData();
  queueCloudSync();
  renderClassSelector();
  list.innerHTML = "";

  const current = getCurrentClass();

  if (!current || current.students.length === 0) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
  }

  if (current) {
    current.students.forEach((student) => {
      const item = document.createElement("li");
      item.className = "student-item";

      const name = document.createElement("span");
      name.textContent = student.name;

      const controls = document.createElement("div");
      controls.className = "student-controls";

      const statusBtn = document.createElement("button");
      statusBtn.className = `status-btn ${student.currentPresent ? "status-present" : "status-absent"}`;
      statusBtn.textContent = student.currentPresent ? "Present" : "Absent";
      statusBtn.disabled = !isTeacher();
      statusBtn.addEventListener("click", () => toggleStatus(student.id));

      const removeBtn = document.createElement("button");
      removeBtn.className = "secondary-btn";
      removeBtn.textContent = "Remove";
      removeBtn.disabled = !isTeacher();
      removeBtn.addEventListener("click", () => removeStudent(student.id));

      controls.append(statusBtn, removeBtn);
      item.append(name, controls);
      list.appendChild(item);
    });
  }

  const summary = calculateSummary(current ? current.students : []);
  totalEl.textContent = String(summary.total);
  presentEl.textContent = String(summary.present);
  absentEl.textContent = String(summary.absent);
  percentageEl.textContent = `${summary.percentage.toFixed(1)}%`;

  renderRecords(current);
  renderIndividualStats(current);
}

function queueCloudSync() {
  if (!cloudConnected || !supabase) return;

  if (cloudSyncTimer) {
    clearTimeout(cloudSyncTimer);
  }

  cloudSyncTimer = setTimeout(() => {
    void uploadLocalToCloud({ silent: true });
  }, 1200);
}

function loadCloudSettings() {
  try {
    const raw = localStorage.getItem(CLOUD_SETTINGS_KEY);
    if (!raw) return { url: "", key: "" };

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { url: "", key: "" };

    return {
      url: typeof parsed.url === "string" ? parsed.url : "",
      key: typeof parsed.key === "string" ? parsed.key : "",
    };
  } catch {
    return { url: "", key: "" };
  }
}

function saveCloudSettings(settings) {
  localStorage.setItem(CLOUD_SETTINGS_KEY, JSON.stringify(settings));
}

function setCloudInputs(settings) {
  cloudUrlInput.value = settings.url || "";
  cloudKeyInput.value = settings.key || "";
}

async function ensureCloudConnected() {
  if (cloudConnected && supabase) return true;
  return tryConnectCloud({ autoPull: false });
}

function isLocalDataEmpty() {
  return classes.every((entry) => entry.students.length === 0 && entry.records.length === 0);
}

function applyLoadedPayload(payload) {
  const normalized = normalizeLoadedState(payload);
  classes = normalized.classes;
  currentClassId = normalized.currentClassId;

  if (classes.length === 0) {
    const firstClass = createClass("Class 1", "A");
    classes.push(firstClass);
    currentClassId = firstClass.id;
  }
}

async function tryConnectCloud({ autoPull }) {
  const saved = loadCloudSettings();
  const settings = {
    url: cloudUrlInput.value.trim() || saved.url,
    key: cloudKeyInput.value.trim() || saved.key,
  };

  if (!settings.url || !settings.key) {
    cloudConnected = false;
    supabase = null;
    setCloudStatus("Cloud not connected. Enter Supabase URL and anon key.");
    return false;
  }

  try {
    supabase = createClient(settings.url, settings.key);
    const { error } = await supabase.from(CLOUD_TABLE).select("app_id").limit(1);

    if (error) {
      cloudConnected = false;
      setCloudStatus(`Cloud connection failed: ${error.message}`, "error");
      return false;
    }

    cloudConnected = true;
    setCloudStatus("Cloud connected.", "connected");

    if (autoPull && isLocalDataEmpty()) {
      const payload = await fetchCloudState();
      if (payload) {
        applyLoadedPayload(payload);
        setMessage("Loaded existing cloud data.", "success");
        render();
      }
    }

    return true;
  } catch (error) {
    cloudConnected = false;
    supabase = null;
    setCloudStatus(`Cloud connection failed: ${getErrorMessage(error)}`, "error");
    return false;
  }
}

async function fetchCloudState() {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(CLOUD_TABLE)
    .select("payload")
    .eq("app_id", CLOUD_APP_ID)
    .maybeSingle();

  if (error) {
    setCloudStatus(`Read failed: ${error.message}`, "error");
    return null;
  }

  if (!data || !data.payload || typeof data.payload !== "object") {
    return null;
  }

  return data.payload;
}

async function uploadLocalToCloud({ silent }) {
  if (!supabase || cloudSyncInFlight) return false;

  cloudSyncInFlight = true;

  try {
    const { error } = await supabase.from(CLOUD_TABLE).upsert(
      {
        app_id: CLOUD_APP_ID,
        payload: {
          classes,
          currentClassId,
          version: 3,
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "app_id",
      }
    );

    if (error) {
      if (!silent) {
        setCloudStatus(`Upload failed: ${error.message}`, "error");
      }
      return false;
    }

    if (!silent) {
      setCloudStatus("Cloud upload completed.", "connected");
    }

    return true;
  } catch (error) {
    if (!silent) {
      setCloudStatus(`Upload failed: ${getErrorMessage(error)}`, "error");
    }
    return false;
  } finally {
    cloudSyncInFlight = false;
  }
}

function getErrorMessage(error) {
  if (!error || typeof error !== "object") return "Unknown error";
  if ("message" in error && typeof error.message === "string") return error.message;
  return "Unknown error";
}
