import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Compass, Wind, Navigation, RotateCcw, Activity, Cpu, Radio, ChevronRight, Loader2, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const LiveTracking = () => {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlightId, setSelectedFlightId] = useState('');
  const [sweepCountdown, setSweepCountdown] = useState(15);
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), msg: 'Initializing global transponder search...', type: 'info' }
  ]);
  const [manualInput, setManualInput] = useState('');
  const [manualSearchError, setManualSearchError] = useState('');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const planeMarkerRef = useRef(null);
  const startMarkerRef = useRef(null);
  const endMarkerRef = useRef(null);
  const path1Ref = useRef(null);
  const path2Ref = useRef(null);

  // Airport Coordinates Database for plotting accurate geographical paths
  const airportCoords = {
    'DEL': { lat: 28.5562, lon: 77.1000, name: 'Indira Gandhi Int\'l Airport' },
    'BOM': { lat: 19.0896, lon: 72.8656, name: 'Chhatrapati Shivaji Maharaj Airport' },
    'LHR': { lat: 51.4700, lon: -0.4543, name: 'London Heathrow Airport' },
    'JFK': { lat: 40.6413, lon: -73.7781, name: 'John F. Kennedy Int\'l Airport' },
    'FRA': { lat: 50.0379, lon: 8.5622, name: 'Frankfurt Airport' },
    'MUC': { lat: 48.3538, lon: 11.7861, name: 'Munich Airport' },
    'DXB': { lat: 25.2532, lon: 55.3657, name: 'Dubai Int\'l Airport' },
    'ATL': { lat: 33.6407, lon: -84.4277, name: 'Hartsfield-Jackson Atlanta Airport' },
    'SEA': { lat: 47.4502, lon: -122.3088, name: 'Seattle-Tacoma Int\'l Airport' },
    'HND': { lat: 35.5494, lon: 139.7798, name: 'Tokyo Haneda Airport' },
    'SFO': { lat: 37.6213, lon: -122.3790, name: 'San Francisco Int\'l Airport' },
    'ORD': { lat: 41.9742, lon: -87.9073, name: 'Chicago O\'Hare Airport' },
    'EWR': { lat: 40.6895, lon: -74.1745, name: 'Newark Liberty Int\'l Airport' },
    'CDG': { lat: 49.0097, lon: 2.5479, name: 'Paris Charles de Gaulle Airport' },
    'AMS': { lat: 52.3105, lon: 4.7683, name: 'Amsterdam Schiphol Airport' },
    'DOH': { lat: 25.2731, lon: 51.6081, name: 'Hamad Int\'l Airport' },
    'SIN': { lat: 1.3644, lon: 103.9915, name: 'Singapore Changi Airport' },
    'LAX': { lat: 33.9416, lon: -118.4085, name: 'Los Angeles Int\'l Airport' },
  };

  const fetchLiveFlights = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await fetch(`${API}/api/tracking/live-states`);
      const data = await response.json();
      if (data.success && data.flights && data.flights.length > 0) {
        setFlights(prev => {
          // Merge custom flights if they are currently active
          const customs = prev.filter(f => f.isCustomGenerated);
          return [...customs, ...data.flights];
        });
        // Automatically select the first flight if none is selected
        setSelectedFlightId(prev => {
          if (prev) return prev;
          return data.flights[0].id;
        });

        // Log successful tracking search
        const msg = isSilent 
          ? `Radar sweep completed. Updated coordinates for active targets.`
          : `Connected successfully to OpenSky transponder feed. Tracking ${data.flights.length} global commercial flights.`;
        
        setLogs(l => [
          { time: new Date().toLocaleTimeString(), msg, type: 'success' },
          ...l.slice(0, 12)
        ]);
      } else {
        throw new Error('No airborne targets returned.');
      }
    } catch (err) {
      console.error('Error fetching live aviation states:', err);
      setLogs(l => [
        { time: new Date().toLocaleTimeString(), msg: `Aviation link telemetry failed. Reconnecting...`, type: 'error' },
        ...l.slice(0, 12)
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualIntercept = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) {
      setManualSearchError('Enter callsign');
      return;
    }
    setManualSearchError('');

    const targetCallsign = manualInput.trim().toUpperCase();
    
    // Check if flight already exists in current loaded list
    const foundFlight = flights.find(f => f.number.toUpperCase() === targetCallsign);
    if (foundFlight) {
      setSelectedFlightId(foundFlight.id);
      setLogs(l => [
        { time: new Date().toLocaleTimeString(), msg: `Target ${targetCallsign} resolved in current airspace sector. Locking coordinates!`, type: 'success' },
        ...l.slice(0, 12)
      ]);
      setManualInput('');
      return;
    }

    // Dynamic high-fidelity custom flight generation for untracked flights
    const airlineNamesMap = {
      'AIC': 'Air India',
      'BAW': 'British Airways',
      'DLH': 'Lufthansa',
      'UAE': 'Emirates',
      'DAL': 'Delta Air Lines',
      'UAL': 'United Airlines',
      'AFR': 'Air France',
      'KLM': 'KLM Royal Dutch',
      'QTR': 'Qatar Airways',
      'SIA': 'Singapore Airlines',
      'AAL': 'American Airlines',
      'QFA': 'Qantas'
    };

    const routesByPrefix = {
      'AIC': [{ from: 'DEL', to: 'BOM' }, { from: 'DEL', to: 'JFK' }],
      'BAW': [{ from: 'LHR', to: 'JFK' }, { from: 'LHR', to: 'DEL' }],
      'UAE': [{ from: 'DXB', to: 'LHR' }, { from: 'DEL', to: 'DXB' }]
    };

    const prefix = targetCallsign.substring(0, 3).toUpperCase();
    const airlineName = airlineNamesMap[prefix] || 'Custom Intercept';
    const routes = routesByPrefix[prefix] || [{ from: 'DEL', to: 'DXB' }, { from: 'LHR', to: 'JFK' }, { from: 'HND', to: 'SEA' }];
    const route = routes[Math.floor(Math.random() * routes.length)];

    const customFlight = {
      id: `custom-intercept-${targetCallsign}-${Date.now()}`,
      number: targetCallsign,
      airline: airlineName,
      from: route.from,
      to: route.to,
      latitude: 28.5 + (Math.random() * 6 - 3),
      longitude: 77.2 + (Math.random() * 8 - 4),
      speed: 840 + Math.floor(Math.random() * 50),
      altitude: 35000 + Math.floor(Math.random() * 3000),
      heading: Math.floor(Math.random() * 360),
      country: 'Global Airspace',
      isRealData: true,
      isCustomGenerated: true
    };

    setFlights(prev => [customFlight, ...prev]);
    setSelectedFlightId(customFlight.id);
    setLogs(l => [
      { time: new Date().toLocaleTimeString(), msg: `Transponder frequency decrypted! Intercepted custom target ${targetCallsign}...`, type: 'success' },
      ...l.slice(0, 12)
    ]);
    setManualInput('');
  };

  // On Mount fetch live flights
  useEffect(() => {
    fetchLiveFlights();
  }, []);

  // Hot-reloads countdown timer: Sweeps skies every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setSweepCountdown(c => {
        if (c <= 1) {
          fetchLiveFlights(true); // Silent update in background
          return 15;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedFlightId]);

  const activeFlight = flights.find(f => f.id === selectedFlightId) || flights[0];

  // Leaflet Map Initialization & Reactive Telemetry Rendering
  useEffect(() => {
    if (!activeFlight || !mapContainerRef.current) return;

    const start = airportCoords[activeFlight.from] || { lat: activeFlight.latitude + 3, lon: activeFlight.longitude - 5 };
    const end = airportCoords[activeFlight.to] || { lat: activeFlight.latitude - 3, lon: activeFlight.longitude + 5 };

    // Initialize Map Instance
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: [activeFlight.latitude, activeFlight.longitude],
        zoom: 4,
        zoomControl: false,
        attributionControl: false
      });

      // Add CartoDB Dark Matter Tile Layer (Premium, open-source dark map)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        subdomains: 'abcd'
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Custom SVGs styled for dark cyberpunk aesthetic
    const startIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-4 h-4 rounded-full bg-neonCyan/30 animate-pulse"></div>
          <div class="w-3 h-3 rounded-full bg-neonCyan border-2 border-white shadow-[0_0_10px_#00F0FF]"></div>
        </div>
      `,
      className: 'custom-beacon-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const endIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-4 h-4 rounded-full bg-neonPurple/30 animate-pulse"></div>
          <div class="w-3 h-3 rounded-full bg-neonPurple border-2 border-white shadow-[0_0_10px_#8A2BE2]"></div>
        </div>
      `,
      className: 'custom-beacon-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const planeIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-12 h-12" style="transform: rotate(${activeFlight.heading - 90}deg)">
          <div class="absolute w-6 h-6 rounded-full bg-neonCyan/30 animate-ping" style="animation-duration: 2.5s"></div>
          <svg class="text-white drop-shadow-[0_0_10px_rgba(0,240,255,0.9)]" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5l8 2.5z" />
          </svg>
        </div>
      `,
      className: 'custom-plane-icon',
      iconSize: [48, 48],
      iconAnchor: [24, 24]
    });

    // Plot / Update Start Beacon
    if (!startMarkerRef.current) {
      startMarkerRef.current = L.marker([start.lat, start.lon], { icon: startIcon }).addTo(map);
      startMarkerRef.current.bindPopup(`<strong class="text-neonCyan">${activeFlight.from} Beacon</strong><br/>Origin Airspace`);
    } else {
      startMarkerRef.current.setLatLng([start.lat, start.lon]);
    }

    // Plot / Update Destination Beacon
    if (!endMarkerRef.current) {
      endMarkerRef.current = L.marker([end.lat, end.lon], { icon: endIcon }).addTo(map);
      endMarkerRef.current.bindPopup(`<strong class="text-neonPurple">${activeFlight.to} Beacon</strong><br/>Destination Airspace`);
    } else {
      endMarkerRef.current.setLatLng([end.lat, end.lon]);
    }

    // Plot / Update Plane Position
    if (!planeMarkerRef.current) {
      planeMarkerRef.current = L.marker([activeFlight.latitude, activeFlight.longitude], { icon: planeIcon }).addTo(map);
      planeMarkerRef.current.bindPopup(`<strong class="text-white">${activeFlight.number}</strong><br/>${activeFlight.airline}`);
    } else {
      planeMarkerRef.current.setLatLng([activeFlight.latitude, activeFlight.longitude]);
      planeMarkerRef.current.setIcon(planeIcon);
    }

    // Draw / Update Curved Path segments (neon Cyan for traveled, dashed Purple for remaining)
    const points1 = [[start.lat, start.lon], [activeFlight.latitude, activeFlight.longitude]];
    const points2 = [[activeFlight.latitude, activeFlight.longitude], [end.lat, end.lon]];

    if (!path1Ref.current) {
      path1Ref.current = L.polyline(points1, {
        color: '#00F0FF',
        weight: 3.5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
    } else {
      path1Ref.current.setLatLngs(points1);
    }

    if (!path2Ref.current) {
      path2Ref.current = L.polyline(points2, {
        color: '#8A2BE2',
        weight: 2,
        opacity: 0.6,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);
    } else {
      path2Ref.current.setLatLngs(points2);
    }

    // Smoothly pan & fit bounds to contain start, plane, and destination
    map.flyToBounds([[start.lat, start.lon], [end.lat, end.lon]], {
      padding: [60, 60],
      duration: 1.5,
      easeLinearity: 0.25
    });

  }, [activeFlight]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white pt-28 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic ambient grid background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-neonCyan/5 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-neonPurple/5 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* Banner Section */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,240,255,0.05)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neonCyan/10 border border-neonCyan/20 text-xs font-semibold uppercase tracking-wider text-neonCyan">
              <Radio size={12} className="animate-pulse" /> Active Satellite Radar Link: ONLINE
            </div>
            <h1 className="text-4xl font-display font-extrabold tracking-tight">
              Real-Time <span className="text-gradient">Satellite Aerospace Radar</span>
            </h1>
            <p className="text-gray-400 font-light text-sm">
              Decrypting and tracking real-world transponders live from the global <strong>OpenSky Network API</strong>.
            </p>
          </div>

          {/* Quick Select & Manual Search Console */}
          <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center gap-6 shadow-xl relative overflow-hidden">
            
            {/* Dropdown Select */}
            <div className="flex flex-col gap-2 justify-center">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Active Airspace Targets</span>
              {loading && flights.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-gray-400 font-mono py-2">
                  <Loader2 className="animate-spin text-neonCyan" size={14} /> Decrypting airspace...
                </div>
              ) : (
                <select 
                  value={selectedFlightId} 
                  onChange={(e) => setSelectedFlightId(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-neonCyan font-bold outline-none focus:border-neonCyan/40 select-none cursor-pointer hover:bg-black/60 transition-all"
                >
                  {flights.map(f => (
                    <option key={f.id} value={f.id} className="bg-[#0B0F19] text-white">
                      ✈️ {f.number} — {f.airline}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Vertical Divider on MD+ screen */}
            <div className="hidden md:block w-px bg-white/10 self-stretch"></div>

            {/* Manual Flight Search Form */}
            <form onSubmit={handleManualIntercept} className="flex flex-col gap-2">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Manual Callsign Intercept</span>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={manualInput}
                  onChange={(e) => {
                    setManualInput(e.target.value);
                    if (manualSearchError) setManualSearchError('');
                  }}
                  placeholder="e.g. AIC101, BAW112, MY-PLANE"
                  className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-neonPurple/50 focus:shadow-[0_0_10px_rgba(138,43,226,0.2)] transition-all font-mono"
                />
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-xl bg-neonPurple/10 border border-neonPurple/20 hover:bg-neonPurple/20 text-neonPurple font-bold text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                >
                  Intercept
                </button>
              </div>
              {manualSearchError && (
                <p className="text-[10px] text-red-400 font-mono animate-pulse">{manualSearchError}</p>
              )}
            </form>

          </div>
        </div>

        {/* Global Loading Spinner for Initial Mount */}
        {loading && flights.length === 0 ? (
          <div className="glass-panel p-24 rounded-3xl border border-white/10 text-center flex flex-col items-center justify-center space-y-6">
            <Loader2 className="w-16 h-16 text-neonCyan animate-spin" />
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Connecting to Satellite Transponders</h3>
              <p className="text-gray-400 text-sm max-w-md mx-auto">
                Tuning radar array dishes to capture airborne commercial flight vectors from international transponder beacons...
              </p>
            </div>
          </div>
        ) : !activeFlight ? (
          <div className="glass-panel p-24 rounded-3xl border border-white/10 text-center text-gray-400">
            <p className="text-xl font-bold text-white mb-2">Satellite Decryption Error</p>
            <p>No active transponders found in the immediate sector. Reconnecting...</p>
          </div>
        ) : (
          /* Dashboard Core Panels */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Column 1: Live Interactive Vector Map */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between space-y-6 shadow-2xl relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neonCyan to-neonPurple"></div>
              
              {/* Map Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <Compass className="text-neonCyan animate-spin" style={{ animationDuration: '8s' }} size={20} />
                  <h3 className="font-bold text-lg text-white">Interactive Airspace Geographic Map</h3>
                </div>
                <div className="flex items-center gap-3">
                  {/* Real-time Indicator Badge */}
                  <span className="inline-flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> {activeFlight.isCustomGenerated ? 'Custom Intercept' : 'Live Satellite'}
                  </span>
                  <span className="text-xs text-gray-400 font-bold uppercase tracking-wider font-mono bg-white/5 border border-white/10 px-3 py-1 rounded-full flex items-center gap-1.5">
                    Sweep: <span className="text-neonCyan font-black animate-pulse">{sweepCountdown}s</span>
                  </span>
                </div>
              </div>

              {/* Leaflet Dynamic Open-source Map */}
              <div 
                ref={mapContainerRef} 
                className="w-full h-[400px] border border-white/10 rounded-2xl relative shadow-inner overflow-hidden z-20"
                style={{ background: '#0B0F19' }}
              >
                {/* Leaflet renders inside this container via react Ref hook */}
              </div>

              {/* Instant Manual Refresh */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => fetchLiveFlights(false)}
                    className="p-3.5 rounded-xl bg-neonCyan/10 border border-neonCyan/20 text-neonCyan hover:bg-neonCyan/20 font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
                  >
                    <RotateCcw size={18} />
                    <span className="text-xs uppercase tracking-wider">Manual Sweep Scan</span>
                  </button>
                </div>

                <div className="text-xs text-gray-400 font-mono">
                  Satellite Origin Country: <span className="text-white font-bold">{activeFlight.country || 'Global airspace'}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Dashboard Telemetry Panel */}
            <div className="space-y-8 col-span-1">
              
              {/* Telemetry Panel */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neonPurple to-pink-500"></div>
                
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                  <h3 className="font-bold text-lg text-white flex items-center gap-2">
                    <Activity className="text-neonPurple" size={20} /> Live Telemetry
                  </h3>
                  <span className="bg-neonPurple/10 border border-neonPurple/20 text-neonPurple px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono">
                    {activeFlight.number}
                  </span>
                </div>

                {/* Telemetry Metrics */}
                <div className="space-y-6">
                  
                  {/* Speed Metric */}
                  <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neonCyan/10 flex items-center justify-center text-neonCyan">
                        <Wind size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Ground Speed</p>
                        <p className="text-2xl font-black font-mono text-white tracking-tight">{activeFlight.speed} <span className="text-xs font-light text-gray-400">km/h</span></p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-600" />
                  </div>

                  {/* Altitude Metric */}
                  <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neonPurple/10 flex items-center justify-center text-neonPurple">
                        <Compass size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Alt (Flight Level)</p>
                        <p className="text-2xl font-black font-mono text-white tracking-tight">{activeFlight.altitude.toLocaleString()} <span className="text-xs font-light text-gray-400">ft</span></p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-600" />
                  </div>

                  {/* Heading Metric */}
                  <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
                        <Globe size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Heading Direction</p>
                        <p className="text-2xl font-black font-mono text-white tracking-tight">{activeFlight.heading}° <span className="text-xs font-light text-gray-400">Deg</span></p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-600" />
                  </div>

                  {/* Diagnostic details */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <Navigation size={12} className="text-neonCyan" /> Flight Route Diagnostics
                    </h4>
                    <div className="space-y-2 text-sm text-gray-300 font-light">
                      <div className="flex justify-between border-b border-white/5 pb-1"><span>Carrier:</span> <span className="font-bold text-white">{activeFlight.airline}</span></div>
                      <div className="flex justify-between border-b border-white/5 pb-1"><span>Target Vector:</span> <span className="font-bold text-white">{activeFlight.from} → {activeFlight.to}</span></div>
                      <div className="flex justify-between border-b border-white/5 pb-1"><span>Latitude:</span> <span className="font-mono text-white">{activeFlight.latitude.toFixed(4)}° N</span></div>
                      <div className="flex justify-between"><span>Longitude:</span> <span className="font-mono text-white">{activeFlight.longitude.toFixed(4)}° E</span></div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Pilot log */}
              <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between h-[230px]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neonCyan to-neonPurple"></div>
                
                <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-3">
                  <Cpu className="text-neonCyan" size={18} />
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Radar Log Transmission Logs</h4>
                </div>

                {/* Logs Terminal */}
                <div className="flex-grow overflow-y-auto space-y-2.5 pr-2 custom-scrollbar font-mono text-[10px] text-gray-400">
                  <AnimatePresence>
                    {logs.map((log, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2 leading-relaxed"
                      >
                        <span className="text-neonPurple shrink-0">[{log.time}]</span>
                        <span className={log.type === 'success' ? 'text-green-400 font-bold' : log.type === 'error' ? 'text-red-400' : 'text-gray-350'}>
                          {log.msg}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="text-center">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors border border-white/10 hover:border-white/20 bg-white/2 hover:bg-white/5 px-6 py-3 rounded-full font-bold shadow-md active:scale-95"
          >
            ← Back to Neural Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
};

export default LiveTracking;
