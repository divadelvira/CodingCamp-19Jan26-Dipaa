// Import Firebase Modules from official CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail, 
    sendEmailVerification, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    deleteDoc, 
    onSnapshot, 
    collection, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// FIREBASE CONFIGURATION
// Ganti dengan konfigurasi Firebase Web App Anda
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyD9uEH08W6mgx5UUmBFxe_ft-_W5jpXnMI",
    authDomain: "mytodolist-codingcamp-project.firebaseapp.com",
    projectId: "mytodolist-codingcamp-project",
    storageBucket: "mytodolist-codingcamp-project.firebasestorage.app",
    messagingSenderId: "860371798604",
    appId: "1:860371798604:web:5ac48f3b3033d3071d42e9",
    measurementId: "G-M741WNM73K"
};

// Cek apakah konfigurasi Firebase sudah dimasukkan oleh pengguna
const isFirebaseSetup = firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY";

// Firebase variables
let auth = null;
let db = null;
let currentUser = null;
let unsubscribeTodos = null;
let currentCloudTodos = [];

// DOM Elements - General
const titleInput = document.getElementById("todo-input");
const descInput = document.getElementById("desc-input");
const startInput = document.getElementById("start-date-input");
const dueInput = document.getElementById("due-date-input");
const priorityInput = document.getElementById("priority-input");
const todoForm = document.getElementById("todo-form");
const todoList = document.querySelector(".todo-list");
const filterOption = document.getElementById("filter-select");
const sortOption = document.getElementById("sort-select");
const searchInput = document.getElementById("search-input");
const deleteAllBtn = document.getElementById("delete-all-btn");
const emptyMsg = document.getElementById("empty-msg");

// Progress elements
const progressPercent = document.getElementById("progress-percent");
const progressBarFill = document.getElementById("progress-bar-fill");
const progressMotivate = document.getElementById("progress-motivate");

// Theme element
const themeToggleBtn = document.getElementById("theme-toggle");

// Connection Banner
const connectionBanner = document.getElementById("connection-banner");
const connectionStatusText = document.getElementById("connection-status-text");

// User Status in Header
const userStatusContainer = document.getElementById("user-status-container");
const userEmailDisplay = document.getElementById("user-email-display");
const logoutBtn = document.getElementById("logout-btn");

// App Wrapper
const todoAppContent = document.getElementById("todo-app-content");

// Auth Form Wrapper
const authContainer = document.getElementById("auth-container");

// Auth Tabs
const tabLoginBtn = document.getElementById("tab-login-btn");
const tabRegisterBtn = document.getElementById("tab-register-btn");

// Auth Forms
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const forgotPasswordForm = document.getElementById("forgot-password-form");

// Auth Links
const forgotPasswordLink = document.getElementById("forgot-password-link");
const backToLoginLink = document.getElementById("back-to-login-link");

// Edit Modal elements
const editModalBackdrop = document.getElementById("edit-modal-backdrop");
const editModalClose = document.getElementById("edit-modal-close");
const editModalCancel = document.getElementById("edit-modal-cancel");
const editModalSave = document.getElementById("edit-modal-save");
const editTitleInput = document.getElementById("edit-title-input");
const editDescInput = document.getElementById("edit-desc-input");
const editStartInput = document.getElementById("edit-start-input");
const editDueInput = document.getElementById("edit-due-input");
const editPriorityInput = document.getElementById("edit-priority-input");

// Confirm Modal elements
const confirmModalBackdrop = document.getElementById("confirm-modal-backdrop");
const confirmModalClose = document.getElementById("confirm-modal-close");
const confirmModalCancel = document.getElementById("confirm-modal-cancel");
const confirmModalBtn = document.getElementById("confirm-modal-btn");
const confirmModalTitle = document.getElementById("confirm-modal-title");
const confirmModalMessage = document.getElementById("confirm-modal-message");

// State variables
let editingTodoId = null;
let confirmCallback = null;

// ==========================================
// EVENT LISTENERS (GLOBAL)
// ==========================================

// Theme Toggling
themeToggleBtn.addEventListener("click", toggleTheme);

