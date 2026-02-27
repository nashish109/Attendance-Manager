
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const STORAGE_KEY = "attendance_app_v3";
const LEGACY_STORAGE_KEY = "attendance_app_v2";
const CLOUD_SETTINGS_KEY = "attendance_cloud_settings_v1";
const CLOUD_TABLE = "attendance_state";
const CLOUD_APP_ID = "attendance_app_v2_default";
const USERS_KEY = "attendance_users_v1";
const SESSION_KEY = "attendance_session_v1";
const STUDENT_PORTAL_KEY = "attendance_student_portal_v1";

let classes = [];
let currentClassId = "";
let recordsExpanded = false;

let currentSession = null;
let authMode = "login";
let profileEditMode = false;
let teacherProfileEditMode = false;
let profileMessageTimer = null;

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
const classSubjectInput = document.getElementById("class-subject");
const classSelect = document.getElementById("class-select");
const deleteClassBtn = document.getElementById("delete-class");
const classMessage = document.getElementById("class-message");

const form = document.getElementById("student-form");
const nameInput = document.getElementById("student-name");
const list = document.getElementById("student-list");
const emptyState = document.getElementById("empty-state");
const studentsPanel = document.getElementById("panel-students");

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
const recordsTitle = document.querySelector("#panel-records h3");

const individualBody = document.getElementById("individual-body");
const individualEmpty = document.getElementById("individual-empty");
const trackingTitle = document.querySelector("#panel-tracking h3");
const trackingFirstColumnHeader = document.querySelector("#individual-table thead th:first-child");

const cloudUrlInput = document.getElementById("cloud-url");
const cloudKeyInput = document.getElementById("cloud-key");
const saveCloudConfigBtn = document.getElementById("save-cloud-config");
const uploadCloudBtn = document.getElementById("upload-cloud");
const downloadCloudBtn = document.getElementById("download-cloud");
const clearCloudConfigBtn = document.getElementById("clear-cloud-config");
const cloudStatus = document.getElementById("cloud-status");

const studentTotalClassesEl = document.getElementById("student-total-classes");
const studentAttendedClassesEl = document.getElementById("student-attended-classes");
const studentOverallPercentageEl = document.getElementById("student-overall-percentage");
const studentRequiredPercentageEl = document.getElementById("student-required-percentage");
const studentComplianceStatusEl = document.getElementById("student-compliance-status");
const dashboardSubjectBody = document.getElementById("dashboard-subject-body");
const dashboardSubjectEmpty = document.getElementById("dashboard-subject-empty");
const attendanceTrendChart = document.getElementById("attendance-trend-chart");
const trendEmpty = document.getElementById("trend-empty");
const projectionPercentageEl = document.getElementById("projection-percentage");
const projectionAllowableAbsencesEl = document.getElementById("projection-allowable-absences");
const projectionRequiredClassesEl = document.getElementById("projection-required-classes");
const studentAlertsEl = document.getElementById("student-alerts");

const subjectMessage = document.getElementById("subject-message");
const subjectBody = document.getElementById("subject-body");
const subjectEmpty = document.getElementById("subject-empty");

const calcTotalInput = document.getElementById("calc-total-classes");
const calcAttendedInput = document.getElementById("calc-attended-classes");
const calcTargetInput = document.getElementById("calc-target-percentage");
const calcCurrentPercentageEl = document.getElementById("calc-current-percentage");
const calcTargetDisplayEl = document.getElementById("calc-target-display");
const calcResultEl = document.getElementById("calc-result");

const profileForm = document.getElementById("profile-form");
const profileNameInput = document.getElementById("profile-name");
const profileRollInput = document.getElementById("profile-roll");
const profileDepartmentInput = document.getElementById("profile-department");
const profileSemesterInput = document.getElementById("profile-semester");
const profileTargetInput = document.getElementById("profile-target");
const profileEditBtn = document.getElementById("profile-edit-btn");
const profileSaveBtn = document.getElementById("profile-save-btn");
const profileLogoutBtn = document.getElementById("profile-logout-btn");
const profileMessage = document.getElementById("profile-message");

