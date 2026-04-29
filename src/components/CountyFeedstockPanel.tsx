'use client';

import React from 'react';
import { X, Download, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  getCountyMetric,
  getDisplaySources,
} from '@/lib/county-analysis';
import type { CountyCropStat, CountyDataSource, CountyMetricValue } from '@/lib/county-analysis';
import { downloadCSV } from '@/lib/utils';

interface CountyFeedstockPanelProps {
  countyName: string;
  geoid: string;
  stats: CountyCropStat[];
  onClose: () => void;
}

type CountyExportRow = Record<string, string | number | boolean | null | undefined>;

function formatValue(value: number, unit: string): string {
  const normalizedUnit = unit.toLowerCase();
  const displayUnit =
    normalizedUnit.startsWith('operation') && value === 1 ? 'operation' : unit;
  const displayValue =
    normalizedUnit.startsWith('operation') || Number.isInteger(value) || value >= 1000
      ? Math.round(value).toLocaleString()
      : value.toFixed(1);
  return `${displayValue} ${displayUnit}`;
}

function SourceBadge({ source }: { source: CountyDataSource }) {
  const classes =
    source === 'census'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-purple-50 text-purple-700 border-purple-200';

  return (
    <span className={`rounded px-1 py-px text-[9px] font-medium leading-tight border ${classes}`}>
      {source}
    </span>
  );
}

function MetricCell({ metric }: { metric: CountyMetricValue | null }) {
  if (!metric) {
    return <span className="text-gray-300">—</span>;
  }

  return (
    <span title={`${metric.parameter} (${metric.source})`}>
      {formatValue(metric.value, metric.unit)}
    </span>
  );
}

const CountyFeedstockPanel: React.FC<CountyFeedstockPanelProps> = ({
  countyName,
  geoid,
  stats,
  onClose,
}) => {
  const handleExport = () => {
    if (stats.length === 0) return;
    const rows = stats.flatMap(stat => {
      const acres = getCountyMetric(stat, 'acres');
      const production = getCountyMetric(stat, 'production');
      const rowsForStat: CountyExportRow[] = [];

      if (acres) {
        rowsForStat.push({
          Crop: stat.landiqName,
          Resource: stat.resource,
          Metric: 'Acres Harvested',
          Parameter: acres.parameter,
          Value: acres.value,
          Unit: acres.unit,
          Source: acres.source,
        });
      }

      if (production) {
        rowsForStat.push({
          Crop: stat.landiqName,
          Resource: stat.resource,
          Metric: 'Production',
          Parameter: production.parameter,
          Value: production.value,
          Unit: production.unit,
          Source: production.source,
        });
      }

      return rowsForStat;
    });
    downloadCSV(rows, `${countyName.replace(/\s/g, '-').toLowerCase()}-feedstock-stats.csv`, [
      `Cal BioScape — County Feedstock Profile: ${countyName} County`,
      `FIPS: ${geoid}`,
    ]);
  };

  return (
    <Card className="absolute bottom-4 right-4 z-20 w-[520px] max-w-[60%] shadow-xl bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-blue-600" />
            {countyName} County — Feedstock Profile
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">USDA census/survey data · FIPS {geoid}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors ml-2 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[320px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="py-2 px-3 text-left font-medium text-gray-500">Crop</th>
              <th className="py-2 px-2 text-right font-medium text-gray-500">Acres Harvested</th>
              <th className="py-2 px-2 text-right font-medium text-gray-500">Production</th>
              <th className="py-2 px-2 text-right font-medium text-gray-500 w-14">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stats.map((stat, i) => {
              const acres = getCountyMetric(stat, 'acres');
              const production = getCountyMetric(stat, 'production');
              const sources = getDisplaySources(acres, production);
              return (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <span className="font-medium">{stat.landiqName}</span>
                    <span className="block text-[10px] text-gray-400">{stat.resource.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="py-2 px-2 text-right text-gray-700">
                    <MetricCell metric={acres} />
                  </td>
                  <td className="py-2 px-2 text-right text-gray-700">
                    <MetricCell metric={production} />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="inline-flex flex-col items-end gap-1">
                      {sources.length > 0
                        ? sources.map(source => <SourceBadge key={source} source={source} />)
                        : <span className="text-gray-300">—</span>}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center border-t pt-2">
        <span className="text-[10px] text-gray-400">{stats.length} crops with data</span>
        <button
          onClick={handleExport}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 underline"
        >
          <Download className="h-3 w-3" />
          Export CSV
        </button>
      </div>
    </Card>
  );
};

export default CountyFeedstockPanel;
