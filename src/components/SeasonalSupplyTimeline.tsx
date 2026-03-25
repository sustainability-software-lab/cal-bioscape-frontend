'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface TimelineCrop {
  name: string;
  color: string;
  dryTons: number;
  /** API availability: 1-indexed month numbers */
  fromMonth: number | null;
  toMonth: number | null;
}

interface SeasonalSupplyTimelineProps {
  crops: TimelineCrop[];
  isLoading: boolean;
}

function buildSegments(fromMonth: number, toMonth: number): Array<[number, number]> {
  // Returns an array of [startIdx, endIdx] segments (0-indexed, inclusive)
  // Handles wrap-around (e.g. Nov → Feb)
  if (fromMonth <= toMonth) {
    return [[fromMonth - 1, toMonth - 1]];
  }
  // Wrap: e.g. Nov(11) → Feb(2) → two segments [10,11] and [0,1]
  return [[fromMonth - 1, 11], [0, toMonth - 1]];
}

const SeasonalSupplyTimeline: React.FC<SeasonalSupplyTimelineProps> = ({ crops, isLoading }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Sort by dry tons descending, take top 12
  const sorted = [...crops]
    .filter(c => c.fromMonth && c.toMonth)
    .sort((a, b) => b.dryTons - a.dryTons)
    .slice(0, 12);

  // Compute total dry tons by month (1-12) for the cumulative bar
  const monthlyTons = React.useMemo(() => {
    const totals = new Array(12).fill(0);
    for (const crop of sorted) {
      if (!crop.fromMonth || !crop.toMonth) continue;
      const segs = buildSegments(crop.fromMonth, crop.toMonth);
      for (const [s, e] of segs) {
        for (let i = s; i <= e; i++) totals[i] += crop.dryTons;
      }
    }
    return totals;
  }, [sorted]);

  const maxMonthlyTons = Math.max(...monthlyTons, 1);

  // Find peak month
  const peakMonthIdx = monthlyTons.indexOf(maxMonthlyTons);

  // Max tons (for bar thickness scaling — max height = 6px, min 2px)
  const maxDryTons = sorted[0]?.dryTons ?? 1;

  if (isLoading) {
    return (
      <div className="border rounded-md border-gray-200 p-3">
        <p className="text-xs text-gray-400 italic">Loading seasonal data…</p>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="border rounded-md border-gray-200 p-3">
        <p className="text-xs text-gray-400 italic">No seasonal availability data for this buffer zone.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md border-gray-200 bg-white">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 text-left"
        onClick={() => setIsCollapsed(c => !c)}
      >
        <div className="flex items-center gap-1.5 text-gray-700">
          <Calendar className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Seasonal Supply Timeline</span>
          <span className="text-[10px] text-gray-400 font-normal ml-1">
            Peak: {MONTHS[peakMonthIdx]}
          </span>
        </div>
        <span className="text-[10px] text-gray-400">{isCollapsed ? '▸' : '▾'}</span>
      </button>

      {!isCollapsed && (
        <div className="px-3 pb-3">
          {/* Single CSS grid wrapper — guarantees label col aligns with month col across all rows */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 48px',
              columnGap: '8px',
              rowGap: '6px',
            }}
          >
            {/* Month header row */}
            <div /> {/* spacer — aligns with crop name column */}
            <div className="grid grid-cols-12 gap-px">
              {MONTHS.map((m, i) => (
                <div
                  key={m}
                  className={`text-center text-[9px] font-medium ${
                    i === peakMonthIdx ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  {m}
                </div>
              ))}
            </div>
            <div /> {/* spacer — aligns with tonnage column */}

            {/* Crop rows */}
            {sorted.map(crop => {
              if (!crop.fromMonth || !crop.toMonth) return null;
              const segs = buildSegments(crop.fromMonth, crop.toMonth);
              const barHeight = Math.max(2, Math.round((crop.dryTons / maxDryTons) * 6));

              return (
                <React.Fragment key={crop.name}>
                  {/* Crop name */}
                  <div
                    className="text-[10px] text-gray-600 truncate text-right self-center"
                    title={crop.name}
                  >
                    {crop.name}
                  </div>
                  {/* Bar track */}
                  <div className="relative self-center" style={{ height: '10px' }}>
                    {segs.map(([s, e], si) => {
                      const width = ((e - s + 1) / 12) * 100;
                      const left = (s / 12) * 100;
                      return (
                        <div
                          key={si}
                          className="absolute rounded-full"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            height: `${barHeight}px`,
                            top: `${(10 - barHeight) / 2}px`,
                            backgroundColor: crop.color,
                            opacity: 0.85,
                          }}
                          title={`${crop.name}: ${MONTHS[s]}–${MONTHS[e]} · ${Math.round(crop.dryTons).toLocaleString()} dry tons/yr`}
                        />
                      );
                    })}
                  </div>
                  {/* Tonnage label */}
                  <div className="text-[10px] text-gray-400 text-right self-center">
                    {crop.dryTons >= 1000
                      ? `${(crop.dryTons / 1000).toFixed(1)}k`
                      : Math.round(crop.dryTons)}
                    {' '}t
                  </div>
                </React.Fragment>
              );
            })}

            {/* Monthly cumulative tonnage bar — spans full width */}
            <div
              style={{ gridColumn: '1 / -1' }}
              className="border-t border-gray-100 pt-1"
            >
              <div className="text-[9px] text-gray-400 mb-1">Monthly feedstock supply (cumulative)</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '80px 1fr 48px',
                  columnGap: '8px',
                }}
              >
                <div /> {/* spacer */}
                <div className="grid grid-cols-12 gap-px" style={{ height: '18px' }}>
                  {monthlyTons.map((tons, i) => {
                    const pct = tons / maxMonthlyTons;
                    return (
                      <div
                        key={i}
                        className="flex items-end"
                        title={`${MONTHS[i]}: ${Math.round(tons).toLocaleString()} dry tons/yr`}
                      >
                        <div
                          className={`w-full rounded-sm ${i === peakMonthIdx ? 'bg-blue-400' : 'bg-gray-300'}`}
                          style={{ height: `${Math.round(pct * 18)}px` }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div /> {/* spacer */}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonalSupplyTimeline;
