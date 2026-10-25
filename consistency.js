
(() => {
  "use strict";

  const STORE = "focusflow_consistency_v1";
  const today = () => new Date().toLocaleDateString("en-CA");
  const escapeHTML = value =>
    String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    })[char]);

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      if (saved && Array.isArray(saved.habits) &&
          saved.days && typeof saved.days === "object") {
        return saved;
      }
    } catch (_) {}
    return { habits: [], days: {} };
  }

  let data = load();

  function dayRecord(date = today()) {
    if (!data.days[date]) {
      data.days[date] = {
        habits: {},
        tasksDone: 0,
        reflection: "",
        improvement: ""
      };
    }
    return data.days[date];
  }

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify(data));
      const status = document.getElementById("ff-save-status");
      if (status) status.textContent = "Saved on this device ✓";
    } catch (_) {
      alert("Could not save. Check your browser's local storage settings.");
    }
  }

  function completedCount(date) {
    const record = data.days[date];
    return record ? Math.max(0, Number(record.tasksDone) || 0) : 0;
  }

  function habitCount(date) {
    const record = data.days[date];
    if (!record) return { done: 0, total: data.habits.length };
    const done = data.habits.filter(h => record.habits[h.id]).length;
    return { done, total: data.habits.length };
  }

  function render() {
    const date = today();
    const record = dayRecord(date);
    const progress = habitCount(date);
    const percent = progress.total
      ? Math.round(progress.done / progress.total * 100) : 0;

    const week = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-CA");
      const count = habitCount(key);
      const value = count.total
        ? Math.round(count.done / count.total * 100) : 0;
      week.push({
        key,
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        value
      });
    }

    const days = Object.keys(data.days).sort().reverse();
    let streak = 0;
    const cursor = new Date();
    while (true) {
      const key = cursor.toLocaleDateString("en-CA");
      const count = habitCount(key);
      if (!count.total || count.done < count.total) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    const habitRows = data.habits.length
      ? data.habits.map(h => `
        <div class="ff-habit">
          <label class="ff-habit-label">
            <input type="checkbox" data-check="${escapeHTML(h.id)}"
              ${record.habits[h.id] ? "checked" : ""}>
            <span>${escapeHTML(h.name)}</span>
          </label>
          <button class="ff-small ff-edit" data-edit="${escapeHTML(h.id)}"
            type="button">Rename</button>
          <button class="ff-small ff-remove" data-remove="${escapeHTML(h.id)}"
            type="button" aria-label="Remove ${escapeHTML(h.name)}">×</button>
        </div>`).join("")
      : `<p class="ff-muted">Add your first habit to start tracking consistency.</p>`;

    document.getElementById("ff-consistency").innerHTML = `
      <section class="ff-wrap">
        <header class="ff-heading">
          <div>
            <p class="ff-eyebrow">YOUR PERSONAL GROWTH SPACE</p>
            <h2>Daily Progress 🌷</h2>
            <p class="ff-muted">${new Date().toLocaleDateString(undefined,
              { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
          </div>
          <span id="ff-save-status" class="ff-muted">Saved on this device ✓</span>
        </header>

        <div class="ff-stats">
          <article class="ff-card">
            <span>Habit progress</span>
            <strong>${progress.done}/${progress.total}</strong>
            <div class="ff-track"><i style="width:${percent}%"></i></div>
            <small>${percent}% completed today</small>
          </article>
          <article class="ff-card">
            <span>Tasks completed today</span>
            <strong>${completedCount(date)}</strong>
            <small>Daily total you record here</small>
          </article>
          <article class="ff-card">
            <span>Current streak</span>
            <strong>🔥 ${streak} day${streak === 1 ? "" : "s"}</strong>
            <small>Days all current habits were completed</small>
          </article>
        </div>

        <div class="ff-columns">
          <article class="ff-panel">
            <h3>My daily habits</h3>
            <p class="ff-muted">Choose small actions you can repeat.</p>
            <form id="ff-add-form" class="ff-add">
              <input id="ff-new-habit" maxlength="60"
                placeholder="e.g. Practise coding for 20 min" required>
              <button type="submit">+ Add habit</button>
            </form>
            <div class="ff-habits">${habitRows}</div>
          </article>

          <article class="ff-panel">
            <h3>Task consistency</h3>
            <p class="ff-muted">Record tasks you complete in your main FocusFlow task list.</p>
            <div class="ff-task-counter">
              <button type="button" id="ff-task-minus" aria-label="Decrease task count">−</button>
              <strong>${completedCount(date)}</strong>
              <button type="button" id="ff-task-plus" aria-label="Increase task count">+</button>
            </div>
            <p class="ff-muted">This counter is separate from the existing task list.</p>
            <h3 class="ff-week-title">Last 7 days</h3>
            <div class="ff-week">
              ${week.map(d => `
                <div class="ff-week-day" title="${d.key}: ${d.value}% habit completion">
                  <div class="ff-bar-bg"><i style="height:${d.value}%"></i></div>
                  <small>${d.label}</small>
                  <small>${d.value}%</small>
                </div>`).join("")}
            </div>
          </article>
        </div>

        <article class="ff-panel ff-journal">
          <h3>Daily reflection ✨</h3>
          <label for="ff-reflection">What did I learn or do well today?</label>
          <textarea id="ff-reflection" maxlength="1000"
            placeholder="Write a small win from today...">${escapeHTML(record.reflection)}</textarea>
          <label for="ff-improvement">What will I improve tomorrow?</label>
          <textarea id="ff-improvement" maxlength="1000"
            placeholder="Choose one realistic next step...">${escapeHTML(record.improvement)}</textarea>
          <button type="button" id="ff-save-journal">Save reflection</button>
        </article>

        <article class="ff-panel">
          <h3>Recent daily records</h3>
          <div class="ff-history">
            ${days.length ? days.slice(0, 7).map(d => {
              const c = habitCount(d);
              return `<div class="ff-history-row">
                <span>${escapeHTML(d)}</span>
                <span>${c.done}/${c.total} habits · ${completedCount(d)} tasks</span>
              </div>`;
            }).join("") : `<p class="ff-muted">Your daily history will appear here.</p>`}
          </div>
        </article>
        <p class="ff-footer">Progress, not perfection. Your records stay in this browser.</p>
      </section>`;

    bindEvents();
  }

  function bindEvents() {
    const root = document.getElementById("ff-consistency");

    root.querySelector("#ff-add-form").addEventListener("submit", event => {
      event.preventDefault();
      const input = root.querySelector("#ff-new-habit");
      const name = input.value.trim();
      if (!name) return;
      if (data.habits.some(h => h.name.toLowerCase() === name.toLowerCase())) {
        alert("That habit already exists.");
        return;
      }
      data.habits.push({
        id: "h" + Date.now() + Math.random().toString(36).slice(2, 7),
        name
      });
      save();
      render();
    });

    root.querySelectorAll("[data-check]").forEach(input => {
      input.addEventListener("change", () => {
        dayRecord().habits[input.dataset.check] = input.checked;
        save();
        render();
      });
    });

    root.querySelectorAll("[data-edit]").forEach(button => {
      button.addEventListener("click", () => {
        const habit = data.habits.find(h => h.id === button.dataset.edit);
        if (!habit) return;
        const name = prompt("Change habit name:", habit.name);
        if (name === null || !name.trim()) return;
        habit.name = name.trim().slice(0, 60);
        save();
        render();
      });
    });

    root.querySelectorAll("[data-remove]").forEach(button => {
      button.addEventListener("click", () => {
        const id = button.dataset.remove;
        const habit = data.habits.find(h => h.id === id);
        if (!habit || !confirm(`Remove "${habit.name}" from your current habits? Past records are preserved.`)) return;
        data.habits = data.habits.filter(h => h.id !== id);
        save();
        render();
      });
    });

    root.querySelector("#ff-task-plus").addEventListener("click", () => {
      dayRecord().tasksDone = completedCount(today()) + 1;
      save();
      render();
    });

    root.querySelector("#ff-task-minus").addEventListener("click", () => {
      dayRecord().tasksDone = Math.max(0, completedCount(today()) - 1);
      save();
      render();
    });

    root.querySelector("#ff-save-journal").addEventListener("click", () => {
      const record = dayRecord();
      record.reflection = root.querySelector("#ff-reflection").value;
      record.improvement = root.querySelector("#ff-improvement").value;
      save();
      render();
    });
  }
  
  function start() {
  const mount = document.getElementById("consistencyMount");
  if (!mount) return;

  const host = document.createElement("div");
  host.id = "ff-consistency";
  mount.appendChild(host);
  render();
}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
