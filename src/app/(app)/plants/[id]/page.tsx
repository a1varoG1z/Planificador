import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PlantDetail } from '@/components/PlantDetail';

export default async function PlantDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: plant } = await supabase.from('plants').select('*').eq('id', params.id).single();
  if (!plant) notFound();

  const [{ data: careProfile }, { data: gardens }, { data: diagnoses }, { data: recommendations }] =
    await Promise.all([
      supabase.from('care_profiles').select('*').eq('plant_id', params.id).maybeSingle(),
      supabase.from('gardens').select('id, name').order('name'),
      supabase.from('diagnoses').select('*').eq('plant_id', params.id).order('created_at', { ascending: false }),
      supabase
        .from('recommendations')
        .select('*')
        .eq('plant_id', params.id)
        .eq('dismissed', false)
        .order('created_at', { ascending: false }),
    ]);

  return (
    <PlantDetail
      plant={plant}
      careProfile={careProfile ?? null}
      gardens={gardens ?? []}
      diagnoses={diagnoses ?? []}
      recommendations={recommendations ?? []}
    />
  );
}
