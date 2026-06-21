import type { FormEvent } from "react";
import { todayKey } from "@/lib/dates";
import type { Goal, PlanTask, PlanWithTasks, TaskStatus } from "@/lib/types";

type PlanningMode = "generate" | "refresh";

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "done", label: "Done" },
  { value: "skipped", label: "Skipped" },
  { value: "too_hard", label: "Too hard" }
];

export function SignInScreen({
  email,
  authLoading,
  authMessage,
  error,
  onEmailChange,
  onSubmit
}: {
  email: string;
  authLoading: boolean;
  authMessage: string;
  error: string;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-8 text-zinc-100">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-soft">
        <p className="text-sm font-medium text-violet-300">Daily focus</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">GoalPilot</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Sign in with your email to save goals, plans, and task history to your account.
        </p>

        <form className="mt-6 grid gap-3" onSubmit={onSubmit}>
          <label className="text-sm font-medium text-zinc-300" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400"
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <button
            className="mt-2 rounded-2xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={authLoading}
          >
            {authLoading ? "Sending link..." : "Email me a sign-in link"}
          </button>
        </form>

        {authMessage ? <SuccessMessage message={authMessage} /> : null}
        {error ? <ErrorMessage message={error} className="mt-4" /> : null}
      </section>
    </main>
  );
}

export function DashboardShell({
  error,
  children,
  onSignOut
}: {
  error: string;
  children: React.ReactNode;
  onSignOut: () => void;
}) {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <DashboardHeader onSignOut={onSignOut} />
        {error ? <ErrorMessage message={error} /> : null}
        {children}
      </div>
    </main>
  );
}

function DashboardHeader({ onSignOut }: { onSignOut: () => void }) {
  return (
    <header className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-zinc-900/70 p-5 shadow-soft sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-medium text-violet-300">Daily focus</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white sm:text-4xl">GoalPilot</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Plan the day from your active goals, refresh when reality changes, and keep completed work in history.
        </p>
      </div>
      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300 sm:items-end">
        <div>
          <span className="text-zinc-500">Today</span>
          <span className="ml-2 font-medium text-white">{todayKey()}</span>
        </div>
        <button className="text-left text-xs font-medium text-violet-300 transition hover:text-violet-200 sm:text-right" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}

export function DashboardGrid({ children }: { children: React.ReactNode }) {
  return <section className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">{children}</section>;
}

export function GoalsPanel({
  goals,
  goalTitle,
  goalPriority,
  goalDeadline,
  onGoalTitleChange,
  onGoalPriorityChange,
  onGoalDeadlineChange,
  onSubmit
}: {
  goals: Goal[];
  goalTitle: string;
  goalPriority: Goal["priority"];
  goalDeadline: string;
  onGoalTitleChange: (value: string) => void;
  onGoalPriorityChange: (value: Goal["priority"]) => void;
  onGoalDeadlineChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Active Goals</h2>
            <p className="text-sm text-zinc-400">{goals.length} goal{goals.length === 1 ? "" : "s"} in play</p>
          </div>
        </div>

        <GoalForm
          goalTitle={goalTitle}
          goalPriority={goalPriority}
          goalDeadline={goalDeadline}
          onGoalTitleChange={onGoalTitleChange}
          onGoalPriorityChange={onGoalPriorityChange}
          onGoalDeadlineChange={onGoalDeadlineChange}
          onSubmit={onSubmit}
        />

        <div className="space-y-3">
          {goals.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-zinc-500">
              Add a goal so the planner has something meaningful to aim at.
            </p>
          ) : (
            goals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
          )}
        </div>
      </section>
    </div>
  );
}

function GoalForm({
  goalTitle,
  goalPriority,
  goalDeadline,
  onGoalTitleChange,
  onGoalPriorityChange,
  onGoalDeadlineChange,
  onSubmit
}: {
  goalTitle: string;
  goalPriority: Goal["priority"];
  goalDeadline: string;
  onGoalTitleChange: (value: string) => void;
  onGoalPriorityChange: (value: Goal["priority"]) => void;
  onGoalDeadlineChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="mb-5 grid gap-3" onSubmit={onSubmit}>
      <input
        className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-400"
        value={goalTitle}
        onChange={(event) => onGoalTitleChange(event.target.value)}
        placeholder="Add a goal"
      />
      <div className="grid grid-cols-[1fr_1.1fr_auto] gap-2">
        <select
          className="rounded-2xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-violet-400"
          value={goalPriority}
          onChange={(event) => onGoalPriorityChange(event.target.value as Goal["priority"])}
          aria-label="Goal priority"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input
          className="min-w-0 rounded-2xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm text-white outline-none focus:border-violet-400"
          type="date"
          value={goalDeadline}
          onChange={(event) => onGoalDeadlineChange(event.target.value)}
          aria-label="Goal deadline"
        />
        <button
          className="rounded-2xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={!goalTitle.trim()}
        >
          Add
        </button>
      </div>
    </form>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-medium leading-6 text-white">{goal.title}</h3>
        <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-xs font-medium capitalize text-violet-200">
          {goal.priority}
        </span>
      </div>
      {goal.deadline ? <p className="mt-2 text-xs text-zinc-500">Deadline {goal.deadline}</p> : null}
    </article>
  );
}

