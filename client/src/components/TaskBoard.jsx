
import { useEffect, useMemo, useState } from "react";
import apiRequest from "../services/api.js";
import "../styles/task-board.css";

const columns = [
  { value: "todo", label: "To do" },
  { value: "in-progress", label: "In progress" },
  { value: "done", label: "Completed" },
];

const initialForm = {
  title: "",
  description: "",
  priority: "medium",
  dueDate: "",
};

function TaskBoard({ projectId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      if (!projectId) {
        if (!cancelled) {
          setError("Project ID is missing.");
          setLoading(false);
        }
        return;
      }

      try {
        const data = await apiRequest(
          `/tasks?projectId=${encodeURIComponent(projectId)}`
        );

        if (!cancelled) {
          setTasks(Array.isArray(data.tasks) ? data.tasks : []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load tasks:", err);
          setError(err.message || "Unable to load tasks.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTasks();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm({ ...initialForm });
    setEditingTaskId(null);
    setShowForm(false);
  }

  function handleNewTask() {
    resetForm();
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function handleEditClick(task) {
    setEditingTaskId(task._id);

    setForm({
      title: task.title || "",
      description: task.description || "",
      priority: task.priority || "medium",
      dueDate: task.dueDate
        ? new Date(task.dueDate).toISOString().slice(0, 10)
        : "",
    });

    setShowForm(true);
    setError("");
    setNotice("");
  }

  async function handleCreate(event) {
    event.preventDefault();

    if (!projectId) {
      setError("Project ID is missing.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const data = await apiRequest("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          dueDate: form.dueDate || null,
          status: "todo",
          projectId,
        }),
      });

      if (!data.task) {
        throw new Error("The server did not return the created task.");
      }

      setTasks((current) => [data.task, ...current]);
      resetForm();
      setNotice("Task created successfully.");
    } catch (err) {
      setError(err.message || "Unable to create task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();

    if (!editingTaskId) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const data = await apiRequest(`/tasks/${editingTaskId}`, {
        method: "PUT",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          dueDate: form.dueDate || null,
        }),
      });

      if (!data.task) {
        throw new Error("The server did not return the updated task.");
      }

      setTasks((current) =>
        current.map((task) =>
          task._id === editingTaskId ? data.task : task
        )
      );

      resetForm();
      setNotice("Task updated successfully.");
    } catch (err) {
      setError(err.message || "Unable to update task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(taskId, status) {
    setError("");
    setNotice("");

    try {
      const data = await apiRequest(`/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });

      if (!data.task) {
        throw new Error("The server did not return the updated task.");
      }

      setTasks((current) =>
        current.map((task) =>
          task._id === taskId ? data.task : task
        )
      );

      setNotice("Task status updated.");
    } catch (err) {
      setError(err.message || "Unable to update task.");
    }
  }

  async function handleDelete(taskId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(`/tasks/${taskId}`, {
        method: "DELETE",
      });

      setTasks((current) =>
        current.filter((task) => task._id !== taskId)
      );

      if (editingTaskId === taskId) {
        resetForm();
      }

      setNotice("Task deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete task.");
    }
  }

  const visibleTasks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesPriority =
        filter === "all" || task.priority === filter;
      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;

      const matchesSearch =
        !query ||
        (task.title || "").toLowerCase().includes(query) ||
        (task.description || "").toLowerCase().includes(query);

      return matchesPriority && matchesStatus && matchesSearch;
    });
  }, [tasks, filter, statusFilter, searchTerm]);

  return (
    <section className="task-board">
      <div className="task-board-heading">
        <div>
          <span className="task-eyebrow">PLAN YOUR PROGRESS</span>
          <h2>Tasks &amp; workflow</h2>
          <p>Break your project into manageable steps.</p>
        </div>

        <button
          type="button"
          className="task-add-button"
          onClick={showForm ? resetForm : handleNewTask}
        >
          {showForm ? "Cancel" : "+ New task"}
        </button>
      </div>

      <div className="task-summary">
        <div className="task-summary-card">
          <span>Total tasks</span>
          <strong>{tasks.length}</strong>
        </div>

        <div className="task-summary-card">
          <span>In progress</span>
          <strong>
            {tasks.filter((task) => task.status === "in-progress").length}
          </strong>
        </div>

        <div className="task-summary-card">
          <span>Completed</span>
          <strong>
            {tasks.filter((task) => task.status === "done").length}
          </strong>
        </div>
      </div>

      {showForm && (
        <form
          className="task-form"
          onSubmit={editingTaskId ? handleUpdate : handleCreate}
        >
          <div className="task-form-heading">
            <h3>{editingTaskId ? "Edit task" : "Create a task"}</h3>
            <p>
              {editingTaskId
                ? "Update the details of your task."
                : "Add a new item to this project's workflow."}
            </p>
          </div>

          <label>
            Task title
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Build the login page"
              minLength={2}
              maxLength={150}
              required
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="What needs to be done?"
              maxLength={2000}
              rows={3}
            />
          </label>

          <div className="task-form-row">
            <label>
              Priority
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label>
              Due date
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handleChange}
              />
            </label>
          </div>

          <button
            type="submit"
            className="task-submit-button"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editingTaskId
                ? "Save changes"
                : "Create task"}
          </button>
        </form>
      )}

      {error && (
        <div className="task-message task-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="task-message task-success" role="status">
          {notice}
        </div>
      )}

      <div className="task-toolbar">
        <div>
          <h3>Your task board</h3>
          <span>
            {visibleTasks.length} of {tasks.length} tasks shown
          </span>
        </div>

        <div className="task-toolbar-controls">
          <label className="task-search">
            <span>Search tasks</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search title or description..."
              aria-label="Search tasks by title or description"
            />
          </label>

          <label className="task-filter">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              {columns.map((column) => (
                <option value={column.value} key={column.value}>
                  {column.label}
                </option>
              ))}
            </select>
          </label>

          <label className="task-filter">
            <span>Priority</span>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="all">All priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="task-empty">
          <span className="task-loader" />
          <p>Loading your tasks...</p>
        </div>
      ) : (
        <div className="task-columns">
          {columns.map((column) => {
            const columnTasks = visibleTasks.filter(
              (task) => task.status === column.value
            );

            return (
              <section className="task-column" key={column.value}>
                <div className="task-column-heading">
                  <div>
                    <span
                      className={`task-column-dot dot-${column.value}`}
                    />
                    <h3>{column.label}</h3>
                  </div>

                  <span className="task-count">{columnTasks.length}</span>
                </div>

                <div className="task-column-content">
                  {columnTasks.length === 0 ? (
                    <div className="task-column-empty">
                      <span>
                        {searchTerm.trim() || filter !== "all"
                          ? "No matching tasks"
                          : "Nothing here yet"}
                      </span>
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <article className="task-card" key={task._id}>
                        <div className="task-card-top">
                          <span
                            className={`task-priority priority-${task.priority}`}
                          >
                            {task.priority} priority
                          </span>

                          <div className="task-card-actions">
                            <button
                              type="button"
                              className="task-edit-button"
                              onClick={() => handleEditClick(task)}
                              aria-label={`Edit ${task.title}`}
                              title="Edit task"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="task-delete-button"
                              onClick={() => handleDelete(task._id)}
                              aria-label={`Delete ${task.title}`}
                              title="Delete task"
                            >
                              ×
                            </button>
                          </div>
                        </div>

                        <h4>{task.title}</h4>

                        {task.description && (
                          <p className="task-card-description">
                            {task.description}
                          </p>
                        )}

                        {task.dueDate && (
                          <p className="task-due-date">
                            Due{" "}
                            {new Date(task.dueDate).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                timeZone: "UTC",
                              }
                            )}
                          </p>
                        )}

                        <label className="task-status-control">
                          <span>Move to</span>
                          <select
                            value={task.status}
                            onChange={(event) =>
                              handleStatusChange(
                                task._id,
                                event.target.value
                              )
                            }
                          >
                            {columns.map((option) => (
                              <option
                                value={option.value}
                                key={option.value}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default TaskBoard;
