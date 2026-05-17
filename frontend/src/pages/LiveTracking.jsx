import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Compass, Wind, Navigation, Play, Pause, RotateCcw, Activity, ShieldAlert, Cpu, Radio, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const LiveTracking = () => {
  const [selectedFlightId, setSelectedFlightId] = useState('AI-101');
  const [progress, setProgress] = useState(35); // Start at 35% progress for dramatic effect
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [logs, setLogs] = useState([
    { time: '12:30:05', msg: 'System check complete. Autopilot active.', type: 'info' },
    { time: '12:31:12', msg: 'GPS Signal Lock established (24 satellites linked).', type: 'success' },
    { time: '12:33:45', msg: 'Entered sector DELTA airspace boundary.', type: 'info' },
    { time: '12:34:50', msg: 'Transponder beacon ping fully synchronized.', type: 'success' }
  ]);

  const mapContainerRef = useRef(null);

  // Available flights list
  const trackableFlights = [
    { id: 'AI-101', number: 'AI-101', airline: 'Air India', from: 'DEL', to: 'BOM', duration: '2h 10m', speed: 840, altitude: 35000, color: '#00F0FF' },
    { id: 'BA-112', number: 'BA-112', airline: 'British Airways', from: 'LHR', to: 'JFK', duration: '7h 45m', speed: 890, altitude: 39000, color: '#8A2BE2' },
    { id: 'DL-404', number: 'DL-404', airline: 'Delta Air Lines', from: 'HND', to: 'SEA', duration: '9h 15m', speed: 910, altitude: 37000, color: '#EC4899' },
    { id: 'FL-902', number: 'FL-902', airline: 'FlightAgent Airways', from: 'DEL', to: 'BOM', duration: '2h 15m', speed: 850, altitude: 36000, color: '#10B981' }
  ];

  const activeFlight = trackableFlights.find(f => f.id === selectedFlightId) || trackableFlights[0];

  // Dynamically compute speed, altitude and telemetry based on current time
  const [liveSpeed, setLiveSpeed] = useState(activeFlight.speed);
  const [liveAltitude, setLiveAltitude] = useState(activeFlight.altitude);

  useEffect(() => {
    setLiveSpeed(activeFlight.speed);
    setLiveAltitude(activeFlight.altitude);
    setProgress(20 + Math.floor(Math.random() * 40)); // Random starting progress for realism
  }, [selectedFlightId]);

  // Main simulation tick loop
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            // Trigger completion log
            setLogs(l => [
              { time: new Date().toLocaleTimeString(), msg: `Flight ${activeFlight.number} has arrived safely at destination ${activeFlight.to}.`, type: 'success' },
              ...l.slice(0, 15)
            ]);
            return 0; // Reset flight
          }
          
          // Randomly trigger logging events
          if (Math.random() < 0.08) {
            const messages = [
              `Adjusting heading for minor wind shear.`,
              `Cabin pressure holding perfectly at 10.9 psi.`,
              `Transponder telemetry ping succeeded.`,
              `Optimal cruising altitude locked.`,
              `Entering cloud coverage sector.`
            ];
            const msg = messages[Math.floor(Math.random() * messages.length)];
            setLogs(l => [
              { time: new Date().toLocaleTimeString(), msg: `Flight ${activeFlight.number}: ${msg}`, type: Math.random() > 0.3 ? 'info' : 'success' },
              ...l.slice(0, 15)
            ]);
          }

          return prev + (0.15 * speedMultiplier);
        });

        // Oscillate telemetry values slightly
        setLiveSpeed(s => activeFlight.speed + Math.floor(Math.sin(Date.now() / 2000) * 12));
        setLiveAltitude(a => activeFlight.altitude + Math.floor(Math.cos(Date.now() / 4000) * 60));

      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speedMultiplier, selectedFlightId, activeFlight]);

  // Calculations for map rendering
  const fromCity = activeFlight.from;
  const toCity = activeFlight.to;
  
  // Coordinate positioning of airports on our high-tech vector canvas
  const airportCoordinates = {
    'DEL': { x: 200, y: 220, name: 'Indira Gandhi Int\'l Airport' },
    'BOM': { x: 380, y: 280, name: 'Chhatrapati Shivaji Maharaj Airport' },
    'LHR': { x: 120, y: 110, name: 'London Heathrow Airport' },
    'JFK': { x: 500, y: 150, name: 'John F. Kennedy Int\'l Airport' },
    'HND': { x: 150, y: 320, name: 'Tokyo Haneda Airport' },
    'SEA': { x: 480, y: 80, name: 'Seattle-Tacoma Int\'l Airport' },
  };

  const startCoord = airportCoordinates[fromCity] || { x: 100, y: 200 };
  const endCoord = airportCoordinates[toCity] || { x: 500, y: 200 };

  // Calculate curve points (control point for quadratic Bezier)
  const ctrlX = (startCoord.x + endCoord.x) / 2 + 30;
  const ctrlY = (startCoord.y + endCoord.y) / 2 - 80;

  // Bezier math to place the plane exactly on the curved path
  const getBezierPoint = (t) => {
    const x = (1 - t) * (1 - t) * startCoord.x + 2 * (1 - t) * t * ctrlX + t * t * endCoord.x;
    const y = (1 - t) * (1 - t) * startCoord.y + 2 * (1 - t) * t * ctrlY + t * t * endCoord.y;
    return { x, y };
  };

  // Derivative calculation to rotate plane along the heading of the curve
  const getBezierAngle = (t) => {
    const dx = 2 * (1 - t) * (ctrlX - startCoord.x) + 2 * t * (endCoord.x - ctrlX);
    const dy = 2 * (1 - t) * (ctrlY - startCoord.y) + 2 * t * (endCoord.y - ctrlY);
    return Math.atan2(dy, dx) * (180 / Math.PI);
  };

  const currentT = progress / 100;
  const planePos = getBezierPoint(currentT);
  const planeAngle = getBezierAngle(currentT);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white pt-28 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* High-tech cosmic glowing background */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-neonCyan/5 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-neonPurple/5 rounded-full mix-blend-screen filter blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* Banner Section */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,240,255,0.05)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold uppercase tracking-wider text-neonCyan">
              <Radio size={12} className="animate-pulse" /> Global Transponder Beacon Status: Active
            </div>
            <h1 className="text-4xl font-display font-extrabold tracking-tight">
              Live <span className="text-gradient">Aerospace Telemetry</span> Tracker
            </h1>
            <p className="text-gray-400 font-light text-sm">Intercept active transponder frequencies, inspect real-time navigation telemetry, and plot live orbital vectors.</p>
          </div>

          {/* Quick Select Panel */}
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-wrap items-center gap-3">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Select Radar Target:</span>
            <select 
              value={selectedFlightId} 
              onChange={(e) => setSelectedFlightId(e.target.value)}
              className="bg-black/50 border border-white/15 rounded-xl px-4 py-2 text-sm text-neonCyan font-bold outline-none focus:border-neonCyan/50 select-none cursor-pointer"
            >
              {trackableFlights.map(f => (
                <option key={f.id} value={f.id} className="bg-[#0B0F19] text-white">
                  ✈️ {f.airline} ({f.number})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Dashboard Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1: Live Interactive Vector Map */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-white/10 flex flex-col justify-between space-y-6 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neonCyan to-neonPurple"></div>
            
            {/* Map Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Compass className="text-neonCyan animate-spin" style={{ animationDuration: '8s' }} size={20} />
                <h3 className="font-bold text-lg text-white">Vector Airspace Vector Map</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider font-mono">Telemetry Lock: {progress.toFixed(1)}%</span>
              </div>
            </div>

            {/* Futuristic Vector Flight Path Canvas */}
            <div ref={mapContainerRef} className="w-full h-[400px] bg-black/60 border border-white/5 rounded-2xl relative overflow-hidden grid-pattern shadow-inner">
              <svg className="absolute inset-0 w-full h-full">
                <defs>
                  {/* Neon Glow Filters */}
                  <filter id="neon-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="neon-glow-purple" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  
                  {/* Grid Pattern */}
                  <pattern id="radar-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
                  </pattern>
                </defs>

                {/* Radar Grid overlay */}
                <rect width="100%" height="100%" fill="url(#radar-grid)" />

                {/* Range Rings (Futuristic aerospace tracker circles) */}
                <circle cx={planePos.x} cy={planePos.y} r="60" fill="none" stroke="rgba(0, 240, 255, 0.08)" strokeWidth="1" className="animate-ping" style={{ animationDuration: '3s' }} />
                <circle cx={planePos.x} cy={planePos.y} r="120" fill="none" stroke="rgba(0, 240, 255, 0.03)" strokeWidth="1" />

                {/* Quadratic Bezier Flight Route Curve */}
                <path 
                  d={`M ${startCoord.x} ${startCoord.y} Q ${ctrlX} ${ctrlY} ${endCoord.x} ${endCoord.y}`} 
                  fill="none" 
                  stroke="rgba(255,255,255,0.08)" 
                  strokeWidth="2" 
                  strokeDasharray="4,6"
                />

                {/* Active Glowing Route Trail left behind plane */}
                <path 
                  d={`M ${startCoord.x} ${startCoord.y} Q ${ctrlX} ${ctrlY} ${endCoord.x} ${endCoord.y}`} 
                  fill="none" 
                  stroke={activeFlight.color} 
                  strokeWidth="3.5" 
                  strokeDasharray="2000"
                  strokeDashoffset={2000 - (2000 * currentT)}
                  filter="url(#neon-glow-cyan)"
                  className="transition-all duration-100 ease-out"
                />

                {/* Airport Beacon Points */}
                {/* Source Airport */}
                <circle cx={startCoord.x} cy={startCoord.y} r="6" fill="#00F0FF" />
                <circle cx={startCoord.x} cy={startCoord.y} r="14" fill="none" stroke="#00F0FF" strokeWidth="1.5" className="animate-pulse" />
                
                {/* Destination Airport */}
                <circle cx={endCoord.x} cy={endCoord.y} r="6" fill="#8A2BE2" />
                <circle cx={endCoord.x} cy={endCoord.y} r="14" fill="none" stroke="#8A2BE2" strokeWidth="1.5" className="animate-pulse" />

                {/* Vector Map UI Labels */}
                <text x={startCoord.x - 35} y={startCoord.y + 24} fill="#00F0FF" fontSize="11" fontWeight="800" letterSpacing="1">{fromCity} BEACON</text>
                <text x={endCoord.x - 35} y={endCoord.y + 24} fill="#8A2BE2" fontSize="11" fontWeight="800" letterSpacing="1">{toCity} BEACON</text>
              </svg>

              {/* Dynamic Flying Airplane Overlay */}
              <div 
                className="absolute w-12 h-12 flex items-center justify-center pointer-events-none transition-all duration-100 ease-out"
                style={{ 
                  left: planePos.x - 24, 
                  top: planePos.y - 24,
                  transform: `rotate(${planeAngle}deg)` 
                }}
              >
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-4 h-4 rounded-full bg-neonCyan animate-ping"></div>
                  <Plane 
                    size={30} 
                    className="text-white drop-shadow-[0_0_8px_rgba(0,240,255,0.8)] transform rotate-90" 
                  />
                </div>
              </div>

              {/* Coordinate Grid Labels */}
              <div className="absolute top-4 left-4 bg-black/60 border border-white/10 rounded px-2.5 py-1 text-[9px] font-mono text-gray-500 select-none">
                SECTOR: DELTA-9 // NAV_MODE: AUTO
              </div>
              <div className="absolute bottom-4 right-4 bg-black/60 border border-white/10 rounded px-2.5 py-1 text-[9px] font-mono text-gray-500 select-none">
                COORD: Lat {((planePos.y * 0.15) + 12).toFixed(4)}° N / Lng {((planePos.x * 0.18) + 72).toFixed(4)}° E
              </div>
            </div>

            {/* Simulation controls panel */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-3.5 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 ${
                    isPlaying 
                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20' 
                      : 'bg-neonCyan/10 border border-neonCyan/20 text-neonCyan hover:bg-neonCyan/20'
                  }`}
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  <span className="text-xs uppercase tracking-wider">{isPlaying ? 'Pause Simulation' : 'Engage Tracker'}</span>
                </button>

                <button 
                  onClick={() => setProgress(0)}
                  className="p-3.5 rounded-xl border border-white/10 hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Reset Flight Vector"
                >
                  <RotateCcw size={18} />
                </button>
              </div>

              {/* Acceleration controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mr-1">Time Warp:</span>
                {[1, 5, 10].map(multiplier => (
                  <button 
                    key={multiplier}
                    onClick={() => setSpeedMultiplier(multiplier)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                      speedMultiplier === multiplier 
                        ? 'bg-neonCyan text-black font-extrabold shadow-[0_0_10px_rgba(0,240,255,0.4)]' 
                        : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {multiplier}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Dashboard Telemetry Panel */}
          <div className="space-y-8 col-span-1">
            
            {/* Live Telemetry Card */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neonPurple to-pink-500"></div>
              
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Activity className="text-neonPurple" size={20} /> Flight Telemetry
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
                      <p className="text-2xl font-black font-mono text-white tracking-tight">{liveSpeed} <span className="text-xs font-light text-gray-400">km/h</span></p>
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
                      <p className="text-2xl font-black font-mono text-white tracking-tight">{liveAltitude.toLocaleString()} <span className="text-xs font-light text-gray-400">ft</span></p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-600" />
                </div>

                {/* Distance Covered Indicator */}
                <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <span>Distance Progress</span>
                    <span className="font-mono text-neonCyan">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <div 
                      className="h-full bg-gradient-to-r from-neonCyan to-neonPurple transition-all duration-100 ease-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs font-medium pt-1 text-gray-400">
                    <span>{fromCity}</span>
                    <span>{toCity}</span>
                  </div>
                </div>

                {/* Navigation Status Overview */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Navigation size={12} className="text-neonCyan" /> Flight Route Diagnostics
                  </h4>
                  <div className="space-y-2 text-sm text-gray-300 font-light">
                    <div className="flex justify-between border-b border-white/5 pb-1"><span>Carrier:</span> <span className="font-bold text-white">{activeFlight.airline}</span></div>
                    <div className="flex justify-between border-b border-white/5 pb-1"><span>Route Vector:</span> <span className="font-bold text-white">{fromCity} → {toCity}</span></div>
                    <div className="flex justify-between border-b border-white/5 pb-1"><span>Cabin Temp:</span> <span className="font-bold text-white">22.4°C</span></div>
                    <div className="flex justify-between"><span>Outside Temp:</span> <span className="font-bold text-neonCyan">-52.6°C</span></div>
                  </div>
                </div>

              </div>
            </div>

            {/* Live Pilot Transmission Log */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between h-[230px]">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neonCyan to-neonPurple"></div>
              
              <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-3">
                <Cpu className="text-neonCyan" size={18} />
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live System Logs & Pilot Transmissions</h4>
              </div>

              {/* Scrolling Terminal Ticker */}
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
                      <span className={log.type === 'success' ? 'text-green-400 font-bold' : 'text-gray-350'}>
                        {log.msg}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

          </div>
        </div>

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
