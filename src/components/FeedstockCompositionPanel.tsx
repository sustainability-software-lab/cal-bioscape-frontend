'use client';

import React from 'react';
import { CompositionData } from '@/lib/composition-filters';

// ---------------------------------------------------------------------------
// Metric display config
// ---------------------------------------------------------------------------

type RatingColor = 'green' | 'amber' | 'red' | 'neutral';

interface MetricConfig {
  label: string;
  unit: string;
  tooltip: string;
  /** Classify the value into a color for bioeconomy relevance */
  rate: (v: number) => RatingColor;
}

const METRICS: Array<{ key: keyof CompositionData; config: MetricConfig }> = [
  {
    key: 'cellulose',
    config: {
      label: 'Cellulose',
      unit: '%',
      tooltip: 'Higher cellulose favours fermentation (ethanol) and fast pyrolysis.',
      rate: (v) => v >= 30 ? 'green' : v >= 15 ? 'amber' : 'red',
    },
  },
  {
    key: 'hemicellulose',
    config: {
      label: 'Hemicellulose',
      unit: '%',
      tooltip: 'Contributes to fermentation yield; also converted in thermochemical processes.',
      rate: (v) => v >= 20 ? 'green' : v >= 10 ? 'amber' : 'red',
    },
  },
  {
    key: 'lignin',
    config: {
      label: 'Lignin',
      unit: '%',
      tooltip: 'Low lignin benefits biochemical conversion; high lignin suits gasification/pyrolysis.',
      rate: (v) => v <= 15 ? 'green' : v <= 25 ? 'amber' : 'red',
    },
  },
  {
    key: 'ash',
    config: {
      label: 'Ash',
      unit: '%',
      tooltip: 'Low ash reduces fouling in boilers and gasifiers.',
      rate: (v) => v <= 5 ? 'green' : v <= 15 ? 'amber' : 'red',
    },
  },
  {
    key: 'moisture',
    config: {
      label: 'Moisture',
      unit: '%',
      tooltip: 'Low moisture is ideal for thermal processes; high moisture suits anaerobic digestion.',
      rate: (v) => v <= 15 ? 'green' : v <= 30 ? 'amber' : 'neutral',
    },
  },
  {
    key: 'volatileMatter',
    config: {
      label: 'Volatile Matter',
      unit: '%',
      tooltip: 'High volatile matter indicates high reactivity, beneficial for gasification and combustion.',
      rate: (v) => v >= 70 ? 'green' : v >= 50 ? 'amber' : 'red',
    },
  },
  {
    key: 'fixedCarbon',
    config: {
      label: 'Fixed Carbon',
      unit: '%',
      tooltip: 'Contributes to char yield in pyrolysis and combustion residence time.',
      rate: (_v) => 'neutral',
    },
  },
  {
    key: 'carbon',
    config: {
      label: 'Carbon (C)',
      unit: '%',
      tooltip: 'Higher carbon content indicates greater energy potential.',
      rate: (v) => v >= 45 ? 'green' : v >= 38 ? 'amber' : 'red',
    },
  },
  {
    key: 'hydrogen',
    config: {
      label: 'Hydrogen (H)',
      unit: '%',
      tooltip: 'Hydrogen content contributes to calorific value.',
      rate: (_v) => 'neutral',
    },
  },
  {
    key: 'nitrogen',
    config: {
      label: 'Nitrogen (N)',
      unit: '%',
      tooltip: 'Low nitrogen (<1%) is better for combustion; high nitrogen (>2%) indicates AD suitability.',
      rate: (v) => v <= 1 ? 'green' : v <= 2 ? 'amber' : 'neutral',
    },
  },
  {
    key: 'sulfur',
    config: {
      label: 'Sulfur (S)',
      unit: '%',
      tooltip: 'Low sulfur reduces SO₂ emissions during combustion.',
      rate: (v) => v <= 0.2 ? 'green' : v <= 0.5 ? 'amber' : 'red',
    },
  },
  {
    key: 'hhv',
    config: {
      label: 'HHV',
      unit: 'MJ/kg',
      tooltip: 'Higher Heating Value (dry basis) — indicates energy density of the feedstock.',
      rate: (v) => v >= 17 ? 'green' : v >= 14 ? 'amber' : 'red',
    },
  },
];

const COLOR_CLASSES: Record<RatingColor, string> = {
  green:   'bg-green-50 text-green-800 border-green-200',
  amber:   'bg-amber-50 text-amber-800 border-amber-200',
  red:     'bg-red-50 text-red-800 border-red-200',
  neutral: 'bg-gray-50 text-gray-700 border-gray-200',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface FeedstockCompositionPanelProps {
  composition: CompositionData;
  source: 'api' | 'fallback';
}

const FeedstockCompositionPanel: React.FC<FeedstockCompositionPanelProps> = ({
  composition,
  source,
}) => {
  const availableMetrics = METRICS.filter(
    ({ key }) => key !== 'hasData' && composition[key] !== undefined
  );

  if (availableMetrics.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-gray-400 italic">
        No composition data available for this crop.
      </div>
    );
  }

  return (
    <div className="px-3 pb-2 pt-1 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
          Biomass Composition
        </span>
        <span
          className={`rounded px-1 py-px text-[9px] font-medium leading-tight border ${
            source === 'api'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
          title={source === 'api' ? 'Data from Cal BioScape analysis API' : 'Data estimated from published literature'}
        >
          {source === 'api' ? 'api' : 'est.'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {availableMetrics.map(({ key, config }) => {
          const value = composition[key] as number;
          const color = config.rate(value);
          return (
            <div
              key={key}
              className={`rounded border px-2 py-1 text-center ${COLOR_CLASSES[color]}`}
              title={config.tooltip}
            >
              <div className="text-[10px] font-medium leading-tight truncate">{config.label}</div>
              <div className="text-xs font-bold mt-0.5">
                {value.toFixed(key === 'hhv' || key === 'lhv' ? 1 : 1)}{config.unit}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FeedstockCompositionPanel;
