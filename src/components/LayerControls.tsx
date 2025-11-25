'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  ORCHARD_VINEYARD_RESIDUES, 
  ROW_CROP_RESIDUES, 
  FIELD_CROP_RESIDUES, 
  CROP_NAME_MAPPING,
  FEEDSTOCK_CATEGORIES,
  MOISTURE_CONTENT_LEVELS,
  ENERGY_CONTENT_LEVELS,
  getFeedstockCharacteristics
} from '@/lib/constants';

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
  onClosePopupForLayer: (layerId: string) => void; // Add this line
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
}) => {
  // Local state to track layer visibility within the component
  // This helps keep UI in sync with actual map layer visibility
  const [localLayerVisibility, setLocalLayerVisibility] = useState<{ [key: string]: boolean }>(initialVisibility);
  
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
  const [selectedMoistureLevels, setSelectedMoistureLevels] = useState<string[]>(
    Object.values(MOISTURE_CONTENT_LEVELS)
  ); // All moisture levels selected by default
  const [selectedEnergyLevels, setSelectedEnergyLevels] = useState<string[]>(
    Object.values(ENERGY_CONTENT_LEVELS)
  ); // All energy levels selected by default
  
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
    // Get standardized crop name
    const standardizedName = CROP_NAME_MAPPING[cropName as keyof typeof CROP_NAME_MAPPING];
    if (!standardizedName) return true; // If not found, assume always available
    
    // Find the crop in the residue tables
    let seasonalData;
    if (standardizedName in ORCHARD_VINEYARD_RESIDUES) {
      seasonalData = ORCHARD_VINEYARD_RESIDUES[standardizedName as keyof typeof ORCHARD_VINEYARD_RESIDUES].seasonalAvailability;
    } else if (standardizedName in ROW_CROP_RESIDUES) {
      seasonalData = ROW_CROP_RESIDUES[standardizedName as keyof typeof ROW_CROP_RESIDUES].seasonalAvailability;
    } else if (standardizedName in FIELD_CROP_RESIDUES) {
      seasonalData = FIELD_CROP_RESIDUES[standardizedName as keyof typeof FIELD_CROP_RESIDUES].seasonalAvailability;
    }
    
    if (!seasonalData) return true; // If no seasonal data, assume always available
    
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
    
    return false; // Not available in any month within range
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
    const characteristics = getFeedstockCharacteristics(cropName);
    // If no characteristics defined, hide the crop (can't determine if it matches filters)
    if (!characteristics) return false;
    
    // Check if crop matches selected feedstock categories
    // If no categories selected (empty array), hide everything
    if (selectedFeedstockCategories.length === 0) return false;
    const categoryMatch = selectedFeedstockCategories.includes(characteristics.category);
    if (!categoryMatch) return false;
    
    // Check if crop matches selected moisture levels
    // If no moisture levels selected (empty array), hide everything
    if (selectedMoistureLevels.length === 0) return false;
    const moistureMatch = selectedMoistureLevels.includes(characteristics.moistureLevel);
    if (!moistureMatch) return false;
    
    // Check if crop matches selected energy levels
    // If no energy levels selected (empty array), hide everything
    if (selectedEnergyLevels.length === 0) return false;
    const energyMatch = selectedEnergyLevels.includes(characteristics.energyLevel);
    if (!energyMatch) return false;
    
    return true; // Crop matches all filter criteria
  }, [monthRange, selectedFeedstockCategories, selectedMoistureLevels, selectedEnergyLevels]);
  
  // Function to apply seasonal filter based on month range
  const applySeasonalFilter = (range: [number, number]) => {
    setCropVisibility(prev => {
      const newState = { ...prev };
      
      // Update visibility for each crop based on seasonal availability
      allCropNames.forEach(cropName => {
        newState[cropName] = isCropAvailableInRange(cropName, range);
      });
      
      // Get visible crops after applying seasonal filter
      const visibleCrops = Object.keys(newState).filter(name => newState[name]);
      
      // Try to directly update the map filter for crop visibility
      const mapInstance = getMapInstance();
      if (mapInstance && mapInstance.getLayer('feedstock-vector-layer')) {
        try {
          // Make sure the layer is visible if the feedstock layer is enabled and there are visible crops
          if (visibleCrops.length > 0 && localLayerVisibility.feedstock) {
            mapInstance.setLayoutProperty('feedstock-vector-layer', 'visibility', 'visible');
          }
          
          // Create a filter that shows only visible crops
          const visibleCropFilter = ['match', ['get', 'main_crop_name'], visibleCrops, true, false];
          // Combine with the existing base filter that excludes 'U' code
          const combinedFilter = ['all', ['!=', ['get', 'main_crop_code'], 'U'], visibleCropFilter];
          
          // Apply the filter directly to the map
          mapInstance.setFilter('feedstock-vector-layer', combinedFilter);
          console.log(`Directly updated crop filter based on seasonal availability (${visibleCrops.length} crops visible)`);
        } catch (err) {
          console.error('Error directly updating crop filter:', err);
        }
      }
      
      return newState;
    });
  };
  
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
          
          // Create a filter that shows only visible crops
          const visibleCropFilter = ['match', ['get', 'main_crop_name'], visibleCrops, true, false];
          // Combine with the existing base filter that excludes 'U' code
          const combinedFilter = ['all', ['!=', ['get', 'main_crop_code'], 'U'], visibleCropFilter];
          
          // Apply the filter directly to the map
          mapInstance.setFilter('feedstock-vector-layer', combinedFilter);
          console.log(`Applied comprehensive filters (${visibleCrops.length} crops visible)`);
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
  
  const handleMoistureLevelChange = (level: string, isChecked: boolean) => {
    setSelectedMoistureLevels(prev => {
      const newSelection = isChecked 
        ? [...prev, level]
        : prev.filter(l => l !== level);
      return newSelection;
    });
  };
  
  const handleEnergyLevelChange = (level: string, isChecked: boolean) => {
    setSelectedEnergyLevels(prev => {
      const newSelection = isChecked 
        ? [...prev, level]
        : prev.filter(l => l !== level);
      return newSelection;
    });
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
          const visibleCropFilter = ['match', ['get', 'main_crop_name'], visibleCrops, true, false];
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
  
  // Apply seasonal filter when component mounts
  useEffect(() => {
    applySeasonalFilter(monthRange);
  }, []);
  
  // Apply all filters when any filter state changes
  useEffect(() => {
    // Wait a bit for the map to be ready on initial load
    const timeoutId = setTimeout(() => {
      applyAllFilters();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [applyAllFilters]);
  
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
            const visibleCropFilter = ['match', ['get', 'main_crop_name'], visibleCrops, true, false];
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
    // Update local state first for immediate UI feedback
    setLocalLayerVisibility(prev => ({
      ...prev,
      [layerId]: isVisible
    }));
    
    // Get map instance
    const mapInstance = getMapInstance();
    if (!mapInstance) {
      console.error("Map instance not found");
      return false; // Failed to toggle directly
    }
    
    // Get the corresponding Mapbox layer ID
    const mapboxLayerId = layerIdMapping[layerId];
    if (!mapboxLayerId) {
      console.error(`No Mapbox layer ID found for ${layerId}`);
      return false; // Failed to toggle directly
    }
    
    try {
      // Check if the layer exists in the map
      if (mapInstance.getLayer(mapboxLayerId)) {
        // Set the visibility property directly on the map layer
        mapInstance.setLayoutProperty(mapboxLayerId, 'visibility', isVisible ? 'visible' : 'none');
        console.log(`Set ${mapboxLayerId} visibility to ${isVisible ? 'visible' : 'none'} directly`);
        
        // If the layer is being hidden, close any associated popup
        if (!isVisible) {
          onClosePopupForLayer(layerId);
        }

        // Update parent state if requested (to keep the overall app state in sync)
        if (updateParentState) {
          onLayerToggle(layerId, isVisible);
        }
        
        return true; // Successfully toggled directly
      } else {
        console.warn(`Layer ${mapboxLayerId} not found in map`);
        return false; // Failed to toggle directly
      }
    } catch (err) {
      console.error(`Error setting ${mapboxLayerId} visibility:`, err);
      return false; // Failed to toggle directly
    }
  };

  // Define a map of layer IDs to their corresponding Mapbox layer IDs
  const layerIdMapping: { [key: string]: string } = {
    feedstock: 'feedstock-vector-layer',
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
              
              {/* Crop Residues Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="feedstockLayer"
                      data-layer-checkbox="feedstock"
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
                          'wastewaterTreatment', 'wasteToEnergy', 'combustionPlants', 'districtEnergySystems', 'foodProcessors', 'tomatoProcessors', 'foodRetailers',
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
                    
                    {/* SAF Plants Layer Toggle - Under Infrastructure */}
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
                        Sustainable Aviation Fuel Plants
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
                              (localLayerVisibility?.foodProcessors && localLayerVisibility?.tomatoProcessors) 
                                ? true 
                                : (localLayerVisibility?.foodProcessors || localLayerVisibility?.tomatoProcessors) 
                                  ? 'indeterminate' 
                                  : false
                            }
                            onCheckedChange={(checked: boolean | 'indeterminate') => {
                              const isChecked = checked === true;
                              // Toggle both subtypes
                              directLayerToggle('foodProcessors', isChecked, true);
                              directLayerToggle('tomatoProcessors', isChecked, true);
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
                          {/* Tomato Processors Layer Toggle - Subtype */}
                          <div className="flex items-center space-x-2 pl-12">
                             <Checkbox
                              id="tomatoProcessorsLayer"
                              checked={localLayerVisibility?.tomatoProcessors ?? false}
                              onCheckedChange={(checked: boolean | 'indeterminate') => directLayerToggle('tomatoProcessors', !!checked)}
                            />
                            <Label htmlFor="tomatoProcessorsLayer" className="flex items-center text-xs">
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: '10px',
                                  height: '10px',
                                  backgroundColor: '#FF6347', // Tomato color
                                  borderRadius: '50%',
                                  marginRight: '2px',
                                  flexShrink: 0,
                                }}
                              ></span>
                              Tomato Processors
                            </Label>
                          </div>

                          {/* Other Food Processors Layer Toggle - Subtype */}
                          <div className="flex items-center space-x-2 pl-12">
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
                              Other Processors
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
                          <p>Filter crops by the type of residue they produce. Select one or more categories to show only those feedstock types.</p>
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
              
              {/* Moisture Content Filter */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="px-2">
                  <Label className="text-sm font-medium flex items-center">
                    Moisture Content
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Info className="h-4 w-4 ml-1 inline-block text-gray-500 cursor-help transition-colors hover:text-gray-700" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p>Filter by moisture content level. Low moisture feedstocks (&lt;15%) are ideal for thermal processes like pyrolysis. High moisture (&gt;30%) feedstocks are better for anaerobic digestion.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
                <div className="px-2 space-y-2">
                  {Object.values(MOISTURE_CONTENT_LEVELS).map((level) => (
                    <div key={level} className="flex items-center space-x-2">
                      <Checkbox
                        id={`moisture-${level}`}
                        checked={selectedMoistureLevels.includes(level)}
                        onCheckedChange={(checked) => handleMoistureLevelChange(level, !!checked)}
                      />
                      <Label htmlFor={`moisture-${level}`} className="text-xs font-normal cursor-pointer">
                        {level}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Energy Content Filter */}
              <div className="space-y-3 pt-4 border-t border-gray-200">
                <div className="px-2">
                  <Label className="text-sm font-medium flex items-center">
                    Energy Content
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Info className="h-4 w-4 ml-1 inline-block text-gray-500 cursor-help transition-colors hover:text-gray-700" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p>Filter by calorific value (energy content). Higher values (&gt;17 MJ/kg) are better for direct combustion and energy generation.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                </div>
                <div className="px-2 space-y-2">
                  {Object.values(ENERGY_CONTENT_LEVELS).map((level) => (
                    <div key={level} className="flex items-center space-x-2">
                      <Checkbox
                        id={`energy-${level}`}
                        checked={selectedEnergyLevels.includes(level)}
                        onCheckedChange={(checked) => handleEnergyLevelChange(level, !!checked)}
                      />
                      <Label htmlFor={`energy-${level}`} className="text-xs font-normal cursor-pointer">
                        {level}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};

export default LayerControls;
