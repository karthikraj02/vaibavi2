import { useState, useEffect } from 'react';
import { Plane, AlertTriangle, CheckCircle, MapPin, Clock } from 'lucide-react';
import { io } from 'socket.io-client';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function FlightTracker() {
    const [flightStatus, setFlightStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState('');
    const flightId = new URLSearchParams(window.location.search).get('flight_id');

    useEffect(() => {
        if (flightId) {
            fetchFlightStatus();
        }
    }, [flightId]);

    useEffect(() => {
        // Real-time WebSocket connection
        const socket = io(API);
        
        socket.on('flight_update', (data) => {
            setFlightStatus(prev => {
                // If we are currently tracking this flight, update its status
                if (prev && (prev._id === data.flightId || prev.flightNumber === data.flightNumber)) {
                    return { 
                        ...prev, 
                        currentStatus: data.status, 
                        lastUpdated: new Date().toISOString() 
                    };
                }
                return prev;
            });
        });

        return () => socket.disconnect();
    }, []);

    const fetchFlightStatus = async () => {
        try {
            const res = await fetch(`${API}/api/tracking/flight/${flightId}`);
            const data = await res.json();
            if (data.success) {
                setFlightStatus(data.status);
            }
        } catch (error) {
            console.error('Error fetching flight status:', error);
        } finally {
            setLoading(false);
        }
    };

    const searchFlight = async (e) => {
        e.preventDefault();
        if (!searchInput) return;
        try {
            setLoading(true);
            const res = await fetch(`${API}/api/tracking/flight-number/${searchInput}`);
            const data = await res.json();
            if (data.success) {
                setFlightStatus(data.status);
            }
        } catch (error) {
            console.error('Error searching flight:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'scheduled':
                return 'text-blue-600';
            case 'delayed':
                return 'text-yellow-600';
            case 'cancelled':
                return 'text-red-600';
            case 'boarding':
            case 'departed':
                return 'text-green-600';
            case 'in_flight':
                return 'text-purple-600';
            case 'landed':
                return 'text-green-600';
            case 'diverted':
                return 'text-orange-600';
            default:
                return 'text-gray-600';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'delayed':
            case 'diverted':
                return <AlertTriangle size={24} />;
            case 'landed':
            case 'departed':
            case 'boarding':
                return <CheckCircle size={24} />;
            default:
                return <Plane size={24} />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold mb-6">✈️ Flight Tracker</h1>
                    <form onSubmit={searchFlight} className="flex gap-2">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search by flight number (e.g., AA100)"
                            className="flex-1 px-4 py-2 rounded border border-gray-300"
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                        >
                            Search
                        </button>
                    </form>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading flight information...</p>
                    </div>
                ) : flightStatus ? (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        {/* Header */}
                        <div className={`p-6 ${getStatusColor(flightStatus.currentStatus).replace('text-', 'bg-')} bg-opacity-10`}>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className={`${getStatusColor(flightStatus.currentStatus)}`}>
                                        {getStatusIcon(flightStatus.currentStatus)}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-bold">{flightStatus.flightNumber}</h2>
                                        <p className="text-lg font-semibold capitalize">{flightStatus.currentStatus.replace('_', ' ')}</p>
                                    </div>
                                </div>
                                {flightStatus.delayMinutes > 0 && (
                                    <div className="bg-yellow-100 border border-yellow-400 p-3 rounded">
                                        <p className="font-bold text-yellow-800">⚠️ {flightStatus.delayMinutes} min delay</p>
                                        <p className="text-sm text-yellow-700">{flightStatus.delayReason}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Route Information */}
                        <div className="grid grid-cols-2 gap-6 p-6 border-b">
                            <div>
                                <p className="text-sm text-gray-600 mb-2">DEPARTURE</p>
                                <p className="text-2xl font-bold">Coming Soon</p>
                                <p className="text-gray-600 mt-2">
                                    {flightStatus.scheduledDeparture
                                        ? new Date(flightStatus.scheduledDeparture).toLocaleString()
                                        : 'TBD'
                                    }
                                </p>
                                {flightStatus.gate && (
                                    <p className="text-sm text-gray-600 mt-2">Gate: {flightStatus.gate}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-2">ARRIVAL</p>
                                <p className="text-2xl font-bold">Coming Soon</p>
                                <p className="text-gray-600 mt-2">
                                    {flightStatus.estimatedArrival
                                        ? new Date(flightStatus.estimatedArrival).toLocaleString()
                                        : 'TBD'
                                    }
                                </p>
                            </div>
                        </div>

                        {/* Additional Details */}
                        <div className="grid grid-cols-2 gap-4 p-6 bg-gray-50">
                            {flightStatus.terminal && (
                                <div>
                                    <p className="text-sm text-gray-600">Terminal</p>
                                    <p className="font-semibold">{flightStatus.terminal}</p>
                                </div>
                            )}
                            {flightStatus.aircraft && (
                                <div>
                                    <p className="text-sm text-gray-600">Aircraft</p>
                                    <p className="font-semibold">{flightStatus.aircraft}</p>
                                </div>
                            )}
                            {flightStatus.weather && (
                                <div>
                                    <p className="text-sm text-gray-600">Weather</p>
                                    <p className="font-semibold">{flightStatus.weather.condition || 'Clear'}</p>
                                </div>
                            )}
                            {flightStatus.bagageCarousel && (
                                <div>
                                    <p className="text-sm text-gray-600">Baggage Carousel</p>
                                    <p className="font-semibold">{flightStatus.bagageCarousel}</p>
                                </div>
                            )}
                        </div>

                        {/* Cancellation Info */}
                        {flightStatus.cancellation && (
                            <div className="p-6 bg-red-50 border-t border-red-200">
                                <p className="text-red-800 font-semibold">Flight Cancelled</p>
                                <p className="text-red-700">Reason: {flightStatus.cancellation.reason}</p>
                            </div>
                        )}

                        {/* Diversion Info */}
                        {flightStatus.diversion && (
                            <div className="p-6 bg-orange-50 border-t border-orange-200">
                                <p className="text-orange-800 font-semibold">Flight Diverted</p>
                                <p className="text-orange-700">Diverted to: {flightStatus.diversion.airport}</p>
                                <p className="text-orange-700">Reason: {flightStatus.diversion.reason}</p>
                            </div>
                        )}

                        {/* Last Updated */}
                        <div className="p-4 text-center border-t bg-gray-50">
                            <p className="text-sm text-gray-500">
                                Last updated: {new Date(flightStatus.lastUpdated || flightStatus.updatedAt).toLocaleString()}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white p-8 rounded-lg shadow text-center">
                        <p className="text-gray-500">No flight information found</p>
                    </div>
                )}
            </div>
        </div>
    );
}