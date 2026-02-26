'use client'; // Needed because LayerControls uses useState

import { useState, useMemo, useCallback, useEffect } from 'react'; // Added useEffect
import dynamic from 'next/dynamic';
import { fetchResidueData } from '@/lib/residue-data';
// Removed useSWRInfinite import
const Map = dynamic(() => import('@/components/Map'), { ssr: false });
import LayerControls from '@/components/LayerControls'; // Import the new LayerControls component
import Header from '@/components/Header'; // Import the Header component
import { ChevronLeft, ChevronRight, Layers, Filter } from 'lucide-react';

// Removed fetcher function
export default function Home() {
  // State for layer visibility
  const [layerVisibility, setLayerVisibility] = useState<{ [key: string]: boolean }>({
    feedstock: true,
    transportation: false,
    railLines: false,
    anaerobicDigester: false,
    biodieselPlants: false,
    freightTerminals: false,
    freightRoutes: false,
    petroleumPipelines: false,
    crudeOilPipelines: false,
    naturalGasPipelines: false,
    biorefineries: false,
    safPlants: false,
    renewableDiesel: false,
    mrf: false,
    cementPlants: false,
    landfillLfg: false,
    wastewaterTreatment: false,
    wasteToEnergy: false,
    combustionPlants: false,
    districtEnergySystems: false,
    foodProcessors: false,
    foodRetailers: false,
    powerPlants: false,
    foodBanks: false,
    farmersMarkets: false
  });

  // State for panel collapse
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Effect to fetch residue data on mount
  useEffect(() => {
    fetchResidueData()
      .catch(err => console.error("Failed to load residue data:", err));
  }, []);

  // Effect to dispatch resize event when panel collapses/expands
  useEffect(() => {
    // Wait for the panel transition to complete
    const timeoutId = setTimeout(() => {
      // Dispatch a custom event that will be caught by the resize observer in Map
      window.dispatchEvent(new Event('resize'));
      console.log('Dispatched resize event after panel state change');
    }, 350); // Slightly longer than the transition duration (300ms)
    
    return () => clearTimeout(timeoutId);
  }, [isPanelCollapsed]);

  // Toggle panel with appropriate function
  const togglePanelCollapse = () => {
    setIsPanelCollapsed(!isPanelCollapsed);
  };

  // Computed values for parent checkbox states based on child layer visibility
  const computedInfrastructureMaster = useMemo(() => {
    return layerVisibility.anaerobicDigester || 
           layerVisibility.biodieselPlants || 
           layerVisibility.biorefineries || 
           layerVisibility.safPlants || 
           layerVisibility.renewableDiesel || 
           layerVisibility.mrf || 
           layerVisibility.cementPlants || 
           layerVisibility.landfillLfg || 
           layerVisibility.wastewaterTreatment ||
           layerVisibility.wasteToEnergy ||
           layerVisibility.combustionPlants ||
           layerVisibility.districtEnergySystems ||
           layerVisibility.foodProcessors ||
           layerVisibility.foodRetailers ||
           layerVisibility.powerPlants ||
           layerVisibility.foodBanks ||
           layerVisibility.farmersMarkets ||
           false;
  }, [
    layerVisibility.anaerobicDigester, 
    layerVisibility.biodieselPlants, 
    layerVisibility.biorefineries,
    layerVisibility.safPlants,
    layerVisibility.renewableDiesel,
    layerVisibility.mrf,
    layerVisibility.cementPlants,
    layerVisibility.landfillLfg,
    layerVisibility.wastewaterTreatment,
    layerVisibility.wasteToEnergy,
    layerVisibility.combustionPlants,
    layerVisibility.districtEnergySystems,
    layerVisibility.foodProcessors,
    layerVisibility.foodRetailers,
    layerVisibility.powerPlants,
    layerVisibility.foodBanks,
    layerVisibility.farmersMarkets
  ]);

  const computedTransportationMaster = useMemo(() => {
    return layerVisibility.railLines || 
           layerVisibility.freightTerminals || 
           layerVisibility.freightRoutes || 
           layerVisibility.petroleumPipelines || 
           layerVisibility.crudeOilPipelines || 
           layerVisibility.naturalGasPipelines || 
           false;
  }, [
    layerVisibility.railLines, 
    layerVisibility.freightTerminals, 
    layerVisibility.freightRoutes,
    layerVisibility.petroleumPipelines,
    layerVisibility.crudeOilPipelines,
    layerVisibility.naturalGasPipelines
  ]);

  // State for cropland layer opacity
  const [croplandOpacity, setCroplandOpacity] = useState<number>(0.6); // Default opacity

  // Define the full list of crop names (consistent with LayerControls)
  const allCropNames = useMemo(() => [
      "Alfalfa & Alfalfa Mixtures", "Almonds", "Apples", "Apricots", "Avocados",
      "Beans (Dry)", "Bush Berries", "Carrots", "Cherries", "Citrus and Subtropical",
      "Cole Crops", "Corn, Sorghum and Sudan", "Cotton", "Dates", "Eucalyptus",
      "Flowers, Nursery and Christmas Tree Farms", "Grapes", "Greenhouse",
      "Idle – Long Term", "Idle – Short Term", "Induced high water table native pasture",
      "Kiwis", "Lettuce/Leafy Greens", "Melons, Squash and Cucumbers",
      "Miscellaneous Deciduous", "Miscellaneous Field Crops", "Miscellaneous Grain and Hay",
      "Miscellaneous Grasses", "Miscellaneous Subtropical Fruits", "Miscellaneous Truck Crops",
      "Mixed Pasture", "Native Pasture", "Olives", "Onions and Garlic",
      "Peaches/Nectarines", "Pears", "Pecans", "Peppers", "Pistachios", "Plums",
      "Pomegranates", "Potatoes", "Prunes", "Rice", "Safflower", "Strawberries",
      "Sugar beets", "Sunflowers", "Sweet Potatoes", "Tomatoes", "Turf Farms",
      "Unclassified Fallow", "Walnuts", "Wheat", "Wild Rice", "Young Perennials"
  ].sort(), []);

  // State for the list of currently visible crops
  const [visibleCrops, setVisibleCrops] = useState<string[]>(allCropNames); // Start with all crops visible

  // --- Removed feedstock data fetching logic (useSWRInfinite, getKey, combinedFeedstockData, etc.) ---

  // Handler to toggle layer visibility
  const handleLayerToggle = (layerId: string, isVisible: boolean) => {
    setLayerVisibility(prev => ({ ...prev, [layerId]: isVisible }));
    
    // Update parent checkbox states based on child layer changes
    if (layerId === 'anaerobicDigester' || layerId === 'biodieselPlants') {
      // setInfrastructureMaster(isVisible); // Removed
    } else if (layerId === 'railLines' || layerId === 'freightTerminals' || layerId === 'freightRoutes') {
      // setTransportationMaster(isVisible); // Removed
    }
    
    console.log(`Toggled layer ${layerId} to ${isVisible}`);
  };

  // Handler for infrastructure master toggle
  const handleInfrastructureToggle = (isVisible: boolean) => {
    setLayerVisibility(prev => ({
      ...prev,
      anaerobicDigester: isVisible, // Toggle anaerobic digester layer with infrastructure
      biodieselPlants: isVisible, // Toggle biodiesel plants layer with infrastructure
      biorefineries: isVisible, // Toggle ethanol biorefineries layer with infrastructure
      safPlants: isVisible, // Toggle SAF plants layer with infrastructure
      renewableDiesel: isVisible, // Toggle renewable diesel plants layer with infrastructure
      mrf: isVisible, // Toggle material recovery facilities layer with infrastructure
      cementPlants: isVisible, // Toggle cement plants layer with infrastructure
      landfillLfg: isVisible, // Toggle landfills with LFG projects layer with infrastructure
      wastewaterTreatment: isVisible, // Toggle wastewater treatment plants layer with infrastructure
      wasteToEnergy: isVisible,
      combustionPlants: isVisible,
      districtEnergySystems: isVisible,
      foodProcessors: isVisible,
      foodRetailers: isVisible,
      powerPlants: isVisible,
      foodBanks: isVisible,
      farmersMarkets: isVisible
    }));
    console.log(`Toggled infrastructure master to ${isVisible}, infrastructure layers set to ${isVisible}`);
  };

  // Handler for transportation master toggle
  const handleTransportationToggle = (isVisible: boolean) => {
    // setTransportationMaster(isVisible); // Removed
    setLayerVisibility(prev => ({
      ...prev,
      transportation: isVisible, // Set transportation layer visibility
      railLines: isVisible, // Automatically toggle rail lines with transportation
      freightTerminals: isVisible, // Automatically toggle freight terminals with transportation
      freightRoutes: isVisible, // Automatically toggle freight routes with transportation
      petroleumPipelines: isVisible, // Automatically toggle petroleum pipelines with transportation
      crudeOilPipelines: isVisible, // Automatically toggle crude oil pipelines with transportation
      naturalGasPipelines: isVisible, // Automatically toggle natural gas pipelines with transportation
      // Add more transportation sublayers here as needed
    }));
    console.log(`Toggled transportation master to ${isVisible}, all transportation sublayers set to ${isVisible}`);
  };

  // Handler to update the list of visible crops from LayerControls (memoized)
  const handleCropFilterChange = useCallback((newVisibleCrops: string[]) => {
    setVisibleCrops(newVisibleCrops);
    console.log("Visible crops updated:", newVisibleCrops.length); // Log changes
  }, []); // Empty dependency array: function doesn't depend on component state/props

  // Handler to show all layers
  const handleShowAllLayers = () => {
    setLayerVisibility(prev => {
      const newVisibility = { ...prev };
      for (const key in newVisibility) {
        newVisibility[key] = true;
      }
      return newVisibility;
    });
  };

  // Handler to hide all layers
  const handleHideAllLayers = () => {
    setLayerVisibility(prev => {
      const newVisibility = { ...prev };
      for (const key in newVisibility) {
        newVisibility[key] = false;
      }
      return newVisibility;
    });
  };

  // Handler to close popup for a specific layer
  const handleClosePopupForLayer = (layerId: string) => {
    // This function will be passed to LayerControls and then to Map
    // The Map component will handle the logic of closing the popup
    console.log(`Request to close popup for layer: ${layerId}`);
  };

  // Removed feedstockError check UI
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden no-scroll">
      {/* Header with Logo */}
      <Header />
      
      {/* Main Content */}
      <main className="flex flex-1 relative w-full h-full overflow-hidden">
        {/* Container for Layer Controls */}
        <div className={`${isPanelCollapsed ? 'w-0' : 'w-87'} transition-all duration-300 ease-in-out overflow-hidden bg-gray-100 flex-shrink-0`}>
          <div className="p-4 h-full overflow-y-auto">
            <LayerControls
              initialVisibility={layerVisibility}
              onLayerToggle={handleLayerToggle}
              onCropFilterChange={handleCropFilterChange} // Pass the handler
              croplandOpacity={croplandOpacity} // Pass opacity state
              setCroplandOpacity={setCroplandOpacity} // Pass opacity setter
              onInfrastructureToggle={handleInfrastructureToggle} // Pass the new handler
              infrastructureMaster={computedInfrastructureMaster} // Pass the computed infrastructure master state
              onTransportationToggle={handleTransportationToggle} // Pass the new handler
              transportationMaster={computedTransportationMaster} // Pass the computed transportation master state
              onShowAllLayers={handleShowAllLayers}
              onHideAllLayers={handleHideAllLayers}
              onClosePopupForLayer={handleClosePopupForLayer}
            />
          </div>
        </div>

        {/* Thin Vertical Icon Bar - Only visible when collapsed */}
        {isPanelCollapsed && (
          <div className="w-12 bg-white border-r border-gray-200 flex flex-col items-center py-4 space-y-6 flex-shrink-0">
            {/* Data Layers Icon */}
            <button
              onClick={togglePanelCollapse}
              className="flex flex-col items-center space-y-1 p-2 rounded-md hover:bg-gray-200 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 group"
            >
              <Layers className="h-5 w-5 text-gray-600 group-hover:text-gray-800 transition-colors duration-200" />
              <span className="text-xs text-gray-500 font-medium group-hover:text-gray-700 transition-colors duration-200">Layers</span>
            </button>
            
            {/* Filters Icon */}
            <button
              onClick={togglePanelCollapse}
              className="flex flex-col items-center space-y-1 p-2 rounded-md hover:bg-gray-200 transition-all duration-200 ease-in-out hover:scale-105 active:scale-95 group"
            >
              <Filter className="h-5 w-5 text-gray-600 group-hover:text-gray-800 transition-colors duration-200" />
              <span className="text-xs text-gray-500 font-medium group-hover:text-gray-700 transition-colors duration-200">Filters</span>
            </button>
          </div>
        )}
        
        {/* Toggle Button */}
        <button
          onClick={togglePanelCollapse}
          className="absolute top-1/2 transform -translate-y-1/2 z-20 bg-white border border-gray-300 rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-gray-50 hover:shadow-xl transition-all duration-300 ease-in-out"
          style={{ 
            left: isPanelCollapsed ? '8px' : '333px'
          }}
        >
          {isPanelCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          )}
        </button>
        
        {/* Container for the Map, taking remaining space and full height */}
        <div className="flex-1 h-full w-full relative overflow-hidden">
          {/* Pass fetched data and visibility state to the Map component */}
          <Map
            layerVisibility={layerVisibility}
            visibleCrops={visibleCrops} // Pass the visible crops state
            croplandOpacity={croplandOpacity} // Pass opacity state
          />
        </div>
      </main>
      
      {/* Footer removed to hide on map page */}
    </div>
  );
}
