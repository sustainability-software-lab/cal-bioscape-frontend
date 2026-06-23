'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Info, Layers, Filter, ChevronDown } from 'lucide-react';
import {
 Tooltip,
 TooltipContent,
 TooltipProvider,
 TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CROP_NAME_MAPPING,
  FEEDSTOCK_CATEGORIES,
  getFeedstockCharacteristics,
  getCropResidueFactors // Added this
} from '@/lib/constants';
import { onResidueDataLoaded } from '@/lib/residue-data';
import {
  CompositionLookup,
  CompositionFilters,
  DEFAULT_COMPOSITION_FILTERS,
  COMPOSITION_FILTER_BOUNDS,
  cropPassesCompositionFilters,
  isCompositionFiltersActive,
} from '@/lib/composition-filters';
import { applyLayerMutualExclusivity, MUTUALLY_EXCLUSIVE_LAYERS } from '@/lib/layer-utils';
import { CARB_PRODUCT_CATEGORIES, CARB_PRODUCT_KEYS } from '@/lib/carb-product-categories';

// Pre-built lookup: layerId -> [partnerId, ...] for O(1) partner resolution in directLayerToggle
const MUTUALLY_EXCLUSIVE_PAIRS: Record<string, string[]> = {};
for (const [a, b] of MUTUALLY_EXCLUSIVE_LAYERS) {
  (MUTUALLY_EXCLUSIVE_PAIRS[a] ??= []).push(b);
  (MUTUALLY_EXCLUSIVE_PAIRS[b] ??= []).push(a);
}

// Define a minimal type for the mapbox map instance to avoid using 'any'
interface MapInstance {
  getLayer: (id: string) => object | undefined;
  setLayoutProperty: (layerId: string, name: string, value: 'visible' | 'none') => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFilter: (layerId: string, filter: any[] | null | undefined) => void;
}

// Define the props interface
interface LayerControlsProps {
  initialVisibility: { [key: string]: boolean };
  onLayerToggle: (layerId: string, isVisible: boolean) => void;
  onCropFilterChange: (visibleCrops: string[]) => void;
  croplandOpacity: number;
  setCroplandOpacity: (opacity: number) => void;
  onInfrastructureToggle: (isVisible: boolean) => void;
  infrastructureMaster: boolean;
  onTransportationToggle: (isVisible: boolean) => void;
  transportationMaster: boolean;
  onShowAllLayers: () => void;
  onHideAllLayers: () => void;
  onClosePopupForLayer: (layerId: string) => void;
  compositionLookup: CompositionLookup;
  compositionFilters: CompositionFilters;
  onCompositionFiltersChange: (filters: CompositionFilters) => void;
}

