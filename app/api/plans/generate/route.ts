import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase";
import { minutesRemainingToday, todayKey } from "@/lib/dates";
import type { Goal, PlanTask, PlanWithTasks } from "@/lib/types";

const requestSchema = z.object({
  mode: z.enum(["generate", "refresh"]),
  sourcePlanId: z.string().uuid().optional().nullable()
});

const taskSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional().nullable(),
  estimated_minutes: z.number().int().min(5).max(180),
  priority: z.number().int().min(1).max(5),
  goal_id: z.string().uuid().optional().nullable()
});

const planSchema = z.object({
  main_focus: z.string().min(1),
  reasoning: z.string().min(1),
  tasks: z.array(taskSchema).min(1).max(8)
});

export async function POST(request: Request) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "Missing OPENROUTER_API_KEY on the server." }, { status: 500 });
    }

    const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!accessToken) {
      return NextResponse.json({ error: "You must sign in before generating a plan." }, { status: 401 });
    }

    const body = requestSchema.parse(await request.json());
    const supabase = createServerSupabaseClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Your session is no longer valid. Please sign in again." }, { status: 401 });
    }

    const userId = authData.user.id;
    const planDate = todayKey();

    const [{ data: goals, error: goalsError }, { data: todayPlans, error: planError }, { data: recentPlans, error: historyError }] =
      await Promise.all([
        supabase
          .from("goals")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("created_at", { ascending: true }),
        supabase
          .from("daily_plans")
          .select("*, tasks:plan_tasks(*)")
          .eq("user_id", userId)
          .eq("plan_date", planDate)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("daily_plans")
          .select("*, tasks:plan_tasks(*)")
          .eq("user_id", userId)
          .lt("plan_date", planDate)
          .order("plan_date", { ascending: false })
          .limit(5)
      ]);

    if (goalsError || planError || historyError) {
      return NextResponse.json({ error: "Could not load planning context from Supabase." }, { status: 500 });
    }

    const plansFromToday = (todayPlans ?? []) as PlanWithTasks[];
    const currentPlan = plansFromToday[0] ?? null;
    const tasks = plansFromToday.flatMap((plan) => plan.tasks ?? []);
    const completed = tasks.filter((task) => task.status === "done");
    const unfinished = tasks.filter((task) => task.status === "not_started");
    const skipped = tasks.filter((task) => task.status === "skipped");
    const tooHard = tasks.filter((task) => task.status === "too_hard");

    const generated = await generatePlan({
      mode: body.mode,
      goals: goals as Goal[],
      latestPlan: currentPlan,
      completed,
      unfinished,
      skipped,
      tooHard,
      recentPlans: (recentPlans ?? []) as PlanWithTasks[],
      availableMinutes: minutesRemainingToday()
    });

    const nextRefreshCount = body.mode === "refresh" ? (currentPlan?.refresh_count ?? 0) + 1 : 0;
    const sourcePlanId = body.mode === "refresh" ? body.sourcePlanId ?? currentPlan?.id ?? null : null;

    const { data: insertedPlan, error: insertPlanError } = await supabase
      .from("daily_plans")
      .insert({
        user_id: userId,
        plan_date: planDate,
        main_focus: generated.main_focus,
        reasoning: generated.reasoning,
        refresh_count: nextRefreshCount,
        source_plan_id: sourcePlanId
      })
      .select("*")
      .single();

    if (insertPlanError || !insertedPlan) {
      return NextResponse.json({ error: "Could not save the generated plan." }, { status: 500 });
    }

    const taskRows = generated.tasks.map((task) => ({
      plan_id: insertedPlan.id,
      user_id: userId,
      title: task.title,
      notes: task.notes ?? null,
      estimated_minutes: task.estimated_minutes,
      priority: task.priority,
      status: "not_started",
      goal_id: task.goal_id ?? null
    }));

    const { data: insertedTasks, error: insertTaskError } = await supabase
      .from("plan_tasks")
      .insert(taskRows)
      .select("*")
      .order("priority", { ascending: true });

    if (insertTaskError) {
      return NextResponse.json({ error: "Could not save the generated tasks." }, { status: 500 });
    }

    return NextResponse.json({ plan: { ...insertedPlan, tasks: insertedTasks ?? [] } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected planning error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

async function generatePlan(context: {
  mode: "generate" | "refresh";
  goals: Goal[];
  latestPlan: PlanWithTasks | null;
  completed: PlanTask[];
  unfinished: PlanTask[];
  skipped: PlanTask[];
  tooHard: PlanTask[];
  recentPlans: PlanWithTasks[];
  availableMinutes: number;
}) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "X-OpenRouter-Title": "GoalPilot"
    },
    body: JSON.stringify({
      model: "google/gemma-4-31b-it:free",
      temperature: 0.45,
      messages: [
        {
          role: "system",
          content:
            "You are a practical daily planning assistant. Return only valid JSON with main_focus, reasoning, and tasks. Keep plans realistic, concise, and useful."
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction:
              context.mode === "refresh"
                ? "Refresh today's plan. Never repeat completed tasks. Replace completed tasks with new useful tasks. Make unfinished tasks more urgent if still important. Break too-hard tasks into smaller easier tasks. Decide whether skipped tasks still matter based on deadline and importance. Return only tasks that should appear in the new current plan."
                : "Generate today's plan from active goals. Prioritize closer deadlines and higher priority goals without overloading the user.",
            output_shape: {
              main_focus: "string",
              reasoning: "string",
              tasks: [
                {
                  title: "string",
                  notes: "short optional string",
                  estimated_minutes: "integer 5-180",
                  priority: "integer 1-5 where 1 is highest",
                  goal_id: "matching goal id or null"
                }
              ]
            },
            hard_rules: [
              "Do not include any completed task title or obvious rewording of a completed task.",
              "Total estimated time must fit comfortably in available_minutes.",
              "Keep 3 to 6 tasks unless the goals clearly need fewer.",
              "Use exact goal_id values only when they match an active goal."
            ],
            available_minutes: context.availableMinutes,
            active_goals: context.goals,
            today_latest_plan: context.latestPlan,
            completed_tasks_today: context.completed,
            unfinished_tasks_today: context.unfinished,
            skipped_tasks_today: context.skipped,
            too_hard_tasks_today: context.tooHard,
            recent_task_history_previous_days: context.recentPlans
          })
        }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter request failed: ${errorBody || response.statusText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter returned an empty plan.");
  }

  return planSchema.parse(parseJsonContent(content));
}

function parseJsonContent(content: string) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced?.[1] ?? trimmed);
}
