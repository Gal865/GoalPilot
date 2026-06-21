export type TaskStatus = "not_started" | "done" | "skipped" | "too_hard";

export type Goal = {
  id: string;
  user_id: string;
  title: string;
  priority: "low" | "medium" | "high";
  deadline: string | null;
  is_active: boolean;
  created_at: string;
};

export type DailyPlan = {
  id: string;
  user_id: string;
  plan_date: string;
  main_focus: string;
  reasoning: string;
  refresh_count: number;
  source_plan_id: string | null;
  created_at: string;
};

export type PlanTask = {
  id: string;
  plan_id: string;
  user_id: string;
  title: string;
  notes: string | null;
  estimated_minutes: number;
  priority: number;
  status: TaskStatus;
  goal_id: string | null;
  created_at: string;
};

export type PlanWithTasks = DailyPlan & {
  tasks: PlanTask[];
};