// Tab switching
tabLoginBtn.addEventListener("click", () => showForm("login"));
tabRegisterBtn.addEventListener("click", () => showForm("register"));

// Links navigation
forgotPasswordLink.addEventListener("click", (e) => {
    e.preventDefault();
    showForm("forgot");
});
backToLoginLink.addEventListener("click", (e) => {
    e.preventDefault();
    showForm("login");
});

// Form Submissions
loginForm.addEventListener("submit", handleLogin);
registerForm.addEventListener("submit", handleRegister);
forgotPasswordForm.addEventListener("submit", handleForgotPassword);
logoutBtn.addEventListener("click", handleLogout);

// Todo CRUD
todoForm.addEventListener("submit", addTodo);
todoList.addEventListener("click", handleAction);
filterOption.addEventListener("change", renderTodos);
sortOption.addEventListener("change", renderTodos);
searchInput.addEventListener("input", renderTodos);
deleteAllBtn.addEventListener("click", handleDeleteAll);

// Modals closing
confirmModalCancel.addEventListener("click", closeConfirmModal);
confirmModalClose.addEventListener("click", closeConfirmModal);

// ==========================================
// INITIALIZE APPLICATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    
    // Set default dates
    const todayStr = new Date().toISOString().split('T')[0];
    startInput.value = todayStr;
    dueInput.value = todayStr;

    if (isFirebaseSetup) {
        initFirebase();
    } else {
        initOfflineMode();
    }
});

// ==========================================
// FIREBASE SETUP & LOGIC
// ==========================================
function initFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        // Connection banner shows connecting status
        connectionBanner.className = "connection-banner offline";
        connectionStatusText.textContent = "Menghubungkan ke Cloud Sync...";
        connectionBanner.classList.remove("hidden");

        // Listen for authentication changes
        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
                
                // Show User status in header
                userEmailDisplay.textContent = user.email;
                userStatusContainer.classList.remove("hidden");
                
                // Hide Auth UI and show App Content
                authContainer.classList.add("hidden");
                todoAppContent.classList.remove("hidden");

                // Update connection status
                if (user.emailVerified) {
                    connectionBanner.className = "connection-banner online";
                    connectionStatusText.innerHTML = '<i class="fas fa-cloud"></i> Tersambung ke Cloud Sync (Akun Aktif)';
                } else {
                    connectionBanner.className = "connection-banner offline";
                    connectionStatusText.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Akun belum aktif. Silakan verifikasi email Anda!';
                }

                // Subscribe to firestore data
                subscribeToFirestore(user.uid);

            } else {
                currentUser = null;
                currentCloudTodos = [];
                
                // Unsubscribe from Firestore listeners
                if (unsubscribeTodos) {
                    unsubscribeTodos();
                    unsubscribeTodos = null;
                }

                // Hide User status and app content
                userStatusContainer.classList.add("hidden");
                todoAppContent.classList.add("hidden");

                // Show Auth UI
                authContainer.classList.remove("hidden");
                showForm("login");

                connectionBanner.className = "connection-banner offline";
                connectionStatusText.innerHTML = '<i class="fas fa-lock"></i> Silakan masuk untuk sinkronisasi cloud.';
                connectionBanner.classList.remove("hidden");

                renderTodos();
            }
        });

    } catch (error) {
        console.error("Firebase Init Error:", error);
        initOfflineMode();
    }
}

// Syncing from Cloud Firestore
function subscribeToFirestore(userId) {
    if (unsubscribeTodos) unsubscribeTodos();

    const todosRef = collection(db, "users", userId, "todos");
    unsubscribeTodos = onSnapshot(todosRef, (snapshot) => {
        const todos = [];
        snapshot.forEach((doc) => {
            todos.push({ id: parseInt(doc.id), ...doc.data() });
        });
        currentCloudTodos = todos;
        renderTodos();
    }, (error) => {
        console.error("Firestore Subscribe Error:", error);
        showWarningModal("Sinkronisasi Gagal", "Gagal memuat data dari cloud database. Silakan periksa koneksi internet Anda.");
    });
}

