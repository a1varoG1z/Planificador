export type TaskType = 'watering' | 'fertilizing' | 'pruning';
export type PlantStatus = 'active' | 'inactive';
export type LifeCycle = 'annual' | 'biennial' | 'perennial';

export interface Garden {
  id: string;
  name: string;
  description: string | null;
  location: string;
  created_by: string | null;
  created_at: string;
}

export interface Plant {
  id: string;
  garden_id: string;
  nickname: string | null;
  species_scientific_name: string | null;
  species_common_name: string | null;
  family: string | null;
  photo_url: string | null;
  identification_source: 'plantnet' | 'manual' | null;
  identification_score: number | null;
  notes: string | null;
  status: PlantStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareProfile {
  id: string;
  plant_id: string;
  watering_frequency_days: number | null;
  watering_frequency_days_warm: number | null;
  watering_frequency_days_cool: number | null;
  watering_notes: string | null;
  watering_last_done: string | null;
  fertilizing_frequency_days: number | null;
  fertilizing_frequency_days_warm: number | null;
  fertilizing_frequency_days_cool: number | null;
  fertilizing_notes: string | null;
  fertilizing_last_done: string | null;
  pruning_frequency_days: number | null;
  pruning_notes: string | null;
  pruning_last_done: string | null;
  pruning_season: string | null;
  light_notes: string | null;
  temperature_min: number | null;
  temperature_max: number | null;
  temperature_notes: string | null;
  humidity_notes: string | null;
  soil_notes: string | null;
  propagation_notes: string | null;
  flowering_fruit_tips: string | null;
  toxicity_notes: string | null;
  life_cycle: LifeCycle | null;
  replant_month: number | null;
  replanting_notes: string | null;
  bloom_month: number | null;
  bloom_notes: string | null;
  source: 'perenual' | 'gemini' | 'hybrid' | 'manual' | null;
  raw_notes: string | null;
  generated_at: string;
  updated_at: string;
}

export interface TaskCompletion {
  id: string;
  plant_id: string;
  task_type: TaskType;
  completed_at: string;
  completed_by: string | null;
  notes: string | null;
}

export interface Diagnosis {
  id: string;
  plant_id: string | null;
  photo_url: string;
  is_healthy: boolean | null;
  diagnosis_summary: string | null;
  diagnosis_details: unknown;
  remedies_commercial: string | null;
  remedies_home: string | null;
  created_by: string | null;
  created_at: string;
}

export interface WildFind {
  id: string;
  found_by: string | null;
  photo_url: string;
  species_scientific_name: string | null;
  species_common_name: string | null;
  family: string | null;
  identification_score: number | null;
  quick_info: string | null;
  location_note: string | null;
  found_at: string;
}

export interface Recommendation {
  id: string;
  plant_id: string;
  content: string;
  dismissed: boolean;
  created_at: string;
}

export interface CareProfileDraft {
  watering_frequency_days: number | null;
  watering_frequency_days_warm: number | null;
  watering_frequency_days_cool: number | null;
  watering_notes: string | null;
  fertilizing_frequency_days: number | null;
  fertilizing_frequency_days_warm: number | null;
  fertilizing_frequency_days_cool: number | null;
  fertilizing_notes: string | null;
  pruning_frequency_days: number | null;
  pruning_notes: string | null;
  pruning_season: string | null;
  light_notes: string | null;
  temperature_min: number | null;
  temperature_max: number | null;
  temperature_notes: string | null;
  humidity_notes: string | null;
  soil_notes: string | null;
  propagation_notes: string | null;
  flowering_fruit_tips: string | null;
  toxicity_notes: string | null;
  life_cycle: LifeCycle | null;
  replant_month: number | null;
  replanting_notes: string | null;
  bloom_month: number | null;
  bloom_notes: string | null;
}

export interface PlantPhoto {
  id: string;
  plant_id: string;
  photo_url: string;
  organ: string | null;
  caption: string | null;
  taken_at: string;
}

export interface ReplantingReminder {
  id: string;
  garden_id: string;
  source_plant_id: string | null;
  species_scientific_name: string | null;
  species_common_name: string | null;
  remind_date: string;
  notes: string | null;
  dismissed: boolean;
  created_at: string;
}

export interface ShoppingItem {
  id: string;
  item: string;
  quantity: string | null;
  notes: string | null;
  plant_id: string | null;
  done: boolean;
  created_at: string;
}
