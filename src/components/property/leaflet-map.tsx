"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Property } from "@/data/properties";

interface LeafletMapProps {
  properties: Property[];
  hoveredPropertyId?: string | null;
  onPropertySelect?: (slug: string) => void;
}

// Center of Tampa area
const MAP_CENTER: [number, number] = [27.9506, -82.4572];

// Custom map icon (Light mode styled to match brand)
const createCustomIcon = (price: number, isHovered: boolean) => {
  const html = `
    <div style="
      background-color: ${isHovered ? '#2b2b36' : 'white'};
      color: ${isHovered ? 'white' : '#2b2b36'};
      border: 1px solid ${isHovered ? '#2b2b36' : '#e5e7eb'};
      padding: 4px 8px;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      white-space: nowrap;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
    ">
      $${price}
    </div>
    <div style="
      width: 0; 
      height: 0; 
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid ${isHovered ? '#2b2b36' : 'white'};
      margin: 0 auto;
      filter: drop-shadow(0 2px 1px rgba(0,0,0,0.1));
    "></div>
  `;

  return L.divIcon({
    html,
    className: "custom-leaflet-marker",
    iconSize: [60, 30],
    iconAnchor: [30, 30],
    popupAnchor: [0, -30],
  });
};

function MapUpdater({ properties, hoveredId }: { properties: Property[], hoveredId?: string | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (hoveredId) {
      const prop = properties.find(p => p.id === hoveredId);
      if (prop) {
        map.flyTo([prop.locationLat, prop.locationLng], 14, { duration: 0.5 });
      }
    } else if (properties.length > 0) {
      // Fit all markers
      const bounds = L.latLngBounds(properties.map(p => [p.locationLat, p.locationLng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [hoveredId, map, properties]);

  return null;
}

export default function LeafletMap({ properties, hoveredPropertyId, onPropertySelect }: LeafletMapProps) {
  return (
    <MapContainer
      center={MAP_CENTER}
      zoom={11}
      scrollWheelZoom={true}
      className="w-full h-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <MapUpdater properties={properties} hoveredId={hoveredPropertyId} />
      
      {properties.map((property) => (
        <Marker
          key={property.id}
          position={[property.locationLat, property.locationLng]}
          icon={createCustomIcon(property.basePriceNight, hoveredPropertyId === property.id)}
          zIndexOffset={hoveredPropertyId === property.id ? 1000 : 0}
          eventHandlers={{
            click: () => onPropertySelect?.(property.slug),
          }}
        >
          <Popup className="rounded-xl overflow-hidden border-0 shadow-xl" closeButton={false}>
            <div className="w-[200px] flex flex-col gap-2">
              <img 
                src={property.images[0]} 
                alt={property.name} 
                className="w-full h-[120px] object-cover rounded-t-xl"
              />
              <div className="p-3 pt-1">
                <div className="font-semibold text-[#2b2b36] text-sm truncate">{property.name}</div>
                <div className="text-gray-500 text-xs mt-1">{property.bedrooms} Beds • {property.bathrooms} Baths</div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
