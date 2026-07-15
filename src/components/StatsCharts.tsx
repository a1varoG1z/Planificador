'use client';

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const COLORS = ['#2c8a49', '#63c479', '#95dca4', '#256e3d', '#e5477a', '#f7a3bc'];

interface Props {
  totalPlants: number;
  archivedPlants: number;
  totalGardens: number;
  plantsPerGarden: { name: string; value: number }[];
  speciesDistribution: { name: string; value: number }[];
  completionsByType: { watering: number; fertilizing: number; pruning: number };
  overdueByType: { watering: number; fertilizing: number; pruning: number };
  healthyCount: number;
  unhealthyCount: number;
}

const TASK_LABELS = { watering: 'Riego', fertilizing: 'Abono', pruning: 'Poda' };

export function StatsCharts({
  totalPlants,
  archivedPlants,
  totalGardens,
  plantsPerGarden,
  speciesDistribution,
  completionsByType,
  overdueByType,
  healthyCount,
  unhealthyCount,
}: Props) {
  const completionsData = (Object.keys(completionsByType) as (keyof typeof completionsByType)[]).map((k) => ({
    name: TASK_LABELS[k],
    hechas: completionsByType[k],
    atrasadas: overdueByType[k],
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Plantas activas" value={totalPlants} />
        <StatTile label="Jardines" value={totalGardens} />
        <StatTile label="Archivadas" value={archivedPlants} />
      </div>

      {(overdueByType.watering + overdueByType.fertilizing + overdueByType.pruning) > 0 && (
        <div className="card bg-rose-50/80 text-sm text-rose-600">
          ⚠️ Tienes {overdueByType.watering + overdueByType.fertilizing + overdueByType.pruning} tareas atrasadas.
          Revisa el calendario.
        </div>
      )}

      {plantsPerGarden.length > 0 && (
        <ChartCard title="🪴 Plantas por jardín">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={plantsPerGarden}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#2c8a49" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {speciesDistribution.length > 0 && (
        <ChartCard title="🌿 Especies más comunes">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={speciesDistribution} dataKey="value" nameKey="name" outerRadius={80} label>
                {speciesDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <ChartCard title="✅ Tareas este mes (hechas vs atrasadas)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={completionsData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="hechas" fill="#2c8a49" radius={[8, 8, 0, 0]} />
            <Bar dataKey="atrasadas" fill="#e5477a" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {(healthyCount + unhealthyCount) > 0 && (
        <ChartCard title="🩺 Diagnósticos de salud">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Sanas', value: healthyCount },
                  { name: 'Con problemas', value: unhealthyCount },
                ]}
                dataKey="value"
                nameKey="name"
                outerRadius={70}
                label
              >
                <Cell fill="#2c8a49" />
                <Cell fill="#e5477a" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-tight text-center">
      <p className="font-display text-2xl font-bold text-leaf-700">{value}</p>
      <p className="text-xs text-leaf-500">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <p className="mb-2 text-sm font-bold text-leaf-700">{title}</p>
      {children}
    </div>
  );
}