// Offline Mode Fallback with Local Simulation
function initOfflineMode() {
    currentCloudTodos = [];
    
    // Check if there is an active local user session
    const savedLocalUser = localStorage.getItem("local_session_user");
    if (savedLocalUser) {
        currentUser = JSON.parse(savedLocalUser);
        
        // Show status
        userEmailDisplay.textContent = currentUser.email;
        userStatusContainer.classList.remove("hidden");
        
        // Show app content, hide Auth
        authContainer.classList.add("hidden");
        todoAppContent.classList.remove("hidden");

        // Banner indicates local storage mode
        connectionBanner.className = "connection-banner offline";
        connectionStatusText.innerHTML = '<i class="fas fa-wifi-slash"></i> Mode Lokal (Tersimpan di Perangkat). Hubungkan ke Firebase untuk sinkronisasi cloud.';
        connectionBanner.classList.remove("hidden");

        renderTodos();
    } else {
        currentUser = null;
        
        // Hide status and app content
        userStatusContainer.classList.add("hidden");
        todoAppContent.classList.add("hidden");
        
        // Show Auth UI (Starts with Login page)
        authContainer.classList.remove("hidden");
        showForm("login");

        connectionBanner.className = "connection-banner offline";
        connectionStatusText.innerHTML = '<i class="fas fa-lock"></i> Silakan masuk (Mode Lokal) untuk mengelola kegiatan Anda.';
        connectionBanner.classList.remove("hidden");

        renderTodos();
    }
}

function showForm(formType) {
    loginForm.classList.add("hidden");
    registerForm.classList.add("hidden");
    forgotPasswordForm.classList.add("hidden");
    tabLoginBtn.classList.remove("active");
    tabRegisterBtn.classList.remove("active");

    if (formType === "login") {
        loginForm.classList.remove("hidden");
        tabLoginBtn.classList.add("active");
    } else if (formType === "register") {
        registerForm.classList.remove("hidden");
        tabRegisterBtn.classList.add("active");
    } else if (formType === "forgot") {
        forgotPasswordForm.classList.remove("hidden");
    }
}

// Login Account (Firebase vs Local Simulation)
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (isFirebaseSetup) {
        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                loginForm.reset();
            })
            .catch((error) => {
                showWarningModal("Gagal Masuk", translateAuthError(error.code));
            });
    } else {
        // Local Authentication Simulation
        const localUsers = JSON.parse(localStorage.getItem("local_users") || "{}");
        if (localUsers[email] && localUsers[email] === password) {
            currentUser = {
                email: email,
                uid: "local_" + email.replace(/[^a-zA-Z0-9]/g, "")
            };
            localStorage.setItem("local_session_user", JSON.stringify(currentUser));
            loginForm.reset();
            initOfflineMode();
        } else {
            showWarningModal("Gagal Masuk", "Email atau kata sandi salah (Mode Lokal).");
        }
    }
}

// Register Account (Firebase vs Local Simulation)
function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("register-confirm-password").value;

    if (password.length < 6) {
        showWarningModal("Pendaftaran Gagal", "Kata sandi minimal terdiri dari 6 karakter!");
        return;
    }

    if (password !== confirmPassword) {
        showWarningModal("Pendaftaran Gagal", "Konfirmasi kata sandi tidak cocok!");
        return;
    }

    if (isFirebaseSetup) {
        createUserWithEmailAndPassword(auth, email, password)
            .then(async (userCredential) => {
                // Send email verification (activation link)
                await sendEmailVerification(userCredential.user);
                registerForm.reset();
                showWarningModal(
                    "Akun Berhasil Dibuat", 
                    "Registrasi berhasil! Kami telah mengirimkan link aktivasi otomatis ke email: " + email + ". Silakan verifikasi email Anda untuk mengaktifkan akun."
                );
            })
            .catch((error) => {
                showWarningModal("Pendaftaran Gagal", translateAuthError(error.code));
            });
    } else {
        // Local Registration Simulation
        const localUsers = JSON.parse(localStorage.getItem("local_users") || "{}");
        if (localUsers[email]) {
            showWarningModal("Pendaftaran Gagal", "Email ini sudah terdaftar secara lokal!");
        } else {
            localUsers[email] = password;
            localStorage.setItem("local_users", JSON.stringify(localUsers));
            
            // Auto Login
            currentUser = {
                email: email,
                uid: "local_" + email.replace(/[^a-zA-Z0-9]/g, "")
            };
            localStorage.setItem("local_session_user", JSON.stringify(currentUser));
            registerForm.reset();
            
            showWarningModal(
                "Pendaftaran Sukses", 
                "Akun lokal berhasil dibuat! Anda sekarang masuk secara otomatis dalam Mode Lokal."
            );
            initOfflineMode();
        }
    }
}

