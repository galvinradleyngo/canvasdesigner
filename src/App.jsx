import React, { useCallback, useMemo, useRef, useState } from "react";
import TaskChecklist from "./components/TaskChecklist.jsx";

function IconBadge({ children, className = "", ...props }) {
  return (
    <span
      className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

function DashboardRing({ title, value, subtitle, color, icon, onClick, ariaLabel }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="flex w-full flex-col items-center gap-2 rounded-3xl border border-white/40 bg-white/70 px-4 py-5 text-slate-700 shadow-[0_16px_32px_-18px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_38px_-18px_rgba(15,23,42,0.38)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ borderColor: color, color }}
    >
      {icon}
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{subtitle}</span>
      <span className="text-3xl font-bold" style={{ color }}>
        {value}
      </span>
      <span className="text-sm font-semibold text-slate-600">{title}</span>
    </button>
  );
}

function ListChecks(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M20 6h-8a1 1 0 1 1 0-2h8a1 1 0 0 1 0 2Zm0 7h-8a1 1 0 1 1 0-2h8a1 1 0 0 1 0 2Zm0 7h-8a1 1 0 1 1 0-2h8a1 1 0 0 1 0 2ZM7.7 4.29l-1.99 2-.71-.7a1 1 0 0 0-1.42 1.41l1.42 1.42a1 1 0 0 0 1.41 0l2.7-2.71A1 1 0 0 0 7.7 4.29Zm0 7l-1.99 2-.71-.7a1 1 0 0 0-1.42 1.41l1.42 1.42a1 1 0 0 0 1.41 0l2.7-2.71A1 1 0 0 0 7.7 11.29Zm0 7-1.99 2-.71-.7a1 1 0 0 0-1.42 1.41l1.42 1.42a1 1 0 0 0 1.41 0l2.7-2.71A1 1 0 1 0 7.7 18.29Z"
      />
    </svg>
  );
}

function AlarmClock(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="m5.28 2.22 1.41 1.41-2.06 2.06L3.22 4.28a1 1 0 0 1 0-1.41l1.05-1.05a1 1 0 0 1 1.41 0Zm12.43 0a1 1 0 0 1 1.41 0l1.05 1.05a1 1 0 0 1 0 1.41l-1.41 1.41-2.06-2.06Zm1.29 9.78a7 7 0 1 1-7-7 7 7 0 0 1 7 7Zm-2 0a5 5 0 1 0-5 5 5 5 0 0 0 5-5Zm-5-3a1 1 0 0 1 1 1v2.59l1.71 1.7a1 1 0 0 1-1.42 1.42L11 14a1 1 0 0 1-.29-.71v-3a1 1 0 0 1 1-1Zm-8.43 6.64 1.41-1.41 2.49 2.49-1.2 1.66a2 2 0 0 0 1.63 3.16h10a2 2 0 0 0 1.63-3.16l-1.2-1.66 2.49-2.49 1.41 1.41-2 2a2 2 0 0 0-.16 2.65l1.2 1.66a4 4 0 0 1-3.26 6.35h-10a4 4 0 0 1-3.26-6.35l1.2-1.66-2-2a2 2 0 0 1-.16-2.65Z"
      />
    </svg>
  );
}

function ClipboardCheck(props) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M16 2a3 3 0 0 1 3 3v1h1a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1V5a3 3 0 0 1 3-3h8Zm4 6H4v12h16V8Zm-6.88 6.47-1.8-1.8a1 1 0 0 0-1.41 1.41l2.5 2.5a1 1 0 0 0 1.41 0l4.5-4.5a1 1 0 1 0-1.41-1.41l-3.79 3.8ZM15 4H9a1 1 0 0 0-1 1v1h8V5a1 1 0 0 0-1-1Z"
      />
    </svg>
  );
}

const initialTeam = [
  { id: "u1", name: "Alex Rivera" },
  { id: "u2", name: "Jamie Chen" },
  { id: "u3", name: "Morgan Patel" },
];

const initialMilestones = [
  { id: "m1", title: "Discovery" },
  { id: "m2", title: "Design" },
  { id: "m3", title: "Launch" },
];

