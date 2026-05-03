// ============================================================
//  Shared MapModal — Leaflet (loaded from CDN, no npm install)
//  Renders the donor + receiver pins and a polyline between them.
//  Used by VolunteerAvailableOffers and VolunteerMyDeliveries.
// ============================================================

import React, { useEffect, useRef } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import RouteIcon from '@mui/icons-material/Route';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

// One-time on-demand loader for Leaflet from CDN.
const ensureLeafletLoaded = () => new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);

    if (!document.querySelector(`link[data-feedhope-leaflet]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = LEAFLET_CSS;
        link.setAttribute('data-feedhope-leaflet', '1');
        document.head.appendChild(link);
    }

    const existing = document.querySelector(`script[data-feedhope-leaflet]`);
    if (existing) {
        existing.addEventListener('load',  () => resolve(window.L));
        existing.addEventListener('error', reject);
        return;
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.setAttribute('data-feedhope-leaflet', '1');
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.appendChild(script);
});

const MapModal = ({ open, onClose, donor, receiver, distanceKm, foodName }) => {
    const mapElRef = useRef(null);
    const mapRef   = useRef(null);

    // Coordinates may be null if the user didn't share them at registration.
    // Use primitives (numbers) for the effect deps so a parent re-render
    // (e.g. from 3s polling) doesn't tear down and rebuild the map mid-zoom.
    const donorLat    = donor?.lat    != null ? Number(donor.lat)    : null;
    const donorLon    = donor?.lon    != null ? Number(donor.lon)    : null;
    const receiverLat = receiver?.lat != null ? Number(receiver.lat) : null;
    const receiverLon = receiver?.lon != null ? Number(receiver.lon) : null;

    const donorPt    = donorLat    != null && donorLon    != null ? [donorLat, donorLon]       : null;
    const receiverPt = receiverLat != null && receiverLon != null ? [receiverLat, receiverLon] : null;
    const hasAnyPoint = !!donorPt || !!receiverPt;

    // Latest popup text in a ref so the effect can read it without listing
    // donor/receiver objects (whose identity flips every parent render) in deps.
    const labelRef = useRef({ donor, receiver });
    labelRef.current = { donor, receiver };

    useEffect(() => {
        if (!open || !hasAnyPoint) return;

        let cancelled = false;

        ensureLeafletLoaded().then((L) => {
            if (cancelled || !mapElRef.current) return;

            // Tear down any previous map
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }

            const map = L.map(mapElRef.current, { zoomControl: true });
            mapRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(map);

            const donorIcon = L.divIcon({
                html: `<div style="background:#16a34a;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:700;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);font-size:12px">D</div>`,
                className: '', iconSize: [32, 32], iconAnchor: [16, 16]
            });
            const receiverIcon = L.divIcon({
                html: `<div style="background:#1976d2;color:#fff;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:700;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);font-size:12px">R</div>`,
                className: '', iconSize: [32, 32], iconAnchor: [16, 16]
            });

            const points = [];
            const { donor: d, receiver: r } = labelRef.current;
            const donorPtLocal    = donorLat    != null && donorLon    != null ? [donorLat, donorLon]       : null;
            const receiverPtLocal = receiverLat != null && receiverLon != null ? [receiverLat, receiverLon] : null;
            if (donorPtLocal) {
                L.marker(donorPtLocal, { icon: donorIcon })
                    .addTo(map)
                    .bindPopup(`<strong>Pickup (Donor)</strong><br>${d?.name || ''}<br><small>${d?.address || ''}</small>`);
                points.push(donorPtLocal);
            }
            if (receiverPtLocal) {
                L.marker(receiverPtLocal, { icon: receiverIcon })
                    .addTo(map)
                    .bindPopup(`<strong>Drop-off (Receiver)</strong><br>${r?.name || ''}<br><small>${r?.address || ''}</small>`);
                points.push(receiverPtLocal);
            }

            if (donorPtLocal && receiverPtLocal) {
                L.polyline([donorPtLocal, receiverPtLocal], {
                    color: '#1976d2', weight: 4, opacity: 0.7, dashArray: '8 8'
                }).addTo(map);
            }

            if (points.length === 1) {
                map.setView(points[0], 14);
            } else {
                map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
            }

            // Modal animations can leave the container at 0 size for a frame
            setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 120);
        }).catch(() => { /* leaflet failed to load — silent */ });

        return () => {
            cancelled = true;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
        // Primitive deps only — the map is rebuilt only when it actually opens
        // or the coordinates themselves change, not on every parent re-render.
    }, [open, hasAnyPoint, donorLat, donorLon, receiverLat, receiverLon]);

    if (!open) return null;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999, padding: 16
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: 12, width: 'min(720px, 100%)',
                    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                    overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,.25)'
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px', borderBottom: '1px solid #e2e8f0'
                }}>
                    <div>
                        <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Delivery Route
                        </div>
                        <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a' }}>
                            {foodName || 'Map'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            background: '#f1f5f9', border: 'none', borderRadius: 8,
                            width: 32, height: 32, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <CloseIcon style={{ fontSize: 18, color: '#475569' }} />
                    </button>
                </div>

                {/* Map */}
                {hasAnyPoint ? (
                    <div
                        ref={mapElRef}
                        onClick={(e) => e.stopPropagation()}
                        style={{ height: 380, width: '100%', background: '#e2e8f0' }}
                    />
                ) : (
                    <div style={{
                        height: 200, background: '#f8fafc', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: '#64748b', fontSize: 14, padding: 20, textAlign: 'center'
                    }}>
                        Location coordinates aren't available for this offer.
                    </div>
                )}

                {/* Footer */}
                <div style={{ padding: '14px 18px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 12 }}>
                        <div>
                            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                                <span style={{
                                    display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
                                    background: '#16a34a', verticalAlign: 'middle', marginRight: 6
                                }} />
                                Pickup (Donor)
                            </div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                                {donor?.name || '—'}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                <LocationOnIcon style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 2 }} />
                                {donor?.address || 'No address'}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                                <span style={{
                                    display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
                                    background: '#1976d2', verticalAlign: 'middle', marginRight: 6
                                }} />
                                Drop-off (Receiver)
                            </div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                                {receiver?.name || '—'}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                <LocationOnIcon style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 2 }} />
                                {receiver?.address || 'No address'}
                            </div>
                        </div>
                    </div>
                    <div style={{
                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                        padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8
                    }}>
                        <RouteIcon style={{ fontSize: 18, color: '#1976d2' }} />
                        <div style={{ fontSize: 13, color: '#0f172a' }}>
                            {distanceKm != null
                                ? <>Approx. <strong>{distanceKm} km</strong> straight-line distance between donor and receiver.</>
                                : 'Distance unavailable — coordinates missing for one of the parties.'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapModal;
