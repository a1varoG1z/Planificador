import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PlantDetail } from '@/components/PlantDetail';
import { frequencyForDate, seasonalFrequencyFor } from '@/lib/careSchedule';
import { getGardenWeather } from '@/lib/weather';
import type { HeatAlert } from '@/components/PlantDetail';

export default async function PlantDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: plant } = await supabase.from('plants').select('*').eq('id', params.id).single();
  if (!plant) notFound();

  const [
    { data: careProfile },
    { data: gardens },
    { data: diagnoses },
    { data: recommendations },
    { data: photos },
    { data: harvests },
  ] = await Promise.all([
    supabase.from('care_profiles').select('*').eq('plant_id', params.id).maybeSingle(),
    supabase.from('gardens').select('id, name, location').order('name'),
    supabase.from('diagnoses').select('*').eq('plant_id', params.id).order('created_at', { ascending: false }),
    supabase
      .from('recommendations')
      .select('*')
      .eq('plant_id', params.id)
      .eq('dismissed', false)
      .order('created_at', { ascending: false }),
    supabase.from('plant_photos').select('*').eq('plant_id', params.id).order('taken_at', { ascending: false }),
    supabase.from('harvests').select('*').eq('plant_id', params.id).order('harvested_at', { ascending: false }),
  ]);

  let heatAlert: HeatAlert | null = null;
  if (careProfile?.heat_alert_threshold_c != null) {
    const garden = gardens?.find((g) => g.id === plant.garden_id);
    const weather = garden ? await getGardenWeather(garden.location) : null;
    if (weather) {
      const tempC = Math.max(weather.currentTempC, weather.maxTempTodayC);
      if (tempC >= careProfile.heat_alert_threshold_c) {
        const currentFreq = frequencyForDate(new Date(), seasonalFrequencyFor(careProfile, 'watering'));
        const daysSinceWatered = careProfile.watering_last_done
          ? Math.floor((Date.now() - new Date(careProfile.watering_last_done).getTime()) / 86_400_000)
          : null;
        const dueSoonThreshold = currentFreq ? Math.max(1, Math.round(currentFreq * 0.6)) : null;
        if (daysSinceWatered != null && dueSoonThreshold != null && daysSinceWatered >= dueSoonThreshold) {
          heatAlert = { tempC, daysSinceWatered };
        }
      }
    }
  }

  return (
    <PlantDetail
      plant={plant}
      careProfile={careProfile ?? null}
      gardens={gardens ?? []}
      diagnoses={diagnoses ?? []}
      recommendations={recommendations ?? []}
      photos={photos ?? []}
      harvests={harvests ?? []}
      heatAlert={heatAlert}
    />
  );
}
