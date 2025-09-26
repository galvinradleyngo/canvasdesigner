import React, { useCallback, useMemo } from "react";
import { useCompletionConfetti } from "../hooks/use-completion-confetti.js";

const STATUS_LABELS = {
  todo: "To Do",
  inprogress: "In Progress",
  blocked: "Blocked",
  skip: "Skipped",
  done: "Done",
};

const STATUS_BADGE_TONES = {
  todo: "bg-slate-100/80 text-slate-600 border-white/60",
  inprogress: "bg-indigo-100/80 text-indigo-600 border-indigo-200/80",
  blocked: "bg-rose-100/80 text-rose-600 border-rose-200/80",
  skip: "bg-amber-100/80 text-amber-700 border-amber-200/80",
  done: "bg-emerald-100/80 text-emerald-700 border-emerald-200/80",
};

const DEFAULT_STATUS_BADGE = "bg-slate-100/80 text-slate-600 border-white/60";
const STATUS_SORT_ORDER = ["inprogress", "blocked", "todo", "skip"];

const formatDate = (value) =>
  new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });

export default function TaskChecklist({
  tasks = [],
  team = [],
  milestones = [],
  onUpdate = () => {},
  onEdit = () => {},
  statusPriority = null,
  sortMode = "dueDate",
}) {
  const taskList = useMemo(() => (Array.isArray(tasks) ? tasks : []), [tasks]);
  const teamList = useMemo(() => (Array.isArray(team) ? team : []), [team]);
  const milestoneList = useMemo(() => (Array.isArray(milestones) ? milestones : []), [milestones]);

  const handleUpdate = typeof onUpdate === "function" ? onUpdate : () => {};
  const handleEdit = typeof onEdit === "function" ? onEdit : () => {};

  const { todayDate, todayKey, todayMidnight } = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return {
      todayDate: value,
      todayKey: value.toDateString(),
      todayMidnight: value.getTime(),
    };
  }, []);

  const teamById = useMemo(() => {
    const map = new Map();
    for (const member of teamList) {
      if (member?.id) {
        map.set(member.id, member);
      }
    }
    return map;
  }, [teamList]);

  const milestoneById = useMemo(() => {
    const map = new Map();
    for (const milestone of milestoneList) {
      if (milestone?.id) {
        map.set(milestone.id, milestone);
      }
    }
    return map;
  }, [milestoneList]);

  const { fireOnDone } = useCompletionConfetti();

  const isTaskOverdue = useCallback(
    (task) => {
      if (!task?.dueDate) return false;
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      return due.getTime() < todayMidnight;
    },
    [todayMidnight],
  );

  const isPriorityTask = useCallback(
    (task) => {
      if (!statusPriority) return false;
      if (statusPriority === "overdue") {
        return isTaskOverdue(task);
      }
      return task?.status === statusPriority;
    },
    [statusPriority, isTaskOverdue],
  );

  const sortTasks = useCallback(
    (items) =>
      [...items].sort((a, b) => {
        const pa = isPriorityTask(a) ? 0 : 1;
        const pb = isPriorityTask(b) ? 0 : 1;
        if (pa !== pb) return pa - pb;
        const da = a?.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const db = b?.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
        return (a?.title || "").localeCompare(b?.title || "", undefined, { sensitivity: "base" });
      }),
    [isPriorityTask],
  );

  const { activeGroups, doneTasks } = useMemo(() => {
    const upcoming = [];
    const completed = [];

    for (const task of taskList) {
      if (task?.status === "done") {
        completed.push(task);
      } else {
        upcoming.push(task);
      }
    }

    const groups = [];

    if (sortMode === "status") {
      const overdueItems = [];
      const pending = [];

      for (const item of upcoming) {
        if (isTaskOverdue(item)) {
          overdueItems.push(item);
        } else {
          pending.push(item);
        }
      }

      if (overdueItems.length > 0) {
        const sortedOverdue = sortTasks(overdueItems);
        groups.push({
          id: "status:overdue",
          heading: "Overdue",
          items: sortedOverdue,
          hasPriority: statusPriority === "overdue" || sortedOverdue.some(isPriorityTask),
        });
      }

      const statusBuckets = pending.reduce((acc, task) => {
        const key = task?.status || "unknown";
        (acc[key] ||= []).push(task);
        return acc;
      }, {});

      const baseOrder = STATUS_SORT_ORDER.filter((key) => statusBuckets[key]?.length);
      const extraKeys = Object.keys(statusBuckets)
        .filter((key) => !STATUS_SORT_ORDER.includes(key))
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
      let order = [...baseOrder, ...extraKeys];
      if (statusPriority && statusPriority !== "overdue") {
        order = [statusPriority, ...order.filter((key) => key !== statusPriority)];
      }

      for (const key of order) {
        const bucket = statusBuckets[key];
        if (!bucket || bucket.length === 0) continue;
        const sortedItems = sortTasks(bucket);
        groups.push({
          id: `status:${key}`,
          heading: STATUS_LABELS[key] || (key === "unknown" ? "Other" : key),
          items: sortedItems,
          hasPriority: statusPriority === key && sortedItems.length > 0,
        });
      }
    } else {
      const map = upcoming.reduce((acc, task) => {
        const key = task?.dueDate || "none";
        (acc[key] ||= []).push(task);
        return acc;
      }, {});

      for (const [date, items] of Object.entries(map)) {
        const sortedItems = sortTasks(items);
        const hasPriority = sortedItems.some(isPriorityTask);
        groups.push({
          id: `due:${date}`,
          heading: date === "none" ? "No due date" : formatDate(date),
          items: sortedItems,
          hasPriority,
          date,
        });
      }

      groups.sort((a, b) => {
        if (statusPriority && a.hasPriority !== b.hasPriority) {
          return a.hasPriority ? -1 : 1;
        }
        if (a.date === "none") return b.date === "none" ? 0 : 1;
        if (b.date === "none") return -1;
        return new Date(a.date) - new Date(b.date);
      });
    }

    const doneTasks = [...completed].sort((a, b) => {
      if (a?.completedDate && b?.completedDate) {
        return new Date(b.completedDate) - new Date(a.completedDate);
      }
      if (a?.completedDate) return -1;
      if (b?.completedDate) return 1;
      return (a?.title || "").localeCompare(b?.title || "", undefined, { sensitivity: "base" });
    });

    return { activeGroups: groups, doneTasks };
  }, [taskList, sortMode, sortTasks, isTaskOverdue, isPriorityTask, statusPriority]);

  return (
    <div className="space-y-6">
      {activeGroups.length > 0 ? (
        <ul className="space-y-2">
          {activeGroups.map(({ id, heading, items }) => (
            <li key={id} className="glass-card p-4 w-full space-y-3">
              <div className="text-sm font-semibold text-slate-700/90">{heading}</div>
              <ul className="space-y-2">
                {items.map((task) => {
                  const milestone = milestoneById.get(task.milestoneId);
                  const assignee = teamById.get(task.assigneeId);
                  const dueDate = task?.dueDate ? new Date(task.dueDate) : null;
                  const dueKey = dueDate ? dueDate.toDateString() : "";
                  const isOverdue = !!dueDate && dueDate < todayDate;
                  const isDueToday = !!dueDate && dueKey === todayKey;
                  const containerTone = isOverdue
                    ? "border-red-200/80 bg-red-50/80 text-red-700/90"
                    : isDueToday
                    ? "border-amber-200/80 bg-amber-50/80 text-amber-700/90"
                    : "border-white/60 bg-white/80 text-slate-700";
                  const pillTone = isOverdue
                    ? "bg-red-100/80 text-red-700 border-red-200/80"
                    : isDueToday
                    ? "bg-amber-100/80 text-amber-700 border-amber-200/80"
                    : task?.dueDate
                    ? "bg-white/80 text-slate-600 border-white/60"
                    : "bg-slate-100/80 text-slate-600 border-white/60";
                  const pillLabel = isOverdue
                    ? "Overdue"
                    : isDueToday
                    ? "Today"
                    : task?.dueDate
                    ? "Scheduled"
                    : "No Date";
                  const isPriority = isPriorityTask(task);
                  const priorityRing = isPriority ? "ring-2 ring-indigo-200/70 ring-offset-1 ring-offset-white" : "";
                  const statusBadgeClass = STATUS_BADGE_TONES[task?.status] || DEFAULT_STATUS_BADGE;

                  return (
                    <li key={task.id}>
                      <div
                        className={`flex items-center gap-3 rounded-3xl border px-4 py-3 shadow-[0_18px_32px_-20px_rgba(15,23,42,0.45)] backdrop-blur transition-all ${containerTone} ${priorityRing}`}
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 text-emerald-500 focus:ring-2 focus:ring-emerald-300"
                          aria-label={`${task.title || "Untitled task"} for ${milestone ? milestone.title : "Unassigned"}`}
                          checked={task?.status === "done"}
                          onChange={(event) => {
                            const nextStatus = event.target.checked ? "done" : "todo";
                            fireOnDone(task?.status, nextStatus);
                            handleUpdate(task.id, { status: nextStatus });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleEdit(task.id)}
                          className="flex-1 min-w-0 text-left focus:outline-none"
                          title={`${task.title || "Untitled task"}${milestone ? ` – ${milestone.title}` : " – Unassigned"}`}
                        >
                          <div className="truncate text-[15px] font-medium leading-tight">
                            {task.title || "Untitled task"}
                          </div>
                          <div className="mt-0.5 truncate text-xs opacity-70">
                            for {milestone ? milestone.title : "Unassigned"} • {assignee ? assignee.name : "Unassigned"}
                          </div>
                        </button>
                        <div className="flex flex-col items-end gap-1 text-[11px] font-semibold uppercase tracking-wide">
                          <span className={`shrink-0 rounded-full border px-2.5 py-1 shadow-sm backdrop-blur ${statusBadgeClass}`}>
                            {STATUS_LABELS[task?.status] || "Unknown"}
                          </span>
                          <span className={`shrink-0 rounded-full border px-2.5 py-1 shadow-sm backdrop-blur ${pillTone}`}>
                            {pillLabel}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-500">
          No upcoming tasks. Add tasks to see them listed here.
        </div>
      )}

      {doneTasks.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-slate-600 mb-2">Completed Tasks</div>
          <ul className="space-y-2">
            {doneTasks.map((task) => {
              const milestone = milestoneById.get(task.milestoneId);
              const assignee = teamById.get(task.assigneeId);
              return (
                <li key={task.id}>
                  <div className="flex items-center gap-3 rounded-3xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-emerald-700 shadow-[0_18px_32px_-20px_rgba(15,23,42,0.45)] backdrop-blur">
                    <input
                      type="checkbox"
                      className="h-5 w-5 shrink-0 rounded-full border-2 border-emerald-300 text-emerald-600 focus:ring-2 focus:ring-emerald-300"
                      aria-label={`${task.title || "Untitled task"} for ${milestone ? milestone.title : "Unassigned"}`}
                      checked
                      onChange={(event) => {
                        const nextStatus = event.target.checked ? "done" : "todo";
                        fireOnDone(task?.status, nextStatus);
                        handleUpdate(task.id, { status: nextStatus });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleEdit(task.id)}
                      className="flex-1 min-w-0 text-left focus:outline-none"
                      title={`${task.title || "Untitled task"}${milestone ? ` – ${milestone.title}` : " – Unassigned"}`}
                    >
                      <div className="truncate text-[15px] font-medium leading-tight">
                        {task.title || "Untitled task"}
                      </div>
                      <div className="mt-0.5 truncate text-xs opacity-70">
                        for {milestone ? milestone.title : "Unassigned"} • {assignee ? assignee.name : "Unassigned"}
                      </div>
                      <div className="mt-1 text-xs font-semibold opacity-80">
                        Completed: {task?.completedDate ? formatDate(task.completedDate) : "—"}
                      </div>
                    </button>
                    <span className="shrink-0 self-start rounded-full border border-emerald-200/80 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 shadow-sm">
                      Done
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
