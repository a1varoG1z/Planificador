import { createClient } from '@/lib/supabase/server';
import { nextDueDate } from '@/lib/careSchedule';
import { StatsCharts } from '@/components/StatsCharts';
import type { CareProfile, Plant } from '@/lib/types';

export default async function StatsPage() {
  const supabase = createClient();

  const [{ data: gardens }, { data: plants }, { data: recentCompletions }, { data: diagnoses }] =
    await Promise.all([
      supabase.from('gardens').select('id, name'),
      supabase.from('plants').select('*, care_profiles(*)'),
      supabase
        .from('task_completions')
        .select('task_type, completed_at')
        .gte('completed_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from('diagnoses').select('is_healthy'),
    ]);

  const plantsWithProfile = (plants ?? []).map((p) => ({
    ...(p as Plant),
    care_profile: (Array.isArray(p.care_profiles) ? p.care_profiles[0] : p.care_profiles) as CareProfile | null,
  }));

  const plantsPerGarden = (gardens ?? []).map((g) => ({
    name: g.name,
    value: plantsWithProfile.filter((p) => p.garden_id === g.id).length,
  }));

  const speciesCounts = new Map<string, number>();
  for (const p of plantsWithProfile) {
    const key = p.species_common_name || p.species_scientific_name || 'Sin identificar';
    speciesCounts.set(key, (speciesCounts.get(key) ?? 0) + 1);
  }
  const speciesDistribution = [...speciesCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const completionsByType = { watering: 0, fertilizing: 0, pruning: 0 };
  for (const c of recentCompletions ?? []) {
    if (c.task_type in completionsByType) {
      completionsByType[c.task_type as keyof typeof completionsByType] += 1;
    }
  }

  const today = new Date();
  const overdueByType = { watering: 0, fertilizing: 0, pruning: 0 };
  for (const p of plantsWithProfile) {
    const profile = p.care_profile;
    if (!profile) continue;
    (['watering', 'fertilizing', 'pruning'] as const).forEach((type) => {
      const due = nextDueDate(
        profile[`${type}_last_done` as const],
        profile[`${type}_frequency_days` as const],
        p.created_at
      );
      if (due && due < today) overdueByType[type] += 1;
    });
  }

  const healthyCount = (diagnoses ?? []).filter((d) => d.is_healthy).length;
  const unhealthyCount = (diagnoses ?? []).length - healthyCount;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-leaf-800">Estadisticas</h1>
      <StatsCharts
        totalPlants={plantsWithProfile.length}
        totalGardens={gardens?.length ?? 0}
        plantsPerGarden={plantsPerGarden}
        speciesDistribution={speciesDistribution}
        completionsByType={completionsByType}
        overdueByType={overdueByType}
        healthyCount={healthyCount}
        unhealthyCount={unhealthyCount}
      />
    </div>
  );
}