// Forgot Password (Reset email vs Local Simulation)
function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById("forgot-email").value.trim();

    if (isFirebaseSetup) {
        sendPasswordResetEmail(auth, email)
            .then(() => {
                forgotPasswordForm.reset();
                showWarningModal(
                    "Link Reset Dikirim", 
                    "Link reset kata sandi otomatis telah dikirim ke email: " + email + ". Silakan periksa kotak masuk atau spam email Anda."
                );
                showForm("login");
            })
            .catch((error) => {
                showWarningModal("Gagal Mengirim Link", translateAuthError(error.code));
            });
    } else {
        // Local Forgot Password Simulation
        const localUsers = JSON.parse(localStorage.getItem("local_users") || "{}");
        if (localUsers[email]) {
            forgotPasswordForm.reset();
            showWarningModal(
                "Link Reset (Simulasi)", 
                "Link reset kata sandi simulasi telah dikirim ke email: " + email + ". (Hubungkan Firebase untuk mengirim email asli)."
            );
            showForm("login");
        } else {
            showWarningModal("Gagal", "Email tidak terdaftar secara lokal.");
        }
    }
}

// Logout Account (Firebase vs Local Simulation)
function handleLogout() {
    showConfirmModal(
        "Keluar Akun",
        "Apakah Anda yakin ingin keluar dari akun Anda?",
        () => {
            if (isFirebaseSetup) {
                signOut(auth).catch((error) => {
                    console.error("Logout error:", error);
                });
            } else {
                localStorage.removeItem("local_session_user");
                initOfflineMode();
            }
        }
    );
}

// Translate Firebase Errors to Indonesian
function translateAuthError(code) {
    switch(code) {
        case "auth/invalid-email": return "Format alamat email tidak valid.";
        case "auth/user-disabled": return "Akun ini telah dinonaktifkan.";
        case "auth/user-not-found": return "Akun tidak ditemukan. Silakan daftarkan akun baru.";
        case "auth/wrong-password": return "Kata sandi salah. Silakan coba lagi.";
        case "auth/email-already-in-use": return "Alamat email ini sudah terdaftar. Silakan masuk atau gunakan email lain.";
        case "auth/weak-password": return "Kata sandi terlalu lemah. Gunakan minimal 6 karakter.";
        case "auth/invalid-credential": return "Email atau kata sandi salah. Silakan periksa kembali.";
        case "auth/missing-password": return "Kata sandi wajib diisi.";
        default: return "Terjadi kesalahan sistem. Silakan coba lagi nanti (" + code + ").";
    }
}

// ==========================================
// GENERAL APP CONTROLS (THEME, MODALS, VALIDATIONS)
// ==========================================

function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = themeToggleBtn.querySelector("i");
    if (theme === "dark") {
        icon.className = "fas fa-sun";
    } else {
        icon.className = "fas fa-moon";
    }
}

// Custom Confirm Modal System
function showConfirmModal(title, message, callback) {
    confirmModalTitle.textContent = title;
    confirmModalMessage.textContent = message;
    confirmModalBtn.textContent = "Lanjutkan";
    confirmModalBtn.style.background = "var(--btn-danger)";
    confirmModalCancel.style.display = "block";
    
    confirmCallback = callback;
    confirmModalBackdrop.classList.add("active");
}

