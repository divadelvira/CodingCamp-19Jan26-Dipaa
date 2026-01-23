const titleInput = document.getElementById("todo-input");
const descInput = document.getElementById("desc-input");
const startInput = document.getElementById("start-date-input");
const dueInput = document.getElementById("due-date-input");
const todoForm = document.getElementById("todo-form");
const todoList = document.querySelector(".todo-list");
const filterOption = document.querySelector(".filter-select");
const deleteAllBtn = document.getElementById("delete-all-btn");
const emptyMsg = document.getElementById("empty-msg");

document.addEventListener("DOMContentLoaded", () => {
    getTodos();
    startInput.valueAsDate = new Date(); 
});
todoForm.addEventListener("submit", addTodo);
todoList.addEventListener("click", handleAction);
filterOption.addEventListener("change", filterTodo);
deleteAllBtn.addEventListener("click", deleteAllTodos);

function addTodo(e) {
    e.preventDefault(); 

    if(!titleInput.value || !dueInput.value) {
        alert("Mohon isi Nama Kegiatan dan Deadline ya! 😊");
        return;
    }

    const todoObj = {
        id: Date.now(),
        title: titleInput.value,
        desc: descInput.value,
        start: startInput.value,
        due: dueInput.value,
        completed: false
    };

    saveLocal(todoObj);
    renderTodo(todoObj);
    
    titleInput.value = "";
    descInput.value = "";
    dueInput.value = "";
    checkEmpty();
}

function renderTodo(todo) {
    const div = document.createElement("div");
    div.classList.add("todo");
    if(todo.completed) div.classList.add("completed");
    div.setAttribute("data-id", todo.id);

    const countdown = getCountdown(todo.due);

    div.innerHTML = `
        <div class="todo-content">
            <span class="task-title">${todo.title} <span class="badge ${countdown.cls}">${countdown.txt}</span></span>
            <p class="task-desc">${todo.desc || "-"}</p>
            <div class="info-row">
                <span>📅 Mulai: ${formatDate(todo.start)}</span>
                <span>🏁 Deadline: ${formatDate(todo.due)}</span>
            </div>
        </div>
        <div class="actions">
            <button class="act-btn check"><i class="fas fa-check"></i></button>
            <button class="act-btn edit"><i class="fas fa-pen"></i></button>
            <button class="act-btn trash"><i class="fas fa-trash"></i></button>
        </div>
    `;
    todoList.appendChild(div);
    checkEmpty();
}

function getCountdown(dueStr) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(dueStr);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if(diff < 0) return { txt: "Telat", cls: "urgent" };
    if(diff === 0) return { txt: "Hari Ini", cls: "urgent" };
    if(diff <= 3) return { txt: `${diff} Hari`, cls: "warning" };
    return { txt: `${diff} Hari`, cls: "safe" };
}

function handleAction(e) {
    const btn = e.target.closest(".act-btn");
    if(!btn) return;
    
    const item = btn.closest(".todo");
    const id = parseInt(item.getAttribute("data-id"));
    let todos = getLocal();

    if(btn.classList.contains("trash")) {
        if(confirm("Hapus kegiatan ini?")) {
            item.remove();
            todos = todos.filter(t => t.id !== id);
            localStorage.setItem("todos", JSON.stringify(todos));
            checkEmpty();
        }
    }

    if(btn.classList.contains("check")) {
        item.classList.toggle("completed");
        const idx = todos.findIndex(t => t.id === id);
        todos[idx].completed = !todos[idx].completed;
        localStorage.setItem("todos", JSON.stringify(todos));
    }

    if(btn.classList.contains("edit")) {
        const titleEl = item.querySelector(".task-title");
        const descEl = item.querySelector(".task-desc");
        
        const newTitle = prompt("Edit Nama Kegiatan:", titleEl.firstChild.textContent.trim());
        if(newTitle === null) return;

        let oldDesc = descEl.innerText === "-" ? "" : descEl.innerText;
        const newDesc = prompt("Edit Deskripsi:", oldDesc);
        if(newDesc === null) return;

        if(newTitle.trim() !== "") {
            const badgeHTML = titleEl.querySelector(".badge").outerHTML;
            titleEl.innerHTML = `${newTitle} ${badgeHTML}`;
            descEl.innerText = newDesc || "-";
            
            
            const idx = todos.findIndex(t => t.id === id);
            todos[idx].title = newTitle;
            todos[idx].desc = newDesc;
            localStorage.setItem("todos", JSON.stringify(todos));
        }
    }
}


function filterTodo(e) {
    const todos = todoList.childNodes;
    todos.forEach(todo => {
        if(todo.nodeType === 1) {
            switch(e.target.value) {
                case "all": todo.style.display = "flex"; break;
                case "completed": 
                    todo.style.display = todo.classList.contains("completed") ? "flex" : "none"; break;
                case "uncompleted":
                    todo.style.display = !todo.classList.contains("completed") ? "flex" : "none"; break;
            }
        }
    });
}

function saveLocal(todo) {
    let todos = getLocal();
    todos.push(todo);
    localStorage.setItem("todos", JSON.stringify(todos));
}
function getLocal() {
    return localStorage.getItem("todos") ? JSON.parse(localStorage.getItem("todos")) : [];
}
function getTodos() {
    let todos = getLocal();
    todos.forEach(t => renderTodo(t));
    checkEmpty();
}
function deleteAllTodos() {
    if(confirm("Hapus SEMUA daftar kegiatan?")) {
        localStorage.clear();
        todoList.innerHTML = "";
        checkEmpty();
    }
}
function checkEmpty() {
    const todos = getLocal();
    emptyMsg.style.display = todos.length === 0 ? "block" : "none";
}
function formatDate(dateStr) {
    if(!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('id-ID', {day: 'numeric', month:'short'});
}