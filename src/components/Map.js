'use client'; // Mark this component as a Client Component

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'; // Added useCallback
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css'; // Import Mapbox CSS
import * as turf from '@turf/turf'; // Import TurfJS
import SitingButton from './SitingButton';
import SitingAnalysis from './SitingAnalysis';
import SitingInventory from './SitingInventory'; // Import the new component
import { INFRASTRUCTURE_LAYERS } from '@/lib/constants';
import { TILESET_REGISTRY } from '@/lib/tileset-registry'; // Import centralized tileset registry
import { layerLabelMappings } from '@/lib/labelMappings';

// --- Configuration ---
// IMPORTANT: Replace with your actual Mapbox access token if using the placeholder.
// It's best practice to store this in an environment variable (e.g., .env.local)
// and access it via process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'YOUR_MAPBOX_ACCESS_TOKEN'; // Use provided placeholder
const MAPBOX_ACCESS_TOKEN_LEGACY = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN_LEGACY; // Legacy token for tylerhuntington222 tilesets

if (!MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === 'YOUR_MAPBOX_ACCESS_TOKEN') {
  console.warn(
    'Mapbox Access Token is not set. Please ensure NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is provided during build.'
  );
  // Consider adding a user-facing message here if the token is missing in production
}

// Set Mapbox access token globally (only if it's not the placeholder)
// Mapbox GL JS will automatically use the token from mapboxgl.accessToken if set.
// If it's the placeholder, the map initialization might fail silently or show errors in the console.
if (MAPBOX_ACCESS_TOKEN && MAPBOX_ACCESS_TOKEN !== 'YOUR_MAPBOX_ACCESS_TOKEN') {
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
}