const initialTasks = [
  {
    id: "t1",
    title: "Outline launch checklist",
    milestoneId: "m3",
    assigneeId: "u1",
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: "inprogress",
  },
  {
    id: "t2",
    title: "Interview stakeholders",
    milestoneId: "m1",
    assigneeId: "u2",
    dueDate: new Date(Date.now() - 86400000).toISOString(),
    status: "todo",
  },
  {
    id: "t3",
    title: "Finalize prototype",
    milestoneId: "m2",
    assigneeId: "u3",
    dueDate: null,
    status: "blocked",
  },
  {
    id: "t4",
    title: "Publish project brief",
    milestoneId: "m1",
    assigneeId: "u1",
    dueDate: new Date().toISOString(),
    status: "done",
    completedDate: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export default function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [tasksCollapsed, setTasksCollapsed] = useState(false);
  const [view, setView] = useState("list");
  const [listPriority, setListPriority] = useState(null);
  const [taskSortMode, setTaskSortMode] = useState("dueDate");
  const tasksSectionRef = useRef(null);

  const totals = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.reduce(
      (acc, task) => {
        if (task.status === "done") {
          acc.done += 1;
          return acc;
        }
        if (task.status === "inprogress") acc.inprogress += 1;
        if (task.status === "todo") acc.todo += 1;
        if (task.dueDate) {
          const due = new Date(task.dueDate);
          due.setHours(0, 0, 0, 0);
          if (due < today) acc.overdue += 1;
        }
        return acc;
      },
      { inprogress: 0, todo: 0, overdue: 0, done: 0 },
    );
  }, [tasks]);

  const scrollToSection = useCallback((ref) => {
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleTasksHeaderClick = useCallback(() => {
    if (tasksCollapsed) {
      setTasksCollapsed(false);
    }
  }, [tasksCollapsed]);

  const handleUpdateTask = useCallback((id, patch) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task)),
    );
  }, []);

  const handleEditTask = useCallback((id) => {
    console.info("Edit task", id);
  }, []);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 p-6">
      <header className="rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-slate-50 p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-800">Product Delivery Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Track milestone progress, triage overdue work, and celebrate wins from one place.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <DashboardRing
          title="In Progress"
          value={totals.inprogress}
          subtitle="tasks"
          color="#6366f1"
          icon={
            <IconBadge className="bg-indigo-100 text-indigo-600 shadow-[0_16px_32px_-18px_rgba(99,102,241,0.55)]">
              <ClipboardCheck />
            </IconBadge>
          }
          onClick={() => {
            setTasksCollapsed(false);
            setView("list");
            setListPriority("inprogress");
            setTaskSortMode("status");
            scrollToSection(tasksSectionRef);
          }}
          ariaLabel="Show in-progress tasks"
        />
        <DashboardRing
          title="To Do"
          value={totals.todo}
          subtitle="tasks"
          color="#0ea5e9"
          icon={
            <IconBadge className="bg-sky-100 text-sky-600 shadow-[0_16px_32px_-18px_rgba(14,165,233,0.55)]">
              <ListChecks />
            </IconBadge>
          }
          onClick={() => {
            setTasksCollapsed(false);
            setView("list");
            setListPriority("todo");
            setTaskSortMode("status");
            scrollToSection(tasksSectionRef);
          }}
          ariaLabel="Show to-do tasks first"
        />
        <DashboardRing
          title="Overdue"
          value={totals.overdue}
          subtitle="needs attention"
          color="#ef4444"
          icon={
            <IconBadge className="bg-red-100 text-red-600 shadow-[0_16px_32px_-18px_rgba(239,68,68,0.55)]">
              <AlarmClock />
            </IconBadge>
          }
          onClick={() => {
            setTasksCollapsed(false);
            setView("list");
            setListPriority("overdue");
            setTaskSortMode("status");
            scrollToSection(tasksSectionRef);
          }}
          ariaLabel="Show overdue tasks"
        />
      </section>

      <section ref={tasksSectionRef} className="glass-surface -mx-4 rounded-3xl border border-white/70 bg-white/80 p-4 shadow sm:mx-0 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2" onClick={handleTasksHeaderClick}>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Team checklist</h2>
            <p className="text-sm text-slate-500">Manage accountability and keep blockers moving.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <button
              type="button"
              onClick={() => setTaskSortMode("dueDate")}
              className={`rounded-full px-3 py-1 ${taskSortMode === "dueDate" ? "bg-slate-900 text-white" : "bg-slate-100"}`}
            >
              Sort by due date
            </button>
            <button
              type="button"
              onClick={() => setTaskSortMode("status")}
              className={`rounded-full px-3 py-1 ${taskSortMode === "status" ? "bg-slate-900 text-white" : "bg-slate-100"}`}
            >
              Group by status
            </button>
          </div>
        </div>
        {!tasksCollapsed && (
          <TaskChecklist
            tasks={tasks}
            team={initialTeam}
            milestones={initialMilestones}
            onUpdate={handleUpdateTask}
            onEdit={handleEditTask}
            statusPriority={listPriority}
            sortMode={taskSortMode}
          />
        )}
      </section>
    </div>
  );
}