export function TodayPlanPanel({
  plan,
  loading,
  planning,
  savingTaskId,
  goalsCount,
  totalMinutes,
  onGeneratePlan,
  onUpdateTaskStatus
}: {
  plan: PlanWithTasks | null;
  loading: boolean;
  planning: PlanningMode | null;
  savingTaskId: string | null;
  goalsCount: number;
  totalMinutes: number;
  onGeneratePlan: (mode: PlanningMode) => void;
  onUpdateTaskStatus: (task: PlanTask, status: TaskStatus) => void;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900/80 p-5 shadow-soft">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Today&apos;s Plan</h2>
          <p className="mt-1 text-sm text-zinc-400">
            {plan ? `${plan.tasks.length} tasks, about ${totalMinutes} minutes` : "Generate a focused plan for today"}
          </p>
        </div>
        <PlanActions goalsCount={goalsCount} planning={planning} hasPlan={Boolean(plan)} onGeneratePlan={onGeneratePlan} />
      </div>

      {loading ? <LoadingCard /> : null}
      {!loading && !plan ? <EmptyPlan /> : null}
      {!loading && plan ? <PlanDetails plan={sortPlanTasks(plan)} savingTaskId={savingTaskId} onUpdateTaskStatus={onUpdateTaskStatus} /> : null}
    </section>
  );
}

function PlanActions({
  goalsCount,
  planning,
  hasPlan,
  onGeneratePlan
}: {
  goalsCount: number;
  planning: PlanningMode | null;
  hasPlan: boolean;
  onGeneratePlan: (mode: PlanningMode) => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <button
        className="rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:border-violet-300/50 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onGeneratePlan("generate")}
        disabled={Boolean(planning) || goalsCount === 0}
      >
        {planning === "generate" ? "Generating..." : "Generate today's plan"}
      </button>
      <button
        className="rounded-2xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onGeneratePlan("refresh")}
        disabled={Boolean(planning) || !hasPlan}
      >
        {planning === "refresh" ? "Refreshing..." : "Refresh today's plan"}
      </button>
    </div>
  );
}

function LoadingCard() {
  return <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-5 text-sm text-zinc-400">Loading...</div>;
}

function EmptyPlan() {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/50 p-8 text-center">
      <p className="text-base font-medium text-white">No plan yet</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">Create today&apos;s plan after adding at least one active goal.</p>
    </div>
  );
}

function PlanDetails({
  plan,
  savingTaskId,
  onUpdateTaskStatus
}: {
  plan: PlanWithTasks;
  savingTaskId: string | null;
  onUpdateTaskStatus: (task: PlanTask, status: TaskStatus) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet-300">Focus</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{plan.main_focus}</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{plan.reasoning}</p>
          </div>
          {plan.refresh_count > 0 ? (
            <span className="w-fit rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">
              Refresh {plan.refresh_count}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {plan.tasks.map((task) => (
          <TaskCard key={task.id} task={task} savingTaskId={savingTaskId} onUpdateTaskStatus={onUpdateTaskStatus} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  savingTaskId,
  onUpdateTaskStatus
}: {
  task: PlanTask;
  savingTaskId: string | null;
  onUpdateTaskStatus: (task: PlanTask, status: TaskStatus) => void;
}) {
  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        task.status === "done" ? "border-emerald-300/20 bg-emerald-950/20 opacity-70" : "border-white/10 bg-zinc-950/70"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-violet-400/10 px-2.5 py-1 text-xs font-medium text-violet-200">
              Priority {task.priority}
            </span>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-400">
              {task.estimated_minutes} min
            </span>
          </div>
          <h3 className={`text-base font-semibold leading-6 ${task.status === "done" ? "text-zinc-400 line-through" : "text-white"}`}>
            {task.title}
          </h3>
          {task.notes ? <p className="mt-2 text-sm leading-6 text-zinc-400">{task.notes}</p> : null}
        </div>
        <select
          className="rounded-2xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-violet-400 disabled:opacity-50"
          value={task.status}
          disabled={savingTaskId === task.id}
          onChange={(event) => onUpdateTaskStatus(task, event.target.value as TaskStatus)}
          aria-label={`Status for ${task.title}`}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}

function SuccessMessage({ message }: { message: string }) {
  return <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">{message}</p>;
}

function ErrorMessage({ message, className = "" }: { message: string; className?: string }) {
  return <div className={`rounded-2xl border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-100 ${className}`}>{message}</div>;
}

function sortPlanTasks(plan: PlanWithTasks): PlanWithTasks {
  return {
    ...plan,
    tasks: [...(plan.tasks ?? [])].sort((a, b) => a.priority - b.priority || a.created_at.localeCompare(b.created_at))
  };
}
