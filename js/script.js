// DOM Elements
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

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    // Set default start date to today
    const todayStr = new Date().toISOString().split('T')[0];
    startInput.value = todayStr;
    dueInput.value = todayStr;
    renderTodos();
});

todoForm.addEventListener("submit", addTodo);
todoList.addEventListener("click", handleAction);
filterOption.addEventListener("change", renderTodos);
sortOption.addEventListener("change", renderTodos);
searchInput.addEventListener("input", renderTodos);
deleteAllBtn.addEventListener("click", handleDeleteAll);

// Theme Toggling
themeToggleBtn.addEventListener("click", toggleTheme);

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
    confirmModalBtn.textContent = "Hapus";
    confirmModalBtn.style.background = "var(--btn-danger)";
    
    // Reset Cancel Button
    confirmModalCancel.style.display = "block";
    
    confirmCallback = callback;
    confirmModalBackdrop.classList.add("active");
}

function showWarningModal(title, message) {
    confirmModalTitle.textContent = title;
    confirmModalMessage.textContent = message;
    confirmModalBtn.textContent = "OK";
    confirmModalBtn.style.background = "var(--input-focus)";
    
    // Hide Cancel Button
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

confirmModalCancel.addEventListener("click", closeConfirmModal);
confirmModalClose.addEventListener("click", closeConfirmModal);

// Add Todo
function addTodo(e) {
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

    saveLocal(todoObj);
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
function handleAction(e) {
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
            () => {
                todos = todos.filter(t => t.id !== id);
                localStorage.setItem("todos", JSON.stringify(todos));
                renderTodos();
            }
        );
    }

    if (btn.classList.contains("check")) {
        const idx = todos.findIndex(t => t.id === id);
        todos[idx].completed = !todos[idx].completed;
        localStorage.setItem("todos", JSON.stringify(todos));
        renderTodos();
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

editModalSave.addEventListener("click", () => {
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
    
    closeEditModal();
});

// Delete All
function handleDeleteAll() {
    const todos = getLocal();
    if (todos.length === 0) return;
    
    showConfirmModal(
        "Hapus Semua Kegiatan",
        "Apakah Anda yakin ingin menghapus SEMUA daftar kegiatan? Tindakan ini tidak dapat dibatalkan.",
        () => {
            localStorage.setItem("todos", JSON.stringify([]));
            renderTodos();
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
function saveLocal(todo) {
    let todos = getLocal();
    todos.push(todo);
    localStorage.setItem("todos", JSON.stringify(todos));
}

function getLocal() {
    return localStorage.getItem("todos") ? JSON.parse(localStorage.getItem("todos")) : [];
}