'use client';

import React from 'react';
import { Card } from "@/components/ui/card";
import { ChevronDown, Leaf } from 'lucide-react';
import { getCropResidueFactors } from '@/lib/constants';
import { formatNumberWithCommas, downloadCSV } from '@/lib/utils';
import { getAvailability, getAnalysisByResource } from '@/lib/api';
import { getApiResource } from '@/lib/resource-mapping';
import { onResidueDataLoaded } from '@/lib/residue-data';
import { computeEnergyTotals, EnergyTotals } from '@/lib/energy-calculations';
import { CompositionData, parseCompositionData, CompositionFilters, CompositionLookup, cropPassesCompositionFilters } from '@/lib/composition-filters';
import { computeMixSummary, rankTechnologies, TechScore } from '@/lib/technology-matcher';
import EnergyPotentialCard from '@/components/EnergyPotentialCard';
import FeedstockCompositionPanel from '@/components/FeedstockCompositionPanel';
import TechnologyRecommender from '@/components/TechnologyRecommender';
import SeasonalSupplyTimeline from '@/components/SeasonalSupplyTimeline';

interface CropInventory {
  name: string;
  acres: number;
  color: string;
}

interface CropInventoryWithResidue extends CropInventory {
  dryResidueYield: number | null;
  wetResidueYield: number | null;
  residueType: string | null;
  /** Whether residue factors came from the live API JSON or literature-based fallbacks */
  residueSource: 'api' | 'fallback' | null;
  /** Human-readable availability window, e.g. "Aug–Oct" or null while loading */
  availability: string | null;
  availabilityLoading: boolean;
}

