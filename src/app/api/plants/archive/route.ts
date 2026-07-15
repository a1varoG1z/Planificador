import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nextMonthOccurrence } from '@/lib/careSchedule';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { plantId } = await request.json();
  if (!plantId) return NextResponse.json({ error: 'Falta plantId' }, { status: 400 });

  const { data: plant, error: plantError } = await supabase
    .from('plants')
    .select('id, garden_id, species_scientific_name, species_common_name, care_profiles(life_cycle, replant_month, replanting_notes)')
    .eq('id', plantId)
    .single();

  if (plantError || !plant) {
    return NextResponse.json({ error: plantError?.message ?? 'Planta no encontrada' }, { status: 404 });
  }

  const { error: updateError } = await supabase.from('plants').update({ status: 'inactive' }).eq('id', plantId);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const careProfile = Array.isArray(plant.care_profiles) ? plant.care_profiles[0] : plant.care_profiles;
  const lifeCycle = careProfile?.life_cycle ?? null;
  const replantMonth = careProfile?.replant_month ?? null;

  if (!lifeCycle || lifeCycle === 'perennial' || !replantMonth) {
    return NextResponse.json({ archived: true, reminderCreated: false });
  }

  const remindDate = nextMonthOccurrence(replantMonth);

  const { error: reminderError } = await supabase.from('replanting_reminders').insert({
    garden_id: plant.garden_id,
    source_plant_id: plant.id,
    species_scientific_name: plant.species_scientific_name,
    species_common_name: plant.species_common_name,
    remind_date: remindDate.toISOString().slice(0, 10),
    notes: careProfile?.replanting_notes ?? null,
  });

  if (reminderError) {
    return NextResponse.json({ archived: true, reminderCreated: false, error: reminderError.message });
  }

  return NextResponse.json({
    archived: true,
    reminderCreated: true,
    lifeCycle,
    remindMonth: replantMonth,
    remindDate: remindDate.toISOString().slice(0, 10),
  });
}