// Accept props for data and visibility
const Map = ({ layerVisibility, visibleCrops, croplandOpacity }) => { // Added visibleCrops & croplandOpacity props
  
  // Define cleanupSitingElements at the very beginning to avoid temporal dead zone issues
  const cleanupSitingElements = useCallback(() => {
    console.log('cleanupSitingElements function called...');
    
    try {
      // Clean up existing marker
      if (currentMarker?.current) {
        console.log('Removing current marker...');
        try {
          currentMarker.current.remove();
        } catch (markerError) {
          console.warn('Error removing marker:', markerError);
        }
        currentMarker.current = null;
      } else {
        console.log('No marker to clean up');
      }
      
      // Clean up buffer layers and source
      if (map?.current) {
        try {
          const source = map.current.getSource('siting-buffer-source');
          if (source && source.setData) {
            try {
              console.log('Clearing siting-buffer-source data...');
              source.setData({ type: 'FeatureCollection', features: [] });
            } catch (e) {
              console.warn('Failed to clear siting-buffer-source data', e);
            }
          } else {
            console.log('No siting-buffer-source to clean up');
          }
          
          // Hide buffer layers
          if (map.current.getLayer('siting-buffer-fill')) {
            console.log('Hiding siting-buffer-fill layer...');
            try {
              map.current.setLayoutProperty('siting-buffer-fill', 'visibility', 'none');
            } catch (e) {
              console.warn('Failed to hide siting-buffer-fill layer:', e);
            }
          } else {
            console.log('No siting-buffer-fill layer to hide');
          }
          if (map.current.getLayer('siting-buffer-outline')) {
            console.log('Hiding siting-buffer-outline layer...');
            try {
              map.current.setLayoutProperty('siting-buffer-outline', 'visibility', 'none');
            } catch (e) {
              console.warn('Failed to hide siting-buffer-outline layer:', e);
            }
          } else {
            console.log('No siting-buffer-outline layer to hide');
          }

          // Also remove any legacy buffer layers/sources if they exist
          if (map.current.getLayer('buffer-fill')) {
            console.log('Removing legacy buffer-fill layer...');
            try {
              map.current.removeLayer('buffer-fill');
            } catch (e) {
              console.warn('Failed to remove legacy buffer-fill layer:', e);
            }
          }
          if (map.current.getLayer('buffer-outline')) {
            console.log('Removing legacy buffer-outline layer...');
            try {
              map.current.removeLayer('buffer-outline');
            } catch (e) {
              console.warn('Failed to remove legacy buffer-outline layer:', e);
            }
          }
          if (map.current.getSource('buffer')) {
            try { 
              console.log('Removing legacy buffer source...');
              map.current.removeSource('buffer'); 
            } catch (e) {
              console.warn('Failed to remove legacy buffer source:', e);
            }
          }
          
          // Additional cleanup: ensure all buffer-related layers are hidden
          const allLayers = map.current.getStyle()?.layers || [];
          let bufferLayersFound = 0;
          allLayers.forEach(layer => {
            if (layer.id && (layer.id.includes('buffer') || layer.id.includes('siting'))) {
              if (map.current.getLayer(layer.id)) {
                try {
                  console.log(`Hiding buffer-related layer: ${layer.id}`);
                  map.current.setLayoutProperty(layer.id, 'visibility', 'none');
                  bufferLayersFound++;
                } catch (e) {
                  console.warn(`Failed to hide layer ${layer.id}:`, e);
                }
              }
            }
          });
          console.log(`Found and hid ${bufferLayersFound} buffer-related layers`);
        } catch (mapError) {
          console.warn('Error during map cleanup:', mapError);
        }
      } else {
        console.log('Map not available for cleanup');
      }
      
      // Clear buffer reference
      if (currentBuffer?.current) {
        console.log('Clearing buffer reference');
        currentBuffer.current = null;
      } else {
        console.log('No buffer reference to clear');
      }
      
      // Reset all siting-related state
      setHasPlacedMarker(false);
      setShowInventoryPanel(false);
      setInventoryData([]);
      setTotalAcres(0);
      setMarkerLocation(null);
      
      console.log('Siting elements cleanup completed');

    } catch (error) {
      console.error('Error during cleanupSitingElements:', error);
      // Force reset state even if cleanup fails
      setHasPlacedMarker(false);
      setShowInventoryPanel(false);
      setInventoryData([]);
      setTotalAcres(0);
      setMarkerLocation(null);
    }
  }, []);
  const mapContainer = useRef(null); // Reference to the map container div
  const map = useRef(null); // Reference to the map instance
  const [mapLoaded, setMapLoaded] = useState(false); // State to track map load status
  const currentPopup = useRef(null); // Reference to track the current popup
  const [currentPopupLayer, setCurrentPopupLayer] = useState(null); // State to track the layer of the current popup
  
  // Siting analysis state
  const [sitingMode, setSitingMode] = useState(false);
  const [showSitingPanel, setShowSitingPanel] = useState(false);
  const [hasPlacedMarker, setHasPlacedMarker] = useState(false);
  const [radius, setRadius] = useState(10); // Initial radius in miles
  const [unit, setUnit] = useState('miles');
  const currentMarker = useRef(null);
  const currentBuffer = useRef(null);
  const sitingModeRef = useRef(false);
  
  // Keep sitingModeRef in sync with sitingMode state
  useEffect(() => {
    sitingModeRef.current = sitingMode;
  }, [sitingMode]);
  
  // Resource inventory state
  const [showInventoryPanel, setShowInventoryPanel] = useState(false);
  const [inventoryData, setInventoryData] = useState([]);
  const [totalAcres, setTotalAcres] = useState(0);
  const [markerLocation, setMarkerLocation] = useState(null);

  // Define crop color mapping
  const cropColorMapping = useMemo(() => ({
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
      "Pears": "#ADFF2F", "Pecans": "#D2691E", "Peppers": "#B22222", "Pistachios": "#93C572",
      "Plums": "#DDA0DD", "Pomegranates": "#E34234", "Potatoes": "#CD853F", "Prunes": "#702963",
      "Rice": "#FFFFE0", "Safflower": "#FFEC8B", "Strawberries": "#FF1493", "Sugar beets": "#D8BFD8",
      "Sunflowers": "#FFDB58", "Sweet Potatoes": "#D2B48C", "Tomatoes": "#FF6347",
      "Turf Farms": "#00FF7F", "Unclassified Fallow": "#696969", "Walnuts": "#A52A2A",
      "Wheat": "#F4A460", "Wild Rice": "#EEE8AA", "Young Perennials": "#C19A6B",
  }), []);

  // --- Helper Functions for Layer Interactivity ---

  const formatPhoneNumber = useCallback((phone) => {
    const phoneNumber = String(phone).replace(/[^\d]/g, '');
    if (phoneNumber.length === 10) {
      return `(${phoneNumber.substring(0, 3)}) ${phoneNumber.substring(3, 6)}-${phoneNumber.substring(6, 10)}`;
    }
    if (phoneNumber.length === 11 && phoneNumber.startsWith('1')) {
        return `+1 (${phoneNumber.substring(1, 4)}) ${phoneNumber.substring(4, 7)}-${phoneNumber.substring(7, 11)}`;
    }
    return phone; // Return original if not a 10 or 11 digit number
  }, []);

  const isURL = useCallback((str) => {
    if (typeof str !== 'string') return false;
    return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('www.');
  }, []);

  // Create and show a popup for a feature
  const createPopupForFeature = useCallback((feature, lngLat, popupTitle, layerId) => {
    if (!map.current) return;

    const properties = feature.properties;
    const labels = layerLabelMappings[layerId] || {};
    let content = '';

    const formatAndBuildLine = (key, value) => {
      if (value === null || value === undefined || value === 0 || String(value).trim() === '') return '';

      let label = labels[key] || key.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
      let formattedValue = value;
      let units = '';

      // Special handling for labels with units in parentheses
      const unitMatch = label.match(/\(([^)]+)\)/);
      if (unitMatch && !key.toLowerCase().startsWith('pomace (')) {
        units = unitMatch[1];
        label = label.replace(unitMatch[0], '').trim();
      }

      if (isURL(formattedValue)) {
        const url = formattedValue.startsWith('http') ? formattedValue : `https://${formattedValue}`;
        formattedValue = `<a href="${url}" target="_blank" rel="noopener noreferrer">${formattedValue}</a>`;
      } else if (label.toLowerCase().includes('phone')) {
        formattedValue = formatPhoneNumber(formattedValue);
      } else if (typeof formattedValue === 'number' || (typeof formattedValue === 'string' && !isNaN(Number(formattedValue)) && formattedValue.trim() !== '')) {
        const num = Number(formattedValue);
        formattedValue = num.toLocaleString();
      }
      
      if (units) {
        formattedValue += ` ${units}`;
      } else if (layerId === 'tomato-processors') {
        const tonsPerYearFields = ['pomace', 'vines', 'culls', 'sludge', 'residue', 'peel', 'seed', 'mold', 'green'];
        if (tonsPerYearFields.some(field => key.toLowerCase().includes(field))) {
          formattedValue += ' tonnes/year';
        }
      }

      return `<div style="margin-bottom: 3px; text-align: left;"><strong style="font-weight: bold;">${label}:</strong> ${formattedValue}</div>`;
    };

    if (layerId === 'tomato-processors') {
      const displayOrder = [
        'Address',
        'City',
        'County',
        'Green',
        'Mold',
        'Peels only',
        'Pomace',
        'Pomace (peels)',
        'Pomace (seeds)',
        'Processing capacity for tomato paste (tons/hr)',
        'Processing capacity of peeled/chopped (tons/hr)',
        'Seeds',
        'Vines'
      ];
      
      // Manually build the content in the desired order
      let nameContent = '';
      if (properties.Name) {
        // Use a generic key 'Name' for formatting, as it's not in the displayOrder
        nameContent = formatAndBuildLine('Name', properties.Name);
      }

      let latLongContent = '';
      if (properties['Lat/Long Info']) {
        const [lat, long] = properties['Lat/Long Info'].split(',').map(coord => parseFloat(coord).toFixed(6));
        latLongContent = `
          <div style="margin-bottom: 3px; text-align: left;"><strong style="font-weight: bold;">Latitude:</strong> ${lat}</div>
          <div style="margin-bottom: 3px; text-align: left;"><strong style="font-weight: bold;">Longitude:</strong> ${long}</div>
        `;
      }
      
      let otherContent = '';
      displayOrder.forEach(key => {
        if (properties.hasOwnProperty(key)) {
          otherContent += formatAndBuildLine(key, properties[key]);
        }
      });
      
      content = nameContent + latLongContent + otherContent;

    } else {
      // Fallback for other layers, preserving original behavior
      for (const key in properties) {
        const excludedKeys = ['id', 'layer', 'source', 'source-layer', 'tile-id', 'Lat/Long Info'];
        const nullValues = ['NA', 'N/A', 'null', '', ' '];

        if (Object.prototype.hasOwnProperty.call(properties, key) && !excludedKeys.includes(key) && !nullValues.includes(String(properties[key]).trim())) {
          content += formatAndBuildLine(key, properties[key]);
        }
      }
    }

    if (!content) {
      content = '<div>No additional information available.</div>';
    }

    const popupHTML = `
      <div style="padding: 5px 15px 5px 5px; font-size: 0.9em;">
        <h4 style="font-size: 1.1em; font-weight: bold; margin: 0 0 8px 0; padding: 0; text-align: left;">${popupTitle}</h4>
        ${content}
      </div>
    `;

    if (currentPopup.current) {
      currentPopup.current.remove();
    }

    currentPopup.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '350px',
      className: 'facility-popup'
    })
      .setLngLat(lngLat)
      .setHTML(popupHTML)
      .addTo(map.current);

    currentPopup.current.on('close', () => {
      currentPopup.current = null;
      setCurrentPopupLayer(null);
    });

    setCurrentPopupLayer(layerId);
  }, [formatPhoneNumber, isURL]);


  // Add interactivity (click and hover) to a layer
  const addLayerInteractivity = useCallback((layerId, popupTitle) => {
    if (!map.current) return;

    map.current.on('click', layerId, (e) => {
      if (sitingModeRef.current) {
        e.originalEvent.stopPropagation();
        return;
      }

      if (e.features && e.features.length > 0) {
        const layerIdWithoutSuffix = layerId.replace(/-layer$/, '');
        createPopupForFeature(e.features[0], e.lngLat, popupTitle, layerIdWithoutSuffix);
      }
    });

    map.current.on('mouseenter', layerId, () => {
      if (!sitingModeRef.current) {
        map.current.getCanvas().style.cursor = 'pointer';
      }
    });

    map.current.on('mouseleave', layerId, () => {
      map.current.getCanvas().style.cursor = '';
    });
  }, [createPopupForFeature]);

  // Function to convert radius to meters based on the selected unit
  const convertToMeters = useCallback((value, unit) => {
    return unit === 'miles' ? value * 1609.34 : value * 1000;
  }, []);

  // Function to analyze resources within the buffer
  const analyzeResourcesInBuffer = useCallback((buffer) => {
    if (!map.current || !mapLoaded) {
      console.log("Map not ready for analysis");
      return;
    }

    // Check if the feedstock layer exists and is ready
    if (!map.current.getLayer('feedstock-vector-layer')) {
      console.log("Feedstock layer not available for analysis - layer not found");
      return;
    }

    // Check if the feedstock source exists and is ready
    const feedstockSource = map.current.getSource('feedstock-vector-source');
    if (!feedstockSource) {
      console.log("Feedstock source not available for analysis - source not found");
      return;
    }

    // Check if the source is loaded
    if (feedstockSource.loaded && !feedstockSource.loaded()) {
      console.log("Feedstock source not fully loaded yet");
      return;
    }

    console.log("Analyzing resources within buffer...");

    try {
      // Validate buffer geometry first
      if (!buffer || !buffer.geometry || !buffer.geometry.coordinates) {
        console.error("Invalid buffer geometry for analysis");
        return;
      }

      // Get all source features from the feedstock layer
      const features = map.current.queryRenderedFeatures(undefined, {
        layers: ['feedstock-vector-layer']
      });
      
      console.log(`Found ${features.length} total features to analyze`);
      
      // Process features to find those within the buffer
      const cropInventory = {};
      let bufferTotalAcres = 0;
      let featuresAnalyzed = 0;
      let featuresWithErrors = 0;

      // Use bounding box for initial filtering
      let bufferBbox;
      try {
        bufferBbox = turf.bbox(buffer);
      } catch {
        console.error("Error calculating buffer bounding box:");
        return;
      }
      
      features.forEach(feature => {
        try {
          // Skip features without geometry
          if (!feature.geometry || !feature.geometry.coordinates || 
              feature.geometry.coordinates.length === 0) {
            return;
          }
          
          featuresAnalyzed++;
          
          // Get properties
          const props = feature.properties;
          const cropName = props.main_crop_name || 'Unknown';
          const acres = parseFloat(props.acres) || 0;
          
          // Create a polygon from the feature
          let featureGeom;
          try {
            // Handle different geometry types
            if (feature.geometry.type === 'MultiPolygon') {
              // For MultiPolygon, get the first polygon
              if (feature.geometry.coordinates[0] && feature.geometry.coordinates[0].length > 0) {
                featureGeom = turf.polygon(feature.geometry.coordinates[0]);
              } else {
                console.log(`Skipping invalid MultiPolygon feature`);
                return;
              }
            } else if (feature.geometry.type === 'Polygon') {
              if (feature.geometry.coordinates.length > 0) {
                featureGeom = turf.polygon(feature.geometry.coordinates);
              } else {
                console.log(`Skipping invalid Polygon feature`);
                return;
              }
            } else {
              console.log(`Skipping feature with geometry type: ${feature.geometry.type}`);
              return;
            }

            // Validate the created geometry
            if (!featureGeom || !featureGeom.geometry || !featureGeom.geometry.coordinates) {
              console.log(`Skipping feature with invalid geometry after creation`);
              return;
            }
          } catch (geomError) {
            console.error("Error creating feature geometry:", geomError);
            featuresWithErrors++;
            return;
          }
          
          // Check if the feature intersects with the buffer
          try {
            // First use a quick bounding box check
            let featureBbox;
            try {
              featureBbox = turf.bbox(featureGeom);
            } catch {
              console.log(`Skipping feature with invalid bounding box`);
              return;
            }
            
            // Check if bboxes overlap
            if (bufferBbox[0] > featureBbox[2] || bufferBbox[2] < featureBbox[0] || 
                bufferBbox[1] > featureBbox[3] || bufferBbox[3] < featureBbox[1]) {
              return; // Bounding boxes don't overlap
            }
            
            // For features that pass the bbox test, check if they're within or intersect the buffer
            let isOverlapping = false;
            let isWithin = false;
            
            try {
              isOverlapping = turf.booleanOverlap(featureGeom, buffer);
              isWithin = turf.booleanWithin(featureGeom, buffer);
            } catch (booleanError) {
              console.log(`Boolean operation failed for feature, skipping:`, booleanError);
              return;
            }
            
            if (isOverlapping || isWithin) {
              
              let intersectionArea = acres;
              
              // If it's not fully within, calculate the intersection area
              if (!isWithin) {
                try {
                  const intersection = turf.intersect(featureGeom, buffer);
                  if (intersection && intersection.geometry && intersection.geometry.coordinates) {
                    // Validate intersection geometry before calculating area
                    try {
                      // Get area in acres (convert from m² to acres)
                      const areaInSquareMeters = turf.area(intersection);
                      if (isFinite(areaInSquareMeters) && areaInSquareMeters > 0) {
                        intersectionArea = areaInSquareMeters * 0.000247105;
                      } else {
                        console.log(`Invalid intersection area calculated, using feature area`);
                        intersectionArea = acres;
                      }
                    } catch (areaError) {
                      console.log(`Error calculating intersection area, using feature area:`, areaError);
                      intersectionArea = acres;
                    }
                  } else {
                    console.log(`No valid intersection geometry, using feature area`);
                    intersectionArea = acres;
                  }
                } catch (intersectError) {
                  console.log(`Error calculating intersection, using feature area:`, intersectError);
                  intersectionArea = acres;
                }
              }
              
              // Validate the calculated area
              if (!isFinite(intersectionArea) || intersectionArea < 0) {
                console.log(`Invalid intersection area calculated, skipping feature`);
                return;
              }
              
              // Add to the inventory
              if (!cropInventory[cropName]) {
                cropInventory[cropName] = 0;
              }
              cropInventory[cropName] += intersectionArea;
              bufferTotalAcres += intersectionArea;
              
              console.log(`Added ${intersectionArea.toFixed(2)} acres of ${cropName}`);
            }
          } catch (error) {
            console.error("Error analyzing feature intersection:", error);
            featuresWithErrors++;
          }
        } catch (error) {
          console.error("Error processing feature:", error);
          featuresWithErrors++;
        }
      });
      
      console.log(`Successfully analyzed ${featuresAnalyzed} features, ${featuresWithErrors} had errors`);
      
      // Convert the inventory object to an array for the component
      const inventoryArray = Object.keys(cropInventory).map(cropName => ({
        name: cropName,
        acres: cropInventory[cropName],
        color: cropColorMapping[cropName] || '#808080' // Use default gray if no color found
      }));
      
      console.log("Resource inventory:", inventoryArray);
      console.log("Total acres in buffer:", bufferTotalAcres);
      
      // Update the state to show the inventory
      setInventoryData(inventoryArray);
      setTotalAcres(bufferTotalAcres);
      setShowInventoryPanel(true);
      
    } catch (error) {
      console.error("Error in resource analysis:", error);
      // Set empty inventory on error
      setInventoryData([]);
      setTotalAcres(0);
      setShowInventoryPanel(false);
    }
  }, [cropColorMapping, setInventoryData, setTotalAcres, setShowInventoryPanel, mapLoaded]);

  // Function to create a buffer around a point
  const createBuffer = useCallback((lngLat, radius, unit) => {
    if (!map.current || !mapLoaded) {
      console.error("Cannot create buffer - map not ready");
      return;
    }

    // Don't create buffer if no marker is placed
    if (!currentMarker.current) {
      console.warn('Cannot create buffer - no marker placed');
      return;
    }

    const source = map.current.getSource('siting-buffer-source');
    if (!source) {
      console.warn('siting-buffer-source not ready yet');
      return;
    }

    // Check if the source is properly initialized
    if (typeof source.setData !== 'function') {
      console.warn('siting-buffer-source setData method not available');
      return;
    }

    try {
      const radiusInMeters = convertToMeters(radius, unit);
      
      // Validate radius
      if (!isFinite(radiusInMeters) || radiusInMeters <= 0) {
        console.error("Invalid radius for buffer creation:", radiusInMeters);
        return;
      }
      
      // Validate coordinates
      if (!lngLat || !isFinite(lngLat.lng) || !isFinite(lngLat.lat)) {
        console.error("Invalid coordinates for buffer creation:", lngLat);
        return;
      }
      
      const point = turf.point([lngLat.lng, lngLat.lat]);
      
      // Validate point geometry
      if (!point || !point.geometry || !point.geometry.coordinates) {
        console.error("Failed to create valid point geometry");
        return;
      }
      
      const buffered = turf.buffer(point, radiusInMeters, { units: 'meters' });
      
      // Validate buffer geometry
      if (!buffered || !buffered.geometry || !buffered.geometry.coordinates) {
        console.error("Failed to create valid buffer geometry");
        return;
      }
      
      // Check if buffer has valid coordinates
      if (!Array.isArray(buffered.geometry.coordinates) || buffered.geometry.coordinates.length === 0) {
        console.error("Buffer geometry has no valid coordinates");
        return;
      }
      
      currentBuffer.current = buffered;

      // Wrap in FeatureCollection for consistency
      const featureCollection = {
        type: 'FeatureCollection',
        features: [buffered]
      };

      // Update source data
      source.setData(featureCollection);

      // Ensure layers are visible only if we have a marker
      if (currentMarker.current) {
        map.current.setLayoutProperty('siting-buffer-fill', 'visibility', 'visible');
        map.current.setLayoutProperty('siting-buffer-outline', 'visibility', 'visible');
      } else {
        // If no marker, hide the buffer layers
        map.current.setLayoutProperty('siting-buffer-fill', 'visibility', 'none');
        map.current.setLayoutProperty('siting-buffer-outline', 'visibility', 'none');
      }

      // Run analysis only if we have a marker and valid buffer
      if (currentMarker.current) {
        console.log("Buffer created successfully, running resource analysis...");
        // Add a small delay to ensure the map is fully ready before analysis
        setTimeout(() => {
          analyzeResourcesInBuffer(buffered);
        }, 100);
      }
      
    } catch (error) {
      console.error("Error creating buffer:", error);
      // Hide buffer layers on error
      if (map.current) {
        try {
          map.current.setLayoutProperty('siting-buffer-fill', 'visibility', 'none');
          map.current.setLayoutProperty('siting-buffer-outline', 'visibility', 'none');
        } catch (layoutError) {
          console.warn("Failed to hide buffer layers:", layoutError);
        }
      }
    }
  }, [mapLoaded, convertToMeters, analyzeResourcesInBuffer]);
  
  // Effect to handle cursor and hover marker for siting mode
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    
    if (sitingMode && !hasPlacedMarker) {
      // Active placement substate: show crosshair and hover marker
      map.current.getCanvas().style.cursor = 'crosshair';
      
      // Create a temporary hover marker element
      const hoverMarkerEl = document.createElement('div');
      hoverMarkerEl.className = 'hover-marker';
      hoverMarkerEl.style.width = '24px';
      hoverMarkerEl.style.height = '36px';
      hoverMarkerEl.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 36\' width=\'24\' height=\'36\'%3E%3Cpath d=\'M12 0C5.37 0 0 5.37 0 12c0 6.63 12 24 12 24s12-17.37 12-24C24 5.37 18.63 0 12 0zm0 16.5c-2.48 0-4.5-2.02-4.5-4.5s2.02-4.5 4.5-4.5 4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5z\' fill=\'%23ff3b30\'/%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'4.5\' fill=\'white\'/%3E%3C/svg%3E")';
      hoverMarkerEl.style.backgroundSize = '24px 36px';
      hoverMarkerEl.style.backgroundRepeat = 'no-repeat';
      hoverMarkerEl.style.backgroundPosition = 'center';
      hoverMarkerEl.style.transform = 'translate(-50%, -100%)';
      hoverMarkerEl.style.pointerEvents = 'none'; // Make sure it doesn't interfere with map events
      hoverMarkerEl.style.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))';
      hoverMarkerEl.style.zIndex = '1000'; // Ensure it's above other elements

      // Create the hover marker and add it to the map
      const hoverMarker = new mapboxgl.Marker({
        element: hoverMarkerEl,
        anchor: 'bottom',
        draggable: false,
        offset: [0, 0]
      }).setLngLat([0, 0]).addTo(map.current);
      
      // Update hover marker position as mouse moves
      const onMouseMove = (e) => {
        if (e && e.lngLat) {
          hoverMarker.setLngLat(e.lngLat);
        }
      };
      
      // Add mousemove listener to update marker position
      map.current.on('mousemove', onMouseMove);
      
      // Shadow effect to enhance visibility
      const shadowStyle = document.createElement('style');
      shadowStyle.textContent = `
        .hover-marker {
          filter: drop-shadow(0 5px 3px rgba(0, 0, 0, 0.4));
          opacity: 0.85;
          transition: transform 0.1s ease-out;
          z-index: 1000;
          pointer-events: none;
        }
        .hover-marker:hover {
          transform: translate(-50%, -105%) scale(1.1);
        }
        .custom-marker {
          filter: drop-shadow(0 5px 3px rgba(0, 0, 0, 0.4));
          z-index: 1000;
        }
      `;
      document.head.appendChild(shadowStyle);
      
      // Position the marker at the center of the map initially
      const initialLngLat = map.current.getCenter();
      if (initialLngLat) {
        hoverMarker.setLngLat(initialLngLat);
      }
      
      return () => {
        // Only clean up the hover marker and cursor, don't touch the placed marker or buffer
        if (map.current) {
          map.current.off('mousemove', onMouseMove);
          map.current.getCanvas().style.cursor = '';
        }
        hoverMarker.remove();
        if (document.head.contains(shadowStyle)) {
          document.head.removeChild(shadowStyle);
        }
      };
    } else if (sitingMode && hasPlacedMarker) {
      // Review substate: hide crosshair/hover marker, keep siting panel open
      map.current.getCanvas().style.cursor = '';
      return () => {};
    } else {
      // Not in siting mode
      map.current.getCanvas().style.cursor = '';
      return () => {};
    }
  }, [mapLoaded, sitingMode, hasPlacedMarker]);

  // Handle map click for siting analysis
  const handleMapClick = useCallback((e) => {
    if (!sitingMode || hasPlacedMarker) return;

    // Close any existing popup when in siting mode
    if (currentPopup.current) {
      currentPopup.current.remove();
      currentPopup.current = null;
    }

    const { lngLat } = e;
    
    // Validate coordinates
    if (!lngLat || !isFinite(lngLat.lng) || !isFinite(lngLat.lat)) {
      console.error("Invalid coordinates received from map click:", lngLat);
      return;
    }
    
    // Validate coordinate ranges (rough sanity check)
    if (lngLat.lng < -180 || lngLat.lng > 180 || lngLat.lat < -90 || lngLat.lat > 90) {
      console.error("Coordinates out of valid range:", lngLat);
      return;
    }

    // Remove existing marker if any
    if (currentMarker.current) {
      currentMarker.current.remove();
      currentMarker.current = null;
    }

    // Create a new marker (no animation)
    const markerElement = document.createElement('div');
    markerElement.className = 'custom-marker';
    markerElement.style.width = '24px';
    markerElement.style.height = '36px';
    markerElement.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 36\' width=\'24\' height=\'36\'%3E%3Cpath d=\'M12 0C5.37 0 0 5.37 0 12c0 6.63 12 24 12 24s12-17.37 12-24C24 5.37 18.63 0 12 0zm0 16.5c-2.48 0-4.5-2.02-4.5-4.5s2.02-4.5 4.5-4.5 4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5z\' fill=\'%23ff3b30\'/%3E%3Ccircle cx=\'12\' cy=\'12\' r=\'4.5\' fill=\'white\'/%3E%3C/svg%3E")';
    markerElement.style.backgroundSize = '24px 36px';
    markerElement.style.backgroundRepeat = 'no-repeat';
    markerElement.style.backgroundPosition = 'center';
    markerElement.style.filter = 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))';
    markerElement.style.zIndex = '5'; // Ensure it's below the UI cards (which have z-index: 10)
    markerElement.style.pointerEvents = 'auto'; // Allow interaction with the marker

    try {
      // Add the marker to the map immediately
      const marker = new mapboxgl.Marker({
        element: markerElement,
        anchor: 'bottom',
        offset: [0, 0]
      })
        .setLngLat(lngLat)
        .addTo(map.current);

      currentMarker.current = marker;

      // Store the marker location
      setMarkerLocation(lngLat);

      // Create/update buffer around the marker
      createBuffer(lngLat, radius, unit);

      // Enter review sub-state: marker placed, keep sitingMode true but stop hover/crosshair via hasPlacedMarker
      setHasPlacedMarker(true);
      
      console.log("Marker placed successfully at:", lngLat);
      
    } catch (error) {
      console.error("Error placing marker:", error);
      // Clean up on error
      if (currentMarker.current) {
        currentMarker.current.remove();
        currentMarker.current = null;
      }
    }
  }, [sitingMode, hasPlacedMarker, radius, unit, createBuffer]);

  // Effect to add and manage map click handler
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    
    // Clean up previous click handler if any
    if (map.current._sitingClickHandler) {
      map.current.off('click', map.current._sitingClickHandler);
    }
    
    // Define the click handler function
    const clickHandler = (e) => {
      // When in siting mode (both placement and review states)
      // we want to prevent default map behavior
      if (sitingMode) {
        // Stop event propagation to prevent other handlers from firing
        e.originalEvent.stopPropagation();
        
        // Only handle the click for marker placement if we're in placement mode
        if (!hasPlacedMarker) {
          handleMapClick(e);
        }
      }
    };
    
    // Store reference to the handler for cleanup
    map.current._sitingClickHandler = clickHandler;
    
    // Add the click handler
    map.current.on('click', clickHandler);
    
    console.log(`Siting mode is now ${sitingMode ? 'enabled' : 'disabled'}`);
    
    return () => {
      // Remove the click handler on cleanup
      if (map.current && map.current._sitingClickHandler) {
        map.current.off('click', map.current._sitingClickHandler);
      }
    };
  }, [mapLoaded, sitingMode, hasPlacedMarker, handleMapClick]);




  // Function to close siting mode and clean up everything
  const closeSitingMode = useCallback(() => {
    console.log('closeSitingMode function called - starting cleanup...');
    
    // Use setTimeout to prevent the map from refreshing
    setTimeout(() => {
      // First, reset the UI state
      setSitingMode(false);
      setShowSitingPanel(false);
      setShowInventoryPanel(false);
      
      // Clear the data
      setInventoryData([]);
      setTotalAcres(0);
      setMarkerLocation(null);
      
      // Then clean up the map elements
      setTimeout(() => {
        console.log('Executing cleanupSitingElements...');
        cleanupSitingElements();
      }, 50);
      
      console.log('Siting mode closed successfully');
    }, 0);
  }, [cleanupSitingElements]);

  // Toggle siting analysis mode
  const toggleSitingMode = () => {
    if (sitingMode) {
      // Exit siting completely - clean up marker and buffer
      console.log('Exiting siting mode - cleaning up elements...');
      
      // First, ensure we reset the state
      setSitingMode(false);
      setShowSitingPanel(false);
      
      // Use helper function to clean up all siting elements
      cleanupSitingElements();
      
      console.log('Siting mode exited successfully');
    } else {
      // Enter siting placement substate without refreshing the map
      console.log('Entering siting mode...');
      
      // Close any existing popups before entering siting mode
      if (currentPopup.current) {
        currentPopup.current.remove();
        currentPopup.current = null;
        console.log('Closed existing popup when entering siting mode');
      }
      
      // Update state in a specific order to prevent map refresh
      // First show panel, then set mode
      setShowSitingPanel(true);
      setHasPlacedMarker(false);
      
      // Use requestAnimationFrame to delay setting siting mode until after render
      requestAnimationFrame(() => {
        setSitingMode(true);
        console.log('Siting mode entered successfully');
      });
    }
  };
  
  // Function to remove current site and reactivate siting mode
  const removeSiteAndReactivate = () => {
    console.log('Removing current site and reactivating siting mode...');
    
    // Clean up elements first
    cleanupSitingElements();
    
    // Use requestAnimationFrame to delay setting siting mode until after render
    requestAnimationFrame(() => {
      // Enable siting mode (placement substate)
      setSitingMode(true);
    });
  };





  // Effect for initializing the map
  useEffect(() => {
    // Prevent map re-initialization if already initialized or token is missing/placeholder
    if (map.current || !MAPBOX_ACCESS_TOKEN || MAPBOX_ACCESS_TOKEN === 'YOUR_MAPBOX_ACCESS_TOKEN') return;

    console.log("Initializing map...");
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current, // Container element ID or HTML element
        style: 'mapbox://styles/mapbox/streets-v11', // Map style URL
        center: [-121.0, 37.5], // Initial center coordinates [lng, lat]
        zoom: 7, // Initial zoom level
        accessToken: MAPBOX_ACCESS_TOKEN === 'YOUR_MAPBOX_ACCESS_TOKEN' ? undefined : MAPBOX_ACCESS_TOKEN, // Pass token only if valid
        preserveDrawingBuffer: true, // Prevent refresh on state changes
        renderWorldCopies: true, // Improve performance
        // Transform requests to support multiple Mapbox accounts
        transformRequest: (url, resourceType) => {
          // Check if this is a request for a legacy tileset (tylerhuntington222)
          // and if we have a legacy token configured
          if (MAPBOX_ACCESS_TOKEN_LEGACY && url.includes('tylerhuntington222')) {
            // Replace the access token in the URL with the legacy one
            if (url.includes('access_token=')) {
              return {
                url: url.replace(/access_token=[^&]+/, `access_token=${MAPBOX_ACCESS_TOKEN_LEGACY}`)
              };
            } else {
              // If no token exists yet, append the legacy one
              const separator = url.includes('?') ? '&' : '?';
              return {
                url: `${url}${separator}access_token=${MAPBOX_ACCESS_TOKEN_LEGACY}`
              };
            }
          }
          
          // For all other requests, use the default behavior (primary token)
          return null;
        }
      });

      // Add zoom and rotation controls to the map.
      map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      
      // Expose map instance globally for direct access by other components
      window.mapboxMap = map.current;

      map.current.on('load', () => {
        console.log("Map loaded successfully");
        setMapLoaded(true); // Set map loaded state to true
        
        // Add a debug function to inspect the SAF/RD data when it's loaded
        map.current.on('sourcedata', function(e) {
          if (e.sourceId === 'cement-plants-source' && e.isSourceLoaded) {
            try {
              console.log("Cement plants source data loaded, inspecting features...");
              
              // Get the style and check the source layers
              const style = map.current.getStyle();
              if (style && style.sources && style.sources['cement-plants-source']) {
                console.log("Cement plants source exists in style:", style.sources['cement-plants-source']);
                
                // Check if we can get the vector layers info
                if (style.sources['cement-plants-source'].vectorLayers) {
                  console.log("Vector layers in cement plants source:", style.sources['cement-plants-source'].vectorLayers);
                } else {
                  console.log("No vectorLayers property in cement plants source");
                }
              }
              
              // Try to get features from the source
              const features = map.current.querySourceFeatures('cement-plants-source', {
                sourceLayer: 'cement_facility_location-aiusqe'
              });
              
              console.log(`Found ${features.length} features in the cement plants tileset`);
              
              if (features.length > 0) {
                // Log the properties of the first few features
                console.log('Sample cement plant feature properties:', features[0].properties);
                
                // Remove this event handler after it runs once
                map.current.off('sourcedata');
              } else {
                // Try alternative layer names
                                  console.log("Trying alternative layer names for cement plants...");
                  
                  // Try with just 'cement_facility_location'
                  const featuresAlt1 = map.current.querySourceFeatures('cement-plants-source', {
                    sourceLayer: 'cement_facility_location'
                  });
                  console.log(`Found ${featuresAlt1.length} features with layer name 'cement_facility_location'`);
                  
                  // Try with just 'cement'
                  const featuresAlt2 = map.current.querySourceFeatures('cement-plants-source', {
                    sourceLayer: 'cement'
                  });
                  console.log(`Found ${featuresAlt2.length} features with layer name 'cement'`);
                  
                  // Try with full tileset ID
                  const featuresAlt3 = map.current.querySourceFeatures('cement-plants-source', {
                    sourceLayer: '4ffuy21y'
                  });
                  console.log(`Found ${featuresAlt3.length} features with layer name '4ffuy21y'`);
              }
              
              // Don't remove this handler yet so we can see multiple load events
              // map.current.off('sourcedata');
            } catch (err) {
              console.error('Error examining cement plants source features:', err);
            }
          }
          else if (e.sourceId === 'mrf-source' && e.isSourceLoaded) {
            try {
              console.log("MRF source data loaded, inspecting features...");
              
              // Try to get features from the source
              const features = map.current.querySourceFeatures('mrf-source', {
                sourceLayer: 'us_mrf_pts-206gpg'
              });
              
              console.log(`Found ${features.length} features in the MRF tileset`);
              
              if (features.length > 0) {
                // Log the properties of the first few features
                console.log("Sample MRF feature properties:");
                for (let i = 0; i < Math.min(3, features.length); i++) {
                  console.log(`Feature ${i}:`, features[i].properties);
                }
                
                // Remove this event handler after it runs once
                map.current.off('sourcedata');
              }
            } catch (err) {
              console.error('Error examining MRF source features:', err);
            }
          }
          else if (e.sourceId === 'saf-plants-source' && e.isSourceLoaded) {
            try {
              console.log("SAF/RD source data loaded, inspecting features...");
              
              // Try to get features from the source
              const features = map.current.querySourceFeatures('saf-plants-source', {
                sourceLayer: 'renewable_diesel_saf_plants-79er6d'
              });
              
              console.log(`Found ${features.length} features in the SAF/RD tileset`);
              
              if (features.length > 0) {
                // Log the properties of the first few features
                console.log("Sample feature properties:");
                for (let i = 0; i < Math.min(3, features.length); i++) {
                  console.log(`Feature ${i}:`, features[i].properties);
                }
                
                // Count features with 'SAF' in products
                const safFeatures = features.filter(f => 
                  f.properties && 
                  f.properties.products && 
                  typeof f.properties.products === 'string' && 
                  f.properties.products.toUpperCase().includes('SAF')
                );
                console.log(`Found ${safFeatures.length} features with 'SAF' in products`);
                
                // Count features with 'RD' in products
                const rdFeatures = features.filter(f => 
                  f.properties && 
                  f.properties.products && 
                  typeof f.properties.products === 'string' && 
                  f.properties.products.toUpperCase().includes('RD')
                );
                console.log(`Found ${rdFeatures.length} features with 'RD' in products`);
                
                // Remove this event handler after it runs once
                map.current.off('sourcedata');
              }
            } catch (err) {
              console.error('Error examining source features:', err);
            }
          }
        });

        // Add new vector source for Feedstock data
        map.current.addSource('feedstock-vector-source', {
          type: 'vector',
          url: `mapbox://${TILESET_REGISTRY.feedstock.tilesetId}`
        });
        console.log("Added feedstock vector source:", TILESET_REGISTRY.feedstock.tilesetId);

        // Add new vector layer for Feedstock data
        map.current.addLayer({
          id: 'feedstock-vector-layer', // New unique layer ID
          type: 'fill', // Using 'fill' as per instructions, adjust if needed
          source: 'feedstock-vector-source', // Reference the new vector source
          'source-layer': TILESET_REGISTRY.feedstock.sourceLayer, // Use stable source layer name from registry
          // Initial filter: Only exclude 'U' code. Crop filtering is handled by useEffect.
          filter: ['!=', ['get', 'main_crop_code'], 'U'],
          paint: {
            'fill-color': [
                'match',
                ['get', 'main_crop_name'], // Style by main_crop_name
                // --- All Unique Crop Names from DB ---
                "Alfalfa & Alfalfa Mixtures", "#90EE90", // LightGreen
                "Almonds", "#8B4513", // SaddleBrown
                "Apples", "#FF0000", // Red
                "Apricots", "#FFA500", // Orange
                "Avocados", "#556B2F", // DarkOliveGreen
                "Beans (Dry)", "#F5DEB3", // Wheat (color)
                "Bush Berries", "#BA55D3", // MediumOrchid
                "Carrots", "#FF8C00", // DarkOrange
                "Cherries", "#DC143C", // Crimson
                "Citrus and Subtropical", "#FFD700", // Gold (Updated Key)
                "Cole Crops", "#2E8B57", // SeaGreen
                "Corn, Sorghum and Sudan", "#DAA520", // GoldenRod (Updated Key)
                "Cotton", "#FFFAF0", // FloralWhite
                "Dates", "#A0522D", // Sienna
                "Eucalyptus", "#778899", // LightSlateGray
                "Flowers, Nursery and Christmas Tree Farms", "#FF69B4", // HotPink
                "Grapes", "#800080", // Purple
                "Greenhouse", "#AFEEEE", // PaleTurquoise
                "Idle – Long Term", "#D3D3D3", // LightGray
                "Idle – Short Term", "#A9A9A9", // DarkGray
                "Induced high water table native pasture", "#ADD8E6", // LightBlue
                "Kiwis", "#9ACD32", // YellowGreen (Updated Key)
                "Lettuce/Leafy Greens", "#32CD32", // LimeGreen
                "Melons, Squash and Cucumbers", "#FFDAB9", // PeachPuff
                "Miscellaneous Deciduous", "#BDB76B", // DarkKhaki
                "Miscellaneous Field Crops", "#DEB887", // BurlyWood
                "Miscellaneous Grain and Hay", "#F5F5DC", // Beige
                "Miscellaneous Grasses", "#98FB98", // PaleGreen
                "Miscellaneous Subtropical Fruits", "#FF7F50", // Coral
                "Miscellaneous Truck Crops", "#66CDAA", // MediumAquaMarine
                "Mixed Pasture", "#006400", // DarkGreen
                "Native Pasture", "#228B22", // ForestGreen
                "Olives", "#808000", // Olive
                "Onions and Garlic", "#FFF8DC", // Cornsilk
                "Peaches/Nectarines", "#FFC0CB", // Pink
                "Pears", "#ADFF2F", // GreenYellow (Changed from LightGreen for distinctness)
                "Pecans", "#D2691E", // Chocolate
                "Peppers", "#B22222", // Firebrick
                "Pistachios", "#93C572", // Pistachio
                "Plums", "#DDA0DD", // Plum
                "Pomegranates", "#E34234", // Vermilion
                "Potatoes", "#CD853F", // Peru
                "Prunes", "#702963", // Byzantium
                "Rice", "#FFFFE0", // LightYellow
                "Safflower", "#FFEC8B", // LightGoldenrod
                "Strawberries", "#FF1493", // DeepPink
                "Sugar beets", "#D8BFD8", // Thistle
                "Sunflowers", "#FFDB58", // Mustard Yellow
                "Sweet Potatoes", "#D2B48C", // Tan
                "Tomatoes", "#FF6347", // Tomato
                "Turf Farms", "#00FF7F", // SpringGreen
                "Unclassified Fallow", "#696969", // DimGray
                "Walnuts", "#A52A2A", // Brown
                "Wheat", "#F4A460", // SandyBrown
                "Wild Rice", "#EEE8AA", // PaleGoldenrod
                "Young Perennials", "#C19A6B", // Fallow
                // --- Default ---
                "#808080" // Default Gray for unmatched crops (including None)
            ],
            'fill-opacity': 0.6
          }
        });

        // Persistent siting buffer source and layers
        if (!map.current.getSource('siting-buffer-source')) {
          map.current.addSource('siting-buffer-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          });

          map.current.addLayer({
            id: 'siting-buffer-fill',
            type: 'fill',
            source: 'siting-buffer-source',
            paint: {
              'fill-color': '#FFFF00',
              'fill-opacity': 0.2
            },
            layout: { visibility: 'none' }
          });

          map.current.addLayer({
            id: 'siting-buffer-outline',
            type: 'line',
            source: 'siting-buffer-source',
            paint: {
              'line-color': '#FFFF00',
              'line-width': 2,
              'line-opacity': 0.8
            },
            layout: { visibility: 'none' }
          });
        }

        // Add rail lines infrastructure layer
        const railLinesTilesetUrl = `mapbox://${TILESET_REGISTRY.railLines.tilesetId}`;
        console.log("Adding rail lines tileset with URL:", railLinesTilesetUrl);
        
        map.current.addSource('rail-lines-source', {
          type: 'vector',
          url: railLinesTilesetUrl
        });
        console.log("Added rail lines vector source");

        // Add rail lines layer with correct source layer
        try {
          map.current.addLayer({
            id: 'rail-lines-layer',
            type: 'line',
            source: 'rail-lines-source',
            'source-layer': TILESET_REGISTRY.railLines.sourceLayer,
            paint: {
              'line-color': '#008B8B', // Dark cyan color for rail lines
              'line-width': 2,
              'line-opacity': 0.8,
              'line-dasharray': [2, 2]
            },
            layout: {
              'visibility': layerVisibility?.railLines ? 'visible' : 'none',
              'line-join': 'round',
              'line-cap': 'round'
            }
          });
          console.log("Added rail lines layer with correct source layer 'us_rail_lines_ftot-80b406'");
        } catch (error) {
          console.error("Failed to add rail lines layer:", error);
        }

        // Add freight terminals transportation layer
        const freightTerminalsTilesetUrl = `mapbox://${TILESET_REGISTRY.freightTerminals.tilesetId}`;
        console.log("Adding freight terminals tileset with URL:", freightTerminalsTilesetUrl);
        
        map.current.addSource('freight-terminals-source', {
          type: 'vector',
          url: freightTerminalsTilesetUrl
        });
        console.log("Added freight terminals vector source");

        // Add freight terminals layer with correct source layer
        try {
          map.current.addLayer({
            id: 'freight-terminals-layer',
            type: 'circle',
            source: 'freight-terminals-source',
            'source-layer': TILESET_REGISTRY.freightTerminals.sourceLayer,
            paint: {
              'circle-color': '#4169E1', // Royal blue color for freight terminals
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.freightTerminals ? 'visible' : 'none'
            }
          });
          console.log("Added freight terminals layer with correct source layer 'us_freight_terminals-d7i106'");
        } catch (error) {
          console.error("Failed to add freight terminals layer:", error);
        }

        // Add freight routes transportation layer
        const freightRoutesTilesetUrl = `mapbox://${TILESET_REGISTRY.freightRoutes.tilesetId}`;
        console.log("Adding freight routes tileset with URL:", freightRoutesTilesetUrl);
        
        map.current.addSource('freight-routes-source', {
          type: 'vector',
          url: freightRoutesTilesetUrl
        });
        console.log("Added freight routes vector source");

        // Add freight routes layer with correct source layer
        try {
          map.current.addLayer({
            id: 'freight-routes-layer',
            type: 'line',
            source: 'freight-routes-source',
            'source-layer': TILESET_REGISTRY.freightRoutes.sourceLayer,
            paint: {
              'line-color': '#9932CC', // Dark orchid color for freight routes
              'line-width': 2,
              'line-opacity': 0.8
            },
            layout: {
              'visibility': layerVisibility?.freightRoutes ? 'visible' : 'none'
            }
          });
          console.log("Added freight routes layer with correct source layer 'us_freight_routes'");
        } catch (error) {
          console.error("Failed to add freight routes layer:", error);
        }

        // Add anaerobic digester infrastructure layer
        const anaerobicDigesterTilesetUrl = `mapbox://${TILESET_REGISTRY.anaerobicDigester.tilesetId}`;
        console.log("Adding anaerobic digester tileset with URL:", anaerobicDigesterTilesetUrl);
        
        map.current.addSource('anaerobic-digester-source', {
          type: 'vector',
          url: anaerobicDigesterTilesetUrl
        });
        console.log("Added anaerobic digester vector source");

        // Add anaerobic digester layer with correct source layer
        try {
          map.current.addLayer({
            id: 'anaerobic-digester-layer',
            type: 'circle',
            source: 'anaerobic-digester-source',
            'source-layer': TILESET_REGISTRY.anaerobicDigester.sourceLayer,
            paint: {
              'circle-color': '#8B4513', // Saddle brown color for anaerobic digesters
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.anaerobicDigester ? 'visible' : 'none'
            }
          });
          console.log("Added anaerobic digester layer with correct source layer 'agstar_ad_pts-12cpd6'");
        } catch (error) {
          console.error("Failed to add anaerobic digester layer:", error);
        }

        // Add biorefineries infrastructure layer
        const biorefineriesTilesetUrl = `mapbox://${TILESET_REGISTRY.biorefineries.tilesetId}`;
        console.log("Adding biorefineries tileset with URL:", biorefineriesTilesetUrl);
        
        map.current.addSource('biorefineries-source', {
          type: 'vector',
          url: biorefineriesTilesetUrl
        });
        console.log("Added biorefineries vector source");

        // Add biorefineries layer with correct source layer
        try {
          map.current.addLayer({
            id: 'biorefineries-layer',
            type: 'circle',
            source: 'biorefineries-source',
            'source-layer': TILESET_REGISTRY.biorefineries.sourceLayer,
            paint: {
              'circle-color': '#9370DB', // Medium purple color for biorefineries
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.biorefineries ? 'visible' : 'none'
            }
          });
          console.log("Added biorefineries layer with correct source layer 'current_biorefineries'");
        } catch (error) {
          console.error("Failed to add biorefineries layer:", error);
        }

        // Add cement plants infrastructure layer
        const cementPlantsTilesetUrl = `mapbox://${TILESET_REGISTRY.cementPlants.tilesetId}`;
        console.log("Adding cement plants tileset with URL:", cementPlantsTilesetUrl);
        
        map.current.addSource('cement-plants-source', {
          type: 'vector',
          url: cementPlantsTilesetUrl
        });
        console.log("Added cement plants vector source");
        
        // Add material recovery facilities infrastructure layer
        const mrfTilesetUrl = `mapbox://${TILESET_REGISTRY.mrf.tilesetId}`;
        console.log("Adding material recovery facilities tileset with URL:", mrfTilesetUrl);
        
        map.current.addSource('mrf-source', {
          type: 'vector',
          url: mrfTilesetUrl
        });
        console.log("Added material recovery facilities vector source");
        
        // Add sustainable aviation fuel plants infrastructure layer
        const safPlantsTilesetUrl = `mapbox://${TILESET_REGISTRY.safPlants.tilesetId}`;
        console.log("Adding sustainable aviation fuel plants tileset with URL:", safPlantsTilesetUrl);
        
        map.current.addSource('saf-plants-source', {
          type: 'vector',
          url: safPlantsTilesetUrl
        });
        console.log("Added sustainable aviation fuel plants vector source");
        
        // Add biodiesel plants infrastructure layer
        const biodieselPlantsTilesetUrl = `mapbox://${TILESET_REGISTRY.biodieselPlants.tilesetId}`;
        console.log("Adding biodiesel plants tileset with URL:", biodieselPlantsTilesetUrl);
        
        map.current.addSource('biodiesel-plants-source', {
          type: 'vector',
          url: biodieselPlantsTilesetUrl
        });
        console.log("Added biodiesel plants vector source");
        
        // Add landfills with LFG projects infrastructure layer
        const landfillLfgTilesetUrl = `mapbox://${TILESET_REGISTRY.landfillLfg.tilesetId}`;
        console.log("Adding landfills with LFG projects tileset with URL:", landfillLfgTilesetUrl);
        
        map.current.addSource('landfill-lfg-source', {
          type: 'vector',
          url: landfillLfgTilesetUrl
        });
        console.log("Added landfills with LFG projects vector source");
        
        // Add wastewater treatment plants infrastructure layer
        const wastewaterTreatmentTilesetUrl = `mapbox://${TILESET_REGISTRY.wastewaterTreatment.tilesetId}`;
        console.log("Adding wastewater treatment plants tileset with URL:", wastewaterTreatmentTilesetUrl);
        
        map.current.addSource('wastewater-treatment-source', {
          type: 'vector',
          url: wastewaterTreatmentTilesetUrl
        });
        console.log("Added wastewater treatment plants vector source");
        
        // Add waste to energy plants infrastructure layer
        const wasteToEnergyTilesetUrl = `mapbox://${TILESET_REGISTRY.wasteToEnergy.tilesetId}`;
        console.log("Adding waste to energy plants tileset with URL:", wasteToEnergyTilesetUrl);
        
        map.current.addSource('waste-to-energy-source', {
          type: 'vector',
          url: wasteToEnergyTilesetUrl
        });
        console.log("Added waste to energy plants vector source");
        
        // Add combustion plants infrastructure layer
        const combustionPlantsTilesetUrl = `mapbox://${TILESET_REGISTRY.combustionPlants.tilesetId}`;
        console.log("Adding combustion plants tileset with URL:", combustionPlantsTilesetUrl);
        
        map.current.addSource('combustion-plants-source', {
          type: 'vector',
          url: combustionPlantsTilesetUrl
        });
        console.log("Added combustion plants vector source");
        
        // Add petroleum pipelines infrastructure layer
        const petroleumPipelinesTilesetUrl = `mapbox://${TILESET_REGISTRY.petroleumPipelines.tilesetId}`;
        console.log("Adding petroleum pipelines tileset with URL:", petroleumPipelinesTilesetUrl);
        
        map.current.addSource('petroleum-pipelines-source', {
          type: 'vector',
          url: petroleumPipelinesTilesetUrl
        });
        console.log("Added petroleum pipelines vector source");
        
        // Add crude oil pipelines infrastructure layer
        const crudeOilPipelinesTilesetUrl = `mapbox://${TILESET_REGISTRY.crudeOilPipelines.tilesetId}`;
        console.log("Adding crude oil pipelines tileset with URL:", crudeOilPipelinesTilesetUrl);
        
        map.current.addSource('crude-oil-pipelines-source', {
          type: 'vector',
          url: crudeOilPipelinesTilesetUrl
        });
        console.log("Added crude oil pipelines vector source");
        
        // Add natural gas pipelines infrastructure layer
        const naturalGasPipelinesTilesetUrl = `mapbox://${TILESET_REGISTRY.naturalGasPipelines.tilesetId}`;
        console.log("Adding natural gas pipelines tileset with URL:", naturalGasPipelinesTilesetUrl);
        
        map.current.addSource('natural-gas-pipelines-source', {
          type: 'vector',
          url: naturalGasPipelinesTilesetUrl
        });
        console.log("Added natural gas pipelines vector source");

        // Add District Energy Systems infrastructure layer
        const districtEnergySystemsTilesetUrl = `mapbox://${TILESET_REGISTRY.districtEnergySystems.tilesetId}`;
        console.log("Adding District Energy Systems tileset with URL:", districtEnergySystemsTilesetUrl);
        
        map.current.addSource('district-energy-systems-source', {
          type: 'vector',
          url: districtEnergySystemsTilesetUrl
        });
        console.log("Added District Energy Systems vector source");

        // Add food processors infrastructure layer
        const foodProcessorsTilesetUrl = `mapbox://${TILESET_REGISTRY.foodProcessors.tilesetId}`;
        console.log("Adding food processors tileset with URL:", foodProcessorsTilesetUrl);
        
        map.current.addSource('food-processors-source', {
          type: 'vector',
          url: foodProcessorsTilesetUrl
        });
        console.log("Added food processors vector source");

        // Add tomato processors infrastructure layer
        const tomatoProcessorsTilesetUrl = `mapbox://${TILESET_REGISTRY.tomatoProcessors.tilesetId}`;
        console.log("Adding tomato processors tileset with URL:", tomatoProcessorsTilesetUrl);
        
        map.current.addSource('tomato-processors-source', {
          type: 'vector',
          url: tomatoProcessorsTilesetUrl
        });
        console.log("Added tomato processors vector source");

        // Add food retailers infrastructure layer
        const foodRetailersTilesetUrl = `mapbox://${TILESET_REGISTRY.foodRetailers.tilesetId}`;
        console.log("Adding food retailers tileset with URL:", foodRetailersTilesetUrl);
        
        map.current.addSource('food-retailers-source', {
          type: 'vector',
          url: foodRetailersTilesetUrl
        });
        console.log("Added food retailers vector source");

        // Add power plants infrastructure layer
        const powerPlantsTilesetUrl = `mapbox://${INFRASTRUCTURE_LAYERS.power_plants.tilesetId}`;
        console.log("Adding power plants tileset with URL:", powerPlantsTilesetUrl);
        
        map.current.addSource('power-plants-source', {
          type: 'vector',
          url: powerPlantsTilesetUrl
        });
        console.log("Added power plants vector source");

        // Add food banks infrastructure layer
        const foodBanksTilesetUrl = `mapbox://${INFRASTRUCTURE_LAYERS.food_banks.tilesetId}`;
        console.log("Adding food banks tileset with URL:", foodBanksTilesetUrl);
        
        map.current.addSource('food-banks-source', {
          type: 'vector',
          url: foodBanksTilesetUrl
        });
        console.log("Added food banks vector source");

        // Add farmers markets infrastructure layer
        const farmersMarketsTilesetUrl = `mapbox://${INFRASTRUCTURE_LAYERS.farmers_markets.tilesetId}`;
        console.log("Adding farmers markets tileset with URL:", farmersMarketsTilesetUrl);
        
        map.current.addSource('farmers-markets-source', {
          type: 'vector',
          url: farmersMarketsTilesetUrl
        });
        console.log("Added farmers markets vector source");

        // Add sustainable aviation fuel plants layer with correct source layer
        try {
          // First, add the layer without filtering to ensure it loads
          map.current.addLayer({
            id: 'saf-plants-layer',
            type: 'circle',
            source: 'saf-plants-source',
            'source-layer': TILESET_REGISTRY.safPlants.sourceLayer,
            paint: {
              'circle-color': '#1E90FF', // Dodger blue color for SAF plants
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.safPlants ? 'visible' : 'none'
            }
          });
          
          // Log the available properties in the first feature for debugging
          map.current.on('sourcedata', function(e) {
            if (e.sourceId === 'saf-plants-source' && e.isSourceLoaded) {
              try {
                // Try to get features from the source
                const features = map.current.querySourceFeatures('saf-plants-source', {
                  sourceLayer: TILESET_REGISTRY.safPlants.sourceLayer
                });
                
                if (features && features.length > 0) {
                  console.log('Sample SAF plant feature properties:', features[0].properties);
                  
                  // Now apply the filter after we've seen the data
                  map.current.setFilter('saf-plants-layer', [
                    'any',
                    [
                      'all',
                      ['has', 'products'], // First check if the feature has a products property
                      ['==', ['typeof', ['get', 'products']], 'string'], // Check if products is a string
                      ['!=', ['index-of', ['upcase', 'SAF'], ['upcase', ['get', 'products']]], -1] // Check if 'SAF' is in products
                    ],
                    [
                      'all',
                      ['has', 'Products'], // Try with capital P as well
                      ['==', ['typeof', ['get', 'Products']], 'string'],
                      ['!=', ['index-of', ['upcase', 'SAF'], ['upcase', ['get', 'Products']]], -1]
                    ]
                  ]);
                  
                  // Remove this event handler after it runs once
                  map.current.off('sourcedata');
                }
              } catch (err) {
                console.error('Error examining source features:', err);
              }
            }
          });
          
          // Apply a simple filter initially
          map.current.setFilter('saf-plants-layer', [
            'any',
            ['has', 'products'], // Check if the feature has a products property
            ['has', 'Products']  // Try with capital P as well
          ]);
          
          console.log("Added sustainable aviation fuel plants layer - will filter for 'SAF' in products when data loads");
        } catch (error) {
          console.error("Failed to add sustainable aviation fuel plants layer:", error);
        }
        
        // Add renewable diesel plants layer using the same source but filtered
        try {
          map.current.addLayer({
            id: 'renewable-diesel-layer',
            type: 'circle',
            source: 'saf-plants-source', // Using the same source as SAF plants
            'source-layer': TILESET_REGISTRY.renewableDiesel.sourceLayer,
            paint: {
              'circle-color': '#FF8C00', // Dark orange color for renewable diesel plants
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.renewableDiesel ? 'visible' : 'none'
            }
          });
          
          // Log the available properties in the first feature for debugging
          map.current.on('sourcedata', function(e) {
            if (e.sourceId === 'saf-plants-source' && e.isSourceLoaded) {
              try {
                // Try to get features from the source
                const features = map.current.querySourceFeatures('saf-plants-source', {
                  sourceLayer: TILESET_REGISTRY.renewableDiesel.sourceLayer
                });
                
                if (features && features.length > 0) {
                  console.log('Sample RD plant feature properties:', features[0].properties);
                  
                  // Now apply the filter after we've seen the data
                  map.current.setFilter('renewable-diesel-layer', [
                    'any',
                    [
                      'all',
                      ['has', 'products'], // First check if the feature has a products property
                      ['==', ['typeof', ['get', 'products']], 'string'], // Check if products is a string
                      ['!=', ['index-of', ['upcase', 'RD'], ['upcase', ['get', 'products']]], -1] // Check if 'RD' is in products
                    ],
                    [
                      'all',
                      ['has', 'Products'], // Try with capital P as well
                      ['==', ['typeof', ['get', 'Products']], 'string'],
                      ['!=', ['index-of', ['upcase', 'RD'], ['upcase', ['get', 'Products']]], -1]
                    ]
                  ]);
                  
                  // Remove this event handler after it runs once
                  map.current.off('sourcedata');
                }
              } catch (err) {
                console.error('Error examining source features:', err);
              }
            }
          });
          
          // Apply a simple filter initially
          map.current.setFilter('renewable-diesel-layer', [
            'any',
            ['has', 'products'], // Check if the feature has a products property
            ['has', 'Products']  // Try with capital P as well
          ]);
          
          console.log("Added renewable diesel plants layer - will filter for 'RD' in products when data loads");
        } catch (error) {
          console.error("Failed to add renewable diesel plants layer:", error);
        }
        
        // Add cement plants layer with the correct source layer name
        try {
          map.current.addLayer({
            id: 'cement-plants-layer',
            type: 'circle',
            source: 'cement-plants-source',
            'source-layer': TILESET_REGISTRY.cementPlants.sourceLayer,
            paint: {
              'circle-color': '#708090', // Slate gray color for cement plants
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.cementPlants ? 'visible' : 'none'
            }
          });
          
          // Log the available properties in the first feature for debugging
          map.current.on('sourcedata', function(e) {
            if (e.sourceId === 'cement-plants-source' && e.isSourceLoaded) {
              try {
                // Try to get features from the source
                const features = map.current.querySourceFeatures('cement-plants-source', {
                  sourceLayer: '4ffuy21y'
                });
                
                console.log(`Found ${features.length} features in the cement plants tileset`);
                
                if (features && features.length > 0) {
                  console.log('Sample cement plant feature properties:', features[0].properties);
                  
                  // Remove this event handler after it runs once
                  map.current.off('sourcedata');
                }
              } catch (err) {
                console.error('Error examining cement plant source features:', err);
              }
            }
          });
          
          console.log("Added cement plants layer with source-layer: '4ffuy21y'");
        } catch (error) {
          console.error("Failed to add cement plants layer:", error);
        }

        // Add material recovery facilities layer
        try {
          map.current.addLayer({
            id: 'mrf-layer',
            type: 'circle',
            source: 'mrf-source',
            'source-layer': TILESET_REGISTRY.mrf.sourceLayer,
            paint: {
              'circle-color': '#20B2AA', // Light sea green color for MRF facilities
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.mrf ? 'visible' : 'none'
            }
          });
          
          // Log the available properties in the first feature for debugging
          map.current.on('sourcedata', function(e) {
            if (e.sourceId === 'mrf-source' && e.isSourceLoaded) {
              try {
                // Try to get features from the source
                const features = map.current.querySourceFeatures('mrf-source', {
                  sourceLayer: 'us_mrf_pts-206gpg'
                });
                
                if (features && features.length > 0) {
                  console.log('Sample MRF feature properties:', features[0].properties);
                  
                  // Remove this event handler after it runs once
                  map.current.off('sourcedata');
                }
              } catch (err) {
                console.error('Error examining MRF source features:', err);
              }
            }
          });
          
          console.log("Added material recovery facilities layer");
        } catch (error) {
          console.error("Failed to add material recovery facilities layer:", error);
        }

        // Add biodiesel plants layer with correct source layer
        try {
          map.current.addLayer({
            id: 'biodiesel-plants-layer',
            type: 'circle',
            source: 'biodiesel-plants-source',
            'source-layer': TILESET_REGISTRY.biodieselPlants.sourceLayer,
            paint: {
              'circle-color': '#228B22', // Forest green color for biodiesel plants
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.biodieselPlants ? 'visible' : 'none'
            }
          });
          console.log("Added biodiesel plants layer with correct source layer 'biodiesel_plants-69v9v0'");
        } catch (error) {
          console.error("Failed to add biodiesel plants layer:", error);
        }
        
        // Add landfills with LFG projects layer
        try {
          map.current.addLayer({
            id: 'landfill-lfg-layer',
            type: 'circle',
            source: 'landfill-lfg-source',
            'source-layer': TILESET_REGISTRY.landfillLfg.sourceLayer,
            paint: {
              'circle-color': '#800080', // Purple color for landfills with LFG projects
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.landfillLfg ? 'visible' : 'none'
            }
          });
          console.log("Added landfills with LFG projects layer with correct source layer '0pobnuqo'");
        } catch (error) {
          console.error("Failed to add landfills with LFG projects layer:", error);
        }
        
        // Add wastewater treatment plants layer
        try {
          map.current.addLayer({
            id: 'wastewater-treatment-layer',
            type: 'circle',
            source: 'wastewater-treatment-source',
            'source-layer': TILESET_REGISTRY.wastewaterTreatment.sourceLayer,
            paint: {
              'circle-color': '#00CED1', // Turquoise color for wastewater treatment plants
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.wastewaterTreatment ? 'visible' : 'none'
            }
          });
          console.log("Added wastewater treatment plants layer with correct source layer 'us_wwt_pts'");
        } catch (error) {
          console.error("Failed to add wastewater treatment plants layer:", error);
        }
        
        // Add waste to energy plants layer
        try {
          map.current.addLayer({
            id: 'waste-to-energy-layer',
            type: 'circle',
            source: 'waste-to-energy-source',
            'source-layer': TILESET_REGISTRY.wasteToEnergy.sourceLayer,
            paint: {
              'circle-color': '#FF6347', // Tomato color for waste to energy plants
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.wasteToEnergy ? 'visible' : 'none'
            }
          });
          console.log("Added waste to energy plants layer with correct source layer 'W2E_points'");
        } catch (error) {
          console.error("Failed to add waste to energy plants layer:", error);
        }
        
        // Add combustion plants layer
        try {
          map.current.addLayer({
            id: 'combustion-plants-layer',
            type: 'circle',
            source: 'combustion-plants-source',
            'source-layer': TILESET_REGISTRY.combustionPlants.sourceLayer,
            paint: {
              'circle-color': '#B22222', // FireBrick color for combustion plants
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.combustionPlants ? 'visible' : 'none'
            }
          });
          console.log("Added combustion plants layer with correct source layer 'COMB_points'");
        } catch (error) {
          console.error("Failed to add combustion plants layer:", error);
        }
        
        // Add District Energy Systems layer
        try {
          map.current.addLayer({
            id: 'district-energy-systems-layer',
            type: 'circle',
            source: 'district-energy-systems-source',
            'source-layer': TILESET_REGISTRY.districtEnergySystems.sourceLayer,
            paint: {
              'circle-color': '#32CD32', // LimeGreen color for District Energy Systems
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.districtEnergySystems ? 'visible' : 'none'
            }
          });
          console.log("Added District Energy Systems layer with correct source layer 'DES_CBG_centroids'");
        } catch (error) {
          console.error("Failed to add District Energy Systems layer:", error);
        }
        
        // Add food processors layer
        try {
          map.current.addLayer({
            id: 'food-processors-layer',
            type: 'circle',
            source: 'food-processors-source',
            'source-layer': TILESET_REGISTRY.foodProcessors.sourceLayer,
            paint: {
              'circle-color': '#FFD700', // Gold color for food processors
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.foodProcessors ? 'visible' : 'none'
            }
          });
          console.log("Added food processors layer with correct source layer 'food_manufactureres_and_processors_epa'");
        } catch (error) {
          console.error("Failed to add food processors layer:", error);
        }

        // Add tomato processors layer
        try {
          map.current.addLayer({
            id: 'tomato-processors-layer',
            type: 'circle',
            source: 'tomato-processors-source',
            'source-layer': TILESET_REGISTRY.tomatoProcessors.sourceLayer,
            paint: {
              'circle-color': '#FF6347', // Tomato color
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.tomatoProcessors ? 'visible' : 'none'
            }
          });
          
          // Log source data to verify source layer name
          map.current.on('sourcedata', function(e) {
            if (e.sourceId === 'tomato-processors-source' && e.isSourceLoaded) {
              try {
                const features = map.current.querySourceFeatures('tomato-processors-source', {
                  sourceLayer: TILESET_REGISTRY.tomatoProcessors.sourceLayer
                });
                console.log(`Found ${features.length} features in the tomato processors tileset`);
                if (features.length > 0) {
                  console.log('Sample tomato processor feature properties:', features[0].properties);
                  map.current.off('sourcedata');
                } else {
                   // Debug: list available layers if possible or try to guess
                   console.log('No features found in tomato processors source layer. Verifying source...');
                }
              } catch (err) {
                console.error('Error examining tomato processors source features:', err);
              }
            }
          });

          console.log("Added tomato processors layer");
        } catch (error) {
          console.error("Failed to add tomato processors layer:", error);
        }
        
        // Add food retailers layer
        try {
          map.current.addLayer({
            id: 'food-retailers-layer',
            type: 'circle',
            source: 'food-retailers-source',
            'source-layer': TILESET_REGISTRY.foodRetailers.sourceLayer,
            paint: {
              'circle-color': '#FF69B4', // HotPink for food retailers
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': layerVisibility?.foodRetailers ? 'visible' : 'none'
            }
          });
          console.log("Added food retailers layer with correct source layer 'food_wholesalers_and_retailers_epa'");
        } catch (error) {
          console.error("Failed to add food retailers layer:", error);
        }

        // Add power plants layer
        try {
          map.current.addLayer({
            id: 'power-plants-layer',
            type: 'circle',
            source: 'power-plants-source',
            'source-layer': INFRASTRUCTURE_LAYERS.power_plants.sourceLayer,
            paint: {
              'circle-color': '#FFD700', // Gold
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': 'none'
            }
          });
          console.log(`Added power plants layer with correct source layer '${INFRASTRUCTURE_LAYERS.power_plants.sourceLayer}'`);
        } catch (error) {
          console.error("Failed to add power plants layer:", error);
        }

        // Add food banks layer
        try {
          map.current.addLayer({
            id: 'food-banks-layer',
            type: 'circle',
            source: 'food-banks-source',
            'source-layer': INFRASTRUCTURE_LAYERS.food_banks.sourceLayer,
            paint: {
              'circle-color': '#32CD32', // LimeGreen
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': 'none'
            }
          });
          console.log(`Added food banks layer with correct source layer '${INFRASTRUCTURE_LAYERS.food_banks.sourceLayer}'`);
        } catch (error) {
          console.error("Failed to add food banks layer:", error);
        }

        // Add farmers markets layer
        try {
          map.current.addLayer({
            id: 'farmers-markets-layer',
            type: 'circle',
            source: 'farmers-markets-source',
            'source-layer': INFRASTRUCTURE_LAYERS.farmers_markets.sourceLayer,
            paint: {
              'circle-color': '#FF4500', // OrangeRed
              'circle-radius': 6,
              'circle-opacity': 0.8,
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 1
            },
            layout: {
              'visibility': 'none'
            }
          });
          console.log(`Added farmers markets layer with correct source layer '${INFRASTRUCTURE_LAYERS.farmers_markets.sourceLayer}'`);
        } catch (error) {
          console.error("Failed to add farmers markets layer:", error);
        }
        
        // Add petroleum pipelines layer (as part of transportation)
        try {
          map.current.addLayer({
            id: 'petroleum-pipelines-layer',
            type: 'line',
            source: 'petroleum-pipelines-source',
            'source-layer': TILESET_REGISTRY.petroleumPipelines.sourceLayer,
            paint: {
              'line-color': '#FF4500', // OrangeRed color for petroleum pipelines
              'line-width': 2,
              'line-opacity': 0.7
            },
            layout: {
              'visibility': layerVisibility?.petroleumPipelines ? 'visible' : 'none'
            }
          });
          console.log("Added petroleum pipelines layer with correct source layer 'us_petrol_prod_pipelines_ftot-4f7wgo'");
        } catch (error) {
          console.error("Failed to add petroleum pipelines layer:", error);
        }
        
        // Add crude oil pipelines layer (as part of transportation)
        try {
          map.current.addLayer({
            id: 'crude-oil-pipelines-layer',
            type: 'line',
            source: 'crude-oil-pipelines-source',
            'source-layer': TILESET_REGISTRY.crudeOilPipelines.sourceLayer,
            paint: {
              'line-color': '#8B0000', // DarkRed color for crude oil pipelines
              'line-width': 2,
              'line-opacity': 0.7
            },
            layout: {
              'visibility': layerVisibility?.crudeOilPipelines ? 'visible' : 'none'
            }
          });
          console.log("Added crude oil pipelines layer with correct source layer 'us_crude_pipeline_ftot-bhu6j4'");
        } catch (error) {
          console.error("Failed to add crude oil pipelines layer:", error);
        }
        
        // Add natural gas pipelines layer (as part of transportation)
        try {
          map.current.addLayer({
            id: 'natural-gas-pipelines-layer',
            type: 'line',
            source: 'natural-gas-pipelines-source',
            'source-layer': TILESET_REGISTRY.naturalGasPipelines.sourceLayer,
            paint: {
              'line-color': '#4169E1', // RoyalBlue color for natural gas pipelines
              'line-width': 2,
              'line-opacity': 0.7
            },
            layout: {
              'visibility': layerVisibility?.naturalGasPipelines ? 'visible' : 'none'
            }
          });
          console.log("Added natural gas pipelines layer with correct source layer 'hifld_us_natural_gas_pipeline-4prihp'");
        } catch (error) {
          console.error("Failed to add natural gas pipelines layer:", error);
        }

        // --- Add Click Listener for Feedstock Layer (Display Properties) ---
        map.current.on('click', 'feedstock-vector-layer', (e) => {
          // Don't show popup when in siting mode (either in placement or review state)
          if (sitingModeRef.current) {
            // Stop event propagation to prevent popup
            e.originalEvent.stopPropagation();
            return;
          }
          
          // Ensure features exist and prevent popups for clicks not directly on a feature
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            const coordinates = e.lngLat;
            const properties = feature.properties;

            // --- Format Properties for Display ---

            // Helper function to convert snake_case to Title Case
            const toTitleCase = (str) => {
              return str.replace(/_/g, ' ').replace(
                /\w\S*/g,
                (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
              );
            };

            // Helper function to format numbers with commas
            const formatNumberWithCommas = (num) => {
              return num.toLocaleString('en-US');
            };

            // Define keys to *include* in the popup and their display order
            const includedKeys = ['main_crop_name', 'acres', 'county', 'region', 'hydro_region']; // Reordered

            let contentLines = '';
            // Iterate through the *included* keys to ensure order and presence
            for (const key of includedKeys) {
              if (properties.hasOwnProperty(key) && properties[key] !== null && properties[key] !== undefined && properties[key] !== '****') {
                // Rename label specifically for main_crop_name
                const label = (key === 'main_crop_name') ? 'Crop' : toTitleCase(key);
                let value = properties[key];

                // Format specific values
                if (key === 'acres' && typeof value === 'number') {
                  value = value.toFixed(2); // Round acres to 2 decimal places
                }
                // Add more formatting rules here if needed

                // Format as "Label: Value" on a single line, left-justified
                contentLines += `<div style="margin-bottom: 3px; text-align: left;"><strong style="font-weight: bold;">${label}:</strong> ${value}</div>`;
              }
            }

            // Calculate crop residue yields using the same methodology as in SitingInventory.tsx
            const cropName = properties.main_crop_name;
            const acres = parseFloat(properties.acres) || 0;
            
            // Import crop residue factor mappings from constants
            const CROP_NAME_MAPPING = {
              // Orchard and Vineyard crops
              "Apples": "Apples",
              "Apricots": "Apricots",
              "Avocados": "Avocados",
              "Cherries": "Cherries",
              "Dates": "Dates",
              "Figs": "Figs",
              "Grapes": "Grapes",
              "Kiwis": "Kiwifruit",
              "Nectarines": "Nectarines",
              "Olives": "Olives",
              "Peaches/Nectarines": "Peaches",
              "Pears": "Pears",
              "Persimmons": "Persimmons",
              "Plums": "Plums & Prunes",
              "Prunes": "Plums & Prunes",
              "Pomegranates": "Pomegranates",
              "Citrus and Subtropical": "All Citrus",
              "Miscellaneous Subtropical Fruits": "All Citrus",
              "Almonds": "Almonds",
              "Pecans": "Pecans",
              "Pistachios": "Pistachios",
              "Walnuts": "Walnuts",
              "Miscellaneous Deciduous": "Fruits & Nuts unsp.",
              
              // Row crops
              "Artichokes": "Artichokes",
              "Asparagus": "Asparagus",
              "Bush Berries": "Berries",
              "Beans (Dry)": "Beans",
              "Lima Beans": "Lima Beans",
              "Green Lima Beans": "Green Lima Beans",
              "Broccoli": "Broccoli",
              "Cabbage": "Cabbage",
              "Cole Crops": "Cabbage",
              "Melons, Squash and Cucumbers": "Combined Melons",
              "Carrots": "Carrots",
              "Cauliflower": "Cauliflower",
              "Celery": "Celery",
              "Cucumbers": "Cucumbers",
              "Garlic": "Garlic",
              "Lettuce/Leafy Greens": "Lettuce and Romaine",
              "Onions and Garlic": "Dry Onions",
              "Peppers": "Hot Peppers",
              "Sweet Peppers": "Sweet Peppers",
              "Spinach": "Spinach",
              "Squash": "Squash",
              "Sweet Corn": "Sweet Corn",
              "Tomatoes": "Tomatoes",
              "Potatoes": "Potatoes",
              "Sweet Potatoes": "Sweet Potatos",
              "Sugar beets": "Sugar Beets",
              "Miscellaneous Truck Crops": "Unsp. vegetables",
              
              // Field crops
              "Corn, Sorghum and Sudan": "Corn",
              "Sorghum": "Sorghum",
              "Wheat": "Wheat",
              "Barley": "Barley",
              "Oats": "Oats",
              "Rice": "Rice",
              "Wild Rice": "Rice",
              "Safflower": "Safflower",
              "Sunflowers": "Sunflower",
              "Cotton": "Cotton",
              "Alfalfa & Alfalfa Mixtures": "Alfalfa",
              "Miscellaneous Field Crops": "Unsp. Field & Seed",
              "Miscellaneous Grain and Hay": "Unsp. Field & Seed",
              "Miscellaneous Grasses": "Bermuda Grass Seed"
            };

            // Orchard and Vineyard Residues
            const ORCHARD_VINEYARD_RESIDUES = {
              "Apples": { wetTonsPerAcre: 1.9, moistureContent: 0.4, dryTonsPerAcre: 1.2 },
              "Apricots": { wetTonsPerAcre: 2.5, moistureContent: 0.4, dryTonsPerAcre: 1.5 },
              "Avocados": { wetTonsPerAcre: 1.5, moistureContent: 0.4, dryTonsPerAcre: 0.9 },
              "Cherries": { wetTonsPerAcre: 2.1, moistureContent: 0.4, dryTonsPerAcre: 1.2 },
              "Dates": { wetTonsPerAcre: 0.6, moistureContent: 0.43, dryTonsPerAcre: 0.3 },
              "Figs": { wetTonsPerAcre: 2.2, moistureContent: 0.43, dryTonsPerAcre: 1.3 },
              "Grapes": { wetTonsPerAcre: 2.0, moistureContent: 0.45, dryTonsPerAcre: 1.1 },
              "Kiwifruit": { wetTonsPerAcre: 2.0, moistureContent: 0.45, dryTonsPerAcre: 1.1 },
              "Nectarines": { wetTonsPerAcre: 1.6, moistureContent: 0.43, dryTonsPerAcre: 0.9 },
              "Olives": { wetTonsPerAcre: 1.1, moistureContent: 0.43, dryTonsPerAcre: 0.7 },
              "Peaches": { wetTonsPerAcre: 2.3, moistureContent: 0.43, dryTonsPerAcre: 1.3 },
              "Pears": { wetTonsPerAcre: 2.3, moistureContent: 0.4, dryTonsPerAcre: 1.4 },
              "Persimmons": { wetTonsPerAcre: 1.6, moistureContent: 0.43, dryTonsPerAcre: 0.9 },
              "Plums & Prunes": { wetTonsPerAcre: 1.5, moistureContent: 0.43, dryTonsPerAcre: 0.9 },
              "Pomegranates": { wetTonsPerAcre: 1.6, moistureContent: 0.43, dryTonsPerAcre: 0.9 },
              "All Citrus": { wetTonsPerAcre: 2.5, moistureContent: 0.4, dryTonsPerAcre: 1.5 },
              "Almonds": { wetTonsPerAcre: 2.5, moistureContent: 0.4, dryTonsPerAcre: 1.5 },
              "Pecans": { wetTonsPerAcre: 1.6, moistureContent: 0.4, dryTonsPerAcre: 1.0 },
              "Pistachios": { wetTonsPerAcre: 1.0, moistureContent: 0.43, dryTonsPerAcre: 0.6 },
              "Walnuts": { wetTonsPerAcre: 1.0, moistureContent: 0.43, dryTonsPerAcre: 0.6 },
              "Fruits & Nuts unsp.": { wetTonsPerAcre: 1.6, moistureContent: 0.5, dryTonsPerAcre: 0.8 }
            };

            // Row Crop Residues
            const ROW_CROP_RESIDUES = {
              "Artichokes": { residueType: "Top Silage", wetTonsPerAcre: 1.7, moistureContent: 0.73, dryTonsPerAcre: 0.5 },
              "Asparagus": { residueType: "", wetTonsPerAcre: 2.2, moistureContent: 0.8, dryTonsPerAcre: 0.4 },
              "Green Lima Beans": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Berries": { residueType: "Prunings and Leaves", wetTonsPerAcre: 1.3, moistureContent: 0.4, dryTonsPerAcre: 0.8 },
              "Snap Beans": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Broccoli": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Cabbage": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Combined Melons": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.2, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Carrots": { residueType: "Top Silage", wetTonsPerAcre: 1.0, moistureContent: 0.84, dryTonsPerAcre: 0.2 },
              "Cauliflower": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Celery": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Cucumbers": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.7, moistureContent: 0.8, dryTonsPerAcre: 0.3 },
              "Garlic": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.73, dryTonsPerAcre: 0.3 },
              "Lettuce and Romaine": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Dry Onions": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.73, dryTonsPerAcre: 0.3 },
              "Green Onions": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.73, dryTonsPerAcre: 0.3 },
              "Hot Peppers": { residueType: "Stems & Leaf Meal", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Sweet Peppers": { residueType: "Stems & Leaf Meal", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Spinach": { residueType: "", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Squash": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.2, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Sweet Corn": { residueType: "Stover", wetTonsPerAcre: 4.7, moistureContent: 0.2, dryTonsPerAcre: 3.8 },
              "Tomatoes": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.3, moistureContent: 0.8, dryTonsPerAcre: 0.3 },
              "Unsp. vegetables": { residueType: "", wetTonsPerAcre: 1.4, moistureContent: 0.8, dryTonsPerAcre: 0.3 },
              "Potatoes": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.2, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Sweet Potatos": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.2, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Sugar Beets": { residueType: "Top Silage", wetTonsPerAcre: 2.4, moistureContent: 0.75, dryTonsPerAcre: 0.6 }
            };

            // Field Crop Residues
            const FIELD_CROP_RESIDUES = {
              "Corn": { residueType: "Stover", wetTonsPerAcre: 2.9, moistureContent: 0.2, dryTonsPerAcre: 2.3 },
              "Sorghum": { residueType: "Stover", wetTonsPerAcre: 2.2, moistureContent: 0.2, dryTonsPerAcre: 1.8 },
              "Wheat": { residueType: "Straw & Stubble", wetTonsPerAcre: 1.2, moistureContent: 0.14, dryTonsPerAcre: 1.0 },
              "Barley": { residueType: "Straw & Stubble", wetTonsPerAcre: 0.9, moistureContent: 0.15, dryTonsPerAcre: 0.7 },
              "Oats": { residueType: "Straw & Stubble", wetTonsPerAcre: 0.5, moistureContent: 0.15, dryTonsPerAcre: 0.4 },
              "Rice": { residueType: "Straw", wetTonsPerAcre: 1.8, moistureContent: 0.14, dryTonsPerAcre: 1.6 },
              "Safflower": { residueType: "Straw & Stubble", wetTonsPerAcre: 0.9, moistureContent: 0.14, dryTonsPerAcre: 0.8 },
              "Sunflower": { residueType: "Straw & Stubble", wetTonsPerAcre: 0.9, moistureContent: 0.14, dryTonsPerAcre: 0.8 },
              "Cotton": { residueType: "Straw & Stubble", wetTonsPerAcre: 1.5, moistureContent: 0.14, dryTonsPerAcre: 1.3 },
              "Beans": { residueType: "vines and leaves", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Lima Beans": { residueType: "Vines and Leaves", wetTonsPerAcre: 1.0, moistureContent: 0.8, dryTonsPerAcre: 0.2 },
              "Alfalfa": { residueType: "Stems & Leaf Meal", wetTonsPerAcre: 1.0, moistureContent: 0.11, dryTonsPerAcre: 0.9 },
              "Bermuda Grass Seed": { residueType: "Grass", wetTonsPerAcre: 1.0, moistureContent: 0.6, dryTonsPerAcre: 0.4 },
              "Unsp. Field & Seed": { residueType: "Stubble", wetTonsPerAcre: 1.0, moistureContent: 0.14, dryTonsPerAcre: 0.86 }
            };

            // Function to get crop residue factors
            const getCropResidueFactors = (cropName) => {
              // Get the standardized crop name from mapping
              const standardizedName = CROP_NAME_MAPPING[cropName] || null;
              
              if (!standardizedName) {
                return null;
              }
              
              // Check each residue category
              if (ORCHARD_VINEYARD_RESIDUES[standardizedName]) {
                return {
                  ...ORCHARD_VINEYARD_RESIDUES[standardizedName],
                  category: 'Orchard and Vineyard',
                  residueType: 'Prunings'
                };
              }
              
              if (ROW_CROP_RESIDUES[standardizedName]) {
                return {
                  ...ROW_CROP_RESIDUES[standardizedName],
                  category: 'Row Crop'
                };
              }
              
              if (FIELD_CROP_RESIDUES[standardizedName]) {
                return {
                  ...FIELD_CROP_RESIDUES[standardizedName],
                  category: 'Field Crop'
                };
              }
              
              return null;
            };

            // Calculate residue yields
            let residueSection = '';
            const residueFactors = getCropResidueFactors(cropName);
            
            if (residueFactors) {
              // Calculate total residue amounts based on the harvested area (acres)
              const dryResidueYield = Math.round(acres * residueFactors.dryTonsPerAcre);
              const wetResidueYield = Math.round(acres * residueFactors.wetTonsPerAcre);
              const residueType = residueFactors.residueType || 'Residue';
              
              // Add residue information to the popup
              residueSection = `
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eaeaea;">
                  <h5 style="font-size: 0.95em; font-weight: bold; margin: 0 0 5px 0;">Annual Crop Residue Estimates</h5>
                  <div style="margin-bottom: 3px; text-align: left;"><strong style="font-weight: bold;">Residue Type:</strong> ${residueType}</div>
                  <div style="margin-bottom: 3px; text-align: left;"><strong style="font-weight: bold;">Wet Tonnage:</strong> ${formatNumberWithCommas(wetResidueYield)} tons/year</div>
                  <div style="margin-bottom: 3px; text-align: left;"><strong style="font-weight: bold;">Dry Tonnage:</strong> ${formatNumberWithCommas(dryResidueYield)} tons/year</div>
                </div>
              `;
            }

            // Increase right padding for close button spacing, remove table
            const popupHTML = `
              <div style="padding: 5px 15px 5px 5px; font-size: 0.9em;">
                <h4 style="font-size: 1.1em; font-weight: bold; margin: 0 0 8px 0; padding: 0; text-align: left;">Crop Field Details</h4>
                ${contentLines}
                ${residueSection}
              </div>
            `;

            // --- Create and Show Popup ---
            // Close any existing popup first
            if (currentPopup.current) {
              currentPopup.current.remove();
            }
            
            // Create new popup and store reference
            currentPopup.current = new mapboxgl.Popup({ 
                closeButton: true, 
                closeOnClick: true, 
                maxWidth: '350px',
                className: 'crop-residue-popup' // Add custom class for additional styling
              })
              .setLngLat(coordinates)
              .setHTML(popupHTML)
              .addTo(map.current);

            // Add event listener to clear popup reference when it's closed
            currentPopup.current.on('close', () => {
              currentPopup.current = null;
              console.log('Popup closed manually');
            });

            console.log('Displayed formatted popup for feature:', properties);
          }
        });

        // --- Add Hover Effect for Feedstock Layer ---
        map.current.on('mouseenter', 'feedstock-vector-layer', () => {
          if (!sitingModeRef.current) {
            map.current.getCanvas().style.cursor = 'pointer';
          }
        });

        map.current.on('mouseleave', 'feedstock-vector-layer', () => {
          map.current.getCanvas().style.cursor = '';
        });

        // --- Add Interactivity to Layers ---
        const interactiveLayers = {
          'rail-lines-layer': 'Rail Line Details',
          'freight-terminals-layer': 'Freight Terminal Details',
          'freight-routes-layer': 'Freight Route Details',
          'petroleum-pipelines-layer': 'Petroleum Pipeline Details',
          'crude-oil-pipelines-layer': 'Crude Oil Pipeline Details',
          'natural-gas-pipelines-layer': 'Natural Gas Pipeline Details',
          'anaerobic-digester-layer': 'Anaerobic Digester Details',
          'biodiesel-plants-layer': 'Biodiesel Plant Details',
          'biorefineries-layer': 'Biorefinery Details',
          'cement-plants-layer': 'Cement Plant Details',
          'mrf-layer': 'Material Recovery Facility Details',
          'saf-plants-layer': 'Sustainable Aviation Fuel Plant Details',
          'renewable-diesel-layer': 'Renewable Diesel Plant Details',
          'landfill-lfg-layer': 'Landfill LFG Project Details',
          'landfill-lfg-layer': 'Landfill LFG Project Details',
          'wastewater-treatment-layer': 'Wastewater Treatment Plant Details',
          'waste-to-energy-layer': 'Waste to Energy Plant Details',
    'combustion-plants-layer': 'Combustion Plant Details',
    'district-energy-systems-layer': 'District Energy System Details',
    'food-processors-layer': 'Food Processor Details',
    'tomato-processors-layer': 'Tomato Processing Facility Details',
    'food-retailers-layer': 'Food Retailer Details',
    'power-plants-layer': 'Power Plant Details',
          'food-banks-layer': 'Food Bank Details',
          'farmers-markets-layer': 'Farmers Market Details',
        };

        for (const [layerId, popupTitle] of Object.entries(interactiveLayers)) {
          if (map.current.getLayer(layerId)) {
            addLayerInteractivity(layerId, popupTitle);
          }
        }

      }); // Closing bracket for map.current.on('load', ...)

      // Handle errors during map initialization
      map.current.on('error', (error) => {
        console.error('Mapbox error:', error);
      });
      
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    // Clean up on component unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null; // Ensure map instance is cleared
        setMapLoaded(false); // Reset map loaded state
      }
      // Clean up popup reference
      if (currentPopup.current) {
        currentPopup.current.remove();
        currentPopup.current = null;
      }
      // Clean up marker and buffer
      if (currentMarker.current) {
        currentMarker.current.remove();
        currentMarker.current = null;
      }
      // Clean up buffer reference
      currentBuffer.current = null;
    };
  }, []); // An empty dependency array ensures this runs only once on mount

  // Effect to update the buffer when radius or unit changes
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    
    // Only update if we have a placed marker and it exists
    if (hasPlacedMarker && currentMarker.current && currentMarker.current.getLngLat) {
      console.log(`Radius changed to ${radius} ${unit}, updating buffer...`);
      const lngLat = currentMarker.current.getLngLat();
      
      // Add a small delay to ensure the UI updates first
      setTimeout(() => {
        createBuffer(lngLat, radius, unit);
      }, 50);
    }
  }, [radius, unit, hasPlacedMarker, mapLoaded, createBuffer]);

  // Effect for controlling feedstock layer visibility
  useEffect(() => {
    if (!mapLoaded || !map.current || !map.current.getLayer('feedstock-vector-layer')) { // Use new layer ID
      // console.log("Visibility effect: Map not ready or layer doesn't exist yet.");
      return; // Ensure map is loaded and layer exists
    }

    const isFeedstockVisible = layerVisibility?.feedstock || false;
    const visibility = isFeedstockVisible ? 'visible' : 'none';
    console.log(`Setting feedstock layer visibility to: ${visibility}`);
    map.current.setLayoutProperty('feedstock-vector-layer', 'visibility', visibility); // Use new layer ID

    // Close popup when feedstock layer is hidden
    if (!isFeedstockVisible && currentPopup.current) {
      currentPopup.current.remove();
      currentPopup.current = null;
      console.log('Closed popup because feedstock layer was hidden');
    }

  }, [mapLoaded, layerVisibility?.feedstock]); // Depend on mapLoaded and the specific layerVisibility property

  // Effect for updating the crop filter based on visibleCrops prop
  useEffect(() => {
    if (!mapLoaded || !map.current || !map.current.getLayer('feedstock-vector-layer')) {
      // console.log("Crop filter effect: Map not ready or layer doesn't exist yet.");
      return; // Ensure map is loaded and layer exists
    }

    // Construct the filter based on visibleCrops
    // Always include the filter for main_crop_code != 'U'
    const cropFilter = (visibleCrops && visibleCrops.length > 0)
      // Corrected: Use the literal property name 'main_crop_name' for the 'in' operator
      ? ['in', 'main_crop_name', ...visibleCrops]
      // Corrected: Use the literal property name for the '==' operator fallback
      : ['==', 'main_crop_name', '']; // Effectively hide all if no crops selected

    const combinedFilter = [
        'all',
        // Corrected: Use the literal property name 'main_crop_code' for the '!=' operator
        ['!=', 'main_crop_code', 'U'],
        cropFilter
    ];

    console.log("Setting crop filter:", JSON.stringify(combinedFilter));
    map.current.setFilter('feedstock-vector-layer', combinedFilter);

    // Close popup when no crops are visible (all crops filtered out)
    if (!visibleCrops || visibleCrops.length === 0) {
      if (currentPopup.current) {
        currentPopup.current.remove();
        currentPopup.current = null;
        console.log('Closed popup because no crops are visible');
      }
    }

}, [mapLoaded, visibleCrops]); // Depend on mapLoaded and visibleCrops

