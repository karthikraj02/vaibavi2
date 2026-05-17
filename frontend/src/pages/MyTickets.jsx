import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Download, Check, QrCode, Clock, ArrowLeft, User, ShieldCheck, HelpCircle, Briefcase, Award } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function MyTickets() {
    const { user } = useContext(AuthContext);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const bookingId = new URLSearchParams(window.location.search).get('booking_id');

    useEffect(() => {
        if (bookingId) {
            fetchTickets();
        } else {
            setLoading(false);
        }
    }, [bookingId]);

    const fetchTickets = async () => {
        try {
            const res = await fetch(`${API}/api/tickets/${bookingId}`);
            const data = await res.json();
            if (data.success) {
                setTickets(data.tickets);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = async (ticketId) => {
        try {
            const res = await fetch(`${API}/api/tickets/${ticketId}/pdf`);
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `FlightAgent-BoardingPass-${ticketId.slice(-6).toUpperCase()}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading ticket:', error);
        }
    };

    const checkIn = async (ticketId) => {
        try {
            const res = await fetch(`${API}/api/tickets/${ticketId}/checkin`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                fetchTickets();
                alert('Security clearance approved! Check-in successful.');
            }
        } catch (error) {
            console.error('Error checking in:', error);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0F19] text-white pt-28 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Ambient background glowing orbs */}
            <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-neonCyan/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob"></div>
            <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-neonPurple/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000"></div>

            <div className="max-w-4xl mx-auto relative z-10">
                
                {/* Back Button */}
                <div className="mb-6">
                    <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-neonCyan transition-colors">
                        <ArrowLeft size={16} /> Back to Neural Hub
                    </Link>
                </div>

                {/* Header */}
                <div className="mb-10 text-left space-y-2">
                    <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight">
                        ✈️ Digital <span className="text-gradient">Boarding Clearance</span>
                    </h1>
                    <p className="text-gray-400 font-light text-sm">Present the dynamic clearance passes and QR authorization codes at flight terminal checkpoints.</p>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col justify-center items-center gap-4">
                        <div className="w-12 h-12 rounded-full border-4 border-t-neonCyan border-r-transparent border-b-neonPurple border-l-transparent animate-spin"></div>
                        <p className="text-sm text-gray-400 tracking-wider">Decrypting digital boarding passes...</p>
                    </div>
                ) : !bookingId || tickets.length === 0 ? (
                    <div className="glass-panel p-16 text-center space-y-6 rounded-3xl border border-white/10 shadow-2xl">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                            <ShieldCheck size={28} />
                        </div>
                        <div className="max-w-md mx-auto space-y-2">
                            <p className="text-lg font-bold text-white">No Boarding Passes Generated</p>
                            <p className="text-sm text-gray-400 leading-relaxed font-light">
                                To view your dynamic flight clearance passes, navigate to the Active Trajectories dashboard and select "Boarding Passes" on your confirmed transit.
                            </p>
                        </div>
                        <Link to="/dashboard" className="neon-button inline-flex bg-gradient-to-r from-neonCyan to-blue-600 px-6 py-3 rounded-full font-bold text-sm tracking-wide shadow-md">
                            Go to Dashboard
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-8">
                        {tickets.map((ticket) => (
                            <div
                                key={ticket._id}
                                className="relative overflow-hidden rounded-3xl border border-white/10 glass-panel flex flex-col md:flex-row shadow-[0_0_40px_rgba(0,0,0,0.4)]"
                            >
                                {/* Apple-style glowing top line */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neonCyan to-neonPurple"></div>

                                {/* Perforation notches (visual effect representing perforated paper tickets) */}
                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0B0F19] border border-white/10 hidden md:block"></div>
                                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0B0F19] border border-white/10 hidden md:block"></div>

                                {/* Main Body (Ticket Information) */}
                                <div className="flex-grow p-8 space-y-6">
                                    <div className="flex justify-between items-center flex-wrap gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Digital Pass Identifier</p>
                                            <h2 className="text-xl font-black text-white tracking-tight">{ticket.ticketNumber || `TKT-${ticket._id.slice(-8).toUpperCase()}`}</h2>
                                            <p className="text-xs text-neonCyan font-mono mt-0.5">PNR REFERENCE: {ticket.pnr || 'FT-902'}</p>
                                        </div>
                                        
                                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-md flex items-center gap-1 ${
                                            ticket.status === 'issued' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                            ticket.status === 'checked_in' ? 'bg-neonCyan/10 text-neonCyan border-neonCyan/20' :
                                            ticket.status === 'boarded' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                            'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${
                                                ticket.status === 'issued' ? 'bg-amber-400 animate-pulse' :
                                                ticket.status === 'checked_in' ? 'bg-neonCyan animate-pulse' :
                                                ticket.status === 'boarded' ? 'bg-green-400' :
                                                'bg-gray-400'
                                            }`}></span>
                                            {ticket.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    {/* Boarding Info Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-white/5 pt-6">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                                <User size={12} /> Passenger
                                            </p>
                                            <p className="text-sm font-bold text-white leading-tight">{ticket.passengerName || user?.name || 'Karthik Raj'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                                <Award size={12} /> Cabin Seat
                                            </p>
                                            <p className="text-sm font-bold text-neonCyan font-mono">{ticket.seatNumber || '14A'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                                <ShieldCheck size={12} /> Cabin Class
                                            </p>
                                            <p className="text-sm font-bold text-white capitalize">{ticket.cabinClass || 'Economy'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                                <Briefcase size={12} /> Baggage Allow
                                            </p>
                                            <p className="text-sm font-bold text-white">{ticket.baggage?.pieces || 1} piece ({ticket.baggage?.weight || 20}kg)</p>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-4 border-t border-white/5 pt-6">
                                        {ticket.status === 'issued' && (
                                            <button
                                                onClick={() => checkIn(ticket._id)}
                                                className="flex-grow md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-neonCyan to-blue-600 text-white font-bold text-xs tracking-wider uppercase px-5 py-3.5 rounded-xl shadow-md hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                                            >
                                                <Check size={14} /> Clear Check-In
                                            </button>
                                        )}
                                        <button
                                            onClick={() => downloadPDF(ticket._id)}
                                            className="flex-grow md:flex-none flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs tracking-wider uppercase px-5 py-3.5 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer"
                                        >
                                            <Download size={14} /> Download Boarding Pass
                                        </button>
                                    </div>
                                </div>

                                {/* Boarding Stub (QR Code panel) */}
                                <div className="border-t border-dashed border-white/10 md:border-t-0 md:border-l md:border-dashed md:border-white/10 relative p-8 md:w-72 flex flex-col items-center justify-center gap-4 bg-white/2">
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center">Boarding Gate Clearance</p>
                                    
                                    {ticket.qrCode ? (
                                        <div className="bg-white p-3 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10 flex items-center justify-center w-36 h-36">
                                            <img src={ticket.qrCode} alt="Boarding QR Code" className="w-full h-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="w-32 h-32 border border-white/10 bg-white/5 rounded-2xl flex flex-col items-center justify-center text-gray-500 gap-2">
                                            <QrCode size={36} />
                                            <span className="text-[9px] font-bold uppercase tracking-wider">No QR Code</span>
                                        </div>
                                    )}

                                    <div className="text-center space-y-0.5">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                                            <Clock size={12} className="text-neonCyan" /> Gate Closes: 20m Prior
                                        </p>
                                        <p className="text-[9px] text-gray-500 font-medium">Clearance must be completed digitally.</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}