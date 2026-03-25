'use client';

import React, { useState } from 'react';
import { Info, Zap } from 'lucide-react';
import { EnergyTotals, EnergyUnit, convertGj, energyUnitLabel } from '@/lib/energy-calculations';
import { formatNumberWithCommas } from '@/lib/utils';

interface EnergyPotentialCardProps {
  totals: EnergyTotals | null;
  isLoading: boolean;
}

const EnergyPotentialCard: React.FC<EnergyPotentialCardProps> = ({ totals, isLoading }) => {
  const [unit, setUnit] = useState<EnergyUnit>('GJ');

  const displayValue = totals ? Math.round(convertGj(totals.totalGj, unit)) : null;

  return (
    <div className="border rounded-md bg-gradient-to-br from-green-50 to-emerald-50 border-emerald-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-emerald-800">
          <Zap className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Feedstock Energy Potential</span>
        </div>
        {/* Unit toggle */}
        <div className="flex rounded border border-emerald-200 overflow-hidden text-[10px]">
          {(['GJ', 'MMBTU', 'MWh'] as EnergyUnit[]).map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`px-2 py-0.5 transition-colors ${
                unit === u
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-gray-400 italic">Calculating energy potential…</p>
      ) : totals && totals.totalGj > 0 ? (
        <div className="space-y-1.5">
          {/* Primary figure */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-700">
              {formatNumberWithCommas(displayValue!)}
            </span>
            <span className="text-sm text-emerald-600">{energyUnitLabel(unit)}/year</span>
          </div>

          {/* Conversion equivalents */}
          <div className="text-[11px] text-gray-600 space-y-0.5">
            <p>
              ≈{' '}
              <span className="font-medium text-gray-700">
                {formatNumberWithCommas(Math.round(totals.electricityMwh))} MWh
              </span>{' '}
              electricity/year at 28% thermal efficiency
            </p>
          </div>

          {/* Bar chart — top 5 crops by energy share */}
          {totals.cropBreakdown.length > 1 && (
            <div className="mt-2 space-y-1">
              {totals.cropBreakdown
                .sort((a, b) => b.energyGj - a.energyGj)
                .slice(0, 5)
                .map((crop) => {
                  const pct = totals.totalGj > 0
                    ? Math.round((crop.energyGj / totals.totalGj) * 100)
                    : 0;
                  return (
                    <div key={crop.cropName} className="flex items-center gap-1.5 text-[10px]">
                      <span className="w-28 truncate text-gray-600 flex-shrink-0" title={crop.cropName}>
                        {crop.cropName}
                      </span>
                      <div className="flex-1 bg-emerald-100 rounded-full h-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-gray-500 w-7 text-right flex-shrink-0">{pct}%</span>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Data source footnote */}
          {!totals.allApiData && (
            <div className="flex items-center gap-1 mt-1">
              <p className="text-[10px] text-amber-600">
                Some HHV values estimated from literature.
              </p>
              <div className="relative group">
                <Info className="h-3 w-3 text-amber-500 cursor-help flex-shrink-0" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-60 bg-gray-900 text-gray-100 text-[10px] leading-relaxed rounded-md px-2.5 py-2 hidden group-hover:block z-50 shadow-lg">
                  Higher heating values (HHV) for crops without measured data are drawn from the{' '}
                  <a
                    href="https://phyllis.nl/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-300 hover:text-blue-200"
                  >
                    Phyllis2 biomass database
                  </a>
                  {' '}(TNO, Netherlands), which aggregates measured compositional data for agricultural residues and waste materials.
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">
          No energy data available for crops in this buffer zone.
        </p>
      )}
    </div>
  );
};

export default EnergyPotentialCard;
