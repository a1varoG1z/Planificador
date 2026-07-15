-- Plantario - esquema de base de datos para Supabase (Postgres)
--
-- Este archivo es idempotente: se puede volver a ejecutar entero sin
-- problema aunque ya lo hayas ejecutado antes (usa "if not exists" y
-- recrea las policies). Si actualizas la app y este archivo cambia,
-- vuelve a pegarlo entero en el SQL Editor y dale a Run.
--
-- Como aplicarlo:
--   1. Antes de ejecutar, sustituye los dos correos en la funcion
--      is_household_member() mas abajo por los vuestros.
--   2. Pega este archivo entero en Supabase Dashboard -> SQL Editor -> Run.
--   3. Crea los dos usuarios en Authentication -> Users -> Add user
--      (con esos mismos correos), o dejad que se registren una vez y
--      luego restringid signups en Authentication -> Providers.

-- ──────────────────────────────────────────────────────────────
-- Helper: quienes pueden leer/escribir datos (solo los dos de casa)
-- ──────────────────────────────────────────────────────────────
create or replace function public.is_household_member()
returns boolean
language sql
stable
as $$
  select auth.jwt() ->> 'email' in (
    'PON_AQUI_TU_EMAIL@example.com',
    'PON_AQUI_EL_EMAIL_DE_TU_PAREJA@example.com'
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ──────────────────────────────────────────────────────────────
-- Jardines (agrupan plantas)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.gardens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  -- ciudad/zona del jardin, para que la IA ajuste clima, heladas y epocas de siembra
  location text not null default 'Vitoria-Gasteiz, España',
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.gardens add column if not exists location text not null default 'Vitoria-Gasteiz, España';

alter table public.gardens enable row level security;

drop policy if exists "household can read gardens" on public.gardens;
create policy "household can read gardens" on public.gardens
  for select using (public.is_household_member());
drop policy if exists "household can write gardens" on public.gardens;
create policy "household can write gardens" on public.gardens
  for insert with check (public.is_household_member());
drop policy if exists "household can update gardens" on public.gardens;
create policy "household can update gardens" on public.gardens
  for update using (public.is_household_member()) with check (public.is_household_member());
drop policy if exists "household can delete gardens" on public.gardens;
create policy "household can delete gardens" on public.gardens
  for delete using (public.is_household_member());

-- ──────────────────────────────────────────────────────────────
-- Plantas del jardin
-- ──────────────────────────────────────────────────────────────
create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  nickname text,
  species_scientific_name text,
  species_common_name text,
  family text,
  photo_url text,
  identification_source text check (identification_source in ('plantnet', 'manual')),
  identification_score numeric,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plants add column if not exists status text not null default 'active';
alter table public.plants drop constraint if exists plants_status_check;
alter table public.plants add constraint plants_status_check check (status in ('active', 'inactive'));

create index if not exists plants_garden_id_idx on public.plants(garden_id);
create index if not exists plants_status_idx on public.plants(status);

alter table public.plants enable row level security;

drop policy if exists "household can read plants" on public.plants;
create policy "household can read plants" on public.plants
  for select using (public.is_household_member());
drop policy if exists "household can write plants" on public.plants;
create policy "household can write plants" on public.plants
  for insert with check (public.is_household_member());
drop policy if exists "household can update plants" on public.plants;
create policy "household can update plants" on public.plants
  for update using (public.is_household_member()) with check (public.is_household_member());
drop policy if exists "household can delete plants" on public.plants;
create policy "household can delete plants" on public.plants
  for delete using (public.is_household_member());

drop trigger if exists plants_set_updated_at on public.plants;
create trigger plants_set_updated_at
  before update on public.plants
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- Perfil de cuidados generado por IA/Perenual
-- ──────────────────────────────────────────────────────────────
create table if not exists public.care_profiles (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null unique references public.plants(id) on delete cascade,

  watering_frequency_days int,
  watering_notes text,
  watering_last_done date,

  fertilizing_frequency_days int,
  fertilizing_notes text,
  fertilizing_last_done date,

  pruning_frequency_days int,
  pruning_notes text,
  pruning_last_done date,
  pruning_season text,

  light_notes text,
  temperature_min numeric,
  temperature_max numeric,
  temperature_notes text,
  humidity_notes text,
  soil_notes text,
  propagation_notes text,
  flowering_fruit_tips text,
  toxicity_notes text,

  -- ciclo de vida: si es anual/bienal, replant_month sirve para planificar
  -- cuando volver a plantarla despues de que termine su ciclo (punto 7)
  life_cycle text check (life_cycle in ('annual', 'biennial', 'perennial')),
  replant_month int check (replant_month between 1 and 12),
  replanting_notes text,

  -- prediccion aproximada de la proxima floracion/fructificacion (solo si aplica)
  bloom_month int check (bloom_month between 1 and 12),
  bloom_notes text,

  source text check (source in ('perenual', 'gemini', 'hybrid', 'manual')),
  raw_notes text,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.care_profiles add column if not exists life_cycle text;
alter table public.care_profiles drop constraint if exists care_profiles_life_cycle_check;
alter table public.care_profiles add constraint care_profiles_life_cycle_check
  check (life_cycle in ('annual', 'biennial', 'perennial'));
alter table public.care_profiles add column if not exists replant_month int;
alter table public.care_profiles drop constraint if exists care_profiles_replant_month_check;
alter table public.care_profiles add constraint care_profiles_replant_month_check
  check (replant_month between 1 and 12);
alter table public.care_profiles add column if not exists replanting_notes text;
alter table public.care_profiles add column if not exists bloom_month int;
alter table public.care_profiles drop constraint if exists care_profiles_bloom_month_check;
alter table public.care_profiles add constraint care_profiles_bloom_month_check
  check (bloom_month between 1 and 12);
alter table public.care_profiles add column if not exists bloom_notes text;

alter table public.care_profiles enable row level security;

drop policy if exists "household can read care_profiles" on public.care_profiles;
create policy "household can read care_profiles" on public.care_profiles
  for select using (public.is_household_member());
drop policy if exists "household can write care_profiles" on public.care_profiles;
create policy "household can write care_profiles" on public.care_profiles
  for insert with check (public.is_household_member());
drop policy if exists "household can update care_profiles" on public.care_profiles;
create policy "household can update care_profiles" on public.care_profiles
  for update using (public.is_household_member()) with check (public.is_household_member());
drop policy if exists "household can delete care_profiles" on public.care_profiles;
create policy "household can delete care_profiles" on public.care_profiles
  for delete using (public.is_household_member());

drop trigger if exists care_profiles_set_updated_at on public.care_profiles;
create trigger care_profiles_set_updated_at
  before update on public.care_profiles
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────────────────────
-- Historial de tareas completadas (riego/abono/poda) - calendario y estadisticas
-- ──────────────────────────────────────────────────────────────
create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  task_type text not null check (task_type in ('watering', 'fertilizing', 'pruning')),
  completed_at timestamptz not null default now(),
  completed_by uuid references auth.users(id) default auth.uid(),
  notes text
);

create index if not exists task_completions_plant_id_idx on public.task_completions(plant_id);
create index if not exists task_completions_completed_at_idx on public.task_completions(completed_at);

alter table public.task_completions enable row level security;

drop policy if exists "household can read task_completions" on public.task_completions;
create policy "household can read task_completions" on public.task_completions
  for select using (public.is_household_member());
drop policy if exists "household can write task_completions" on public.task_completions;
create policy "household can write task_completions" on public.task_completions
  for insert with check (public.is_household_member());
drop policy if exists "household can delete task_completions" on public.task_completions;
create policy "household can delete task_completions" on public.task_completions
  for delete using (public.is_household_member());

-- ──────────────────────────────────────────────────────────────
-- Diagnosticos de enfermedades/plagas
-- ──────────────────────────────────────────────────────────────
create table if not exists public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid references public.plants(id) on delete set null,
  photo_url text not null,
  is_healthy boolean,
  diagnosis_summary text,
  diagnosis_details jsonb,
  remedies_commercial text,
  remedies_home text,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists diagnoses_plant_id_idx on public.diagnoses(plant_id);

alter table public.diagnoses enable row level security;

drop policy if exists "household can read diagnoses" on public.diagnoses;
create policy "household can read diagnoses" on public.diagnoses
  for select using (public.is_household_member());
drop policy if exists "household can write diagnoses" on public.diagnoses;
create policy "household can write diagnoses" on public.diagnoses
  for insert with check (public.is_household_member());
drop policy if exists "household can delete diagnoses" on public.diagnoses;
create policy "household can delete diagnoses" on public.diagnoses
  for delete using (public.is_household_member());

-- ──────────────────────────────────────────────────────────────
-- Identificaciones "en la naturaleza", sin jardin asociado
-- ──────────────────────────────────────────────────────────────
create table if not exists public.wild_finds (
  id uuid primary key default gen_random_uuid(),
  found_by uuid references auth.users(id) default auth.uid(),
  photo_url text not null,
  species_scientific_name text,
  species_common_name text,
  family text,
  identification_score numeric,
  quick_info text,
  location_note text,
  found_at timestamptz not null default now()
);

alter table public.wild_finds enable row level security;

drop policy if exists "household can read wild_finds" on public.wild_finds;
create policy "household can read wild_finds" on public.wild_finds
  for select using (public.is_household_member());
drop policy if exists "household can write wild_finds" on public.wild_finds;
create policy "household can write wild_finds" on public.wild_finds
  for insert with check (public.is_household_member());
drop policy if exists "household can delete wild_finds" on public.wild_finds;
create policy "household can delete wild_finds" on public.wild_finds
  for delete using (public.is_household_member());

-- ──────────────────────────────────────────────────────────────
-- Recomendaciones de mejora generadas por IA
-- ──────────────────────────────────────────────────────────────
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  content text not null,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists recommendations_plant_id_idx on public.recommendations(plant_id);

alter table public.recommendations enable row level security;

drop policy if exists "household can read recommendations" on public.recommendations;
create policy "household can read recommendations" on public.recommendations
  for select using (public.is_household_member());
drop policy if exists "household can write recommendations" on public.recommendations;
create policy "household can write recommendations" on public.recommendations
  for insert with check (public.is_household_member());
drop policy if exists "household can update recommendations" on public.recommendations;
create policy "household can update recommendations" on public.recommendations
  for update using (public.is_household_member()) with check (public.is_household_member());
drop policy if exists "household can delete recommendations" on public.recommendations;
create policy "household can delete recommendations" on public.recommendations
  for delete using (public.is_household_member());

-- ──────────────────────────────────────────────────────────────
-- Historial de fotos por planta (punto 4)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.plant_photos (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants(id) on delete cascade,
  photo_url text not null,
  organ text,
  caption text,
  taken_at timestamptz not null default now()
);

create index if not exists plant_photos_plant_id_idx on public.plant_photos(plant_id);

alter table public.plant_photos enable row level security;

drop policy if exists "household can read plant_photos" on public.plant_photos;
create policy "household can read plant_photos" on public.plant_photos
  for select using (public.is_household_member());
drop policy if exists "household can write plant_photos" on public.plant_photos;
create policy "household can write plant_photos" on public.plant_photos
  for insert with check (public.is_household_member());
drop policy if exists "household can delete plant_photos" on public.plant_photos;
create policy "household can delete plant_photos" on public.plant_photos
  for delete using (public.is_household_member());

-- ──────────────────────────────────────────────────────────────
-- Recordatorios de replantacion (punto 7): cuando una planta anual/bienal
-- (ej. tomatera) termina su ciclo y se marca inactiva, se genera aqui un
-- aviso para volver a plantarla en la epoca adecuada.
-- ──────────────────────────────────────────────────────────────
create table if not exists public.replanting_reminders (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  source_plant_id uuid references public.plants(id) on delete set null,
  species_scientific_name text,
  species_common_name text,
  remind_date date not null,
  notes text,
  dismissed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists replanting_reminders_garden_id_idx on public.replanting_reminders(garden_id);
create index if not exists replanting_reminders_remind_date_idx on public.replanting_reminders(remind_date);

alter table public.replanting_reminders enable row level security;

drop policy if exists "household can read replanting_reminders" on public.replanting_reminders;
create policy "household can read replanting_reminders" on public.replanting_reminders
  for select using (public.is_household_member());
drop policy if exists "household can write replanting_reminders" on public.replanting_reminders;
create policy "household can write replanting_reminders" on public.replanting_reminders
  for insert with check (public.is_household_member());
drop policy if exists "household can update replanting_reminders" on public.replanting_reminders;
create policy "household can update replanting_reminders" on public.replanting_reminders
  for update using (public.is_household_member()) with check (public.is_household_member());
drop policy if exists "household can delete replanting_reminders" on public.replanting_reminders;
create policy "household can delete replanting_reminders" on public.replanting_reminders
  for delete using (public.is_household_member());

-- ──────────────────────────────────────────────────────────────
-- Lista de la compra de jardineria (punto 5)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.shopping_list (
  id uuid primary key default gen_random_uuid(),
  item text not null,
  quantity text,
  notes text,
  plant_id uuid references public.plants(id) on delete set null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists shopping_list_done_idx on public.shopping_list(done);

alter table public.shopping_list enable row level security;

drop policy if exists "household can read shopping_list" on public.shopping_list;
create policy "household can read shopping_list" on public.shopping_list
  for select using (public.is_household_member());
drop policy if exists "household can write shopping_list" on public.shopping_list;
create policy "household can write shopping_list" on public.shopping_list
  for insert with check (public.is_household_member());
drop policy if exists "household can update shopping_list" on public.shopping_list;
create policy "household can update shopping_list" on public.shopping_list
  for update using (public.is_household_member()) with check (public.is_household_member());
drop policy if exists "household can delete shopping_list" on public.shopping_list;
create policy "household can delete shopping_list" on public.shopping_list
  for delete using (public.is_household_member());

-- ──────────────────────────────────────────────────────────────
-- Suscripciones a notificaciones push (punto 2)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "household can read push_subscriptions" on public.push_subscriptions;
create policy "household can read push_subscriptions" on public.push_subscriptions
  for select using (public.is_household_member());
drop policy if exists "household can write push_subscriptions" on public.push_subscriptions;
create policy "household can write push_subscriptions" on public.push_subscriptions
  for insert with check (public.is_household_member());
drop policy if exists "household can delete push_subscriptions" on public.push_subscriptions;
create policy "household can delete push_subscriptions" on public.push_subscriptions
  for delete using (public.is_household_member());

-- ──────────────────────────────────────────────────────────────
-- Storage: bucket publico para fotos de plantas/diagnosticos
-- ──────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('plant-photos', 'plant-photos', true)
on conflict (id) do nothing;

drop policy if exists "household can upload plant photos" on storage.objects;
create policy "household can upload plant photos" on storage.objects
  for insert with check (bucket_id = 'plant-photos' and public.is_household_member());
drop policy if exists "anyone can view plant photos" on storage.objects;
create policy "anyone can view plant photos" on storage.objects
  for select using (bucket_id = 'plant-photos');
drop policy if exists "household can delete plant photos" on storage.objects;
create policy "household can delete plant photos" on storage.objects
  for delete using (bucket_id = 'plant-photos' and public.is_household_member());
