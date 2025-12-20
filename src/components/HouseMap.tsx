'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ResidentMapInfo } from '@/lib/store';

interface HouseMarker {
    id: string;
    houseNumber: string;
    villageNo: number;
    latitude: number;
    longitude: number;
    totalResidents: number;
    surveyedCount: number;
    status: 'complete' | 'partial' | 'not_surveyed';
    headOfHouse: string;
    residents: ResidentMapInfo[];
}

interface HouseMapProps {
    houses: HouseMarker[];
}

// Create custom colored markers
const createMarkerIcon = (color: string) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                width: 24px;
                height: 24px;
                background-color: ${color};
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            "></div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
};

const greenIcon = createMarkerIcon('#22c55e');   // All passed
const redIcon = createMarkerIcon('#ef4444');     // Has failed
const yellowIcon = createMarkerIcon('#eab308');  // Partial survey
const grayIcon = createMarkerIcon('#9ca3af');    // Not surveyed

// Status colors for residents
const getResidentStatusColor = (status: string) => {
    switch (status) {
        case 'passed': return '#22c55e';    // Green - ผ่านเกณฑ์
        case 'failed': return '#ef4444';    // Red - ไม่ผ่าน
        case 'other': return '#3b82f6';     // Blue - อื่นๆ
        default: return '#9ca3af';          // Gray - ยังไม่ได้กรอก
    }
};

export default function HouseMap({ houses }: HouseMapProps) {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        // Initialize map
        const map = L.map(mapContainerRef.current).setView([15.05, 100.49], 13);
        mapRef.current = map;

        // Add tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add markers
        const markers: L.Marker[] = [];

        houses.forEach(house => {
            // Skip houses without valid GPS coordinates
            if (!house.latitude || !house.longitude || (house.latitude === 0 && house.longitude === 0)) {
                return;
            }

            // Determine marker color based on health status
            // Red: any failed, Green: all passed, Yellow: partial, Gray: not surveyed
            const hasAnyFailed = house.residents.some(r => r.status === 'failed');
            const allSurveyed = house.surveyedCount === house.totalResidents && house.totalResidents > 0;
            const allPassed = allSurveyed && house.residents.every(r => r.status === 'passed');
            const isPartial = house.surveyedCount > 0 && house.surveyedCount < house.totalResidents;
            const notSurveyed = house.surveyedCount === 0;

            let icon = grayIcon;
            let markerStatus = 'not_surveyed';
            if (hasAnyFailed) {
                icon = redIcon;
                markerStatus = 'failed';
            } else if (allPassed) {
                icon = greenIcon;
                markerStatus = 'passed';
            } else if (isPartial) {
                icon = yellowIcon;
                markerStatus = 'partial';
            }

            const statusText = markerStatus === 'failed' ? '🔴 มีคนไม่ผ่านเกณฑ์' :
                markerStatus === 'passed' ? '✅ ผ่านเกณฑ์ทุกคน' :
                    markerStatus === 'partial' ? '🟡 สำรวจบางส่วน' : '⚪ ยังไม่สำรวจ';

            const statusBgColor = markerStatus === 'failed' ? '#fee2e2' :
                markerStatus === 'passed' ? '#dcfce7' :
                    markerStatus === 'partial' ? '#fef9c3' : '#f3f4f6';

            // Build residents list HTML with colored status
            const residentsHtml = house.residents.map(r => `
                <div style="display: flex; align-items: center; gap: 6px; padding: 4px 0; border-bottom: 1px solid #eee;">
                    <span style="
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        background-color: ${getResidentStatusColor(r.status)};
                        flex-shrink: 0;
                        border: 1px solid rgba(0,0,0,0.1);
                    "></span>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 11px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.name}</div>
                        <div style="font-size: 9px; color: #888;">${r.relationship}</div>
                    </div>
                </div>
            `).join('');

            const marker = L.marker([house.latitude, house.longitude], { icon })
                .addTo(map)
                .bindPopup(`
                    <div style="min-width: 240px; max-height: 350px; font-family: 'Sarabun', sans-serif;">
                        <div style="font-weight: bold; font-size: 15px; margin-bottom: 4px; color: #0d9488;">
                            🏠 บ้านเลขที่ ${house.houseNumber}
                        </div>
                        <div style="color: #666; font-size: 12px;">หมู่ ${house.villageNo}</div>
                        <div style="margin-top: 8px; padding: 6px 10px; background: ${statusBgColor}; border-radius: 6px; text-align: center; font-size: 12px; font-weight: 500;">
                            ${statusText} (${house.surveyedCount}/${house.totalResidents} คน)
                        </div>
                        <div style="margin-top: 12px; font-size: 12px; font-weight: bold; color: #333;">
                            👥 รายชื่อสมาชิก:
                        </div>
                        <div style="max-height: 160px; overflow-y: auto; margin-top: 6px; padding-right: 4px;">
                            ${residentsHtml}
                        </div>
                        <div style="margin-top: 10px; padding: 6px; background: #f8fafc; border-radius: 4px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                            <span style="font-size: 9px; display: flex; align-items: center; gap: 3px;">
                                <span style="width: 8px; height: 8px; background: #22c55e; border-radius: 50%;"></span> ผ่าน
                            </span>
                            <span style="font-size: 9px; display: flex; align-items: center; gap: 3px;">
                                <span style="width: 8px; height: 8px; background: #ef4444; border-radius: 50%;"></span> ไม่ผ่าน
                            </span>
                            <span style="font-size: 9px; display: flex; align-items: center; gap: 3px;">
                                <span style="width: 8px; height: 8px; background: #3b82f6; border-radius: 50%;"></span> อื่นๆ
                            </span>
                            <span style="font-size: 9px; display: flex; align-items: center; gap: 3px;">
                                <span style="width: 8px; height: 8px; background: #9ca3af; border-radius: 50%;"></span> ยังไม่กรอก
                            </span>
                        </div>
                    </div>
                `, { maxWidth: 300 });

            markers.push(marker);
        });

        // Fit bounds to show all markers
        if (markers.length > 0) {
            const group = L.featureGroup(markers);
            map.fitBounds(group.getBounds().pad(0.1));
        }

        // Cleanup
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [houses]);

    return (
        <div
            ref={mapContainerRef}
            className="w-full h-[500px] rounded-2xl overflow-hidden shadow-lg"
        />
    );
}
