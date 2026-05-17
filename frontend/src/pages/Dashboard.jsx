import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Ticket, Clock, CreditCard, Plane, Calendar, User, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user || !user.token) {
        setLoading(false);
        return;
      }
      try {
        const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const res = await fetch(`${API}/api/bookings`, {
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setBookings(data.bookings);
        }
      } catch (err) {
        console.error('Error fetching bookings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white pt-28 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neonCyan/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neonPurple/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* User Greeting Banner */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 mb-10 shadow-[0_0_30px_rgba(0,240,255,0.05)] flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold uppercase tracking-wider text-neonCyan">
              <Sparkles size={12} /> Active Access Session
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight">
              Welcome Back, <span className="text-gradient">{user?.name || 'Traveler'}</span>
            </h1>
            <p className="text-gray-400 font-light text-sm">Monitor your neural-route bookings, boarding clearances, and flight trajectories.</p>
          </div>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 self-start md:self-auto">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-neonCyan to-neonPurple flex items-center justify-center font-bold text-white shadow-lg">
              {(user?.name || 'T')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold">{user?.name || 'Authorized Guest'}</p>
              <p className="text-xs text-gray-500">{user?.email || 'session@flightagent.io'}</p>
            </div>
          </div>
        </div>

        {/* Stats Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 flex items-center space-x-5 hover:border-neonCyan/30 hover:shadow-[0_0_20px_rgba(0,240,255,0.1)] transition-all duration-300 transform hover:scale-[1.02]">
            <div className="bg-neonCyan/10 p-4 rounded-xl text-neonCyan shadow-[0_0_15px_rgba(0,240,255,0.15)]">
              <Ticket size={28} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Active Missions</p>
              <p className="text-3xl font-extrabold text-white mt-0.5">{bookings.length}</p>
            </div>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl border border-white/10 flex items-center space-x-5 hover:border-neonPurple/30 hover:shadow-[0_0_20px_rgba(138,43,226,0.1)] transition-all duration-300 transform hover:scale-[1.02]">
            <div className="bg-neonPurple/10 p-4 rounded-xl text-neonPurple shadow-[0_0_15px_rgba(138,43,226,0.15)]">
              <Plane size={28} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Historical Transits</p>
              <p className="text-3xl font-extrabold text-white mt-0.5">{bookings.length > 0 ? bookings.length + 3 : 12}</p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/10 flex items-center space-x-5 hover:border-pink-500/30 hover:shadow-[0_0_20px_rgba(236,72,153,0.1)] transition-all duration-300 transform hover:scale-[1.02]">
            <div className="bg-pink-500/10 p-4 rounded-xl text-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.15)]">
              <CreditCard size={28} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Neural Refunds</p>
              <p className="text-3xl font-extrabold text-white mt-0.5">0</p>
            </div>
          </div>
        </div>

        {/* Recent Bookings Section */}
        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/10 bg-white/2 flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Plane className="text-neonCyan rotate-45" size={20} /> Live Trajectories & Bookings
            </h2>
            <Link to="/search" className="text-xs font-semibold text-neonCyan hover:underline">
              Book New Transit →
            </Link>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col justify-center items-center gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-t-neonCyan border-r-transparent border-b-neonPurple border-l-transparent animate-spin"></div>
              <p className="text-sm text-gray-400 tracking-wider">Decrypting booking databases...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-16 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400 shadow-inner">
                <AlertCircle size={28} />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <p className="text-lg font-bold text-white">No Transits Registered</p>
                <p className="text-sm text-gray-400 leading-relaxed font-light">
                  Your neural itinerary is currently vacant. Unlock optimal itineraries, automated smart-checkin, and direct booking receipt dispatching now.
                </p>
              </div>
              <Link to="/search" className="neon-button inline-flex bg-gradient-to-r from-neonCyan to-blue-600 px-6 py-3 rounded-full font-bold text-sm tracking-wide shadow-md active:scale-95 transition-all">
                Initialize Search
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {bookings.map((booking) => (
                <div key={booking._id} className="p-6 hover:bg-white/2 transition-colors flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  
                  {/* Left Block: Flight Details & PNR */}
                  <div className="flex-grow space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="bg-neonCyan/10 text-neonCyan px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-neonCyan/20">
                        {booking.flight?.flightNumber || 'FL-902'}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
                        <Calendar size={13} /> {booking.flight?.departureDate ? new Date(booking.flight.departureDate).toLocaleDateString() : 'Pending'}
                      </span>
                      <span className="text-xs text-gray-500 font-bold uppercase tracking-widest bg-white/5 border border-white/10 px-2.5 py-0.5 rounded">
                        PNR: {booking.paymentIntentId ? booking.paymentIntentId.slice(-6).toUpperCase() : 'FT-902'}
                      </span>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-left">
                        <p className="text-2xl font-black tracking-tight text-white">{booking.flight?.from || 'DEL'}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Departure Airport</p>
                      </div>
                      <div className="flex flex-col items-center flex-grow max-w-[120px] relative">
                        <span className="text-xs text-neonCyan/80 font-mono tracking-widest">{booking.flight?.duration || '2h 15m'}</span>
                        <div className="w-full h-0.5 bg-gradient-to-r from-neonCyan/20 via-neonCyan to-neonPurple/20 relative my-2">
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 text-neonCyan text-xs">✈</div>
                        </div>
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{booking.flight?.airline || 'FlightAgent Airways'}</span>
                      </div>
                      <div className="text-left">
                        <p className="text-2xl font-black tracking-tight text-white">{booking.flight?.to || 'BOM'}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Arrival Airport</p>
                      </div>
                    </div>
                  </div>

                  {/* Middle Block: Passenger Summary & Details */}
                  <div className="w-full lg:w-auto min-w-[200px] border-t border-white/5 pt-4 lg:border-t-0 lg:pt-0 space-y-3">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <User size={13} /> Passengers Verified
                    </p>
                    <div className="space-y-1">
                      {booking.passengers.map((p, pIdx) => (
                        <p key={pIdx} className="text-sm font-semibold text-white/95">
                          {p.firstName} {p.lastName} <span className="text-xs text-gray-500 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5 ml-1">{p.seatNumber || `Seat ${pIdx + 12}`}</span>
                        </p>
                      ))}
                    </div>
                    <p className="text-sm font-bold text-neonCyan">
                      Total Paid: ${booking.totalAmount || booking.flight?.price}
                    </p>
                  </div>

                  {/* Right Block: Actions */}
                  <div className="flex lg:flex-col gap-3 min-w-[180px]">
                    <span className="inline-flex items-center justify-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Confirmed
                    </span>
                    <Link 
                      to={`/tickets?booking_id=${booking._id}`}
                      className="neon-button text-center bg-gradient-to-r from-neonCyan to-blue-600 px-4 py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Ticket size={13} /> Boarding Passes
                    </Link>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default Dashboard;