function showWarningModal(title, message) {
    confirmModalTitle.textContent = title;
    confirmModalMessage.textContent = message;
    confirmModalBtn.textContent = "OK";
    confirmModalBtn.style.background = "var(--input-focus)";
    confirmModalCancel.style.display = "none";
    
    confirmCallback = closeConfirmModal;
    confirmModalBackdrop.classList.add("active");
}

function closeConfirmModal() {
    confirmModalBackdrop.classList.remove("active");
    confirmCallback = null;
}

confirmModalBtn.addEventListener("click", () => {
    if (confirmCallback) confirmCallback();
    closeConfirmModal();
});

// ==========================================
// TO DO DATA CRUD ACTIONS
// ==========================================

// Add Todo
async function addTodo(e) {
    e.preventDefault();

    const title = titleInput.value.trim();
    const desc = descInput.value.trim();
    const start = startInput.value;
    const due = dueInput.value;
    const priority = priorityInput.value;

    if (!title || !due) {
        showWarningModal("Peringatan", "Mohon isi Nama Kegiatan dan Deadline ya! 😊");
        return;
    }

    // Date Validation
    if (new Date(due) < new Date(start)) {
        showWarningModal("Validasi Tanggal", "Tanggal deadline tidak boleh mendahului tanggal mulai kegiatan! 📅");
        return;
    }

    const todoObj = {
        id: Date.now(),
        title,
        desc,
        start,
        due,
        priority,
        completed: false
    };

    await saveLocal(todoObj);
    renderTodos();

    // Reset inputs
    titleInput.value = "";
    descInput.value = "";
    
    const todayStr = new Date().toISOString().split('T')[0];
    startInput.value = todayStr;
    dueInput.value = todayStr;
    priorityInput.value = "medium";
}

// Render Todos list
function renderTodos() {
    let todos = getLocal();
    
    // Update progress dashboard based on all tasks
    updateProgress(todos);

    // Apply Search Filter
    const searchVal = searchInput.value.toLowerCase().trim();
    if (searchVal) {
        todos = todos.filter(t => 
            t.title.toLowerCase().includes(searchVal) || 
            (t.desc && t.desc.toLowerCase().includes(searchVal))
        );
    }

    // Apply Status Filter
    const filterVal = filterOption.value;
    if (filterVal === "completed") {
        todos = todos.filter(t => t.completed);
    } else if (filterVal === "uncompleted") {
        todos = todos.filter(t => !t.completed);
    }

    // Apply Sorting
    const sortVal = sortOption.value;
    if (sortVal === "newest") {
        todos.sort((a, b) => b.id - a.id);
    } else if (sortVal === "oldest") {
        todos.sort((a, b) => a.id - b.id);
    } else if (sortVal === "due-soon") {
        todos.sort((a, b) => new Date(a.due) - new Date(b.due));
    } else if (sortVal === "priority-desc") {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        todos.sort((a, b) => (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2));
    }

    // Clear and render
    todoList.innerHTML = "";

    if (todos.length === 0) {
        emptyMsg.style.display = "block";
    } else {
        emptyMsg.style.display = "none";
        todos.forEach(todo => {
            const li = document.createElement("li");
            li.className = `todo priority-${todo.priority}`;
            if (todo.completed) li.classList.add("completed");
            li.setAttribute("data-id", todo.id);

            const countdown = getCountdown(todo.due, todo.completed);
            const priorityLbl = getPriorityLabel(todo.priority);

            li.innerHTML = `
                <div class="todo-content">
                    <div class="task-header">
                        <span class="task-title">${todo.title}</span>
                        <span class="badge ${countdown.cls}">${countdown.txt}</span>
                        <span class="badge-priority badge-priority-${todo.priority}">${priorityLbl}</span>
                    </div>
                    ${todo.desc ? `<p class="task-desc">${todo.desc}</p>` : ""}
                    <div class="info-row">
                        <span>📅 Mulai: ${formatDate(todo.start)}</span>
                        <span>🏁 Deadline: ${formatDate(todo.due)}</span>
                    </div>
                </div>
                <div class="actions">
                    <button class="act-btn check" title="Tandai Selesai"><i class="fas fa-check"></i></button>
                    <button class="act-btn edit" title="Edit Kegiatan"><i class="fas fa-pen"></i></button>
                    <button class="act-btn trash" title="Hapus Kegiatan"><i class="fas fa-trash"></i></button>
                </div>
            `;
            todoList.appendChild(li);
        });
    }
}