interface SitingInventoryProps {
  isVisible: boolean;
  inventory: CropInventory[];
  totalAcres: number;
  bufferRadius: number;
  bufferUnit: string;
  location?: { lng: number; lat: number } | null;
  /** County FIPS GEOIDs overlapping the buffer zone (derived from Map.js) */
  geoids?: string[];
  compositionFilters?: CompositionFilters;
  compositionLookup?: CompositionLookup;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatAvailabilityWindow(fromMonth: number, toMonth: number): string {
  const from = MONTH_NAMES[fromMonth - 1] ?? String(fromMonth);
  const to   = MONTH_NAMES[toMonth   - 1] ?? String(toMonth);
  return `${from}–${to}`;
}

const SitingInventory: React.FC<SitingInventoryProps> = ({
  isVisible,
  inventory,
  totalAcres,
  bufferRadius,
  bufferUnit,
  location,
  geoids,
  compositionFilters,
  compositionLookup,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Re-render once residue data finishes loading so useMemos below see the data.
  const [residueReady, setResidueReady] = React.useState(0);
  React.useEffect(() => onResidueDataLoaded(() => setResidueReady(v => v + 1)), []);

  // ---- residue + availability state ----
  // availability map: LandIQ crop name → display string (or null)
  const [availabilityMap, setAvailabilityMap] = React.useState<Record<string, string | null>>({});
  const [availabilityLoading, setAvailabilityLoading] = React.useState(false);
  // Raw month numbers for the Gantt timeline
  const [rawAvailabilityMap, setRawAvailabilityMap] = React.useState<Record<string, { fromMonth: number; toMonth: number } | null>>({});

  // ---- Full composition data for energy calculations + composition panel ----
  // Maps API resource name → parsed CompositionData (or {hasData:false} if unavailable)
  const [compositionByResource, setCompositionByResource] = React.useState<Record<string, CompositionData>>({});
  const [compositionLoading, setCompositionLoading] = React.useState(false);
  // Per-crop expand state for the composition panel
  const [expandedCrops, setExpandedCrops] = React.useState<Set<string>>(new Set());

  // Fetch availability from the API whenever the inventory or geoids change
  React.useEffect(() => {
    if (!inventory || inventory.length === 0) return;

    // Pick the first (primary) geoid if available; fall back to state-level "06"
    const geoid = geoids && geoids.length > 0 ? geoids[0] : '06';

    setAvailabilityLoading(true);
    const newMap: Record<string, string | null> = {};
    const newRawMap: Record<string, { fromMonth: number; toMonth: number } | null> = {};

    const promises = inventory.map(async (crop) => {
      const apiResource = getApiResource(crop.name);
      if (!apiResource) {
        newMap[crop.name] = null;
        newRawMap[crop.name] = null;
        return;
      }
      try {
        const result = await getAvailability(apiResource, geoid);
        if (result && result.from_month && result.to_month) {
          newMap[crop.name] = formatAvailabilityWindow(result.from_month, result.to_month);
          newRawMap[crop.name] = { fromMonth: result.from_month, toMonth: result.to_month };
        } else {
          newMap[crop.name] = null;
          newRawMap[crop.name] = null;
        }
      } catch {
        newMap[crop.name] = null;
        newRawMap[crop.name] = null;
      }
    });

    Promise.allSettled(promises).then(() => {
      setAvailabilityMap({ ...newMap });
      setRawAvailabilityMap({ ...newRawMap });
      setAvailabilityLoading(false);
    });
  }, [inventory, geoids]);

  // Fetch full composition data for each crop — used by both the energy card and composition panel
  React.useEffect(() => {
    if (!inventory || inventory.length === 0) return;
    const geoid = geoids && geoids.length > 0 ? geoids[0] : '06';

    setCompositionLoading(true);
    const newByResource: Record<string, CompositionData> = {};

    // Deduplicate: same API resource may appear for multiple LandIQ crops
    const resourcesSeen = new Set<string>();
    const promises = inventory.map(async (crop) => {
      const apiResource = getApiResource(crop.name);
      if (!apiResource || resourcesSeen.has(apiResource)) return;
      resourcesSeen.add(apiResource);
      const result = await getAnalysisByResource(apiResource, geoid);
      newByResource[apiResource] = parseCompositionData(result);
    });

    Promise.allSettled(promises).then(() => {
      setCompositionByResource({ ...newByResource });
      setCompositionLoading(false);
    });
  }, [inventory, geoids]);

  // Calculate residue yields for each crop in the inventory
  const inventoryWithResidues: CropInventoryWithResidue[] = React.useMemo(() => {
    return inventory.map(crop => {
      const residueResult = getCropResidueFactors(crop.name);

      // Derive static availability window from the first factor's from/to month.
      // Used as fallback when the API availability endpoint has no data.
      let staticAvailability: string | null = null;
      if (residueResult && residueResult.factors.length > 0) {
        const f = residueResult.factors[0];
        if (f.fromMonth && f.toMonth) {
          staticAvailability = formatAvailabilityWindow(f.fromMonth, f.toMonth);
        }
      }

      // API result takes precedence; fall back to static from residue factors.
      const availability = availabilityMap[crop.name] ?? staticAvailability;
      // Only show the loading spinner if we have no static data to show yet.
      const isLoading = availabilityLoading && availability === null;

      if (residueResult && residueResult.factors.length > 0) {
        let totalDryTonsPerAcre = 0;
        let totalWetTonsPerAcre = 0;
        const types = new Set<string>();

        residueResult.factors.forEach(factor => {
          totalDryTonsPerAcre += factor.dryTonsPerAcre || 0;
          totalWetTonsPerAcre += factor.wetTonsPerAcre || 0;
          if (factor.residueType) {
            types.add(factor.residueType);
          } else if (factor.resourceName) {
            types.add(factor.resourceName);
          }
        });

        const dryResidueYield = Math.round(crop.acres * totalDryTonsPerAcre);
        const wetResidueYield = Math.round(crop.acres * totalWetTonsPerAcre);

        return {
          ...crop,
          dryResidueYield,
          wetResidueYield,
          residueType: Array.from(types).join(', ') || 'Residue',
          residueSource: residueResult.source,
          availability,
          availabilityLoading: isLoading,
        };
      }

      return {
        ...crop,
        dryResidueYield: null,
        wetResidueYield: null,
        residueType: null,
        residueSource: null,
        availability,
        availabilityLoading: isLoading,
      };
    });
  }, [inventory, availabilityMap, availabilityLoading, residueReady]);

  // Filter out rows with NA values (null residue yields) and apply composition filters
  const filteredInventory = React.useMemo(() => {
    return inventoryWithResidues.filter((crop): crop is CropInventoryWithResidue & { dryResidueYield: number; wetResidueYield: number } => {
      if (crop.dryResidueYield === null || crop.wetResidueYield === null) return false;
      if (compositionFilters && compositionLookup) {
        if (!cropPassesCompositionFilters(crop.name, compositionLookup, compositionFilters)) return false;
      }
      return true;
    });
  }, [inventoryWithResidues, compositionFilters, compositionLookup]);

  // Calculate total residue yields from filtered inventory
  const totalDryResidue = React.useMemo(() => {
    return filteredInventory.reduce((sum, crop) =>
      sum + (crop.dryResidueYield || 0), 0);
  }, [filteredInventory]);

  const totalWetResidue = React.useMemo(() => {
    return filteredInventory.reduce((sum, crop) =>
      sum + (crop.wetResidueYield || 0), 0);
  }, [filteredInventory]);

  // Compute feedstock energy potential from dry residue × HHV
  const energyTotals: EnergyTotals | null = React.useMemo(() => {
    if (filteredInventory.length === 0) return null;
    // Build hhvLookup from compositionByResource (API HHV, or null to trigger fallback)
    const hhvLookup: Record<string, number | null> = {};
    for (const [resource, comp] of Object.entries(compositionByResource)) {
      hhvLookup[resource] = comp.hhv ?? null;
    }
    const cropInputs = filteredInventory.map(crop => ({
      cropName: crop.name,
      dryTons: crop.dryResidueYield,
      apiResource: getApiResource(crop.name),
    }));
    return computeEnergyTotals(cropInputs, hhvLookup);
  }, [filteredInventory, compositionByResource]);

  // Rank conversion technologies for the feedstock mix
  const techScores: TechScore[] = React.useMemo(() => {
    if (filteredInventory.length === 0) return [];
    const cropInputs = filteredInventory.map(crop => ({
      cropName: crop.name,
      dryTons: crop.dryResidueYield,
      apiResource: getApiResource(crop.name),
    }));
    const summary = computeMixSummary(cropInputs, compositionByResource);
    // Only rank if we have at least some composition data
    const hasAnyData = Object.values(compositionByResource).some(c => c.hasData);
    return hasAnyData ? rankTechnologies(summary) : [];
  }, [filteredInventory, compositionByResource]);

  // Handler for exporting the inventory data as CSV
  const handleExportCSV = () => {
    if (filteredInventory.length === 0) return;

    // Format data for CSV
    const csvData = filteredInventory.map(crop => ({
      'Crop Type': crop.name,
      'Acres': Math.round(crop.acres),
      'Percentage': Math.round((crop.acres / totalAcres) * 100) + '%',
      'Dry Residue (tons/year)': crop.dryResidueYield,
      'Wet Residue (tons/year)': crop.wetResidueYield,
      'Availability': crop.availability ?? 'N/A',
    }));

    // Add a total row
    csvData.push({
      'Crop Type': 'Total',
      'Acres': Math.round(totalAcres),
      'Percentage': '100%',
      'Dry Residue (tons/year)': Math.round(totalDryResidue),
      'Wet Residue (tons/year)': Math.round(totalWetResidue),
      'Availability': '',
    });

    // Create metadata for the CSV
    const metadata = [];

    // Add title with proper spacing for the header row
    metadata.push('BioCircular Valley Siting Tool - Resource Inventory');

    // Add location data if available - split lat/long to separate rows to avoid comma issues
    if (location) {
      metadata.push(`Location: ${location.lat.toFixed(6)}° N`);
      metadata.push(`${location.lng.toFixed(6)}° W`);
    }

    // Add buffer information
    metadata.push(`Buffer Zone: ${bufferRadius} ${bufferUnit}`);

    // Add date - format without commas
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Los_Angeles'
    }).replace(/,/g, ''); // Remove commas from date

    // Split the date to avoid commas in CSV
    const dateParts = formattedDate.split(' ');
    if (dateParts.length >= 3) {
      metadata.push(`Generated: ${dateParts[0]} ${dateParts[1]}`);
      metadata.push(dateParts[2]); // Year on its own row
    }

    // Generate filename with date and location if available
    let filename = 'biocirv-resource-inventory';
    if (location) {
      filename += `-lat${location.lat.toFixed(4)}-lng${location.lng.toFixed(4)}`;
    }
    filename += `-${new Date().toISOString().split('T')[0]}.csv`;

    downloadCSV(csvData, filename, metadata);
  };