const LayerControls: React.FC<LayerControlsProps> = ({
  initialVisibility,
  onLayerToggle,
  onCropFilterChange,
  croplandOpacity,
  setCroplandOpacity,
  onInfrastructureToggle,
  infrastructureMaster,
  onTransportationToggle,
  transportationMaster,
  onShowAllLayers,
  onHideAllLayers,
  onClosePopupForLayer,
  compositionLookup,
  compositionFilters,
  onCompositionFiltersChange,
}) => {
  // Local state to track layer visibility within the component
  // This helps keep UI in sync with actual map layer visibility
  const [localLayerVisibility, setLocalLayerVisibility] = useState<{ [key: string]: boolean }>(initialVisibility);

  // Re-render once residue data finishes loading so crop filters reflect actual data.
  const [, setResidueReady] = useState(0);
  useEffect(() => onResidueDataLoaded(() => setResidueReady(v => v + 1)), []);

  // Update local state when props change
  useEffect(() => {
    setLocalLayerVisibility(initialVisibility);
  }, [initialVisibility]);

  // Define type for the color mapping
  type CropColorMap = { [key: string]: string };

  // --- Static Crop Color Mapping ---
  const cropColorMapping: CropColorMap = useMemo(() => ({
      "Alfalfa & Alfalfa Mixtures": "#90EE90", "Almonds": "#8B4513", "Apples": "#FF0000",
      "Apricots": "#FFA500", "Avocados": "#556B2F", "Beans (Dry)": "#F5DEB3",
      "Bush Berries": "#BA55D3", "Carrots": "#FF8C00", "Cherries": "#DC143C",
      "Citrus and Subtropical": "#FFD700", "Cole Crops": "#2E8B57", "Corn, Sorghum and Sudan": "#DAA520",
      "Cotton": "#FFFAF0", "Dates": "#A0522D", "Eucalyptus": "#778899",
      "Flowers, Nursery and Christmas Tree Farms": "#FF69B4", "Grapes": "#800080", "Greenhouse": "#AFEEEE",
      "Idle – Long Term": "#D3D3D3", "Idle – Short Term": "#A9A9A9",
      "Induced high water table native pasture": "#ADD8E6", "Kiwis": "#9ACD32", "Lettuce/Leafy Greens": "#32CD32",
      "Melons, Squash and Cucumbers": "#FFDAB9", "Miscellaneous Deciduous": "#BDB76B",
      "Miscellaneous Field Crops": "#DEB887", "Miscellaneous Grain and Hay": "#F5F5DC",
      "Miscellaneous Grasses": "#98FB98", "Miscellaneous Subtropical Fruits": "#FF7F50",
      "Miscellaneous Truck Crops": "#66CDAA", "Mixed Pasture": "#006400", "Native Pasture": "#228B22",
      "Olives": "#808000", "Onions and Garlic": "#FFF8DC", "Peaches/Nectarines": "#FFC0CB",
      "Pears": "#90EE90", "Pecans": "#D2691E", "Peppers": "#B22222", "Pistachios": "#93C572",
      "Plums": "#DDA0DD", "Pomegranates": "#E34234", "Potatoes": "#CD853F", "Prunes": "#702963",
      "Rice": "#FFFFE0", "Safflower": "#FFEC8B", "Strawberries": "#FF1493", "Sugar beets": "#D8BFD8",
      "Sunflowers": "#FFDB58", "Sweet Potatoes": "#D2B48C", "Tomatoes": "#FF6347",
      "Turf Farms": "#00FF7F", "Unclassified Fallow": "#696969", "Walnuts": "#A52A2A",
      "Wheat": "#F4A460", "Wild Rice": "#EEE8AA", "Young Perennials": "#C19A6B",
  }), []);

  const allCropNames = useMemo(() => Object.keys(cropColorMapping).sort(), [cropColorMapping]);

  // --- State for Crop Filtering ---
  const [cropVisibility, setCropVisibility] = useState<{ [key: string]: boolean }>(() =>
    allCropNames.reduce((acc, name) => {
      acc[name] = true; // Initially all visible
      return acc;
    }, {} as { [key: string]: boolean })
  );
  const [filterText, setFilterText] = useState('');
  const [isCropLegendCollapsed, setIsCropLegendCollapsed] = useState(true);
  
  // State for collapsible sections
  const [isCropResiduesCollapsed, setIsCropResiduesCollapsed] = useState(false);
  const [isInfrastructureCollapsed, setIsInfrastructureCollapsed] = useState(false);
  const [isTransportationCollapsed, setIsTransportationCollapsed] = useState(false);
  const [isFoodProcessorsCollapsed, setIsFoodProcessorsCollapsed] = useState(false);
  
  // Month range slider state
  const [monthRange, setMonthRange] = useState<[number, number]>([0, 11]); // January to December by default
  
  // New feedstock characteristic filter states
  const [selectedFeedstockCategories, setSelectedFeedstockCategories] = useState<string[]>(
    Object.values(FEEDSTOCK_CATEGORIES)
  ); // All categories selected by default
  // Composition filter state — range [min, max] per metric; full range = no filtering
  // Month names for the range slider
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Helper function to get month name from index
  const getMonthName = (index: number) => monthNames[index];
  
  // Helper function to handle month range change
  const handleMonthRangeChange = (value: [number, number]) => {
    setMonthRange(value);
    // Filtering will be applied automatically via useEffect
  };
  
  // Define type for month abbreviations
  type MonthAbbr = 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep' | 'Oct' | 'Nov' | 'Dec';
  
  // Helper function to get month abbreviation from index
  const getMonthAbbr = (index: number): MonthAbbr => {
    const monthAbbrs: MonthAbbr[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthAbbrs[index];
  };
  
  // Function to check if a crop is available in the selected month range
  const isCropAvailableInRange = (cropName: string, range: [number, number]): boolean => {
    // Use the helper to get factors which now includes seasonal availability from the dynamic source
    const result = getCropResidueFactors(cropName);
    const factorsArray = result?.factors;

    // If no data, assume always available (or should it be false? Original code assumed true if not found in mapping)
    if (!factorsArray || factorsArray.length === 0) return true;

    // Check if ANY of the residue streams for this crop are available in the range
    return factorsArray.some(factor => {
      const seasonalData = factor.seasonalAvailability;
      if (!seasonalData) return false;

      // Check if crop is available in any month within the selected range
      const [startMonth, endMonth] = range;
      
      // Handle cases where the range wraps around (e.g., Nov-Feb)
      if (startMonth <= endMonth) {
        // Normal range (e.g., Mar-Jul)
        for (let i = startMonth; i <= endMonth; i++) {
          if (seasonalData[getMonthAbbr(i)]) return true;
        }
      } else {
        // Wrapped range (e.g., Nov-Feb)
        // Check from start to December
        for (let i = startMonth; i < 12; i++) {
          if (seasonalData[getMonthAbbr(i)]) return true;
        }
        // Check from January to end
        for (let i = 0; i <= endMonth; i++) {
          if (seasonalData[getMonthAbbr(i)]) return true;
        }
      }
      return false;
    });
  };
  
  // Comprehensive filter function that checks all selected filter criteria
  const isCropMatchingFilters = useCallback((cropName: string): boolean => {
    // Get standardized crop name
    const standardizedName = CROP_NAME_MAPPING[cropName as keyof typeof CROP_NAME_MAPPING];
    if (!standardizedName) return true; // If not found in mapping, show by default
    
    // Check seasonal availability
    const seasonalMatch = isCropAvailableInRange(cropName, monthRange);
    if (!seasonalMatch) return false;
    
    // Get feedstock characteristics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const characteristics = getFeedstockCharacteristics(cropName) as any; // Cast to any to handle new property safely if TS complains
    // If no characteristics defined, hide the crop (can't determine if it matches filters)
    if (!characteristics) return false;
    
    // Check if crop matches selected feedstock categories
    // If no categories selected (empty array), hide everything
    if (selectedFeedstockCategories.length === 0) return false;
    const categoryMatch = selectedFeedstockCategories.includes(characteristics.category);
    if (!categoryMatch) return false;
    
    // Check composition filters (crops with no API data always pass)
    if (!cropPassesCompositionFilters(cropName, compositionLookup, compositionFilters)) return false;

    return true; // Crop matches all filter criteria
  }, [monthRange, selectedFeedstockCategories, compositionLookup, compositionFilters]);
  
  
  // Comprehensive function to apply all filters (seasonal + characteristics)
  const applyAllFilters = useCallback(() => {
    setCropVisibility(prev => {
      const newState = { ...prev };
      
      // Update visibility for each crop based on ALL filter criteria
      allCropNames.forEach(cropName => {
        newState[cropName] = isCropMatchingFilters(cropName);
      });
      
      // Get visible crops after applying all filters
      const visibleCrops = Object.keys(newState).filter(name => newState[name]);
      
      // Try to directly update the map filter for crop visibility
      const mapInstance = getMapInstance();
      if (mapInstance && mapInstance.getLayer('feedstock-vector-layer')) {
        try {
          // Make sure the layer is visible if the feedstock layer is enabled and there are visible crops
          if (visibleCrops.length > 0 && localLayerVisibility.feedstock) {
            mapInstance.setLayoutProperty('feedstock-vector-layer', 'visibility', 'visible');
          }
          
          if (visibleCrops.length === allCropNames.length) {
            // Show everything (except U) when all tracked crops are visible
            mapInstance.setFilter('feedstock-vector-layer', ['!=', ['get', 'main_crop_code'], 'U']);
            console.log(`Applied comprehensive filters (All ${visibleCrops.length} tracked crops visible, showing all dataset features)`);
          } else {
            // Create a filter that shows only visible crops
            const visibleCropFilter = visibleCrops.length > 0
              ? ['match', ['get', 'main_crop_name'], visibleCrops, true, false]
              : ['==', ['get', 'main_crop_name'], '___NO_MATCH___']; // Hide all
            // Combine with the existing base filter that excludes 'U' code
            const combinedFilter = ['all', ['!=', ['get', 'main_crop_code'], 'U'], visibleCropFilter];
            
            // Apply the filter directly to the map
            mapInstance.setFilter('feedstock-vector-layer', combinedFilter);
            console.log(`Applied comprehensive filters (${visibleCrops.length} crops visible)`);
          }
        } catch (err) {
          console.error('Error applying comprehensive filters:', err);
        }
      }
      
      return newState;
    });
  }, [isCropMatchingFilters, allCropNames, localLayerVisibility.feedstock]);
  
  // Handler functions for new filters
  const handleFeedstockCategoryChange = (category: string, isChecked: boolean) => {
    setSelectedFeedstockCategories(prev => {
      const newSelection = isChecked 
        ? [...prev, category]
        : prev.filter(c => c !== category);
      return newSelection;
    });
    // Apply filters will be called via useEffect
  };
  
  // --- Crop filtering logic ---
  const filteredCropNames = useMemo(() => 
    allCropNames.filter(name => 
      name.toLowerCase().includes(filterText.toLowerCase())
    ), [allCropNames, filterText]
  );

  const handleCropToggle = (cropName: string, isVisible: boolean) => {
    setCropVisibility(prev => {
      const newState = { ...prev, [cropName]: isVisible };
      const visibleCrops = Object.keys(newState).filter(name => newState[name]);
      
      // Try to directly update the map filter for crop visibility
      const mapInstance = getMapInstance();
      if (mapInstance && mapInstance.getLayer('feedstock-vector-layer')) {
        try {
          // Make sure the layer is visible if at least one crop is selected
          if (visibleCrops.length > 0 && localLayerVisibility.feedstock) {
            mapInstance.setLayoutProperty('feedstock-vector-layer', 'visibility', 'visible');
          }
          
          // Create a filter that shows only visible crops
          const visibleCropFilter = visibleCrops.length > 0
            ? ['match', ['get', 'main_crop_name'], visibleCrops, true, false]
            : ['==', ['get', 'main_crop_name'], '___NO_MATCH___']; // Hide all
          // Combine with the existing base filter that excludes 'U' code
          const combinedFilter = ['all', ['!=', ['get', 'main_crop_code'], 'U'], visibleCropFilter];
          
          // Apply the filter directly to the map
          mapInstance.setFilter('feedstock-vector-layer', combinedFilter);
          console.log(`Directly updated crop filter for ${cropName} (${visibleCrops.length} crops visible)`);
        } catch (err) {
          console.error('Error directly updating crop filter:', err);
        }
      }
      
      return newState;
    });
  };

  // Notify parent of initial crop visibility
  useEffect(() => {
    const visibleCrops = allCropNames.filter(name => cropVisibility[name]);
    onCropFilterChange(visibleCrops);
  }, [allCropNames, cropVisibility, onCropFilterChange]); // Added missing dependencies
  
  // Keep a ref to the latest applyAllFilters so the effect below can call it
  // WITHOUT depending on it. Depending on applyAllFilters would re-run filtering
  // whenever compositionLookup loads asynchronously, or the feedstock layer's
  // visibility changes (e.g. entering siting/analysis mode) — which would
  // spontaneously uncheck crop boxes. We only want filtering to re-apply when a
  // user actually moves a filter control.
  const applyAllFiltersRef = useRef(applyAllFilters);
  applyAllFiltersRef.current = applyAllFilters;

  // Re-apply crop filtering ONLY in response to a real user action on a filter
  // control: the seasonal month range, the feedstock-category checkboxes, or the
  // composition sliders. These three pieces of state change exclusively on user
  // interaction. We deliberately do NOT depend on compositionLookup (async data
  // load) or layer visibility, so page load, zoom, and siting/analysis mode can
  // no longer auto-uncheck crop boxes — those toggle on user action only.
  const prevFilterInputsRef = useRef({ monthRange, selectedFeedstockCategories, compositionFilters });
  useEffect(() => {
    const prev = prevFilterInputsRef.current;
    const userChangedFilter =
      prev.monthRange !== monthRange ||
      prev.selectedFeedstockCategories !== selectedFeedstockCategories ||
      prev.compositionFilters !== compositionFilters;
    prevFilterInputsRef.current = { monthRange, selectedFeedstockCategories, compositionFilters };

    // Skip the initial mount run (and any re-run where the inputs are identical,
    // e.g. React StrictMode's double-invoke) so crops start — and stay — visible
    // until the user touches a filter.
    if (!userChangedFilter) return;

    // Small delay so the map instance is ready when applying the derived filter.
    const timeoutId = setTimeout(() => {
      applyAllFiltersRef.current();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [monthRange, selectedFeedstockCategories, compositionFilters]);
  
  // Store a reference to the map instance when it becomes available
  useEffect(() => {
    const checkForMap = () => {
      const mapInstance = getMapInstance();
      if (mapInstance) {
        console.log('Map instance found and stored for direct manipulation');
        return true;
      }
      return false;
    };
    
    // Try immediately
    if (!checkForMap()) {
      // If not available, set up a polling mechanism
      const intervalId = setInterval(() => {
        if (checkForMap()) {
          clearInterval(intervalId);
        }
      }, 500); // Check every 500ms
      
      // Clean up
      return () => clearInterval(intervalId);
    }
  }, []);

  const handleSelectAllCrops = () => {
    setCropVisibility(prev => {
      const newState = { ...prev };
      // Only select crops that are available in the current month range
      allCropNames.forEach(name => {
        newState[name] = isCropAvailableInRange(name, monthRange);
      });
      
      // Get visible crops after applying seasonal filter
      const visibleCrops = allCropNames.filter(name => newState[name]);
      
      // Try to directly update the map filter for crop visibility
      const mapInstance = getMapInstance();
      if (mapInstance && mapInstance.getLayer('feedstock-vector-layer')) {
        try {
          // Make sure the layer is visible if the feedstock layer is enabled
          if (localLayerVisibility.feedstock) {
            mapInstance.setLayoutProperty('feedstock-vector-layer', 'visibility', 'visible');
          }
          
          // If all crops are visible, we can use a simpler filter
          if (visibleCrops.length === allCropNames.length) {
            mapInstance.setFilter('feedstock-vector-layer', ['!=', ['get', 'main_crop_code'], 'U']);
          } else {
            // Create a filter that shows only visible crops
            const visibleCropFilter = visibleCrops.length > 0
              ? ['match', ['get', 'main_crop_name'], visibleCrops, true, false]
              : ['==', ['get', 'main_crop_name'], '___NO_MATCH___']; // Hide all
            // Combine with the existing base filter that excludes 'U' code
            const combinedFilter = ['all', ['!=', ['get', 'main_crop_code'], 'U'], visibleCropFilter];
            
            // Apply the filter directly to the map
            mapInstance.setFilter('feedstock-vector-layer', combinedFilter);
          }
          console.log(`Directly updated crop filter to show ${visibleCrops.length} crops`);
        } catch (err) {
          console.error('Error directly updating crop filter:', err);
        }
      }
      
      return newState;
    });
  };

  const handleDeselectAllCrops = () => {
     setCropVisibility(prev => {
        const newState = { ...prev };
        allCropNames.forEach(name => newState[name] = false);
        
        // Try to directly update the map filter to hide all crops
        const mapInstance = getMapInstance();
        if (mapInstance && mapInstance.getLayer('feedstock-vector-layer')) {
          try {
            // Set a filter that will hide all crops (no crop will match this condition)
            mapInstance.setFilter('feedstock-vector-layer', ['==', ['get', 'main_crop_name'], '___NO_CROP_MATCHES_THIS___']);
            console.log('Directly updated crop filter to hide all crops');
          } catch (err) {
            console.error('Error directly updating crop filter:', err);
          }
        }
        
        return newState;
     });
  };

  const isCroplandVisible = initialVisibility?.feedstock ?? false;

  // Get reference to the map
  const getMapInstance = (): MapInstance | undefined => {
    // This is a workaround to access the map instance directly
    // Ideally, we would have a proper reference passed from the parent
    const mapInstance = (window as unknown as { mapboxMap?: MapInstance }).mapboxMap;
    return mapInstance;
  };
  
  // Robust function to toggle layer visibility directly on the map and update local state
  const directLayerToggle = (layerId: string, isVisible: boolean, updateParentState: boolean = true): boolean => {
    // Apply mutual exclusivity and update local state for immediate UI feedback
    setLocalLayerVisibility(prev => applyLayerMutualExclusivity({ ...prev }, layerId, isVisible));
    
    // Get the corresponding Mapbox layer ID (required for direct manipulation)
    const mapboxLayerId = layerIdMapping[layerId];
    if (!mapboxLayerId) {
      console.error(`No Mapbox layer ID found for ${layerId}`);
      // Still update parent state so Map.js effect can handle it
      if (updateParentState) {
        if (isVisible) {
          const partnerIds = MUTUALLY_EXCLUSIVE_PAIRS[layerId] ?? [];
          for (const partnerId of partnerIds) {
            onLayerToggle(partnerId, false);
          }
        }
        onLayerToggle(layerId, isVisible);
      }
      return false;
    }

    // Get map instance for direct manipulation
    const mapInstance = getMapInstance();
    
    // Always update parent state so the Map.js useEffect applies visibility when
    // the layer is ready, even if the Mapbox layer hasn't been added yet (e.g.
    // map 'load' event hasn't fired).
    if (updateParentState) {
      if (isVisible) {
        const partnerIds = MUTUALLY_EXCLUSIVE_PAIRS[layerId] ?? [];
        for (const partnerId of partnerIds) {
          onLayerToggle(partnerId, false);
        }
      }
      onLayerToggle(layerId, isVisible);
    }

    if (!mapInstance) {
      // Map not mounted yet; parent state was already updated above.
      console.warn('Map instance not available; visibility will apply via Map.js effect');
      return false;
    }

    try {
      // Fast path: if the Mapbox layer already exists, manipulate it directly so
      // the visibility change is immediate (no React render cycle needed).
      if (mapInstance.getLayer(mapboxLayerId)) {
        mapInstance.setLayoutProperty(mapboxLayerId, 'visibility', isVisible ? 'visible' : 'none');
        console.log(`Set ${mapboxLayerId} visibility to ${isVisible ? 'visible' : 'none'} directly`);

        if (!isVisible) {
          onClosePopupForLayer(layerId);
        }

        if (isVisible) {
          const partnerIds = MUTUALLY_EXCLUSIVE_PAIRS[layerId] ?? [];
          for (const partnerId of partnerIds) {
            const partnerMapboxId = layerIdMapping[partnerId];
            if (partnerMapboxId && mapInstance.getLayer(partnerMapboxId)) {
              mapInstance.setLayoutProperty(partnerMapboxId, 'visibility', 'none');
            }
            onClosePopupForLayer(partnerId);
          }
        }

        return true;
      } else {
        // Layer not yet added (map still loading). Parent state was already
        // updated above; Map.js effect will apply visibility once mapLoaded fires.
        console.warn(`Layer ${mapboxLayerId} not in map yet; visibility will apply via Map.js effect`);
        return false;
      }
    } catch (err) {
      console.error(`Error setting ${mapboxLayerId} visibility:`, err);
      return false;
    }
  };

  // Define a map of layer IDs to their corresponding Mapbox layer IDs
  const layerIdMapping: { [key: string]: string } = {
    feedstock: 'feedstock-vector-layer',
    county: 'county-layer',
    railLines: 'rail-lines-layer',
    freightTerminals: 'freight-terminals-layer',
    freightRoutes: 'freight-routes-layer',
    petroleumPipelines: 'petroleum-pipelines-layer',
    crudeOilPipelines: 'crude-oil-pipelines-layer',
    naturalGasPipelines: 'natural-gas-pipelines-layer',
    anaerobicDigester: 'anaerobic-digester-layer',
    biodieselPlants: 'biodiesel-plants-layer',
    biorefineries: 'biorefineries-layer',
    safPlants: 'saf-plants-layer',
    renewableDiesel: 'renewable-diesel-layer',
    mrf: 'mrf-layer',
    cementPlants: 'cement-plants-layer',
    landfillLfg: 'landfill-lfg-layer',
    wastewaterTreatment: 'wastewater-treatment-layer',
    wasteToEnergy: 'waste-to-energy-layer',
    combustionPlants: 'combustion-plants-layer',
    districtEnergySystems: 'district-energy-systems-layer',
    foodProcessors: 'food-processors-layer',
    tomatoProcessors: 'tomato-processors-layer',
    // CARB food processors disaggregated by primary_ag_product (issue #98)
    ...Object.fromEntries(CARB_PRODUCT_CATEGORIES.map((c) => [c.key, c.mapboxLayerId])),
    foodRetailers: 'food-retailers-layer',
    powerPlants: 'power-plants-layer',
    foodBanks: 'food-banks-layer',
    farmersMarkets: 'farmers-markets-layer'
  };

  // Show all layers with proper state management
  const handleShowAllLayers = (e?: React.MouseEvent): void => {
    if (e) e.stopPropagation();
    onShowAllLayers();
  };

  // Hide all layers with proper state management
  const handleHideAllLayers = (e?: React.MouseEvent): void => {
    if (e) e.stopPropagation();
    onHideAllLayers();
  };

  return (
    <Card className="w-full py-1">
      <Accordion type="multiple" defaultValue={['layers', 'filters']} className="w-full px-4 py-0">
        {/* Layer Toggles Section */}
        <AccordionItem value="layers">
          <AccordionTrigger className="[&[data-state=open]>svg]:rotate-0 [&[data-state=closed]>svg]:-rotate-90 no-underline">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center text-sm no-underline">
                <Layers className="h-5 w-5 mr-2" />
                <span className="no-underline">Layers</span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  onClick={handleShowAllLayers}
                  className="text-xs px-3 py-1 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors layer-control-button cursor-pointer"
                >
                  Show All
                </div>
                <div
                  onClick={handleHideAllLayers}
                  className="text-xs px-3 py-1 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors layer-control-button cursor-pointer"
                >
                  Hide All
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 pl-4">
              
              {/* USDA County Crop Totals Toggle */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="countyLayer"
                  data-layer-checkbox="county"
                  data-testid="layer-checkbox-county"
                  checked={localLayerVisibility?.county ?? false}
                  onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('county', !!checked)}
                />
                <Label htmlFor="countyLayer" className="flex items-center font-medium">
                  USDA County Crop Totals
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Info className="h-4 w-4 ml-1 inline-block text-gray-500 cursor-help transition-colors hover:text-gray-700" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Source: 2022 USDA Census of Agriculture</p>
                        <p className="text-xs text-gray-400 mt-1">Primary crop production totals only. Derived residues are on the Crop Residues (LandIQ) layer.</p>
                        <p className="text-xs text-gray-400 mt-1">Mutually exclusive with Crop Residues layer</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
              </div>

              {/* Crop Residues Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="feedstockLayer"
                      data-layer-checkbox="feedstock"
                      data-testid="layer-checkbox-feedstock"
                      checked={localLayerVisibility?.feedstock ?? false}
                      onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('feedstock', !!checked)}
                    />
                    <Label htmlFor="feedstockLayer" className="flex items-center font-medium">
                      Crop Residues
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Info className="h-4 w-4 ml-1 inline-block text-gray-500 cursor-help transition-colors hover:text-gray-700" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>Source: LandIQ 2023 Crop Mapping Dataset</p>
                            <a href="https://www.landiq.com/data/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              LandIQ Data Page
                            </a>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                  </div>
                  <button
                    onClick={() => setIsCropResiduesCollapsed(!isCropResiduesCollapsed)}
                    className="flex items-center p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronDown className={`text-muted-foreground size-4 shrink-0 translate-y-0.5 transition-transform duration-200 ${isCropResiduesCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                  </button>
                </div>
                
                {/* Crop Residues Content - Only show when not collapsed */}
                {!isCropResiduesCollapsed && (
                  <>
                    {/* Opacity Slider for Cropland - Only show when layer is visible */}
                    {isCroplandVisible && (
                      <div className="pl-6 mt-2 space-y-1">
                        <Label htmlFor="croplandOpacitySlider" className="text-sm">Layer Opacity:</Label>
                        <Slider
                          id="croplandOpacitySlider"
                          min={0}
                          max={1}
                          step={0.01}
                          value={[croplandOpacity]}
                          className="w-[80%]"
                          onValueChange={(value) => setCroplandOpacity(value[0])}
                        />
                      </div>
                    )}

                    {/* --- Collapsible Crop Legend/Filter (only if Cropland is visible) --- */}
                    {isCroplandVisible && (
                      <div className="pl-6 mt-2 border-l-2 border-gray-200">
                        <button
                          onClick={() => setIsCropLegendCollapsed(!isCropLegendCollapsed)}
                          className="text-sm font-medium text-left w-full py-1 hover:bg-gray-100 rounded flex justify-between items-center"
                        >
                          <span>Filter Crop Types</span>
                          <ChevronDown className={`text-muted-foreground size-4 shrink-0 transition-transform duration-200 ${isCropLegendCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                        </button>
                        {!isCropLegendCollapsed && (
                          <div className="mt-2 space-y-3 pr-2 max-h-60 overflow-y-auto">
                            <Input
                              type="text"
                              placeholder="Search crops..."
                              value={filterText}
                              onChange={(e) => setFilterText(e.target.value)}
                              className="text-xs h-8"
                            />
                             <div className="flex justify-between text-xs">
                               <button onClick={handleSelectAllCrops} className="text-blue-600 hover:underline">Select All</button>
                               <button onClick={handleDeselectAllCrops} className="text-blue-600 hover:underline">Deselect All</button>
                             </div>
                            {filteredCropNames.map((cropName) => (
                              <div key={cropName} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`crop-${cropName}`}
                                  data-crop-checkbox={cropName}
                                  checked={cropVisibility[cropName] ?? false}
                                  onCheckedChange={(checked) => handleCropToggle(cropName, !!checked)}
                                />
                                <Label htmlFor={`crop-${cropName}`} className="text-xs font-normal flex-grow truncate flex items-center" title={cropName}>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      width: '12px',
                                      height: '12px',
                                      backgroundColor: cropColorMapping[cropName],
                                      border: '1px solid #ccc',
                                      marginRight: '2px',
                                      flexShrink: 0,
                                    }}
                                  ></span>
                                  {cropName}
                                </Label>
                              </div>
                            ))}
                            {filteredCropNames.length === 0 && (
                                <p className="text-xs text-gray-500 italic">No matching crops found.</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Infrastructure Layer Toggle */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="infrastructureLayer"
                      data-layer-checkbox="infrastructure"
                      checked={infrastructureMaster}
                      onCheckedChange={(checked: boolean | 'indeterminate') => {
                        const isChecked = !!checked;
                        const infrastructureLayers = [
                          'anaerobicDigester', 'biodieselPlants', 'biorefineries', 'safPlants',
                          'renewableDiesel', 'mrf', 'cementPlants', 'landfillLfg',
                          'wastewaterTreatment', 'wasteToEnergy', 'combustionPlants', 'districtEnergySystems', 'foodProcessors', ...CARB_PRODUCT_KEYS, 'foodRetailers',
                          'powerPlants', 'foodBanks', 'farmersMarkets'
                        ];

                        // Update parent state for master checkbox
                        onInfrastructureToggle(isChecked);
                        
                        // Update parent state for each individual layer, which will trigger updates
                        // in the Map component and this component's local state.
                        infrastructureLayers.forEach(layerId => {
                          onLayerToggle(layerId, isChecked);
                        });
                      }}
                    />
                    <Label htmlFor="infrastructureLayer" className="font-medium text-sm">Infrastructure</Label>
                  </div>
                  <button
                    onClick={() => setIsInfrastructureCollapsed(!isInfrastructureCollapsed)}
                    className="flex items-center p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronDown className={`text-muted-foreground size-4 shrink-0 translate-y-0.5 transition-transform duration-200 ${isInfrastructureCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                  </button>
                </div>

                {/* Infrastructure Content - Only show when not collapsed */}
                {!isInfrastructureCollapsed && (
                  <>
                    {/* Anaerobic Digester Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6">
                                           <Checkbox
                      id="anaerobicDigesterLayer"
                      data-layer-checkbox="anaerobicDigester"
                      checked={localLayerVisibility?.anaerobicDigester ?? false}
                      onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('anaerobicDigester', !!checked)}
                    />
                      <Label htmlFor="anaerobicDigesterLayer" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#8B4513',
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        Livestock Anaerobic Digesters
                      </Label>
                    </div>
                    
                    {/* Biorefineries Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="biorefineries"
                        checked={localLayerVisibility?.biorefineries ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('biorefineries', !!checked)}
                      />
                      <Label htmlFor="biorefineries" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#9370DB',
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        Ethanol Biorefineries
                      </Label>
                    </div>
                    
                    {/* Biorefineries Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="safPlants"
                        checked={localLayerVisibility?.safPlants ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('safPlants', !!checked)}
                      />
                      <Label htmlFor="safPlants" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#1E90FF',
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        Biorefineries
                      </Label>
                    </div>
                    
                    {/* Renewable Diesel Plants Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="renewableDiesel"
                        checked={localLayerVisibility?.renewableDiesel ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('renewableDiesel', !!checked)}
                      />
                      <Label htmlFor="renewableDiesel" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#FF8C00',
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        Renewable Diesel Plants
                      </Label>
                    </div>
                    
                    {/* Material Recovery Facilities Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="mrf"
                        checked={localLayerVisibility?.mrf ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('mrf', !!checked)}
                      />
                      <Label htmlFor="mrf" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#20B2AA',
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        Material Recovery Facilities
                      </Label>
                    </div>
                    
                    {/* Cement Plants Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="cementPlants"
                        checked={localLayerVisibility?.cementPlants ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('cementPlants', !!checked)}
                      />
                      <Label htmlFor="cementPlants" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#708090',
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        Cement Plants
                      </Label>
                    </div>
                    
                    {/* Biodiesel Plants Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="biodieselPlantsLayer"
                        checked={localLayerVisibility?.biodieselPlants ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('biodieselPlants', !!checked)}
                      />
                      <Label htmlFor="biodieselPlantsLayer" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#228B22',
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        Biodiesel Plants
                      </Label>
                    </div>
                    
                    {/* Landfills with LFG Projects Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="landfillLfgLayer"
                        checked={localLayerVisibility?.landfillLfg ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('landfillLfg', !!checked)}
                      />
                      <Label htmlFor="landfillLfgLayer" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#800080',
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        Landfills with LFG Projects
                      </Label>
                    </div>
                    
                    {/* Wastewater Treatment Plants Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="wastewaterTreatmentLayer"
                        checked={localLayerVisibility?.wastewaterTreatment ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('wastewaterTreatment', !!checked)}
                      />
                      <Label htmlFor="wastewaterTreatmentLayer" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#00CED1',
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        Wastewater Treatment Plants
                      </Label>
                    </div>
                    
                    {/* Waste to Energy Plants Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="wasteToEnergyLayer"
                        checked={localLayerVisibility?.wasteToEnergy ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('wasteToEnergy', !!checked)}
                      />
                      <Label htmlFor="wasteToEnergyLayer" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#FF6347', /* Tomato color for Waste to Energy Plants */
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        Waste to Energy Plants
                      </Label>
                    </div>
                    
                    {/* Combustion Plants Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="combustionPlantsLayer"
                        checked={localLayerVisibility?.combustionPlants ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('combustionPlants', !!checked)}
                      />
                      <Label htmlFor="combustionPlantsLayer" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#B22222', /* FireBrick color for Combustion Plants */
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        Combustion Plants
                      </Label>
                    </div>
                    
                    {/* District Energy Systems Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="districtEnergySystemsLayer"
                        checked={localLayerVisibility?.districtEnergySystems ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('districtEnergySystems', !!checked)}
                      />
                      <Label htmlFor="districtEnergySystemsLayer" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#32CD32', /* LimeGreen color for District Energy Systems */
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        District Energy Systems
                      </Label>
                    </div>
                    

                    {/* Food Retailers Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="foodRetailersLayer"
                        checked={localLayerVisibility?.foodRetailers ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('foodRetailers', !!checked)}
                      />
                      <Label htmlFor="foodRetailersLayer" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#FF69B4', /* HotPink for Food Retailers */
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        Food Retailers
                      </Label>
                    </div>

                    {/* Power Plants Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                      <Checkbox
                        id="powerPlantsLayer"
                        checked={localLayerVisibility?.powerPlants ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('powerPlants', !!checked)}
                      />
                      <Label htmlFor="powerPlantsLayer" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#FFD700', // Gold
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        Power Plants
                      </Label>
                    </div>
                    {/* Food Banks Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                      <Checkbox
                        id="foodBanksLayer"
                        checked={localLayerVisibility?.foodBanks ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('foodBanks', !!checked)}
                      />
                      <Label htmlFor="foodBanksLayer" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#32CD32', // LimeGreen
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        Food Banks
                      </Label>
                    </div>
                    {/* Farmers' Markets Layer Toggle - Under Infrastructure */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                      <Checkbox
                        id="farmersMarketsLayer"
                        checked={localLayerVisibility?.farmersMarkets ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('farmersMarkets', !!checked)}
                      />
                      <Label htmlFor="farmersMarketsLayer" className="flex items-center text-xs">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#FF4500', // OrangeRed
                            borderRadius: '50%',
                            marginRight: '2px',
                            flexShrink: 0,
                          }}
                        ></span>
                        Farmers' Markets
                      </Label>
                    </div>

                    {/* Food Processors Group Layer Toggle - Under Infrastructure */}
                    <div className="space-y-1 pl-6 mt-2">
                      {/* Header Row with Master Checkbox and Collapse */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="foodProcessorsMaster"
                            checked={
                              (localLayerVisibility?.foodProcessors && CARB_PRODUCT_KEYS.every((k) => localLayerVisibility?.[k]))
                                ? true
                                : (localLayerVisibility?.foodProcessors || CARB_PRODUCT_KEYS.some((k) => localLayerVisibility?.[k]))
                                  ? 'indeterminate'
                                  : false
                            }
                            onCheckedChange={(checked: boolean | 'indeterminate') => {
                              const isChecked = checked === true;
                              directLayerToggle('foodProcessors', isChecked, true);
                              CARB_PRODUCT_KEYS.forEach((k) => directLayerToggle(k, isChecked, true));
                            }}
                          />
                          <Label htmlFor="foodProcessorsMaster" className="flex items-center text-xs font-medium">
                            Food Processing Facilities
                          </Label>
                        </div>
                        <button
                          onClick={() => setIsFoodProcessorsCollapsed(!isFoodProcessorsCollapsed)}
                          className="flex items-center p-1 hover:bg-gray-100 rounded"
                        >
                          <ChevronDown className={`text-muted-foreground size-3 shrink-0 transition-transform duration-200 ${isFoodProcessorsCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                        </button>
                      </div>

                      {/* Subtypes - Only show when not collapsed */}
                      {!isFoodProcessorsCollapsed && (
                        <div className="space-y-1">
                          {/* NOTE: The legacy "Tomato" subtype (tomatoProcessors /
                              tomato-processors-layer, from Maryam Touhin's sparse tileset) is
                              intentionally hidden from the legend — its richer replacement is
                              the CARB "Tomatoes" entry below. The tileset, source, and Mapbox
                              layer are kept in Map.js so the two datasets can be merged later;
                              only the legend entry and bulk toggles are removed so the layer
                              never renders for now. */}

                          {/* CARB Food Processors - disaggregated by primary_ag_product (issue #98).
                              One independently-toggleable, color-coded legend entry per product. */}
                          {CARB_PRODUCT_CATEGORIES.map((category) => (
                            <div key={category.key} className="flex items-center space-x-2 pl-6">
                              <Checkbox
                                id={`${category.key}Layer`}
                                checked={localLayerVisibility?.[category.key] ?? false}
                                onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle(category.key, !!checked)}
                              />
                              <Label htmlFor={`${category.key}Layer`} className="flex items-center text-xs">
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: '10px',
                                    height: '10px',
                                    backgroundColor: category.color,
                                    borderRadius: '50%',
                                    marginRight: '2px',
                                    flexShrink: 0,
                                  }}
                                ></span>
                                {category.label}
                              </Label>
                            </div>
                          ))}

                          {/* Other Food Processors (EPA) Layer Toggle - listed last as the
                              catch-all after the specific tomato + CARB product subtypes. */}
                          <div className="flex items-center space-x-2 pl-6">
                             <Checkbox
                              id="foodProcessorsLayer"
                              checked={localLayerVisibility?.foodProcessors ?? false}
                              onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('foodProcessors', !!checked)}
                            />
                            <Label htmlFor="foodProcessorsLayer" className="flex items-center text-xs">
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: '10px',
                                  height: '10px',
                                  backgroundColor: '#FFD700', /* Gold color for Food Processors */
                                  borderRadius: '50%',
                                  marginRight: '2px',
                                  flexShrink: 0,
                                }}
                              ></span>
                              Other
                            </Label>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Transportation Layer Toggle */}
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="transportationLayer"
                      data-layer-checkbox="transportation"
                      checked={transportationMaster}
                      onCheckedChange={(checked: boolean | 'indeterminate') => {
                        const isChecked = !!checked;
                        const transportationLayers = [
                          'railLines', 'freightTerminals', 'freightRoutes', 'petroleumPipelines',
                          'crudeOilPipelines', 'naturalGasPipelines'
                        ];

                        // Update parent state for master checkbox
                        onTransportationToggle(isChecked);

                        // Update parent state for each individual layer
                        transportationLayers.forEach(layerId => {
                          onLayerToggle(layerId, isChecked);
                        });
                      }}
                    />
                    <Label htmlFor="transportationLayer" className="font-medium text-sm">Transportation</Label>
                  </div>
                  <button
                    onClick={() => setIsTransportationCollapsed(!isTransportationCollapsed)}
                    className="flex items-center p-1 hover:bg-gray-100 rounded"
                  >
                    <ChevronDown className={`text-muted-foreground size-4 shrink-0 translate-y-0.5 transition-transform duration-200 ${isTransportationCollapsed ? '-rotate-90' : 'rotate-0'}`} />
                  </button>
                </div>

                {/* Transportation Content - Only show when not collapsed */}
                {!isTransportationCollapsed && (
                  <>
                    {/* Rail Lines Layer Toggle - Under Transportation */}
                    <div className="flex items-center space-x-2 pl-6">
                       <Checkbox
                        id="railLinesLayer"
                        checked={localLayerVisibility?.railLines ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('railLines', !!checked)}
                      />
                      <Label htmlFor="railLinesLayer" className="flex items-center text-xs">
                        <div style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '2px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '16px',
                              borderTop: '3px dashed #008B8B',
                              flexShrink: 0,
                            }}
                          ></span>
                        </div>
                        Rail Lines
                      </Label>
                    </div>

                    {/* Freight Terminals Layer Toggle - Under Transportation */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="freightTerminalsLayer"
                        checked={localLayerVisibility?.freightTerminals ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('freightTerminals', !!checked)}
                      />
                      <Label htmlFor="freightTerminalsLayer" className="flex items-center text-xs">
                        <div style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '2px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '12px',
                              height: '12px',
                              backgroundColor: '#4169E1',
                              borderRadius: '50%',
                              flexShrink: 0,
                            }}
                          ></span>
                        </div>
                        Freight Terminals
                      </Label>
                    </div>

                    {/* Freight Routes Layer Toggle - Under Transportation */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="freightRoutesLayer"
                        checked={localLayerVisibility?.freightRoutes ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('freightRoutes', !!checked)}
                      />
                      <Label htmlFor="freightRoutesLayer" className="flex items-center text-xs">
                        <div style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '2px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '16px',
                              height: '3px',
                              backgroundColor: '#9932CC',
                              flexShrink: 0,
                            }}
                          ></span>
                        </div>
                        Freight Routes
                      </Label>
                    </div>
                    
                    {/* Petroleum Pipelines Layer Toggle - Under Transportation */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="petroleumPipelinesLayer"
                        checked={localLayerVisibility?.petroleumPipelines ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('petroleumPipelines', !!checked)}
                      />
                      <Label htmlFor="petroleumPipelinesLayer" className="flex items-center text-xs">
                        <div style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '2px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '16px',
                              height: '3px',
                              backgroundColor: '#FF4500',
                              flexShrink: 0,
                            }}
                          ></span>
                        </div>
                        Petroleum Pipelines
                      </Label>
                    </div>
                    
                    {/* Crude Oil Pipelines Layer Toggle - Under Transportation */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="crudeOilPipelinesLayer"
                        checked={localLayerVisibility?.crudeOilPipelines ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('crudeOilPipelines', !!checked)}
                      />
                      <Label htmlFor="crudeOilPipelinesLayer" className="flex items-center text-xs">
                        <div style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '2px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '16px',
                              height: '3px',
                              backgroundColor: '#8B0000',
                              flexShrink: 0,
                            }}
                          ></span>
                        </div>
                        Crude Oil Pipelines
                      </Label>
                    </div>
                    
                    {/* Natural Gas Pipelines Layer Toggle - Under Transportation */}
                    <div className="flex items-center space-x-2 pl-6 mt-2">
                       <Checkbox
                        id="naturalGasPipelinesLayer"
                        checked={localLayerVisibility?.naturalGasPipelines ?? false}
                        onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('naturalGasPipelines', !!checked)}
                      />
                      <Label htmlFor="naturalGasPipelinesLayer" className="flex items-center text-xs">
                        <div style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '2px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '16px',
                              height: '3px',
                              backgroundColor: '#4169E1',
                              flexShrink: 0,
                            }}
                          ></span>
                        </div>
                        Natural Gas Pipelines
                      </Label>
                    </div>
                  </>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Filtering Section */}
        <AccordionItem value="filters">
          <AccordionTrigger className="[&[data-state=open]>svg]:rotate-0 [&[data-state=closed]>svg]:-rotate-90">
            <div className="flex items-center text-sm">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              {/* Month Range Slider for Feedstock Availability */}
              <div className="space-y-3">
                <div className="px-2">
                  <Label className="text-sm font-medium flex items-center">
                    Feedstock Seasonal Availability
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Info className="h-4 w-4 ml-1 inline-block text-gray-500 cursor-help transition-colors hover:text-gray-700" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p>Filter crops based on when their residues are seasonally available. Crops will be shown if they are available in at least one month within the selected range.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
                <div className="px-2">
                  <Slider
                    min={0}
                    max={11}
                    step={1}
                    value={monthRange}
                    onValueChange={handleMonthRangeChange}
                    className="w-full"
                  />
                  <div className="mt-2">
                    <div className="text-xs text-blue-600 text-center">
                      {monthRange[0] === monthRange[1] 
                        ? getMonthName(monthRange[0])
                        : `${getMonthName(monthRange[0])} to ${getMonthName(monthRange[1])} (inclusive)`
                      }
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Feedstock Type Category Filter */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="px-2">
                  <Label className="text-sm font-medium flex items-center">
                    Feedstock Type
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Info className="h-4 w-4 ml-1 inline-block text-gray-500 cursor-help transition-colors hover:text-gray-700" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p>Filter by feedstock resource type. Each category corresponds to a distinct biomass material: woody prunings and nut shells (Tree, Vine &amp; Nut), grain straws and stover (Grain &amp; Field), fresh organic residues (Vegetable &amp; Specialty), green forage biomass (Pasture &amp; Forage), and non-cropped land (Idle &amp; Fallow).</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
                <div className="px-2 space-y-2">
                  {Object.values(FEEDSTOCK_CATEGORIES).map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={selectedFeedstockCategories.includes(category)}
                        onCheckedChange={(checked) => handleFeedstockCategoryChange(category, !!checked)}
                      />
                      <Label htmlFor={`category-${category}`} className="text-xs font-normal cursor-pointer">
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Composition Filters (API-driven: moisture, composition, and energy content) */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="px-2 flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center">
                    Biomass Composition
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Info className="h-4 w-4 ml-1 inline-block text-gray-500 cursor-help transition-colors hover:text-gray-700" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p>Filter crops by biochemical composition. Values sourced from the Cal BioScape API where available; otherwise estimated from peer-reviewed biomass literature (Phyllis2/ECN, NREL). Adjust ranges to focus on feedstocks suited to specific conversion pathways.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {isCompositionFiltersActive(compositionFilters) && (
                      <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide">ACTIVE</span>
                    )}
                  </Label>
                  {isCompositionFiltersActive(compositionFilters) && (
                    <button
                      onClick={() => onCompositionFiltersChange(DEFAULT_COMPOSITION_FILTERS)}
                      className="text-xs text-blue-600 hover:underline ml-4"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {Object.keys(compositionLookup).length === 0 ? (
                  <p className="px-2 text-xs text-gray-400 italic">Loading composition data…</p>
                ) : (
                  <div className="px-2 space-y-5">
                    {/* Moisture Content */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-normal text-gray-700">
                          Moisture Content
                          <span className="ml-1 text-[10px] font-normal text-gray-400">(wet basis)</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Info className="h-3 w-3 ml-1 inline-block text-gray-400 cursor-help" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p>As-received moisture content (% wet basis). Lower values (&lt;15%) indicate drier feedstocks better suited for direct combustion and pyrolysis; higher values (&gt;30%) favour anaerobic digestion. Values sourced from the Cal BioScape API where available; otherwise from peer-reviewed biomass literature.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <span className="text-xs text-blue-600">
                          {compositionFilters.moisture[0]}–{compositionFilters.moisture[1]}%
                        </span>
                      </div>
                      <Slider
                        min={COMPOSITION_FILTER_BOUNDS.moisture[0]}
                        max={COMPOSITION_FILTER_BOUNDS.moisture[1]}
                        step={1}
                        value={compositionFilters.moisture}
                        onValueChange={(v) =>
                          onCompositionFiltersChange({ ...compositionFilters, moisture: v as [number, number] })
                        }
                        className="w-full"
                      />
                    </div>

                    {/* Cellulose */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-normal text-gray-700">
                          Cellulose
                          <span className="ml-1 text-[10px] font-normal text-gray-400">(dry basis)</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Info className="h-3 w-3 ml-1 inline-block text-gray-400 cursor-help" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p>Cellulose as % of dry mass. Higher cellulose favours fermentation (ethanol) and fast pyrolysis pathways.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <span className="text-xs text-blue-600">
                          {compositionFilters.cellulose[0]}–{compositionFilters.cellulose[1]}%
                        </span>
                      </div>
                      <Slider
                        min={COMPOSITION_FILTER_BOUNDS.cellulose[0]}
                        max={COMPOSITION_FILTER_BOUNDS.cellulose[1]}
                        step={1}
                        value={compositionFilters.cellulose}
                        onValueChange={(v) =>
                          onCompositionFiltersChange({ ...compositionFilters, cellulose: v as [number, number] })
                        }
                        className="w-full"
                      />
                    </div>

                    {/* Lignin */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-normal text-gray-700">
                          Lignin
                          <span className="ml-1 text-[10px] font-normal text-gray-400">(dry basis)</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Info className="h-3 w-3 ml-1 inline-block text-gray-400 cursor-help" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p>Lignin as % of dry mass. Low lignin is preferred for biochemical conversion; high lignin suits thermochemical gasification.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <span className="text-xs text-blue-600">
                          {compositionFilters.lignin[0]}–{compositionFilters.lignin[1]}%
                        </span>
                      </div>
                      <Slider
                        min={COMPOSITION_FILTER_BOUNDS.lignin[0]}
                        max={COMPOSITION_FILTER_BOUNDS.lignin[1]}
                        step={1}
                        value={compositionFilters.lignin}
                        onValueChange={(v) =>
                          onCompositionFiltersChange({ ...compositionFilters, lignin: v as [number, number] })
                        }
                        className="w-full"
                      />
                    </div>

                    {/* Ash */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-normal text-gray-700">
                          Ash Content
                          <span className="ml-1 text-[10px] font-normal text-gray-400">(dry basis)</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Info className="h-3 w-3 ml-1 inline-block text-gray-400 cursor-help" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p>Ash as % of dry mass. Lower ash improves combustion efficiency and reduces fouling in boilers and gasifiers.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <span className="text-xs text-blue-600">
                          {compositionFilters.ash[0]}–{compositionFilters.ash[1]}%
                        </span>
                      </div>
                      <Slider
                        min={COMPOSITION_FILTER_BOUNDS.ash[0]}
                        max={COMPOSITION_FILTER_BOUNDS.ash[1]}
                        step={1}
                        value={compositionFilters.ash}
                        onValueChange={(v) =>
                          onCompositionFiltersChange({ ...compositionFilters, ash: v as [number, number] })
                        }
                        className="w-full"
                      />
                    </div>

                    {/* HHV */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-normal text-gray-700">
                          Heating Value (HHV)
                          <span className="ml-1 text-[10px] font-normal text-gray-400">(dry basis)</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Info className="h-3 w-3 ml-1 inline-block text-gray-400 cursor-help" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p>Higher Heating Value (MJ/kg, dry basis) — the energy content of the feedstock. Higher values (&gt;17 MJ/kg) are better for direct combustion and co-firing. Values sourced from the Cal BioScape API where available; otherwise from peer-reviewed biomass literature.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <span className="text-xs text-blue-600">
                          {compositionFilters.hhv[0]}–{compositionFilters.hhv[1]} MJ/kg
                        </span>
                      </div>
                      <Slider
                        min={COMPOSITION_FILTER_BOUNDS.hhv[0]}
                        max={COMPOSITION_FILTER_BOUNDS.hhv[1]}
                        step={0.5}
                        value={compositionFilters.hhv}
                        onValueChange={(v) =>
                          onCompositionFiltersChange({ ...compositionFilters, hhv: v as [number, number] })
                        }
                        className="w-full"
                      />
                    </div>

                    <p className="text-xs text-gray-400 italic">
                      Crops without composition data are always shown.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};

export default LayerControls;