const teacherProfileForm = document.getElementById("teacher-profile-form");
const teacherProfileNameInput = document.getElementById("teacher-profile-name");
const teacherProfileIdInput = document.getElementById("teacher-profile-id");
const teacherProfileDepartmentInput = document.getElementById("teacher-profile-department");
const teacherProfileSubjectInput = document.getElementById("teacher-profile-subject");
const teacherProfileEditBtn = document.getElementById("teacher-profile-edit-btn");
const teacherProfileSaveBtn = document.getElementById("teacher-profile-save-btn");
const teacherProfileLogoutBtn = document.getElementById("teacher-profile-logout-btn");
const teacherProfileMessage = document.getElementById("teacher-profile-message");

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
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      const latest = loadData();
      classes = latest.classes;
      currentClassId = latest.currentClassId || classes[0]?.id || "";
      render();
      return;
    }

    if (event.key === STUDENT_PORTAL_KEY) {
      render();
    }
  });

  classForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isTeacher()) return;

    const className = classNameInput.value.trim();
    const section = classSectionInput.value.trim();
    const subject = classSubjectInput.value.trim();

    if (!className || !section || !subject) return;

    const created = createClass(className, section, subject, currentSession?.name || "Unknown Teacher");
    classes.push(created);
    currentClassId = created.id;
    classNameInput.value = "";
    classSectionInput.value = "";
    classSubjectInput.value = "";
    setClassMessage(`Added ${created.className} - ${created.section} (${created.subject}).`, "success");
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

  [calcTotalInput, calcAttendedInput, calcTargetInput].forEach((input) => {
    input.addEventListener("input", () => {
      renderCalculator();
    });
  });

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentSession || isTeacher()) return;
    if (!profileEditMode) {
      setProfileMessage("Click Edit Profile before saving changes.", "warning");
      return;
    }

    const profile = {
      name: profileNameInput.value.trim(),
      rollNumber: profileRollInput.value.trim(),
      department: profileDepartmentInput.value.trim(),
      semester: profileSemesterInput.value.trim(),
      targetPercentage: Number(profileTargetInput.value),
    };

    if (!profile.name) {
      setProfileMessage("Name is required.", "error");
      return;
    }
    if (!Number.isFinite(profile.targetPercentage) || profile.targetPercentage <= 0 || profile.targetPercentage > 100) {
      setProfileMessage("Target attendance must be between 1 and 100.", "error");
      return;
    }

    saveCurrentStudentProfile(profile);
    syncUserName(profile.name);
    flashProfileMessage("Profile saved.", "success");
    setProfileEditMode(false);
    render();
  });

  profileEditBtn.addEventListener("click", () => {
    if (!currentSession || isTeacher()) return;
    if (profileEditMode) {
      setProfileEditMode(false);
      flashProfileMessage("Edit cancelled.", "warning");
      renderProfile();
      return;
    }

    setProfileEditMode(true);
    flashProfileMessage("Edit mode enabled.", "success");
  });

  profileLogoutBtn.addEventListener("click", () => {
    currentSession = null;
    localStorage.removeItem(SESSION_KEY);
    showAuth();
  });

  teacherProfileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!currentSession || !isTeacher()) return;
    if (!teacherProfileEditMode) {
      setTeacherProfileMessage("Click Edit Profile before saving changes.", "warning");
      return;
    }

    const profile = {
      name: teacherProfileNameInput.value.trim(),
      teacherId: teacherProfileIdInput.value.trim(),
      department: teacherProfileDepartmentInput.value.trim(),
      primarySubject: teacherProfileSubjectInput.value.trim(),
    };

    if (!profile.name) {
      setTeacherProfileMessage("Name is required.", "error");
      return;
    }

    saveCurrentTeacherProfile(profile);
    syncUserName(profile.name);
    setTeacherProfileEditMode(false);
    setTeacherProfileMessage("Teacher profile saved.", "success");
    renderTeacherProfile();
  });

  teacherProfileEditBtn.addEventListener("click", () => {
    if (!currentSession || !isTeacher()) return;
    setTeacherProfileEditMode(!teacherProfileEditMode);
    setTeacherProfileMessage(
      teacherProfileEditMode ? "Edit mode enabled. Update fields and save." : "Edit cancelled."
    );
    renderTeacherProfile();
  });

  teacherProfileLogoutBtn.addEventListener("click", () => {
    currentSession = null;
    localStorage.removeItem(SESSION_KEY);
    showAuth();
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
  profileEditMode = false;
  teacherProfileEditMode = false;
  userBadge.textContent = `${currentSession?.role || "user"}: ${currentSession?.name || currentSession?.email || ""}`;
  applyRolePermissions();
  openPanel(isTeacher() ? "page-core" : "page-student-dashboard");
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

function loadStudentPortalData() {
  const fallback = { profiles: {}, subjects: {} };

  try {
    const raw = localStorage.getItem(STUDENT_PORTAL_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;

    const profiles = parsed.profiles && typeof parsed.profiles === "object" ? parsed.profiles : {};
    const subjects = parsed.subjects && typeof parsed.subjects === "object" ? parsed.subjects : {};

    return { profiles, subjects };
  } catch {
    return fallback;
  }
}

function saveStudentPortalData(data) {
  localStorage.setItem(STUDENT_PORTAL_KEY, JSON.stringify(data));
}

function getCurrentSessionKey() {
  if (!currentSession) return "";
  return `${currentSession.role}:${String(currentSession.email || "").toLowerCase()}`;
}

function getDefaultStudentProfile() {
  return {
    name: currentSession?.name || "",
    rollNumber: "",
    department: "",
    semester: "",
    targetPercentage: 75,
  };
}

function getCurrentStudentProfile() {
  const key = getCurrentSessionKey();
  if (!key) return getDefaultStudentProfile();

  const data = loadStudentPortalData();
  const existing = data.profiles[key];
  if (!existing || typeof existing !== "object") return getDefaultStudentProfile();

  return {
    name: typeof existing.name === "string" && existing.name.trim() ? existing.name : currentSession?.name || "",
    rollNumber: typeof existing.rollNumber === "string" ? existing.rollNumber : "",
    department: typeof existing.department === "string" ? existing.department : "",
    semester: typeof existing.semester === "string" ? existing.semester : "",
    targetPercentage:
      typeof existing.targetPercentage === "number" && existing.targetPercentage > 0 && existing.targetPercentage <= 100
        ? existing.targetPercentage
        : 75,
  };
}

function saveCurrentStudentProfile(profile) {
  const key = getCurrentSessionKey();
  if (!key) return;

  const data = loadStudentPortalData();
  data.profiles[key] = {
    name: profile.name,
    rollNumber: profile.rollNumber,
    department: profile.department,
    semester: profile.semester,
    targetPercentage: profile.targetPercentage,
  };
  saveStudentPortalData(data);
}

function getDefaultTeacherProfile() {
  return {
    name: currentSession?.name || "",
    teacherId: "",
    department: "",
    primarySubject: "",
  };
}

function getCurrentTeacherProfile() {
  const key = getCurrentSessionKey();
  if (!key) return getDefaultTeacherProfile();

  const data = loadStudentPortalData();
  const existing = data.profiles[key];
  if (!existing || typeof existing !== "object") return getDefaultTeacherProfile();

  return {
    name: typeof existing.name === "string" && existing.name.trim() ? existing.name : currentSession?.name || "",
    teacherId: typeof existing.teacherId === "string" ? existing.teacherId : "",
    department: typeof existing.department === "string" ? existing.department : "",
    primarySubject: typeof existing.primarySubject === "string" ? existing.primarySubject : "",
  };
}

function saveCurrentTeacherProfile(profile) {
  const key = getCurrentSessionKey();
  if (!key) return;

  const data = loadStudentPortalData();
  data.profiles[key] = {
    name: profile.name,
    teacherId: profile.teacherId,
    department: profile.department,
    primarySubject: profile.primarySubject,
  };
  saveStudentPortalData(data);
}

function isTeacher() {
  return currentSession?.role === "teacher";
}

function applyRolePermissions() {
  const teacherMode = isTeacher();
  const teacherPages = new Set(["page-core", "page-records-tracking", "page-reports", "page-cloud", "page-teacher-profile"]);
  const studentPages = new Set([
    "page-student-dashboard",
    "page-student-subjects",
    "page-student-calculator",
    "page-student-profile",
  ]);

  document.querySelectorAll("[data-teacher-only]").forEach((el) => {
    el.classList.toggle("hidden", !teacherMode);
    if ("disabled" in el) {
      el.disabled = !teacherMode;
    }
  });

  navLinks.forEach((button) => {
    const pageId = button.dataset.page || "";
    if (teacherPages.has(pageId)) {
      button.classList.toggle("hidden", !teacherMode);
      return;
    }
    if (studentPages.has(pageId)) {
      button.classList.toggle("hidden", teacherMode);
    }
  });

  if (!teacherMode) {
    if (studentsPanel) studentsPanel.classList.add("hidden");
    if (recordsTitle) recordsTitle.textContent = "My Daily Attendance (Selected Subject)";
    if (trackingTitle) trackingTitle.textContent = "My Attendance by Subject";
    if (trackingFirstColumnHeader) trackingFirstColumnHeader.textContent = "Subject";
    setMessage("Student mode: view access enabled.");
    return;
  }

  if (studentsPanel) studentsPanel.classList.remove("hidden");
  if (recordsTitle) recordsTitle.textContent = "Attendance Records";
  if (trackingTitle) trackingTitle.textContent = "Student Attendance Tracking";
  if (trackingFirstColumnHeader) trackingFirstColumnHeader.textContent = "Student";
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

function createClass(className, section, subject = "General", teacherName = "") {
  return {
    id: crypto.randomUUID(),
    className,
    section,
    subject,
    teacherName: teacherName || currentSession?.name || "Unknown Teacher",
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
        subject:
          typeof entry.subject === "string" && entry.subject.trim().length > 0
            ? entry.subject.trim()
            : "General",
        teacherName:
          typeof entry.teacherName === "string" && entry.teacherName.trim().length > 0
            ? entry.teacherName.trim()
            : "Unknown Teacher",
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

function setAttendance(studentId, present) {
  if (!isTeacher()) return;

  const current = getCurrentClass();
  if (!current) return;

  const student = current.students.find((entry) => entry.id === studentId);
  if (!student) return;

  student.currentPresent = Boolean(present);
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

function setSubjectMessage(message, kind = "") {
  subjectMessage.textContent = message;
  subjectMessage.classList.remove("success", "error", "warning");
  if (kind) {
    subjectMessage.classList.add(kind);
  }
}

function setProfileMessage(message, kind = "") {
  profileMessage.textContent = message;
  profileMessage.classList.remove("success", "error", "warning");
  if (kind) {
    profileMessage.classList.add(kind);
  }
}

function flashProfileMessage(message, kind = "success", timeoutMs = 1800) {
  setProfileMessage(message, kind);

  if (profileMessageTimer) {
    clearTimeout(profileMessageTimer);
  }

  profileMessageTimer = setTimeout(() => {
    setProfileMessage("");
    profileMessageTimer = null;
  }, timeoutMs);
}

function setTeacherProfileMessage(message, kind = "") {
  teacherProfileMessage.textContent = message;
  teacherProfileMessage.classList.remove("success", "error", "warning");
  if (kind) {
    teacherProfileMessage.classList.add(kind);
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

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function findCurrentSessionStudent(currentClass) {
  if (!currentClass || !currentSession) return null;

  const sessionName = normalizeName(currentSession.name);
  if (!sessionName) return null;

  return currentClass.students.find((student) => normalizeName(student.name) === sessionName) || null;
}

function getStudentEntryForRecord(record, studentId, sessionName) {
  if (!record || !Array.isArray(record.entries)) return null;

  return (
    record.entries.find((entry) => entry.studentId === studentId) ||
    record.entries.find((entry) => normalizeName(entry.name) === sessionName) ||
    null
  );
}

function buildMySubjectStats() {
  const sessionName = normalizeName(currentSession?.name);
  if (!sessionName) return [];

  const rows = [];

  classes.forEach((entry) => {
    const student = findCurrentSessionStudent(entry);
    if (!student) return;

    const stats = {
      subject: entry.subject || "General",
      className: entry.className,
      section: entry.section,
      teacherName: entry.teacherName || "Unknown Teacher",
      subjectLabel: `${entry.subject || "General"} (${entry.className} - ${entry.section}) - ${entry.teacherName || "Unknown Teacher"}`,
      presentDays: 0,
      absentDays: 0,
      totalDays: 0,
    };

    entry.records.forEach((record) => {
      const attendance = getStudentEntryForRecord(record, student.id, sessionName);
      if (!attendance) return;

      stats.totalDays += 1;
      if (attendance.present) {
        stats.presentDays += 1;
      } else {
        stats.absentDays += 1;
      }
    });

    rows.push(stats);
  });

  return rows.sort((a, b) => a.subjectLabel.localeCompare(b.subjectLabel));
}

function getAttendancePercentage(attendedClasses, totalClasses) {
  if (totalClasses <= 0) return 0;
  return (attendedClasses / totalClasses) * 100;
}

function getAttendanceStatus(percentage, targetPercentage) {
  const deviation = percentage - targetPercentage;
  if (deviation >= 3) return "Safe";
  if (deviation >= 0) return "At Risk";
  return "Critical";
}

function classesNeededToReachTarget(totalClasses, attendedClasses, targetPercentage) {
  const target = targetPercentage / 100;
  if (target >= 1) {
    return attendedClasses >= totalClasses ? 0 : Number.POSITIVE_INFINITY;
  }
  const required = (target * totalClasses - attendedClasses) / (1 - target);
  return Math.max(0, Math.ceil(required));
}

function classesCanMissSafely(totalClasses, attendedClasses, targetPercentage) {
  const target = targetPercentage / 100;
  if (target <= 0) return Number.POSITIVE_INFINITY;

  const allowed = attendedClasses / target - totalClasses;
  return Math.max(0, Math.floor(allowed));
}

function getComplianceStatus(percentage, targetPercentage) {
  if (percentage >= targetPercentage) return "Compliant";
  if (percentage >= targetPercentage - 3) return "At Risk";
  return "Non-Compliant";
}

function buildMyTrendSeries() {
  const sessionName = normalizeName(currentSession?.name);
  if (!sessionName) return [];

  const dateMap = new Map();

  classes.forEach((entry) => {
    const student = findCurrentSessionStudent(entry);
    if (!student) return;

    entry.records.forEach((record) => {
      const attendance = getStudentEntryForRecord(record, student.id, sessionName);
      if (!attendance) return;

      if (!dateMap.has(record.date)) {
        dateMap.set(record.date, { date: record.date, present: 0, total: 0 });
      }

      const bucket = dateMap.get(record.date);
      bucket.total += 1;
      if (attendance.present) bucket.present += 1;
    });
  });

  return Array.from(dateMap.values())
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((entry) => ({
      ...entry,
      percentage: getAttendancePercentage(entry.present, entry.total),
    }));
}

function renderTrendChart(series) {
  if (!attendanceTrendChart || !trendEmpty) return;

  attendanceTrendChart.innerHTML = "";

  if (series.length < 2) {
    trendEmpty.classList.remove("hidden");
    return;
  }

  trendEmpty.classList.add("hidden");
  const width = 800;
  const height = 220;
  const left = 44;
  const right = 16;
  const top = 16;
  const bottom = 32;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  for (let i = 0; i <= 4; i += 1) {
    const y = top + (plotHeight / 4) * i;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(left));
    line.setAttribute("y1", String(y));
    line.setAttribute("x2", String(width - right));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", "#d6e0ea");
    line.setAttribute("stroke-width", "1");
    attendanceTrendChart.appendChild(line);
  }

  const points = series.map((entry, index) => {
    const x = left + (plotWidth * index) / (series.length - 1);
    const y = top + ((100 - entry.percentage) / 100) * plotHeight;
    return { ...entry, x, y };
  });

  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", "#0f766e");
  polyline.setAttribute("stroke-width", "2.5");
  polyline.setAttribute("points", points.map((point) => `${point.x},${point.y}`).join(" "));
  attendanceTrendChart.appendChild(polyline);

  points.forEach((point, index) => {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", String(point.x));
    dot.setAttribute("cy", String(point.y));
    dot.setAttribute("r", "3.5");
    dot.setAttribute("fill", "#0f766e");
    attendanceTrendChart.appendChild(dot);

    if (index % Math.ceil(points.length / 6) === 0 || index === points.length - 1) {
      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", String(point.x));
      label.setAttribute("y", String(height - 10));
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("font-size", "10");
      label.setAttribute("fill", "#607282");
      label.textContent = point.date.slice(5);
      attendanceTrendChart.appendChild(label);
    }
  });
}

function setProfileEditMode(enabled) {
  profileEditMode = Boolean(enabled);

  const readOnly = !profileEditMode;
  profileNameInput.readOnly = readOnly;
  profileRollInput.readOnly = readOnly;
  profileDepartmentInput.readOnly = readOnly;
  profileSemesterInput.readOnly = readOnly;
  profileTargetInput.readOnly = readOnly;
  profileSaveBtn.disabled = readOnly;
  profileEditBtn.textContent = profileEditMode ? "Cancel Edit" : "Edit Profile";
}

function setTeacherProfileEditMode(enabled) {
  teacherProfileEditMode = Boolean(enabled);

  const readOnly = !teacherProfileEditMode;
  teacherProfileNameInput.readOnly = readOnly;
  teacherProfileIdInput.readOnly = readOnly;
  teacherProfileDepartmentInput.readOnly = readOnly;
  teacherProfileSubjectInput.readOnly = readOnly;
  teacherProfileSaveBtn.disabled = readOnly;
  teacherProfileEditBtn.textContent = teacherProfileEditMode ? "Cancel Edit" : "Edit Profile";
}

function renderStudentDashboard() {
  if (!currentSession || isTeacher()) return;

  const profile = getCurrentStudentProfile();
  const target = profile.targetPercentage;
  const subjects = buildMySubjectStats().map((entry) => {
    const percentage = getAttendancePercentage(entry.presentDays, entry.totalDays);
    const deviation = percentage - target;

    return {
      subject: entry.subject,
      className: entry.className,
      section: entry.section,
      teacherName: entry.teacherName,
      totalClasses: entry.totalDays,
      attendedClasses: entry.presentDays,
      percentage,
      deviation,
      risk: getAttendanceStatus(percentage, target),
      requiredClasses:
        percentage >= target ? 0 : classesNeededToReachTarget(entry.totalDays, entry.presentDays, target),
    };
  });

  const totals = subjects.reduce(
    (acc, subject) => {
      acc.totalClasses += subject.totalClasses;
      acc.attendedClasses += subject.attendedClasses;
      return acc;
    },
    { totalClasses: 0, attendedClasses: 0 }
  );

  const overallPercentage = getAttendancePercentage(totals.attendedClasses, totals.totalClasses);
  const complianceStatus = getComplianceStatus(overallPercentage, target);
  const statusClass =
    complianceStatus === "Compliant"
      ? "status-safe"
      : complianceStatus === "At Risk"
      ? "status-warning"
      : "status-critical";

  studentTotalClassesEl.textContent = String(totals.totalClasses);
  studentAttendedClassesEl.textContent = String(totals.attendedClasses);
  studentOverallPercentageEl.textContent = `${overallPercentage.toFixed(1)}%`;
  studentRequiredPercentageEl.textContent = `${target.toFixed(1)}%`;
  studentComplianceStatusEl.textContent = complianceStatus;
  studentComplianceStatusEl.className = statusClass;

  dashboardSubjectBody.innerHTML = "";
  if (subjects.length === 0) {
    dashboardSubjectEmpty.style.display = "block";
  } else {
    dashboardSubjectEmpty.style.display = "none";
    subjects
      .sort((a, b) => a.subject.localeCompare(b.subject))
      .forEach((subject) => {
        const row = document.createElement("tr");

        const subjectCell = document.createElement("td");
        subjectCell.textContent = `${subject.subject} (${subject.className}-${subject.section})`;

        const totalCell = document.createElement("td");
        totalCell.textContent = String(subject.totalClasses);

        const attendedCell = document.createElement("td");
        attendedCell.textContent = String(subject.attendedClasses);

        const percentageCell = document.createElement("td");
        percentageCell.textContent = `${subject.percentage.toFixed(1)}%`;

        const deviationCell = document.createElement("td");
        deviationCell.textContent = `${subject.deviation >= 0 ? "+" : ""}${subject.deviation.toFixed(1)}%`;

        const riskCell = document.createElement("td");
        riskCell.textContent = subject.risk;
        riskCell.className =
          subject.risk === "Safe" ? "status-safe" : subject.risk === "At Risk" ? "status-warning" : "status-critical";

        const requiredCell = document.createElement("td");
        requiredCell.textContent =
          subject.requiredClasses === Number.POSITIVE_INFINITY
            ? "N/A"
            : String(subject.requiredClasses);

        row.append(subjectCell, totalCell, attendedCell, percentageCell, deviationCell, riskCell, requiredCell);
        dashboardSubjectBody.appendChild(row);
      });
  }

  const trendSeries = buildMyTrendSeries();
  renderTrendChart(trendSeries);

  const projectedCycleClasses = Math.max(subjects.length, 1);
  const projectedPercentage = getAttendancePercentage(
    totals.attendedClasses + projectedCycleClasses,
    totals.totalClasses + projectedCycleClasses
  );
  const allowableAbsences = classesCanMissSafely(totals.totalClasses, totals.attendedClasses, target);
  const requiredOverallClasses = classesNeededToReachTarget(totals.totalClasses, totals.attendedClasses, target);

  projectionPercentageEl.textContent = `${projectedPercentage.toFixed(1)}%`;
  projectionAllowableAbsencesEl.textContent =
    allowableAbsences === Number.POSITIVE_INFINITY ? "Unlimited" : String(allowableAbsences);
  projectionRequiredClassesEl.textContent =
    requiredOverallClasses === Number.POSITIVE_INFINITY ? "N/A" : String(requiredOverallClasses);

  studentAlertsEl.innerHTML = "";
  const belowThreshold = subjects.filter((subject) => subject.deviation < 0);
  const nearThreshold = subjects.filter((subject) => subject.deviation >= 0 && subject.deviation < 3);

  if (belowThreshold.length > 0) {
    const alert = document.createElement("div");
    alert.className = "alert-item alert-critical";
    alert.textContent = `${belowThreshold.length} subject(s) are below threshold and need immediate recovery focus.`;
    studentAlertsEl.appendChild(alert);
  }

  if (nearThreshold.length > 0) {
    const alert = document.createElement("div");
    alert.className = "alert-item alert-warning";
    alert.textContent = `${nearThreshold.length} subject(s) are within 3% of threshold and require stabilization.`;
    studentAlertsEl.appendChild(alert);
  }

  if (subjects.length > 0 && belowThreshold.length === 0 && nearThreshold.length === 0) {
    const alert = document.createElement("div");
    alert.className = "alert-item alert-safe";
    alert.textContent = "All tracked subjects are in compliant range with stable buffer.";
    studentAlertsEl.appendChild(alert);
  }

  if (subjects.length === 0) {
    const alert = document.createElement("div");
    alert.className = "alert-item";
    alert.textContent = "No attendance data available yet. Ask faculty to post attendance records.";
    studentAlertsEl.appendChild(alert);
  }
}

function renderStudentSubjects() {
  if (!currentSession || isTeacher()) return;

  const profile = getCurrentStudentProfile();
  const subjects = buildMySubjectStats().map((entry) => ({
    subject: entry.subject,
    className: entry.className,
    section: entry.section,
    teacherName: entry.teacherName,
    totalClasses: entry.totalDays,
    attendedClasses: entry.presentDays,
  }));

  subjectBody.innerHTML = "";
  if (subjects.length === 0) {
    subjectEmpty.style.display = "block";
    subjectEmpty.textContent = "No teacher-linked subjects found yet.";
    return;
  }

  subjectEmpty.style.display = "none";
  setSubjectMessage("Subjects are auto-synced from teacher records.", "success");

  subjects.forEach((subject) => {
    const row = document.createElement("tr");
    const percentage = getAttendancePercentage(subject.attendedClasses, subject.totalClasses);
    const status = getAttendanceStatus(percentage, profile.targetPercentage);

    const nameCell = document.createElement("td");
    nameCell.textContent = subject.subject;

    const classCell = document.createElement("td");
    classCell.textContent = subject.className;

    const sectionCell = document.createElement("td");
    sectionCell.textContent = subject.section;

    const teacherCell = document.createElement("td");
    teacherCell.textContent = subject.teacherName;

    const totalCell = document.createElement("td");
    totalCell.textContent = String(subject.totalClasses);

    const attendedCell = document.createElement("td");
    attendedCell.textContent = String(subject.attendedClasses);

    const percentageCell = document.createElement("td");
    percentageCell.textContent = `${percentage.toFixed(1)}%`;

    const statusCell = document.createElement("td");
    statusCell.textContent = status;
    statusCell.className =
      status === "Safe" ? "status-safe" : status === "At Risk" ? "status-warning" : "status-critical";

    row.append(nameCell, classCell, sectionCell, teacherCell, totalCell, attendedCell, percentageCell, statusCell);
    subjectBody.appendChild(row);
  });
}

function renderCalculator() {
  if (!currentSession || isTeacher()) return;

  const profile = getCurrentStudentProfile();
  const totalClasses = Math.max(0, Number(calcTotalInput.value) || 0);
  const attendedClasses = Math.max(0, Math.min(totalClasses, Number(calcAttendedInput.value) || 0));
  const target = Number(calcTargetInput.value) > 0 ? Number(calcTargetInput.value) : profile.targetPercentage;

  const currentPercentage = getAttendancePercentage(attendedClasses, totalClasses);
  calcCurrentPercentageEl.textContent = `${currentPercentage.toFixed(1)}%`;
  calcTargetDisplayEl.textContent = `${target.toFixed(1)}%`;

  calcResultEl.classList.remove("success", "error", "warning");

  if (currentPercentage >= target) {
    const canMiss = classesCanMissSafely(totalClasses, attendedClasses, target);
    calcResultEl.textContent = `You can miss ${canMiss} more class${canMiss === 1 ? "" : "es"} and stay above ${target.toFixed(
      1
    )}%.`;
    calcResultEl.classList.add("success");
    return;
  }

  const need = classesNeededToReachTarget(totalClasses, attendedClasses, target);
  calcResultEl.textContent =
    need === Number.POSITIVE_INFINITY
      ? `You must attend every upcoming class to aim for ${target.toFixed(1)}%.`
      : `You must attend the next ${need} class${need === 1 ? "" : "es"} to reach ${target.toFixed(1)}%.`;
  calcResultEl.classList.add("error");
}

function renderProfile() {
  if (!currentSession || isTeacher()) return;

  const profile = getCurrentStudentProfile();
  if (!profileEditMode) {
    profileNameInput.value = profile.name;
    profileRollInput.value = profile.rollNumber;
    profileDepartmentInput.value = profile.department;
    profileSemesterInput.value = profile.semester;
    profileTargetInput.value = String(profile.targetPercentage);
  }
  setProfileEditMode(profileEditMode);
}

function renderTeacherProfile() {
  if (!currentSession || !isTeacher()) return;

  const profile = getCurrentTeacherProfile();
  if (!teacherProfileEditMode) {
    teacherProfileNameInput.value = profile.name;
    teacherProfileIdInput.value = profile.teacherId;
    teacherProfileDepartmentInput.value = profile.department;
    teacherProfileSubjectInput.value = profile.primarySubject;
  }
  setTeacherProfileEditMode(teacherProfileEditMode);
}

function syncUserName(nextName) {
  if (!currentSession) return;

  currentSession.name = nextName;
  saveSession(currentSession);
  userBadge.textContent = `${currentSession.role}: ${currentSession.name || currentSession.email || ""}`;

  const users = loadUsers();
  const index = users.findIndex((user) => user.email === currentSession.email && user.role === currentSession.role);
  if (index !== -1) {
    users[index].name = nextName;
    saveUsers(users);
  }
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
    option.textContent = `${entry.className} - ${entry.section} | ${entry.subject} | ${entry.teacherName}`;
    classSelect.appendChild(option);
  });

  if (!classes.some((entry) => entry.id === currentClassId) && classes.length > 0) {
    currentClassId = classes[0].id;
  }

  classSelect.value = currentClassId;
}

function renderRecords(current) {
  recordList.innerHTML = "";

  if (!current) {
    recordEmpty.style.display = "block";
    recordEmpty.textContent = isTeacher()
      ? "No date records saved yet."
      : "No attendance records available for this subject yet.";
    recordsDropdownToggle.classList.add("hidden");
    return;
  }

  if (isTeacher()) {
    if (current.records.length === 0) {
      recordEmpty.style.display = "block";
      recordEmpty.textContent = "No date records saved yet.";
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
    return;
  }

  const student = findCurrentSessionStudent(current);
  const sessionName = normalizeName(currentSession?.name);

  if (!student) {
    recordEmpty.style.display = "block";
    recordEmpty.textContent = "You are not added to this subject yet.";
    recordsDropdownToggle.classList.add("hidden");
    return;
  }

  const personalRecords = current.records
    .map((record) => {
      const attendance = getStudentEntryForRecord(record, student.id, sessionName);
      if (!attendance) return null;

      return {
        date: record.date,
        present: attendance.present,
      };
    })
    .filter(Boolean);

  if (personalRecords.length === 0) {
    recordEmpty.style.display = "block";
    recordEmpty.textContent = "No attendance has been posted for you in this subject yet.";
    recordsDropdownToggle.classList.add("hidden");
    return;
  }

  recordEmpty.style.display = "none";
  const hasOlderRecords = personalRecords.length > 1;

  if (hasOlderRecords) {
    recordsDropdownToggle.classList.remove("hidden");
    recordsDropdownToggle.textContent = recordsExpanded
      ? "Hide Older Records"
      : `Show Older Records (${personalRecords.length - 1})`;
  } else {
    recordsDropdownToggle.classList.add("hidden");
  }

  const visibleRecords = recordsExpanded ? personalRecords : personalRecords.slice(0, 1);

  visibleRecords.forEach((record) => {
    const item = document.createElement("li");
    item.className = "record-item";

    const title = document.createElement("strong");
    title.textContent = record.date;

    const meta = document.createElement("span");
    meta.className = "record-meta";
    meta.textContent = `Status: ${record.present ? "Present" : "Absent"} | ${current.subject} | ${current.teacherName}`;

    item.append(title, meta);
    recordList.appendChild(item);
  });
}

function renderIndividualStats(current) {
  individualBody.innerHTML = "";

  if (isTeacher() && !current) {
    individualEmpty.style.display = "block";
    individualEmpty.textContent = "No attendance records available yet.";
    return;
  }

  const stats = isTeacher() ? buildStudentStats(current) : buildMySubjectStats();

  if (stats.length === 0) {
    individualEmpty.style.display = "block";
    individualEmpty.textContent = isTeacher()
      ? "No attendance records available yet."
      : "No attendance records available for your account yet.";
    return;
  }

  individualEmpty.style.display = "none";

  stats.forEach((entry) => {
    const row = document.createElement("tr");

    const firstCell = document.createElement("td");
    firstCell.textContent = isTeacher() ? entry.name : entry.subjectLabel;

    const presentCell = document.createElement("td");
    presentCell.textContent = String(entry.presentDays);

    const absentCell = document.createElement("td");
    absentCell.textContent = String(entry.absentDays);

    const totalCell = document.createElement("td");
    totalCell.textContent = String(entry.totalDays);

    const percentageCell = document.createElement("td");
    const percentage = entry.totalDays === 0 ? 0 : (entry.presentDays / entry.totalDays) * 100;
    percentageCell.textContent = `${percentage.toFixed(1)}%`;

    row.append(firstCell, presentCell, absentCell, totalCell, percentageCell);
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

      const attendanceLabel = document.createElement("label");
      attendanceLabel.className = "attendance-toggle";

      const statusCheckbox = document.createElement("input");
      statusCheckbox.type = "checkbox";
      statusCheckbox.checked = student.currentPresent;
      statusCheckbox.disabled = !isTeacher();
      statusCheckbox.addEventListener("change", () => setAttendance(student.id, statusCheckbox.checked));

      const attendanceText = document.createElement("span");
      attendanceText.className = `attendance-state ${student.currentPresent ? "present" : "absent"}`;
      attendanceText.textContent = student.currentPresent ? "Present" : "Absent";

      attendanceLabel.append(statusCheckbox, attendanceText);

      const removeBtn = document.createElement("button");
      removeBtn.className = "secondary-btn";
      removeBtn.textContent = "Remove";
      removeBtn.disabled = !isTeacher();
      removeBtn.addEventListener("click", () => removeStudent(student.id));

      controls.append(attendanceLabel, removeBtn);
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

  if (!isTeacher()) {
    if (!calcTargetInput.value) {
      calcTargetInput.value = String(getCurrentStudentProfile().targetPercentage);
    }
    renderStudentDashboard();
    renderStudentSubjects();
    renderCalculator();
    renderProfile();
    return;
  }

  renderTeacherProfile();
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
