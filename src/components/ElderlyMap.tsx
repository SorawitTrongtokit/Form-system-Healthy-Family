'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapMarker {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    status: 'passed' | 'failed' | 'other' | 'not_surveyed';
    age?: number;
    houseNumber?: string;
    villageNo?: number;
}

interface ElderlyMapProps {
    markers: MapMarker[];
    center?: [number, number];
    zoom?: number;
}

// Custom marker icons by status
const createIcon = (status: string) => {
    const colors: Record<string, string> = {
        passed: '#22c55e',      // green
        failed: '#ef4444',      // red
        other: '#3b82f6',       // blue
        not_surveyed: '#9ca3af' // gray
    };

    const color = colors[status] || colors.not_surveyed;

    return L.divIcon({
        className: 'custom-marker',
        html: `
      <div style="
        width: 30px;
        height: 30px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="color: white; font-size: 14px;">👴</span>
      </div>
    `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });
};

export default function ElderlyMap({ markers, center = [15.06, 100.49], zoom = 14 }: ElderlyMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        // Initialize map
        const map = L.map(mapRef.current).setView(center, zoom);
        mapInstanceRef.current = map;

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Add markers
        markers.forEach(marker => {
            const icon = createIcon(marker.status);

            const statusLabels: Record<string, string> = {
                passed: '✅ ผ่านเกณฑ์',
                failed: '❌ ไม่ผ่านเกณฑ์',
                other: '🔵 อื่นๆ',
                not_surveyed: '⚪ ยังไม่ได้กรอก'
            };

            const popupContent = `
        <div style="font-family: 'Sarabun', sans-serif; min-width: 180px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b;">${marker.name}</h3>
          <p style="margin: 4px 0; color: #64748b; font-size: 14px;">
            🎂 อายุ ${marker.age || '-'} ปี
          </p>
          <p style="margin: 4px 0; color: #64748b; font-size: 14px;">
            🏠 บ้านเลขที่ ${marker.houseNumber || '-'} หมู่ ${marker.villageNo || '-'}
          </p>
          <p style="margin: 8px 0 0 0; font-weight: 600; color: ${marker.status === 'passed' ? '#166534' :
                    marker.status === 'failed' ? '#991b1b' :
                        marker.status === 'other' ? '#1e40af' : '#374151'
                };">
            ${statusLabels[marker.status]}
          </p>
        </div>
      `;

            L.marker([marker.latitude, marker.longitude], { icon })
                .addTo(map)
                .bindPopup(popupContent);
        });

        // Fit bounds to show all markers
        if (markers.length > 0) {
            const bounds = L.latLngBounds(markers.map(m => [m.latitude, m.longitude]));
            map.fitBounds(bounds, { padding: [50, 50] });
        }

        // Cleanup
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [markers, center, zoom]);

    return (
        <div
            ref={mapRef}
            style={{
                height: '500px',
                width: '100%',
                borderRadius: '16px',
                overflow: 'hidden'
            }}
        />
    );
}
