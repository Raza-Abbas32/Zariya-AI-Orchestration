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

      // Light Futuristic Grayscale Map Tile Layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(leafletMap.current);

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
        duration: 1.8,
        easeLinearity: 0.25
      });

      // User Target Custom Glowing Node Icon
      const userHtml = `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-8 h-8 rounded-full bg-emerald-500/20 animate-ripple"></div>
          <div class="absolute w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_8px_#10b981] animate-pulse"></div>
        </div>
      `;

      const userIcon = L.divIcon({
        html: userHtml,
        className: 'custom-leaflet-user-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker([targetLocation.lat, targetLocation.lng], { icon: userIcon })
        .addTo(layerGroup.current)
        .bindTooltip("SIGNAL SOURCE (YOU)", { 
          permanent: true, 
          direction: "top", 
          offset: [0, -10],
          className: 'custom-map-tooltip-user font-mono font-bold text-[9px] text-emerald-600 bg-white border border-emerald-500/30 rounded px-2 py-0.5 shadow-md shadow-emerald-500/5' 
        });
    }

    // Find the provider with the minimum distance (shortest path)
    const shortestProviderId = providers.length > 0 
      ? [...providers].sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))[0].id
      : null;

    providers.forEach(p => {
      const isSelected = selectedProvider?.id === p.id;
      const isShortest = p.id === shortestProviderId;
      
      let markerColorClass = 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.4)]';
      let rippleColor = 'bg-slate-500/15';
      if (isSelected) {
        markerColorClass = 'bg-[#5503A5] shadow-[0_0_12px_rgba(85,3,165,0.6)] border border-white';
        rippleColor = 'bg-[#5503A5]/25';
      } else if (isShortest) {
        markerColorClass = 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)] border border-white';
        rippleColor = 'bg-emerald-500/15';
      }

      // Provider Glowing Div Icon
      const providerHtml = `
        <div class="relative flex items-center justify-center w-8 h-8">
          ${isSelected ? `<div class="absolute w-8 h-8 rounded-full ${rippleColor} animate-ping"></div>` : ''}
          <div class="absolute w-3.5 h-3.5 rounded-full ${markerColorClass} transition-all duration-300"></div>
        </div>
      `;

      const providerIcon = L.divIcon({
        html: providerHtml,
        className: 'custom-leaflet-provider-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([p.location.lat, p.location.lng], { icon: providerIcon })
        .addTo(layerGroup.current!);
      
      // Beautiful Cyberpunk Popup in Light Theme
      const popupHtml = `
        <div class="font-sans text-xs bg-white text-slate-800 p-3 rounded-2xl border border-slate-200/60 shadow-xl min-w-[160px]">
          <div class="font-black border-b border-slate-100 pb-1.5 mb-1.5 uppercase tracking-wide flex items-center gap-1.5 text-[#5503A5]">
            <span class="w-1.5 h-1.5 rounded-full bg-[#5503A5] animate-pulse"></span>
            ${p.name.split(' ')[0]}
          </div>
          <div class="space-y-1 font-mono text-[9px] text-slate-500">
            <div>Distance: <span class="text-slate-700 font-bold">${p.distance}</span></div>
            <div>ETA: <span class="text-[#5503A5] font-bold">${p.eta}</span></div>
            <div>Trust Score: <span class="text-emerald-600 font-bold">${(p.trustScore * 100).toFixed(0)}%</span></div>
            <div>Total Fee: <span class="text-[#5503A5] font-bold">PKR ${p.pricing.total}</span></div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: false,
        className: 'custom-leaflet-popup'
      });

      // Path Line from User to Provider
      if (targetLocation) {
        const polyline = L.polyline([
          [targetLocation.lat, targetLocation.lng],
          [p.location.lat, p.location.lng]
        ], {
          color: isSelected ? '#5503A5' : (isShortest ? '#059669' : 'rgba(148,163,184,0.3)'),
          weight: isSelected ? 3.5 : (isShortest ? 2.5 : 1.5),
          opacity: isSelected ? 0.95 : (isShortest ? 0.7 : 0.4),
          dashArray: isSelected ? undefined : '5, 8'
        }).addTo(layerGroup.current!);

        // If selected, add an animated glow stroke
        if (isSelected) {
          polyline.bindTooltip(`Matching Path: ${p.eta}`, { 
            sticky: true, 
            className: 'font-mono text-[8px] bg-white border border-[#5503A5]/30 text-[#5503A5] px-1.5 py-0.5 rounded shadow-md' 
          });
        }
      }
    });
  }, [providers, targetLocation, selectedProvider]);

  return <div ref={mapRef} id="map-container" className="w-full h-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-md bg-white" />;
}
