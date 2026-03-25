'use client';

import React from 'react';
import { FlaskConical } from 'lucide-react';
import { TechScore } from '@/lib/technology-matcher';

interface TechnologyRecommenderProps {
  scores: TechScore[];
  isLoading: boolean;
}

const COLOR_STYLES: Record<TechScore['color'], { bar: string; badge: string; label: string }> = {
  green: {
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    label: 'text-emerald-700',
  },
  amber: {
    bar: 'bg-amber-400',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    label: 'text-amber-700',
  },
  gray: {
    bar: 'bg-gray-300',
    badge: 'bg-gray-50 text-gray-500 border-gray-200',
    label: 'text-gray-500',
  },
};

const TechnologyRecommender: React.FC<TechnologyRecommenderProps> = ({ scores, isLoading }) => {
  const [expanded, setExpanded] = React.useState(false);
  const top3 = scores.slice(0, 3);

  return (
    <div className="border rounded-md bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-indigo-800">
          <FlaskConical className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Recommended Conversion Pathways</span>
        </div>
        {scores.length > 0 && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-[10px] text-indigo-600 hover:underline"
          >
            {expanded ? 'Less' : 'Details'}
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-gray-400 italic">Analysing feedstock mix…</p>
      ) : scores.length === 0 ? (
        <p className="text-xs text-gray-400 italic">
          No composition data available to score conversion technologies.
        </p>
      ) : (
        <div className="space-y-2">
          {top3.map((tech) => {
            const styles = COLOR_STYLES[tech.color];
            return (
              <div key={tech.name}>
                <div className="flex items-center gap-2 text-xs">
                  {/* Badge */}
                  <span
                    className={`flex-shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${styles.badge}`}
                  >
                    {tech.shortName}
                  </span>
                  {/* Score bar */}
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`${styles.bar} h-1.5 rounded-full transition-all duration-500`}
                      style={{ width: `${tech.score}%` }}
                    />
                  </div>
                  <span className={`w-8 text-right font-medium ${styles.label}`}>
                    {tech.score}%
                  </span>
                </div>
                {/* Rationale — only show first item unless expanded */}
                {expanded && tech.rationale.length > 0 && (
                  <div className="ml-[60px] mt-0.5 space-y-px">
                    {tech.rationale.map((r, i) => (
                      <p key={i} className="text-[10px] text-gray-500 leading-tight">• {r}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {!expanded && top3[0]?.rationale[0] && (
            <p className="text-[10px] text-gray-500 mt-1 leading-tight">
              Key factor: {top3[0].rationale[0].toLowerCase()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TechnologyRecommender;
