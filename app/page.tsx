"use client";

import type { AuthError, PostgrestError, Session } from "@supabase/supabase-js";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardGrid,
  DashboardShell,
  GoalsPanel,
  SignInScreen,
  TodayPlanPanel
} from "./components";
import { todayKey } from "@/lib/dates";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import type { Goal, PlanTask, PlanWithTasks, TaskStatus } from "@/lib/types";


type PlanningMode = "generate" | "refresh";

export default function Home() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [plan, setPlan] = useState<PlanWithTasks | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalPriority, setGoalPriority] = useState<Goal["priority"]>("medium");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState<PlanningMode | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const userId = session?.user.id ?? "";
  const setupError = supabase ? "" : "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON.";

  const loadDashboard = useCallback(async (id: string) => {
    if (!id || !supabase) {
      return;
    }

    setError("");
    setLoading(true);

    const [goalsResult, plansResult] = await Promise.all([
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", id)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("daily_plans")
        .select("*, tasks:plan_tasks(*)")
        .eq("user_id", id)
        .eq("plan_date", todayKey())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    ]);

    if (goalsResult.error || plansResult.error) {
      setError(
        `Could not load your dashboard: ${formatSupabaseError(goalsResult.error ?? plansResult.error)}`
      );
    } else {
      setGoals((goalsResult.data ?? []) as Goal[]);
      setPlan((plansResult.data as PlanWithTasks | null) ?? null);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setSession(data.session);
      if (data.session) {
        void loadDashboard(data.session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setGoals([]);
      setPlan(null);
      setError("");

      if (nextSession) {
        void loadDashboard(nextSession.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadDashboard, supabase]);

  const totalMinutes = useMemo(
    () => plan?.tasks.reduce((sum, task) => sum + task.estimated_minutes, 0) ?? 0,
    [plan]
  );

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }

    if (!supabase) {
      setError(setupError);
      return;
    }

    setAuthLoading(true);
    setAuthMessage("");
    setError("");

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      setAuthMessage("Check your email for a sign-in link.");
    }

    setAuthLoading(false);
  }

  async function signOut() {
    await supabase?.auth.signOut();
  }

  async function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!goalTitle.trim() || !userId || !supabase) {
      return;
    }

    setError("");
    const { data, error: goalError } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        title: goalTitle.trim(),
        priority: goalPriority,
        deadline: goalDeadline || null,
        is_active: true
      })
      .select("*")
      .single();

    if (goalError || !data) {
      setError(`Could not add that goal: ${formatSupabaseError(goalError)}`);
      return;
    }

    setGoals((current) => [...current, data as Goal]);
    setGoalTitle("");
    setGoalPriority("medium");
    setGoalDeadline("");
  }

  async function generatePlan(mode: PlanningMode) {
    if (!session || planning) {
      return;
    }

    setError("");
    setPlanning(mode);

    const response = await fetch("/api/plans/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode,
        sourcePlanId: mode === "refresh" ? plan?.id ?? null : null
      })
    });

    const payload = (await response.json()) as { plan?: PlanWithTasks; error?: string };

    if (!response.ok || !payload.plan) {
      setError(payload.error ?? "The planning request failed.");
    } else {
      setPlan(payload.plan);
    }

    setPlanning(null);
  }

  async function updateTaskStatus(task: PlanTask, status: TaskStatus) {
    if (!supabase) {
      setError(setupError);
      return;
    }

    setSavingTaskId(task.id);
    setError("");

    const { error: taskError } = await supabase.from("plan_tasks").update({ status }).eq("id", task.id);

    if (taskError) {
      setError(`Could not update that task: ${formatSupabaseError(taskError)}`);
    } else {
      setPlan((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          tasks: current.tasks.map((item) => (item.id === task.id ? { ...item, status } : item))
        };
      });
    }

    setSavingTaskId(null);
  }

  if (!session) {
    return (
      <SignInScreen
        email={email}
        authLoading={authLoading}
        authMessage={authMessage}
        error={error || setupError}
        onEmailChange={setEmail}
        onSubmit={signIn}
      />
    );
  }

  return (
    <DashboardShell error={error} onSignOut={signOut}>
      <DashboardGrid>
        <GoalsPanel
          goals={goals}
          goalTitle={goalTitle}
          goalPriority={goalPriority}
          goalDeadline={goalDeadline}
          onGoalTitleChange={setGoalTitle}
          onGoalPriorityChange={setGoalPriority}
          onGoalDeadlineChange={setGoalDeadline}
          onSubmit={addGoal}
        />
        <TodayPlanPanel
          plan={plan}
          loading={loading}
          planning={planning}
          savingTaskId={savingTaskId}
          goalsCount={goals.length}
          totalMinutes={totalMinutes}
          onGeneratePlan={generatePlan}
          onUpdateTaskStatus={updateTaskStatus}
        />
      </DashboardGrid>
    </DashboardShell>
  );
}

function formatSupabaseError(error: AuthError | PostgrestError | null) {
  if (!error) {
    return "No details returned.";
  }

  return error.message;
}