// Effect for updating the cropland layer opacity
useEffect(() => {
  if (!mapLoaded || !map.current || !map.current.getLayer('feedstock-vector-layer')) {
    // console.log("Opacity effect: Map not ready or layer doesn't exist yet.");
    return; // Ensure map is loaded and layer exists
  }

  // Check if croplandOpacity is a valid number before setting
  if (typeof croplandOpacity === 'number' && croplandOpacity >= 0 && croplandOpacity <= 1) {
    console.log(`Setting feedstock layer opacity to: ${croplandOpacity}`);
    map.current.setPaintProperty('feedstock-vector-layer', 'fill-opacity', croplandOpacity);
  } else {
    console.warn(`Invalid croplandOpacity value received: ${croplandOpacity}. Opacity not set.`);
    // Optionally set a default opacity here if the value is invalid
    // map.current.setPaintProperty('feedstock-vector-layer', 'fill-opacity', 0.6);
  }

}, [mapLoaded, croplandOpacity]); // Depend on mapLoaded and croplandOpacity

  // Effect for controlling infrastructure and transportation layer visibility
useEffect(() => {
  if (!mapLoaded || !map.current) return;

  const layerMapping = {
    'rail-lines-layer': layerVisibility?.railLines,
    'freight-terminals-layer': layerVisibility?.freightTerminals,
    'freight-routes-layer': layerVisibility?.freightRoutes,
    'petroleum-pipelines-layer': layerVisibility?.petroleumPipelines,
    'crude-oil-pipelines-layer': layerVisibility?.crudeOilPipelines,
    'natural-gas-pipelines-layer': layerVisibility?.naturalGasPipelines,
    'anaerobic-digester-layer': layerVisibility?.anaerobicDigester,
    'biodiesel-plants-layer': layerVisibility?.biodieselPlants,
    'biorefineries-layer': layerVisibility?.biorefineries,
    'cement-plants-layer': layerVisibility?.cementPlants,
    'mrf-layer': layerVisibility?.mrf,
    'saf-plants-layer': layerVisibility?.safPlants,
    'renewable-diesel-layer': layerVisibility?.renewableDiesel,
    'landfill-lfg-layer': layerVisibility?.landfillLfg,
    'wastewater-treatment-layer': layerVisibility?.wastewaterTreatment,
    'waste-to-energy-layer': layerVisibility?.wasteToEnergy,
    'combustion-plants-layer': layerVisibility?.combustionPlants,
    'district-energy-systems-layer': layerVisibility?.districtEnergySystems,
    'food-processors-layer': layerVisibility?.foodProcessors,
    'tomato-processors-layer': layerVisibility?.tomatoProcessors,
    'food-retailers-layer': layerVisibility?.foodRetailers,
    'power-plants-layer': layerVisibility?.powerPlants,
    'food-banks-layer': layerVisibility?.foodBanks,
    'farmers-markets-layer': layerVisibility?.farmersMarkets,
  };

  Object.entries(layerMapping).forEach(([layerId, isVisible]) => {
    if (map.current.getLayer(layerId)) {
      const visibility = isVisible ? 'visible' : 'none';
      if (map.current.getLayoutProperty(layerId, 'visibility') !== visibility) {
        map.current.setLayoutProperty(layerId, 'visibility', visibility);
      }

      // If the layer is being hidden and a popup for it is open, close the popup
      if (!isVisible && currentPopup.current && currentPopupLayer === layerId.replace(/-layer$/, '')) {
        currentPopup.current.remove();
        currentPopup.current = null;
        setCurrentPopupLayer(null);
      }
    }
  });
}, [mapLoaded, layerVisibility, currentPopupLayer]);

  // Define validateBufferState function before it's used in dependency arrays
  const validateBufferState = useCallback(() => {
    if (!mapLoaded || !map.current) return;
    
    const hasMarker = !!currentMarker.current;
    const hasBufferData = !!(currentBuffer.current && currentBuffer.current.geometry && currentBuffer.current.geometry.coordinates);
    
    // If we have no marker but have buffer data, clean up the buffer
    if (!hasMarker && hasBufferData) {
      console.log('Buffer state inconsistency detected - cleaning up buffer without marker');
      cleanupSitingElements();
      return;
    }
    
    // If we have a marker but no buffer data, and we're in siting mode, recreate the buffer
    if (hasMarker && !hasBufferData && sitingMode && hasPlacedMarker) {
      console.log('Buffer state inconsistency detected - recreating buffer for existing marker');
      const lngLat = currentMarker.current.getLngLat();
      createBuffer(lngLat, radius, unit);
    }
    
    // If we have both marker and buffer, ensure buffer layers are visible
    if (hasMarker && hasBufferData && sitingMode) {
      // Ensure buffer layers are visible
      try {
        if (map.current.getLayer('siting-buffer-fill') && map.current.getLayer('siting-buffer-outline')) {
          map.current.setLayoutProperty('siting-buffer-fill', 'visibility', 'visible');
          map.current.setLayoutProperty('siting-buffer-outline', 'visibility', 'visible');
        }
      } catch (e) {
        console.warn('Failed to ensure buffer visibility:', e);
      }
    }
  }, [mapLoaded, sitingMode, hasPlacedMarker, radius, unit, createBuffer, cleanupSitingElements]);