// Get Countdown
function getCountdown(dueStr, isCompleted) {
    if (isCompleted) {
        return { txt: "Selesai", cls: "done" };
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dueStr);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) return { txt: "Telat", cls: "urgent" };
    if (diff === 0) return { txt: "Hari Ini", cls: "urgent" };
    if (diff <= 3) return { txt: `${diff} Hari`, cls: "warning" };
    return { txt: `${diff} Hari`, cls: "safe" };
}

// Priority Helpers
function getPriorityLabel(priority) {
    switch(priority) {
        case "high": return "Tinggi";
        case "medium": return "Sedang";
        case "low": return "Rendah";
        default: return "Sedang";
    }
}

// Format Date
function formatDate(dateStr) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('id-ID', {day: 'numeric', month:'short'});
}

// Handle Actions (Check, Edit, Delete)
async function handleAction(e) {
    const btn = e.target.closest(".act-btn");
    if (!btn) return;

    const item = btn.closest(".todo");
    const id = parseInt(item.getAttribute("data-id"));
    let todos = getLocal();

    if (btn.classList.contains("trash")) {
        const todo = todos.find(t => t.id === id);
        showConfirmModal(
            "Hapus Kegiatan",
            `Apakah Anda yakin ingin menghapus "${todo.title}"?`,
            async () => {
                if (currentUser) {
                    if (isFirebaseSetup) {
                        await deleteDoc(doc(db, "users", currentUser.uid, "todos", id.toString()));
                    } else {
                        todos = todos.filter(t => t.id !== id);
                        localStorage.setItem("todos_" + currentUser.email, JSON.stringify(todos));
                        renderTodos();
                    }
                } else {
                    todos = todos.filter(t => t.id !== id);
                    localStorage.setItem("todos", JSON.stringify(todos));
                    renderTodos();
                }
            }
        );
    }

    if (btn.classList.contains("check")) {
        const todo = todos.find(t => t.id === id);
        if (currentUser) {
            if (isFirebaseSetup) {
                await setDoc(doc(db, "users", currentUser.uid, "todos", id.toString()), { completed: !todo.completed }, { merge: true });
            } else {
                const idx = todos.findIndex(t => t.id === id);
                todos[idx].completed = !todos[idx].completed;
                localStorage.setItem("todos_" + currentUser.email, JSON.stringify(todos));
                renderTodos();
            }
        } else {
            const idx = todos.findIndex(t => t.id === id);
            todos[idx].completed = !todos[idx].completed;
            localStorage.setItem("todos", JSON.stringify(todos));
            renderTodos();
        }
    }

    if (btn.classList.contains("edit")) {
        const todo = todos.find(t => t.id === id);
        openEditModal(todo);
    }
}

// Edit Modal Logic
function openEditModal(todo) {
    editingTodoId = todo.id;
    editTitleInput.value = todo.title;
    editDescInput.value = todo.desc || "";
    editStartInput.value = todo.start;
    editDueInput.value = todo.due;
    editPriorityInput.value = todo.priority || "medium";

    editModalBackdrop.classList.add("active");
}

function closeEditModal() {
    editModalBackdrop.classList.remove("active");
    editingTodoId = null;
}

editModalClose.addEventListener("click", closeEditModal);
editModalCancel.addEventListener("click", closeEditModal);

