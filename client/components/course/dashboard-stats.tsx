import { Flame, GraduationCap, TimerReset } from "lucide-react";
import type { UserProgress } from "@/services/types";

export function DashboardStats({ coursesCount, progress = [] }: { coursesCount: number; progress?: UserProgress[] }) {
  const streak = calculateStreak(progress);
  const completedLessons = progress.filter((item) => item.completed).length;
  const stats = [
    { label: "Courses", value: coursesCount, icon: GraduationCap },
    { label: "Streak", value: `${streak}d`, icon: Flame },
    { label: "Review", value: completedLessons ? "Today" : "Start", icon: TimerReset }
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-lg border border-line bg-panel p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-mint text-teal">
            <stat.icon className="h-4 w-4" />
          </div>
          <p className="text-2xl font-semibold text-ink">{stat.value}</p>
          <p className="text-xs text-muted">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

function calculateStreak(progress: UserProgress[]) {
  const activeDays = new Set(
    progress
      .filter((item) => item.completed || item.quizScore > 0 || item.watchedPercentage > 0)
      .map((item) => toDayKey(new Date(item.updatedAt)))
  );

  if (!activeDays.size) {
    return 0;
  }

  let cursor = startOfDay(new Date());
  let streak = 0;

  if (!activeDays.has(toDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (activeDays.has(toDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDayKey(date: Date) {
  const local = startOfDay(date);
  const month = `${local.getMonth() + 1}`.padStart(2, "0");
  const day = `${local.getDate()}`.padStart(2, "0");
  return `${local.getFullYear()}-${month}-${day}`;
}
