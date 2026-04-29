'use client';

import React from 'react';
import { X, Download, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CountyCropStat, PRIORITY_PARAMS, fetchCountyFeedstockStats } from '@/lib/county-analysis';
import { downloadCSV } from '@/lib/utils';

interface CountyFeedstockPanelProps {
  countyName: string;
  geoid: string;
  onClose: () => void;
}

function getParamValue(
  stat: CountyCropStat,
  ...labels: string[]
): { value: number; unit: string } | null {
  for (const label of labels) {
    const found = stat.parameters.find(p =>
      p.parameter.toLowerCase().includes(label.toLowerCase())
    );
    if (found) return { value: found.value, unit: found.unit };
  }
  return null;
}

function formatValue(value: number, unit: string): string {
  const rounded = value >= 1000 ? Math.round(value).toLocaleString() : value.toFixed(1);
  return `${rounded} ${unit}`;
}

const CountyFeedstockPanel: React.FC<CountyFeedstockPanelProps> = ({
  countyName,
  geoid,
  onClose,
}) => {
  const [stats, setStats] = React.useState<CountyCropStat[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    setError(null);
    fetchCountyFeedstockStats(geoid)
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load county data.');
        setLoading(false);
      });
  }, [geoid]);

  const handleExport = () => {
    if (stats.length === 0) return;
    const rows = stats.flatMap(stat =>
      stat.parameters
        .filter(p => PRIORITY_PARAMS.some(pp => p.parameter.toLowerCase().includes(pp.toLowerCase())))
        .map(p => ({
          Crop: stat.landiqName,
          Resource: stat.resource,
          Parameter: p.parameter,
          Value: p.value,
          Unit: p.unit,
          Source: stat.source,
        }))
    );
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
      {loading ? (
        <p className="text-xs text-gray-400 italic py-4 text-center">Loading county data…</p>
      ) : error ? (
        <p className="text-xs text-red-500 py-4 text-center">{error}</p>
      ) : stats.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-4 text-center">
          No USDA census or survey data found for {countyName} County.
        </p>
      ) : (
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
                const acres = getParamValue(stat, 'ACRES HARVESTED', 'ACRES PLANTED');
                const production = getParamValue(stat, 'PRODUCTION');
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <span className="font-medium">{stat.landiqName}</span>
                      <span className="block text-[10px] text-gray-400">{stat.resource.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-2 px-2 text-right text-gray-700">
                      {acres ? formatValue(acres.value, acres.unit) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-700">
                      {production ? formatValue(production.value, production.unit) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className={`rounded px-1 py-px text-[9px] font-medium leading-tight border ${
                        stat.source === 'census'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}>
                        {stat.source}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {!loading && stats.length > 0 && (
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
      )}
    </Card>
  );
};

export default CountyFeedstockPanel;
