import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlaneTakeoff, PlaneLanding, Calendar, Search, SlidersHorizontal, X, MapPin, Clock, AlertCircle, Info, Loader2, CheckCircle, User, CreditCard } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import airportLookup from '../data/airportLookup.json';

const matchesAirport = (code, query) => {
  if (!query) return true;
  const q = query.toLowerCase();
  if (code.toLowerCase().includes(q)) return true;
  const info = airportLookup[code];
  if (!info) return false;
  return (info.city || '').toLowerCase().includes(q) || (info.country || '').toLowerCase().includes(q) || (info.full || '').toLowerCase().includes(q);
};

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FlightSearch = () => {
  const { formatCurrency } = useCurrency();
  const [selectedFlight, setSelectedFlight] = useState(null);
  const dateRef = useRef(null);
  const [allFlights, setAllFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(20);
  const [hasSearched, setHasSearched] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(0); // 0=details, 1=form, 2=confirmed
  const [bookingRef, setBookingRef] = useState('');
  const [passengerName, setPassengerName] = useState('');
  const [passengerEmail, setPassengerEmail] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [formError, setFormError] = useState('');
  const [seat, setSeat] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [etherealUrl, setEtherealUrl] = useState('');

  const handleGenerateDemoTicket = async () => {
    if (!passengerName.trim() || !passengerEmail.trim()) {
      setFormError('Please fill in all required fields');
      return;
    }
    if (!passengerEmail.includes('@')) {
      setFormError('Please enter a valid email address');
      return;
    }

    setEmailSending(true);
    setFormError('');

    const newBookingRef = `FA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const newSeat = `${Math.floor(Math.random() * 30) + 1}${['A','B','C','D','E','F'][Math.floor(Math.random() * 6)]}`;
    
    const depDateObj = searchDate ? new Date(searchDate) : new Date(Date.now() + 7 * 86400000);
    const depStr = depDateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    setBookingRef(newBookingRef);
    setSeat(newSeat);

    try {
      const response = await fetch(`${API}/api/tickets/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          passengerName,
          passengerEmail,
          flight: selectedFlight,
          bookingRef: newBookingRef,
          seat: newSeat,
          departureDate: depStr
        })
      });

      const data = await response.json();
      if (response.ok) {
        if (data.etherealUrl) {
          setEtherealUrl(data.etherealUrl);
        } else {
          setEtherealUrl('');
        }
        setCheckoutStep(3);
      } else {
        setFormError(data.message || 'Failed to generate e-ticket & email');
      }
    } catch (err) {
      console.error(err);
      setFormError('Network error: Unable to connect to backend server');
    } finally {
      setEmailSending(false);
    }
  };

  // Load flights data
  useEffect(() => {
    import('../data/flights.json').then(mod => {
      setAllFlights(mod.default || mod);
      setLoading(false);
    });
  }, []);

  const allAirlines = useMemo(() => {
    const set = new Set();
    allFlights.forEach(f => set.add(f.airline));
    return [...set].sort();
  }, [allFlights]);

  const [maxPrice, setMaxPrice] = useState(5000);
  const [selectedCarriers, setSelectedCarriers] = useState([]);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [activeSearch, setActiveSearch] = useState({ from: '', to: '' });

  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);

  const fromSuggestions = useMemo(() => {
    if (!searchFrom.trim()) return [];
    const q = searchFrom.toLowerCase();
    return Object.entries(airportLookup)
      .filter(([code, info]) => {
        return code.toLowerCase().includes(q) || 
               (info.city || '').toLowerCase().includes(q) || 
               (info.country || '').toLowerCase().includes(q) || 
               (info.full || '').toLowerCase().includes(q);
      })
      .slice(0, 5)
      .map(([code, info]) => ({ code, ...info }));
  }, [searchFrom]);

  const toSuggestions = useMemo(() => {
    if (!searchTo.trim()) return [];
    const q = searchTo.toLowerCase();
    return Object.entries(airportLookup)
      .filter(([code, info]) => {
        return code.toLowerCase().includes(q) || 
               (info.city || '').toLowerCase().includes(q) || 
               (info.country || '').toLowerCase().includes(q) || 
               (info.full || '').toLowerCase().includes(q);
      })
      .slice(0, 5)
      .map(([code, info]) => ({ code, ...info }));
  }, [searchTo]);

  const handleCarrierToggle = (airline) => {
    setSelectedCarriers(prev => 
      prev.includes(airline) 
        ? prev.filter(c => c !== airline)
        : [...prev, airline]
    );
  };

  const handleSearch = () => {
    setActiveSearch({ from: searchFrom.trim().toLowerCase(), to: searchTo.trim().toLowerCase() });
    setHasSearched(true);
    setVisibleCount(20);
    setSelectedCarriers([]); // Reset carrier filter on new search
  };

  // Popular airlines to feature as defaults
  const popularAirlines = ['Emirates', 'Singapore Airlines', 'Air India', 'Lufthansa', 'British Airways', 'Qatar Airways', 'American Airlines', 'Delta Air Lines', 'Cathay Pacific', 'Turkish Airlines', 'Japan Airlines', 'Air France', 'Qantas', 'Korean Air', 'United Airlines'];

  // Step 1: Filter by route (search or popular)
  const routeMatchedFlights = useMemo(() => {
    if (!hasSearched) {
      // Pick flights evenly from each popular airline for a diverse default view
      const perAirline = 15;
      const defaults = [];
      popularAirlines.forEach(name => {
        const airlineFlights = allFlights.filter(f => f.airline === name);
        // Pick evenly spaced flights from this airline
        const step = Math.max(1, Math.floor(airlineFlights.length / perAirline));
        for (let i = 0; i < airlineFlights.length && defaults.length < popularAirlines.length * perAirline; i += step) {
          defaults.push(airlineFlights[i]);
          if (defaults.filter(d => d.airline === name).length >= perAirline) break;
        }
      });
      return defaults;
    }
    return allFlights.filter(f => {
      const matchesFrom = matchesAirport(f.from, activeSearch.from);
      const matchesTo = matchesAirport(f.to, activeSearch.to);
      return matchesFrom && matchesTo;
    });
  }, [allFlights, activeSearch, hasSearched]);

  // Step 2: Get available airlines from route matches (for the carrier filter sidebar)
  const matchedAirlines = useMemo(() => {
    const set = new Set();
    routeMatchedFlights.forEach(f => set.add(f.airline));
    return [...set].sort();
  }, [routeMatchedFlights]);

  // Step 3: Apply price + carrier filters on top of route matches
  const filteredFlights = useMemo(() => {
    return routeMatchedFlights.filter(f => {
      const withinPrice = f.price <= maxPrice;
      const matchesCarrier = selectedCarriers.length === 0 || selectedCarriers.includes(f.airline);
      return withinPrice && matchesCarrier;
    });
  }, [routeMatchedFlights, maxPrice, selectedCarriers]);

  const visibleFlights = filteredFlights.slice(0, visibleCount);

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-neonCyan/10 rounded-full mix-blend-screen filter blur-[120px] pointer-events-none"></div>
      
      <div className="space-y-8 relative z-10">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-3xl p-8 border border-white/10 relative z-20">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neonCyan to-neonPurple"></div>
          <h2 className="text-4xl font-extrabold mb-8 text-white tracking-tight">Locate Flights</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
            <div className="bg-white/5 rounded-xl p-3 flex items-center border border-white/10 hover:border-neonCyan/50 transition-colors relative">
              <PlaneTakeoff className="text-neonCyan mr-3 shrink-0" size={20} />
              <div className="relative w-full">
                <input 
                  type="text" 
                  placeholder="From (e.g. DEL)" 
                  value={searchFrom} 
                  onChange={e => {
                    setSearchFrom(e.target.value);
                    setShowFromSuggestions(true);
                  }} 
                  onFocus={() => setShowFromSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()} 
                  className="outline-none w-full bg-transparent text-white placeholder-gray-400" 
                />
                
                {showFromSuggestions && fromSuggestions.length > 0 && (
                  <div className="absolute left-[-44px] right-[-14px] mt-4 bg-[#0F1424]/98 border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl max-h-64 overflow-y-auto">
                    {fromSuggestions.map(airport => (
                      <div 
                        key={airport.code} 
                        onClick={() => {
                          setSearchFrom(airport.code);
                          setShowFromSuggestions(false);
                        }}
                        className="px-4 py-3.5 hover:bg-neonCyan/15 cursor-pointer flex items-center justify-between border-b border-white/5 last:border-b-0 group transition-all duration-150"
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="font-bold text-sm text-white group-hover:text-neonCyan transition-colors truncate">{airport.city} ({airport.code})</span>
                          <span className="text-[10px] text-gray-400 truncate max-w-[170px] mt-0.5">{airport.full}</span>
                        </div>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest shrink-0">{airport.country}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-white/5 rounded-xl p-3 flex items-center border border-white/10 hover:border-neonCyan/50 transition-colors relative">
              <PlaneLanding className="text-neonCyan mr-3 shrink-0" size={20} />
              <div className="relative w-full">
                <input 
                  type="text" 
                  placeholder="To (e.g. JFK)" 
                  value={searchTo} 
                  onChange={e => {
                    setSearchTo(e.target.value);
                    setShowToSuggestions(true);
                  }} 
                  onFocus={() => setShowToSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()} 
                  className="outline-none w-full bg-transparent text-white placeholder-gray-400" 
                />
                
                {showToSuggestions && toSuggestions.length > 0 && (
                  <div className="absolute left-[-44px] right-[-14px] mt-4 bg-[#0F1424]/98 border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl max-h-64 overflow-y-auto">
                    {toSuggestions.map(airport => (
                      <div 
                        key={airport.code} 
                        onClick={() => {
                          setSearchTo(airport.code);
                          setShowToSuggestions(false);
                        }}
                        className="px-4 py-3.5 hover:bg-neonCyan/15 cursor-pointer flex items-center justify-between border-b border-white/5 last:border-b-0 group transition-all duration-150"
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="font-bold text-sm text-white group-hover:text-neonCyan transition-colors truncate">{airport.city} ({airport.code})</span>
                          <span className="text-[10px] text-gray-400 truncate max-w-[170px] mt-0.5">{airport.full}</span>
                        </div>
                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest shrink-0">{airport.country}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div onClick={() => dateRef.current?.showPicker?.()} className="bg-white/5 rounded-xl p-3 flex items-center border border-white/10 hover:border-neonPurple/50 transition-colors cursor-pointer">
              <Calendar className="text-neonPurple mr-3 shrink-0" size={20} />
              <input ref={dateRef} type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} className="outline-none w-full bg-transparent text-white text-sm opacity-80 cursor-pointer [color-scheme:dark]" style={{ minHeight: '24px' }} />
            </div>
            <button onClick={handleSearch} className="neon-button bg-gradient-to-r from-neonCyan to-blue-600 rounded-xl font-bold flex items-center justify-center p-3">
              <Search className="mr-2" size={20} /> Execute Search
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="col-span-1 glass-panel p-6 rounded-2xl border border-white/10 h-fit">
            <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
              <SlidersHorizontal className="text-neonPurple" size={20} />
              <h3 className="font-bold text-xl text-white">Parameters</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-gray-400 block mb-3">Max Price: <span className="text-neonCyan font-bold">{formatCurrency(maxPrice)}</span></label>
                <input type="range" min="200" max="5000" step="50" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-neonCyan" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-400 block mb-2 uppercase tracking-wider">Carriers</label>
                <div className="max-h-48 overflow-y-auto pr-1 space-y-2">
                {matchedAirlines.map(airline => (
                  <div key={airline} onClick={() => handleCarrierToggle(airline)} className="flex items-center space-x-3 text-sm text-gray-300 hover:text-white cursor-pointer group select-none">
                    <div className={`w-4 h-4 rounded border shrink-0 ${selectedCarriers.includes(airline) ? 'bg-neonCyan border-neonCyan' : 'bg-black/30 border-white/30'} flex items-center justify-center transition-colors group-hover:border-neonCyan`}>
                      {selectedCarriers.includes(airline) && <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span>{airline}</span>
                  </div>
                ))}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-1 md:col-span-3 space-y-4">
            {loading ? (
              <div className="glass-panel p-12 rounded-2xl border border-white/10 text-center">
                <Loader2 className="w-10 h-10 text-neonCyan animate-spin mx-auto mb-4" />
                <p className="text-white font-bold text-lg">Loading 66,811 flights worldwide...</p>
                <p className="text-gray-400 text-sm mt-1">Sourced from OpenFlights global routes database</p>
              </div>
            ) : filteredFlights.length === 0 ? (
              <div className="glass-panel p-8 rounded-2xl border border-white/10 text-center text-gray-400">
                <p className="text-xl font-bold text-white mb-2">No flights match your parameters</p>
                <p>Try adjusting your max price or carrier filters.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-400 mb-2">
                  {hasSearched 
                    ? <>Showing {Math.min(visibleCount, filteredFlights.length)} of <span className="text-neonCyan font-bold">{filteredFlights.length.toLocaleString()}</span> flights found</>
                    : <>🔥 <span className="text-neonCyan font-bold">Popular Flights</span> — Search above to explore 66,811+ routes worldwide</>}
                </p>
                {visibleFlights.map((flight, idx) => (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(idx, 5) * 0.05 }} key={flight.id} 
                    onClick={() => setSelectedFlight(flight)}
                    className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between hover:border-neonCyan/40 hover:bg-white/10 transition-all duration-300 cursor-pointer group">
                    
                    <div className="flex items-center space-x-6 w-full md:w-auto mb-4 md:mb-0">
                      <div className="w-14 h-14 bg-white/90 border border-white/10 text-neonCyan rounded-xl flex items-center justify-center font-display font-bold text-2xl group-hover:scale-110 transition-transform p-2 overflow-hidden">
                        {flight.logo ? <img src={flight.logo} alt={flight.airline} className="w-full h-full object-contain" /> : flight.airline[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xl font-display">{flight.time}</h4>
                        <p className="text-sm text-gray-400 mt-1">{flight.airline} • <span className="text-neonPurple">{flight.duration}</span> • {flight.from} → {flight.to}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-8 w-full md:w-auto justify-between md:justify-end">
                      <div className="text-right">
                        <p className="text-4xl font-extrabold text-white tracking-tight">{formatCurrency(flight.price)}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Per Unit</p>
                      </div>
                      <button className="neon-button bg-gradient-to-r from-neonPurple to-blue-600 px-6 py-3 rounded-xl font-bold shadow-[0_0_15px_rgba(138,43,226,0.4)] hover:shadow-[0_0_25px_rgba(138,43,226,0.7)]">
                        Select
                      </button>
                    </div>
                  </motion.div>
                ))}
                {visibleCount < filteredFlights.length && (
                  <button onClick={() => setVisibleCount(prev => prev + 20)} className="w-full py-4 rounded-2xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors">
                    Load More ({filteredFlights.length - visibleCount} remaining)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Flight Details Modal */}
      <AnimatePresence>
        {selectedFlight && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => { setSelectedFlight(null); setCheckoutStep(0); }}
            ></motion.div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-panel relative w-full max-w-2xl p-8 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,240,255,0.15)] overflow-y-auto max-h-[90vh] my-4 z-10"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neonCyan to-neonPurple"></div>
              
              <button 
                onClick={() => { setSelectedFlight(null); setCheckoutStep(0); }}
                className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-white/90 border border-white/10 text-neonCyan rounded-xl flex items-center justify-center font-display font-bold text-3xl shadow-[0_0_15px_rgba(0,240,255,0.2)] p-2 overflow-hidden">
                  {selectedFlight.logo ? <img src={selectedFlight.logo} alt={selectedFlight.airline} className="w-full h-full object-contain" /> : selectedFlight.airline[0]}
                </div>
                <div>
                  <h2 className="text-3xl font-display font-extrabold text-white tracking-tight">{selectedFlight.airline}</h2>
                  <p className="text-neonCyan font-medium flex items-center gap-2">
                    <Info size={16} /> Flight {selectedFlight.flightNumber}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Departure Details */}
                <div className="bg-black/30 p-5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 text-gray-400 mb-4">
                    <PlaneTakeoff size={18} className="text-neonCyan" />
                    <span className="uppercase tracking-wider text-xs font-bold">Departure</span>
                  </div>
                  <p className="text-4xl font-extrabold text-white mb-1">{selectedFlight.from}</p>
                  <div className="space-y-2 mt-4 text-sm text-gray-300">
                    <p className="flex justify-between"><span>Terminal:</span> <span className="font-bold text-white">{selectedFlight.departureTerminal}</span></p>
                    <p className="flex justify-between"><span>Gate:</span> <span className="font-bold text-white">{selectedFlight.departureGate}</span></p>
                    <p className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
                      <Clock size={14} className="text-gray-400"/>
                      <span className="font-bold text-white">{selectedFlight.time.split('-')[0].trim()}</span>
                    </p>
                  </div>
                </div>

                {/* Arrival Details */}
                <div className="bg-black/30 p-5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 text-gray-400 mb-4">
                    <PlaneLanding size={18} className="text-neonPurple" />
                    <span className="uppercase tracking-wider text-xs font-bold">Arrival</span>
                  </div>
                  <p className="text-4xl font-extrabold text-white mb-1">{selectedFlight.to}</p>
                  <div className="space-y-2 mt-4 text-sm text-gray-300">
                    <p className="flex justify-between"><span>Terminal:</span> <span className="font-bold text-white">{selectedFlight.arrivalTerminal}</span></p>
                    <p className="flex justify-between"><span>Gate:</span> <span className="font-bold text-white">{selectedFlight.arrivalGate}</span></p>
                    <p className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
                      <Clock size={14} className="text-gray-400"/>
                      <span className="font-bold text-white">{selectedFlight.time.split('-')[1].trim()}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Bar */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedFlight.status === 'Delayed' ? (
                    <AlertCircle className="text-yellow-400" size={24} />
                  ) : (
                    <MapPin className="text-green-400" size={24} />
                  )}
                  <div>
                    <p className="text-sm text-gray-400">Current Status</p>
                    <p className={`font-bold ${selectedFlight.status === 'Delayed' ? 'text-yellow-400' : 'text-green-400'}`}>
                      {selectedFlight.status}
                      {selectedFlight.delay !== 'None' && ` (${selectedFlight.delay} delay)`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Total Duration</p>
                  <p className="font-bold text-white">{selectedFlight.duration}</p>
                </div>
              </div>

              {checkoutStep === 0 && (
                <button onClick={() => setCheckoutStep(1)} className="neon-button w-full mt-6 bg-gradient-to-r from-neonCyan to-blue-600 py-4 rounded-xl font-bold shadow-[0_0_15px_rgba(0,240,255,0.4)] text-lg">
                  Book This Flight ({formatCurrency(selectedFlight.price)})
                </button>
              )}

              {checkoutStep === 1 && (() => {
                const today = new Date();
                const depDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate() + 7).padStart(2, '0')}`;
                const skyscannerUrl = `https://www.skyscanner.co.in/transport/flights/${selectedFlight.from.toLowerCase()}/${selectedFlight.to.toLowerCase()}/${depDate.slice(2).replace(/-/g, '')}/?adultsv2=1&cabinclass=economy&ref=home`;
                const googleFlightsUrl = `https://www.google.com/travel/flights?q=flights+from+${selectedFlight.from}+to+${selectedFlight.to}&curr=USD&hl=en`;
                const kayakUrl = `https://www.kayak.com/flights/${selectedFlight.from}-${selectedFlight.to}/${depDate}?sort=bestflight_a`;

                return (
                <div className="mt-6 space-y-4">
                  <div className="bg-black/30 p-4 rounded-2xl border border-white/5 text-center">
                    <p className="text-sm text-gray-400 mb-1">You're booking a real flight</p>
                    <p className="text-white font-bold text-lg">{selectedFlight.from} → {selectedFlight.to}</p>
                    <p className="text-neonCyan text-sm">{selectedFlight.airline} • {selectedFlight.flightNumber}</p>
                  </div>

                  <p className="text-xs text-gray-400 text-center">Choose a trusted partner to complete your booking</p>

                  <a href={skyscannerUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-4 w-full p-4 rounded-2xl border border-white/10 hover:border-neonCyan/50 hover:bg-white/5 transition-all group cursor-pointer">
                    <div className="w-12 h-12 bg-[#0770E3] rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0">S</div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-bold group-hover:text-neonCyan transition-colors">Book on Skyscanner</p>
                      <p className="text-xs text-gray-400">Compare prices from 100+ airlines</p>
                    </div>
                    <span className="text-gray-400 group-hover:text-neonCyan transition-colors">→</span>
                  </a>

                  <a href={googleFlightsUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-4 w-full p-4 rounded-2xl border border-white/10 hover:border-neonCyan/50 hover:bg-white/5 transition-all group cursor-pointer">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-2xl">✈️</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-bold group-hover:text-neonCyan transition-colors">Book on Google Flights</p>
                      <p className="text-xs text-gray-400">Direct airline prices, no hidden fees</p>
                    </div>
                    <span className="text-gray-400 group-hover:text-neonCyan transition-colors">→</span>
                  </a>

                  <a href={kayakUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-4 w-full p-4 rounded-2xl border border-white/10 hover:border-neonCyan/50 hover:bg-white/5 transition-all group cursor-pointer">
                    <div className="w-12 h-12 bg-[#FF6913] rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0">K</div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-bold group-hover:text-neonCyan transition-colors">Book on Kayak</p>
                      <p className="text-xs text-gray-400">Best deals from top travel sites</p>
                    </div>
                    <span className="text-gray-400 group-hover:text-neonCyan transition-colors">→</span>
                  </a>

                  <div className="border-t border-white/10 pt-4 mt-4">
                    <p className="text-xs text-gray-500 text-center mb-3">Or generate a demo e-ticket to test the flow</p>
                    <button onClick={() => setCheckoutStep(2)} className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 font-bold text-white shadow-[0_0_15px_rgba(138,43,226,0.3)]">
                      🎫 Generate Demo E-Ticket
                    </button>
                  </div>

                  <button onClick={() => { setCheckoutStep(0); }} className="w-full py-3 rounded-xl border border-white/10 text-gray-400 font-medium hover:bg-white/5 hover:text-white transition-colors text-sm">
                    ← Back to flight details
                  </button>
                </div>
                );
              })()}

              {/* Demo Booking: Passenger Details */}
              {checkoutStep === 2 && (
                <div className="mt-6 space-y-4">
                  <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-3">
                    <h3 className="text-white font-bold flex items-center gap-2"><User size={16} className="text-neonCyan" /> Passenger Details</h3>
                    <input type="text" placeholder="Full Name *" value={passengerName} disabled={emailSending} onChange={e => { setPassengerName(e.target.value); setFormError(''); }} className={`w-full bg-white/5 border ${!passengerName && formError ? 'border-red-500' : 'border-white/10'} rounded-xl p-3 text-white placeholder-gray-400 outline-none focus:border-neonCyan transition-colors disabled:opacity-50`} />
                    <input type="email" placeholder="Email Address *" value={passengerEmail} disabled={emailSending} onChange={e => { setPassengerEmail(e.target.value); setFormError(''); }} className={`w-full bg-white/5 border ${!passengerEmail && formError ? 'border-red-500' : 'border-white/10'} rounded-xl p-3 text-white placeholder-gray-400 outline-none focus:border-neonCyan transition-colors disabled:opacity-50`} />
                  </div>
                  {formError && <p className="text-red-400 text-sm text-center font-medium">{formError}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => setCheckoutStep(1)} disabled={emailSending} className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors disabled:opacity-50">Back</button>
                    <button onClick={handleGenerateDemoTicket} disabled={emailSending} className="flex-grow py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 font-bold text-white shadow-[0_0_15px_rgba(138,43,226,0.3)] disabled:opacity-70 flex items-center justify-center gap-2">
                      {emailSending ? (
                        <>
                          <Loader2 className="animate-spin text-white" size={18} />
                          Sending PDF Ticket...
                        </>
                      ) : (
                        'Generate E-Ticket'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* E-Ticket & Receipt */}
              {checkoutStep === 3 && (() => {
                const depDateObj = searchDate ? new Date(searchDate) : new Date(Date.now() + 7 * 86400000);
                const depStr = depDateObj.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                const pnr = bookingRef;
                const baseFare = Math.round(selectedFlight.price * 0.75);
                const taxes = Math.round(selectedFlight.price * 0.18);
                const surcharge = selectedFlight.price - baseFare - taxes;

                const handlePrint = () => {
                  const win = window.open('', '_blank');
                  win.document.write(`
                    <html><head><title>E-Ticket - ${pnr}</title>
                    <style>
                      * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
                      body { padding: 40px; background: #fff; color: #1a1a2e; }
                      .ticket { border: 2px solid #0ff; border-radius: 16px; padding: 32px; max-width: 700px; margin: 0 auto; }
                      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #ddd; padding-bottom: 20px; margin-bottom: 20px; }
                      .brand { font-size: 24px; font-weight: 800; color: #0ff; }
                      .brand span { color: #8a2be2; }
                      .pnr-box { text-align: right; }
                      .pnr-label { font-size: 11px; color: #888; text-transform: uppercase; }
                      .pnr-value { font-size: 22px; font-weight: 800; color: #0770E3; letter-spacing: 2px; }
                      .route { display: flex; justify-content: space-between; align-items: center; margin: 24px 0; }
                      .airport { text-align: center; }
                      .airport-code { font-size: 42px; font-weight: 800; color: #1a1a2e; }
                      .airport-label { font-size: 12px; color: #888; }
                      .arrow { font-size: 28px; color: #0ff; }
                      .details-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 20px 0; padding: 16px; background: #f8f9fa; border-radius: 12px; }
                      .detail-item .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
                      .detail-item .value { font-size: 14px; font-weight: 700; margin-top: 2px; }
                      .receipt { margin-top: 24px; border-top: 2px dashed #ddd; padding-top: 20px; }
                      .receipt h3 { font-size: 16px; margin-bottom: 12px; }
                      .receipt-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
                      .receipt-total { display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: 800; border-top: 2px solid #1a1a2e; margin-top: 8px; }
                      .barcode { text-align: center; margin-top: 24px; padding-top: 20px; border-top: 2px dashed #ddd; }
                      .barcode-text { font-family: 'Courier New', monospace; font-size: 14px; letter-spacing: 4px; color: #888; }
                      .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #aaa; }
                      @media print { body { padding: 20px; } }
                    </style></head><body>
                    <div class="ticket">
                      <div class="header">
                        <div class="brand">Flight<span>Agent</span></div>
                        <div class="pnr-box">
                          <div class="pnr-label">Booking Reference / PNR</div>
                          <div class="pnr-value">${pnr}</div>
                        </div>
                      </div>
                      <div style="font-size:13px;color:#888;margin-bottom:4px;">E-TICKET / BOARDING PASS</div>
                      <div style="font-size:18px;font-weight:700;margin-bottom:4px;">${selectedFlight.airline} — ${selectedFlight.flightNumber}</div>
                      <div class="route">
                        <div class="airport">
                          <div class="airport-code">${selectedFlight.from}</div>
                          <div class="airport-label">Departure</div>
                        </div>
                        <div class="arrow">✈ →</div>
                        <div class="airport">
                          <div class="airport-code">${selectedFlight.to}</div>
                          <div class="airport-label">Arrival</div>
                        </div>
                      </div>
                      <div class="details-grid">
                        <div class="detail-item"><div class="label">Passenger</div><div class="value">${passengerName.toUpperCase()}</div></div>
                        <div class="detail-item"><div class="label">Date</div><div class="value">${depStr}</div></div>
                        <div class="detail-item"><div class="label">Seat</div><div class="value">${seat}</div></div>
                        <div class="detail-item"><div class="label">Terminal</div><div class="value">${selectedFlight.departureTerminal}</div></div>
                        <div class="detail-item"><div class="label">Gate</div><div class="value">${selectedFlight.departureGate}</div></div>
                        <div class="detail-item"><div class="label">Class</div><div class="value">Economy</div></div>
                        <div class="detail-item"><div class="label">Departure</div><div class="value">${selectedFlight.time.split('-')[0].trim()}</div></div>
                        <div class="detail-item"><div class="label">Duration</div><div class="value">${selectedFlight.duration}</div></div>
                        <div class="detail-item"><div class="label">Status</div><div class="value" style="color:green;">Confirmed</div></div>
                      </div>
                      <div class="receipt">
                        <h3>💳 Payment Receipt</h3>
                        <div class="receipt-row"><span>Base Fare</span><span>$${baseFare}</span></div>
                        <div class="receipt-row"><span>Taxes & Fees</span><span>$${taxes}</span></div>
                        <div class="receipt-row"><span>Fuel Surcharge</span><span>$${surcharge}</span></div>
                        <div class="receipt-total"><span>Total Paid</span><span>$${selectedFlight.price}</span></div>
                      </div>
                      <div class="barcode">
                        <div class="barcode-text">||||| ${pnr} ||| ${selectedFlight.flightNumber} ||| ${selectedFlight.from}${selectedFlight.to} |||||</div>
                      </div>
                      <div class="footer">This is a demo e-ticket generated by FlightAgent. For actual bookings, use our partner links (Skyscanner, Google Flights, Kayak).</div>
                    </div>
                    <script>window.onload = function() { window.print(); }</script>
                    </body></html>
                  `);
                  win.document.close();
                };

                return (
                <div className="mt-6 space-y-4">
                  <div className="text-center">
                    <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-3" />
                    <h3 className="text-2xl font-extrabold text-white mb-1">Demo E-Ticket Sent!</h3>
                    <p className="text-gray-400 text-sm">We've sent a PDF ticket and receipt to <strong>{passengerEmail}</strong></p>
                  </div>

                  {etherealUrl && (
                    <div className="bg-purple-950/40 border border-purple-500/30 rounded-2xl p-4 text-center">
                      <p className="text-sm text-purple-300 mb-3 font-medium">
                        📬 Ethereal testing mailbox is active!
                      </p>
                      <a 
                        href={etherealUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-[0_0_15px_rgba(138,43,226,0.4)] transition-all cursor-pointer select-none"
                      >
                        ✉️ View Sent Email & PDF Ticket
                      </a>
                    </div>
                  )}

                  <div className="bg-black/30 p-5 rounded-2xl border border-white/5 space-y-3" id="eticket-content">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider">E-Ticket / Boarding Pass</p>
                        <p className="text-white font-bold text-lg">{selectedFlight.airline}</p>
                        <p className="text-neonCyan text-sm">{selectedFlight.flightNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">PNR / Booking Ref</p>
                        <p className="text-neonCyan font-bold text-lg tracking-widest">{pnr}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-4 border-t border-b border-white/5">
                      <div className="text-center">
                        <p className="text-3xl font-extrabold text-white">{selectedFlight.from}</p>
                        <p className="text-xs text-gray-400">{selectedFlight.time.split('-')[0].trim()}</p>
                      </div>
                      <div className="text-center text-gray-500 flex-1 px-4">
                        <div className="border-t border-dashed border-white/20 relative">
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black/30 px-2 text-neonCyan">✈</span>
                        </div>
                        <p className="text-xs mt-2">{selectedFlight.duration}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-extrabold text-white">{selectedFlight.to}</p>
                        <p className="text-xs text-gray-400">{selectedFlight.time.split('-')[1]?.trim()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div><p className="text-gray-500 text-xs">PASSENGER</p><p className="text-white font-bold">{passengerName.toUpperCase()}</p></div>
                      <div><p className="text-gray-500 text-xs">DATE</p><p className="text-white font-bold">{depStr}</p></div>
                      <div><p className="text-gray-500 text-xs">SEAT</p><p className="text-white font-bold">{seat}</p></div>
                      <div><p className="text-gray-500 text-xs">TERMINAL</p><p className="text-white font-bold">{selectedFlight.departureTerminal}</p></div>
                      <div><p className="text-gray-500 text-xs">GATE</p><p className="text-white font-bold">{selectedFlight.departureGate}</p></div>
                      <div><p className="text-gray-500 text-xs">CLASS</p><p className="text-white font-bold">Economy</p></div>
                    </div>

                    <div className="border-t border-white/5 pt-3 mt-2">
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">💳 Payment Receipt</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-gray-400">Base Fare</span><span className="text-white">{formatCurrency(baseFare)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Taxes & Fees</span><span className="text-white">{formatCurrency(taxes)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-400">Fuel Surcharge</span><span className="text-white">{formatCurrency(surcharge)}</span></div>
                        <div className="flex justify-between border-t border-white/10 pt-2 mt-2"><span className="text-white font-bold">Total Paid</span><span className="text-neonCyan font-bold text-lg">{formatCurrency(selectedFlight.price)}</span></div>
                      </div>
                    </div>

                    <div className="text-center pt-3 border-t border-dashed border-white/10">
                      <p className="font-mono text-xs text-gray-500 tracking-[6px]">||||| {pnr} ||||| {selectedFlight.flightNumber} |||||</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={handlePrint} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-neonCyan to-blue-600 font-bold text-white shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer">
                      🖨️ Print Ticket & Receipt
                    </button>
                    <button onClick={() => { setSelectedFlight(null); setCheckoutStep(0); setPassengerName(''); setPassengerEmail(''); setEtherealUrl(''); }} className="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors cursor-pointer">
                      Done
                    </button>
                  </div>
                </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FlightSearch;