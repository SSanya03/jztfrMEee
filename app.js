
"use strict";

const STORAGE_KEY = "focusflow.tasks.v1";
const PRIORITIES = ["high", "medium", "low"];
const CATEGORIES = ["work", "study", "personal", "other"];

const Storage = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];

      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];

      return data.filter(task =>
        task &&
        typeof task.id === "string" &&
        typeof task.title === "string" &&
        PRIORITIES.includes(task.priority) &&
        CATEGORIES.includes(task.category) &&
        typeof task.completed === "boolean"
      );
    } catch {
      return [];
    }
  },

  save(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }
};

let tasks = Storage.load();
let editingId = null;

const $ = id => document.getElementById(id);

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function saveAndRender() {
  try {
    Storage.save(tasks);
    render();
  } catch {
    alert("Could not save tasks. Check your browser storage.");
  }
}

function render() {
  const completed = tasks.filter(t => t.completed).length;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = tasks.filter(t =>
    !t.completed && t.dueDate && t.dueDate < today
  ).length;

  $("totalCount").textContent = tasks.length;
  $("completedCount").textContent = completed;
  $("pendingCount").textContent = tasks.length - completed;
  $("overdueCount").textContent = overdue;

  const query = $("searchInput").value.trim().toLowerCase();
  const status = $("statusFilter").value;
  const priority = $("priorityFilter").value;
  const sortBy = $("sortBy").value;

  let shown = tasks.filter(t =>
    (t.title + " " + (t.notes || "") + " " + t.category)
      .toLowerCase().includes(query) &&
    (status === "all" ||
      (status === "completed" ? t.completed : !t.completed)) &&
    (priority === "all" || t.priority === priority)
  );

  shown.sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "dueDate")
      return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
    if (sortBy === "priority")
      return PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
    return b.createdAt - a.createdAt;
  });

  $("taskList").innerHTML = shown.map(t => `
    <article class="task-card ${t.completed ? "completed" : ""}">
      <div>
        <h3>${escapeHTML(t.title)}</h3>
        ${t.notes ? `<p>${escapeHTML(t.notes)}</p>` : ""}
        <p>
          <span class="priority">${escapeHTML(t.priority.toUpperCase())}</span>
          · ${escapeHTML(t.category)}
          ${t.dueDate ? " · Due: " + escapeHTML(t.dueDate) : ""}
        </p>
      </div>
      <div class="task-actions">
        <button data-action="toggle" data-id="${escapeHTML(t.id)}">
          ${t.completed ? "Undo" : "Complete"}
        </button>
        <button data-action="edit" data-id="${escapeHTML(t.id)}">Edit</button>
        <button class="delete" data-action="delete" data-id="${escapeHTML(t.id)}">Delete</button>
      </div>
    </article>
  `).join("");

  $("emptyMessage").hidden = shown.length > 0;
}

$("taskForm").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("taskTitle").value.trim();
  const notes = $("taskNotes").value.trim();
  const priority = $("taskPriority").value;
  const category = $("taskCategory").value;
  const dueDate = $("taskDueDate").value || null;
  const message = $("formMessage");

  if (!title) {
    message.textContent = "Please enter a task title.";
    return;
  }

  if (title.length > 100) {
    message.textContent = "Title must be 100 characters or fewer.";
    return;
  }

  message.textContent = "";

  if (editingId) {
    const task = tasks.find(t => t.id === editingId);
    if (task) Object.assign(task, {
      title, notes, priority, category, dueDate,
      updatedAt: Date.now()
    });
    editingId = null;
    $("taskForm").querySelector('button[type="submit"]').textContent = "+ Add task";
  } else {
    const now = Date.now();
    tasks.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(now),
      title, notes, priority, category, dueDate,
      completed: false,
      createdAt: now,
      updatedAt: now
    });
  }

  $("taskForm").reset();
  saveAndRender();
});

$("taskList").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const task = tasks.find(t => t.id === button.dataset.id);
  if (!task) return;

  if (button.dataset.action === "toggle") {
    task.completed = !task.completed;
    task.updatedAt = Date.now();
  } else if (button.dataset.action === "delete") {
    if (!confirm(`Delete "${task.title}"?`)) return;
    tasks = tasks.filter(t => t.id !== task.id);
  } else if (button.dataset.action === "edit") {
    editingId = task.id;
    $("taskTitle").value = task.title;
    $("taskNotes").value = task.notes || "";
    $("taskPriority").value = task.priority;
    $("taskCategory").value = task.category;
    $("taskDueDate").value = task.dueDate || "";
    $("taskForm").querySelector('button[type="submit"]').textContent = "Save changes";
    $("taskTitle").focus();
    return;
  }

  saveAndRender();
});

["searchInput", "statusFilter", "priorityFilter", "sortBy"]
  .forEach(id => $(id).addEventListener("input", render));

render();