  if (!isVisible) return null;

  return (
    <Card className={`absolute top-4 right-4 z-10 ${isCollapsed ? 'py-2 px-4' : 'p-4'} w-[620px] max-w-[65%] shadow-lg bg-white max-h-[calc(100%-24px)] flex flex-col`}>
      <div className={`flex justify-between items-center ${isCollapsed ? 'mb-0' : 'mb-0'}`}>
        <h3 className="font-medium text-sm flex items-center">
          <Leaf className="h-4 w-4 mr-2" />
          Resource Inventory
        </h3>
        <div className="flex items-center">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronDown className={`h-4 w-4 transform ${isCollapsed ? '-rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-2 overflow-y-auto flex-1 pr-2">
          {/* Sighting Location */}
          {location && (
            <div className="text-xs text-gray-700 bg-gray-50 p-2 rounded-md border">
              <span className="font-mono text-xs mb-0 mr-2">Site Location (Latitude, Longitude):</span>
              <span className="font-mono text-xs">
                {location.lat.toFixed(6)},{location.lng.toFixed(6)}
              </span>
            </div>
          )}

          {/* Energy Potential Card */}
          <EnergyPotentialCard totals={energyTotals} isLoading={compositionLoading} />

          {/* Conversion Technology Recommender */}
          <TechnologyRecommender scores={techScores} isLoading={compositionLoading} />

          <div className="text-xs text-gray-600 border-b pb-3">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-sm">Resources within {bufferRadius} {bufferUnit} buffer zone:</p>
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                {filteredInventory.length} crop types
              </span>
            </div>
            <div className="mt-1 grid grid-cols-2 justify-between">
              <p className="font-normal text-sm">Total Dry Residue: {formatNumberWithCommas(Math.round(totalDryResidue))} tons/year</p>
              <p className="font-normal text-sm text-right">Total Wet Residue: {formatNumberWithCommas(Math.round(totalWetResidue))} tons/year</p>
            </div>
            <div className="mt-1">
            </div>
          </div>

          {filteredInventory.length > 0 ? (
            <div className="max-h-[350px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-3 text-left font-medium text-gray-500 w-[28%]">Crop Type</th>
                    <th className="py-2 px-2 text-right font-medium text-gray-500 w-[12%]">Acres</th>
                    <th className="py-2 px-2 text-right font-medium text-gray-500 w-[11%]">% of Area</th>
                    <th className="py-2 px-2 text-right font-medium text-gray-500 w-[18%]">Dry Residue (tons/year)</th>
                    <th className="py-2 px-2 text-right font-medium text-gray-500 w-[18%]">Wet Residue (tons/year)</th>
                    <th className="py-2 px-2 text-right font-medium text-gray-500 w-[13%]">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInventory
                    .sort((a, b) => b.acres - a.acres) // Sort by acres descending
                    .map((crop, index) => {
                      const apiResource = getApiResource(crop.name);
                      const composition = apiResource ? compositionByResource[apiResource] : undefined;
                      const hasComposition = composition?.hasData === true;
                      const isExpanded = expandedCrops.has(crop.name);
                      return (
                        <React.Fragment key={index}>
                          <tr
                            className={`hover:bg-gray-50 ${hasComposition ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                              if (!hasComposition) return;
                              setExpandedCrops(prev => {
                                const next = new Set(prev);
                                next.has(crop.name) ? next.delete(crop.name) : next.add(crop.name);
                                return next;
                              });
                            }}
                          >
                            <td className="py-2 px-3 whitespace-normal">
                              <div className="flex items-center gap-1.5">
                                {hasComposition && (
                                  <ChevronDown
                                    className={`h-3 w-3 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                                  />
                                )}
                                <span
                                  className="inline-block h-3 w-3 rounded-sm flex-shrink-0"
                                  style={{ backgroundColor: crop.color }}
                                />
                                <span className="line-clamp-1 min-w-0" title={crop.name}>{crop.name}</span>
                                {crop.residueSource === 'api' && (
                                  <span
                                    className="flex-shrink-0 rounded px-1 py-px text-[9px] font-medium leading-tight bg-green-50 text-green-700 border border-green-200"
                                    title="Yield factors sourced from resource_info.json"
                                  >API</span>
                                )}
                                {crop.residueSource === 'fallback' && (
                                  <span
                                    className="flex-shrink-0 rounded px-1 py-px text-[9px] font-medium leading-tight bg-amber-50 text-amber-700 border border-amber-200"
                                    title="Yield factors estimated from published literature"
                                  >Est.</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-right">{formatNumberWithCommas(Math.round(crop.acres))}</td>
                            <td className="py-2 px-2 text-right">
                              {Math.round((crop.acres / totalAcres) * 100)}%
                            </td>
                            <td className="py-2 px-2 text-right">
                              {formatNumberWithCommas(crop.dryResidueYield)}
                            </td>
                            <td className="py-2 px-2 text-right">
                              {formatNumberWithCommas(crop.wetResidueYield)}
                            </td>
                            <td className="py-2 px-2 text-right text-gray-600">
                              {crop.availabilityLoading
                                ? <span className="text-gray-400 italic">…</span>
                                : crop.availability ?? <span className="text-gray-400">—</span>}
                            </td>
                          </tr>
                          {isExpanded && hasComposition && composition && (
                            <tr className="bg-gray-50">
                              <td colSpan={6} className="p-0">
                                <FeedstockCompositionPanel
                                  composition={composition}
                                  source={crop.residueSource ?? 'fallback'}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td className="py-2 px-3 text-left">Total</td>
                    <td className="py-2 px-2 text-right">{formatNumberWithCommas(Math.round(totalAcres))}</td>
                    <td className="py-2 px-2 text-right">100%</td>
                    <td className="py-2 px-2 text-right">{formatNumberWithCommas(Math.round(totalDryResidue))}</td>
                    <td className="py-2 px-2 text-right">{formatNumberWithCommas(Math.round(totalWetResidue))}</td>
                    <td className="py-2 px-2 text-right"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500 py-4">
              No crop resources with residue data found within the buffer zone.
            </div>
          )}

          {/* Seasonal Supply Timeline */}
          {filteredInventory.length > 0 && (
            <SeasonalSupplyTimeline
              isLoading={availabilityLoading}
              crops={filteredInventory.map(crop => {
                const raw = rawAvailabilityMap[crop.name];
                // Fall back to static residue factor months if API unavailable
                const factor = getCropResidueFactors(crop.name)?.factors[0];
                return {
                  name: crop.name,
                  color: crop.color,
                  dryTons: crop.dryResidueYield,
                  fromMonth: raw?.fromMonth ?? factor?.fromMonth ?? null,
                  toMonth: raw?.toMonth ?? factor?.toMonth ?? null,
                };
              })}
            />
          )}

          <div className="text-xs text-gray-500 border-t pt-3 mt-1">
            <p className="mb-1">This inventory shows annual crop residues available within the selected buffer zone, calculated using combined empirical field measurements and <a href="https://www.sciencedirect.com/science/article/abs/pii/S0921344918303148" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">established crop residue yield factors</a>.
            {availabilityLoading && <span className="ml-1 text-gray-400 italic">Loading availability data…</span>}
            </p>
            <div className="flex justify-between items-center">
              <button
                onClick={handleExportCSV}
                className="text-gray-600 hover:text-gray-800 underline text-xs ml-auto"
                disabled={filteredInventory.length === 0}
              >
                Export Data
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default SitingInventory;