// Effect for periodic buffer state validation
useEffect(() => {
  if (!mapLoaded || !map.current) return;
  
  // Validate buffer state every 2 seconds to catch inconsistencies
  const validationInterval = setInterval(() => {
    validateBufferState();
  }, 2000);
  
  return () => {
    clearInterval(validationInterval);
  };
}, [mapLoaded, sitingMode, hasPlacedMarker, radius, unit, validateBufferState]);

// Effect to clean up buffers when siting mode is disabled
useEffect(() => {
  if (!mapLoaded || !map.current) return;
  
  // If siting mode is disabled, ensure all buffers are cleaned up
  if (!sitingMode) {
    console.log('Siting mode disabled - ensuring buffers are cleaned up...');
    cleanupSitingElements();
  }
}, [mapLoaded, sitingMode, cleanupSitingElements]);

// Color mapping definition removed - will be handled in LayerControls

  // Effect for handling container resize
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    
    // Store a reference to the current map container element
    const currentMapContainer = mapContainer.current;
    
    // Create a resize observer to detect container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (!map.current) return;
      
      // Resize the map with a small delay to ensure the container size is stable
      setTimeout(() => {
        console.log('Container resized, triggering map resize');
        map.current.resize();
      }, 100);
    });
    
    // Start observing the container for size changes
    if (currentMapContainer) {
      resizeObserver.observe(currentMapContainer);
      console.log('Resize observer attached to map container');
    }
    
    // Also listen for window resize events
    const handleResize = () => {
      if (map.current) {
        setTimeout(() => {
          console.log('Window resized, triggering map resize');
          map.current.resize();
        }, 100);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      // Clean up the observer when the component unmounts
      if (currentMapContainer) {
        resizeObserver.unobserve(currentMapContainer);
        console.log('Resize observer detached from map container');
      }
      
      // Remove window resize listener
      window.removeEventListener('resize', handleResize);
    };
  }, [mapLoaded]);

  return (
    // Ensure the container has dimensions and relative positioning for the legend
    <div
      ref={mapContainer}
      className="map-container"
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative',
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }}
    >
      {/* Show either the button or the panel */}
      {!showSitingPanel ? (
        <SitingButton 
          onClick={toggleSitingMode} 
          isActive={sitingMode} 
        />
      ) : (
        <SitingAnalysis
          onClose={closeSitingMode}
          onRadiusChange={setRadius}
          onUnitChange={setUnit}
          onRemoveSite={removeSiteAndReactivate}
          radius={radius}
          unit={unit}
          isActive={sitingMode}
          hasPlacedMarker={hasPlacedMarker}
        />
      )}
      
      {/* Resource Inventory Panel */}
      <SitingInventory 
        isVisible={showInventoryPanel}
        inventory={inventoryData}
        totalAcres={totalAcres}
        bufferRadius={radius}
        bufferUnit={unit}
        location={markerLocation}
      />
    </div>
  );
};

export default Map;