editModalSave.addEventListener("click", async () => {
    const title = editTitleInput.value.trim();
    const desc = editDescInput.value.trim();
    const start = editStartInput.value;
    const due = editDueInput.value;
    const priority = editPriorityInput.value;

    if (!title || !due) {
        showWarningModal("Peringatan", "Mohon isi Nama Kegiatan dan Deadline ya! 😊");
        return;
    }

    // Date Validation
    if (new Date(due) < new Date(start)) {
        showWarningModal("Validasi Tanggal", "Tanggal deadline tidak boleh mendahului tanggal mulai kegiatan! 📅");
        return;
    }

    if (currentUser) {
        if (isFirebaseSetup) {
            await setDoc(doc(db, "users", currentUser.uid, "todos", editingTodoId.toString()), {
                title,
                desc,
                start,
                due,
                priority
            }, { merge: true });
        } else {
            let todos = getLocal();
            const idx = todos.findIndex(t => t.id === editingTodoId);
            if (idx !== -1) {
                todos[idx].title = title;
                todos[idx].desc = desc;
                todos[idx].start = start;
                todos[idx].due = due;
                todos[idx].priority = priority;

                localStorage.setItem("todos_" + currentUser.email, JSON.stringify(todos));
                renderTodos();
            }
        }
    } else {
        let todos = getLocal();
        const idx = todos.findIndex(t => t.id === editingTodoId);
        if (idx !== -1) {
            todos[idx].title = title;
            todos[idx].desc = desc;
            todos[idx].start = start;
            todos[idx].due = due;
            todos[idx].priority = priority;

            localStorage.setItem("todos", JSON.stringify(todos));
            renderTodos();
        }
    }
    
    closeEditModal();
});

// Delete All
function handleDeleteAll() {
    const todos = getLocal();
    if (todos.length === 0) return;
    
    showConfirmModal(
        "Hapus Semua Kegiatan",
        "Apakah Anda yakin ingin menghapus SEMUA daftar kegiatan? Tindakan ini tidak dapat dibatalkan.",
        async () => {
            if (currentUser) {
                if (isFirebaseSetup) {
                    const todosRef = collection(db, "users", currentUser.uid, "todos");
                    const querySnapshot = await getDocs(todosRef);
                    const batchPromises = [];
                    querySnapshot.forEach(doc => {
                        batchPromises.push(deleteDoc(doc.ref));
                    });
                    await Promise.all(batchPromises);
                } else {
                    localStorage.setItem("todos_" + currentUser.email, JSON.stringify([]));
                    renderTodos();
                }
            } else {
                localStorage.setItem("todos", JSON.stringify([]));
                renderTodos();
            }
        }
    );
}

// Progress Dashboard Logic
function updateProgress(todos) {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const percent = total === 0 ? 0 : (completed / total) * 100;

    progressPercent.textContent = `${Math.round(percent)}% selesai`;
    progressBarFill.style.width = `${percent}%`;

    // Motivational Message
    if (total === 0) {
        progressMotivate.textContent = "Ayo mulai harimu dengan produktif! 🚀";
    } else if (percent === 0) {
        progressMotivate.textContent = "Yuk, selesaikan kegiatan pertamamu hari ini! 💪";
    } else if (percent < 40) {
        progressMotivate.textContent = "Langkah awal yang baik! Teruskan! 👍";
    } else if (percent < 80) {
        progressMotivate.textContent = "Hebat! Sebagian besar tugas sudah beres! 🔥";
    } else if (percent < 100) {
        progressMotivate.textContent = "Tinggal sedikit lagi! Selesaikan semuanya! ⚡";
    } else {
        progressMotivate.textContent = "Luar biasa! Semua kegiatan hari ini selesai! 🎉";
    }
}

// Local Storage Helpers
async function saveLocal(todo) {
    if (currentUser) {
        if (isFirebaseSetup) {
            await setDoc(doc(db, "users", currentUser.uid, "todos", todo.id.toString()), todo);
        } else {
            let todos = getLocal();
            todos.push(todo);
            localStorage.setItem("todos_" + currentUser.email, JSON.stringify(todos));
        }
    } else {
        let todos = getLocal();
        todos.push(todo);
        localStorage.setItem("todos", JSON.stringify(todos));
    }
}

function getLocal() {
    if (currentUser) {
        if (isFirebaseSetup) {
            return currentCloudTodos;
        } else {
            return localStorage.getItem("todos_" + currentUser.email) ? JSON.parse(localStorage.getItem("todos_" + currentUser.email)) : [];
        }
    }
    return localStorage.getItem("todos") ? JSON.parse(localStorage.getItem("todos")) : [];
}