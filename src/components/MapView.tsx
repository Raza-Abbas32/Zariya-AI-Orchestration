import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Provider } from '../types';

interface MapViewProps {
  providers: Provider[];
  targetLocation: { lat: number; lng: number } | null;
  selectedProvider: Provider | null;
}

export default function MapView({ providers, targetLocation, selectedProvider }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const layerGroup = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (mapRef.current && !leafletMap.current) {
      leafletMap.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([30.3753, 69.3451], 5);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(leafletMap.current);
      layerGroup.current = L.layerGroup().addTo(leafletMap.current);
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!leafletMap.current || !layerGroup.current) return;

    layerGroup.current.clearLayers();

    if (targetLocation) {
      const zoomLevel = selectedProvider ? 15 : 14;
      const center = selectedProvider ? selectedProvider.location : targetLocation;
      
      leafletMap.current.flyTo([center.lat, center.lng], zoomLevel, {
        duration: 2
      });

      // User/Target Location (Green Point)
      L.circleMarker([targetLocation.lat, targetLocation.lng], {
        radius: 8,
        fillColor: '#10b981',
        color: '#fff',
        weight: 3,
        opacity: 1,
        fillOpacity: 1
      }).addTo(layerGroup.current)
        .bindTooltip("You", { permanent: true, direction: "top", className: 'font-bold text-[10px]' });
    }

    // Find the provider with the minimum distance (shortest path)
    const shortestProviderId = providers.length > 0 
      ? [...providers].sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))[0].id
      : null;

    providers.forEach(p => {
      const isSelected = selectedProvider?.id === p.id;
      const isShortest = p.id === shortestProviderId;
      
      // Provider Marker
      const marker = L.circleMarker([p.location.lat, p.location.lng], {
        radius: isSelected ? 10 : 6,
        fillColor: isSelected ? '#00f2ff' : (isShortest ? '#10b981' : '#94a3b8'),
        color: '#fff',
        weight: isSelected ? 3 : 1,
        opacity: 1,
        fillOpacity: 1
      }).addTo(layerGroup.current!);
      
      marker.bindPopup(`<b>${p.name}</b><br/>${p.distance}${isShortest ? ' (Shortest)' : ''}`);

      // Path Line from User to Provider
      if (targetLocation) {
        L.polyline([
          [targetLocation.lat, targetLocation.lng],
          [p.location.lat, p.location.lng]
        ], {
          color: isSelected ? '#00f2ff' : (isShortest ? '#10b981' : '#cbd5e1'),
          weight: isSelected ? 4 : (isShortest ? 3 : 2),
          opacity: isSelected ? 0.8 : (isShortest ? 0.6 : 0.4),
          dashArray: (isSelected || isShortest) ? undefined : '5, 10'
        }).addTo(layerGroup.current!);
      }
    });
  }, [providers, targetLocation, selectedProvider]);

  return <div ref={mapRef} id="map-container" className="w-full h-full" />;
}
