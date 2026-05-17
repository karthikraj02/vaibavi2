import { useEffect, useState } from "react";
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export default function Admin() {
    const [flights, setFlights] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [activeTab, setActiveTab] = useState('flights');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loginParams, setLoginParams] = useState({ username: '', password: '' });

    const initialFormState = {
        flightNumber: '',
        airline: '',
        flightName: '',
        departureCity: '',
        departureAirport: '',
        destinationCity: '',
        destinationAirport: '',
        departureDate: '',
        departureTime: '',
        prices: { economy: '', business: '', first: '' },
        availableSeats: { economy: 60, business: 20, first: 10 }
    };

    const [formData, setFormData] = useState(initialFormState);
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (token) {
            setIsAuthenticated(true);
            fetchFlights(token);
            fetchBookings(token);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API}/api/admin/login`, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginParams)
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('adminToken', data.token);
                setIsAuthenticated(true);
                fetchFlights(data.token);
                fetchBookings(data.token);
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (error) {
            console.error("Login failed:", error);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        setIsAuthenticated(false);
        setFlights([]);
        setBookings([]);
    };

    const fetchFlights = async (token = localStorage.getItem('adminToken')) => {
        if (!token) return;
        try {
            const res = await fetch(`${API}/api/admin/flights`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setFlights(data.flights);
            } else {
                if (res.status === 401) handleLogout();
            }
        } catch (error) {
            console.error("Error fetching flights:", error);
        }
    };

    const fetchBookings = async (token = localStorage.getItem('adminToken')) => {
        if (!token) return;
        try {
            const res = await fetch(`${API}/api/admin/bookings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setBookings(data.bookings);
            }
        } catch (error) {
            console.error("Error fetching bookings:", error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('price_')) {
            const field = name.split('_')[1];
            setFormData(prev => ({ ...prev, prices: { ...prev.prices, [field]: value } }));
        } else if (name.startsWith('seat_')) {
            const field = name.split('_')[1];
            setFormData(prev => ({ ...prev, availableSeats: { ...prev.availableSeats, [field]: value } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
           const url = editingId
  ? `${API}/api/admin/flight/${editingId}`
  : `${API}/api/admin/flight`;

            const method = editingId ? "PUT" : "POST";

            await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                },
                body: JSON.stringify(formData)
            });

            setFormData(initialFormState);
            setEditingId(null);
            fetchFlights();
        } catch (error) {
            console.error("Error saving flight:", error);
        }
    };

    const handleEdit = (flight) => {
        setEditingId(flight._id);
        setFormData({
            flightNumber: flight.flightNumber || '',
            airline: flight.airline || '',
            flightName: flight.flightName || '',
            departureCity: flight.departureCity || '',
            departureAirport: flight.departureAirport || '',
            destinationCity: flight.destinationCity || '',
            destinationAirport: flight.destinationAirport || '',
            departureDate: flight.departureDate ? flight.departureDate.split('T')[0] : '',
            departureTime: flight.departureTime || '',

            prices: flight.prices || { economy: '', business: '', first: '' },
            availableSeats: flight.availableSeats || { economy: 60, business: 20, first: 10 }
        });
    };

    const deleteFlight = async (id) => {
        try {
            if (!window.confirm("Are you sure you want to delete this flight?")) return;
            await fetch(`${API}/api/admin/flight/${id}`, {
                method: "DELETE",
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            fetchFlights();
        } catch (error) {
            console.error("Error deleting flight:", error);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#171717]">
                <form onSubmit={handleLogin} className="bg-[#212121] p-8 rounded-xl shadow-lg w-96 max-w-full border border-white/10">
                    <h2 className="text-2xl font-bold mb-6 text-center text-gray-100">Admin Login</h2>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                        <input
                            type="text"
                            required
                            value={loginParams.username}
                            onChange={e => setLoginParams({ ...loginParams, username: e.target.value })}
                            className="w-full p-2.5 bg-[#2f2f2f] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={loginParams.password}
                            onChange={e => setLoginParams({ ...loginParams, password: e.target.value })}
                            className="w-full p-2.5 bg-[#2f2f2f] border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition shadow-md">
                        Log In
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#171717] text-gray-200 pb-10">
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
                    <button onClick={handleLogout} className="px-4 py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-lg transition text-sm font-medium">Log Out</button>
                </div>

                <div className="flex border-b border-white/10 mb-6">
                    <button
                        onClick={() => setActiveTab('flights')}
                        className={`py-2 px-6 font-medium text-lg transition ${activeTab === 'flights' ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/10' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                    >
                        Manage Flights
                    </button>
                    <button
                        onClick={() => { setActiveTab('bookings'); fetchBookings(); }}
                        className={`py-2 px-6 font-medium text-lg transition ${activeTab === 'bookings' ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/10' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                    >
                        View Bookings
                    </button>
                </div >

                {activeTab === 'flights' && (
                    <>
                        <div className="bg-[#212121] p-6 rounded-xl shadow-lg mb-8 border border-white/10">
                            <h2 className="text-xl font-semibold mb-6 flex items-center text-white">
                                {editingId ? 'Edit Flight' : 'Add New Flight'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Flight Number</label>
                                        <input required name="flightNumber" value={formData.flightNumber} onChange={handleChange} placeholder="e.g. AI-202" className="w-full bg-[#2f2f2f] border border-white/10 text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Airline</label>
                                        <input required name="airline" value={formData.airline} onChange={handleChange} placeholder="e.g. Air India" className="w-full bg-[#2f2f2f] border border-white/10 text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Flight Name</label>
                                        <input required name="flightName" value={formData.flightName} onChange={handleChange} placeholder="e.g. Boeing 777" className="w-full bg-[#2f2f2f] border border-white/10 text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Departure City</label>
                                        <input required name="departureCity" value={formData.departureCity} onChange={handleChange} placeholder="e.g. Mumbai" className="w-full bg-[#2f2f2f] border border-white/10 text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Departure Airport</label>
                                        <input required name="departureAirport" value={formData.departureAirport} onChange={handleChange} placeholder="e.g. BOM" className="w-full bg-[#2f2f2f] border border-white/10 text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Departure Date</label>
                                        <input required type="date" name="departureDate" value={formData.departureDate} onChange={handleChange} className="w-full bg-[#2f2f2f] border border-white/10 text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 css-date-icon-invert" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Destination City</label>
                                        <input required name="destinationCity" value={formData.destinationCity} onChange={handleChange} placeholder="e.g. Delhi" className="w-full bg-[#2f2f2f] border border-white/10 text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Destination Airport</label>
                                        <input required name="destinationAirport" value={formData.destinationAirport} onChange={handleChange} placeholder="e.g. DEL" className="w-full bg-[#2f2f2f] border border-white/10 text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Departure Time</label>
                                        <input required type="time" name="departureTime" value={formData.departureTime} onChange={handleChange} className="w-full bg-[#2f2f2f] border border-white/10 text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 css-date-icon-invert" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 mt-6 border-t border-white/10">
                                    <div>
                                        <h3 className="font-medium text-gray-200 mb-3">Ticket Prices (₹/$)</h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Economy</label>
                                                <input required type="number" name="price_economy" value={formData.prices.economy} onChange={handleChange} className="w-full bg-[#2f2f2f] border border-white/10 text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Business</label>
                                                <input required type="number" name="price_business" value={formData.prices.business} onChange={handleChange} className="w-full bg-[#2f2f2f] border border-white/10 text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">First Class</label>
                                                <input required type="number" name="price_first" value={formData.prices.first} onChange={handleChange} className="w-full bg-[#2f2f2f] border border-white/10 text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="font-medium text-gray-200 mb-3">Available Seats</h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Economy</label>
                                                <input required type="number" name="seat_economy" value={formData.availableSeats.economy} onChange={handleChange} className="w-full bg-[#2f2f2f] border border-white/10 text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">Business</label>
                                                <input required type="number" name="seat_business" value={formData.availableSeats.business} onChange={handleChange} className="w-full bg-[#2f2f2f] border border-white/10 text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-400 mb-1">First Class</label>
                                                <input required type="number" name="seat_first" value={formData.availableSeats.first} onChange={handleChange} className="w-full bg-[#2f2f2f] border border-white/10 text-white p-2.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-white/10">
                                    {editingId && (
                                        <button type="button" onClick={() => { setEditingId(null); setFormData(initialFormState); }} className="px-5 py-2.5 bg-[#2f2f2f] text-gray-300 border border-white/10 rounded-lg hover:bg-[#383838] hover:text-white font-medium transition">
                                            Cancel
                                        </button>
                                    )}
                                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition shadow-sm">
                                        {editingId ? 'Update Flight' : 'Add Flight'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="bg-[#212121] rounded-xl shadow-lg border border-white/10 overflow-hidden">
                            <div className="px-6 py-5 border-b border-white/10 bg-[#1e1e1e] flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-gray-200">Flight Database</h2>
                                <span className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full font-medium">{flights.length} flights</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-[#1e1e1e] text-gray-400">
                                        <tr>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Flight Info</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Route</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Schedule</th>
                                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Seats Left</th>
                                            <th scope="col" className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {flights.map(f => (
                                            <tr key={f._id} className="hover:bg-[#2a2a2a] transition">
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded inline-block mb-1">{f.flightNumber}</div>
                                                    <div className="text-sm font-medium text-gray-300">{f.airline}</div>
                                                    <div className="text-xs text-gray-500">{f.flightName}</div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="text-sm text-gray-200 flex items-center gap-2">
                                                        <span className="font-medium" title={f.departureCity}>{f.departureAirport}</span>
                                                        <span className="text-gray-500">→</span>
                                                        <span className="font-medium" title={f.destinationCity}>{f.destinationAirport}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1">{f.departureCity} to {f.destinationCity}</div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-300">{f.departureDate ? new Date(f.departureDate).toLocaleDateString() : ''}</div>
                                                    <div className="text-sm text-gray-400 font-mono mt-1 bg-[#171717] px-1.5 py-0.5 rounded inline-block">{f.departureTime}</div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1 text-sm bg-[#171717] p-2.5 rounded-lg border border-white/5">
                                                        <div className="flex justify-between w-24">
                                                            <span className="font-medium text-gray-500">Eco:</span>
                                                            <span className={`font-bold ${f.availableSeats?.economy === 0 ? 'text-red-400' : 'text-green-500'}`}>{f.availableSeats?.economy || 0}</span>
                                                        </div>
                                                        <div className="flex justify-between w-24">
                                                            <span className="font-medium text-gray-500">Bus:</span>
                                                            <span className={`font-bold ${f.availableSeats?.business === 0 ? 'text-red-400' : 'text-green-500'}`}>{f.availableSeats?.business || 0}</span>
                                                        </div>
                                                        <div className="flex justify-between w-24">
                                                            <span className="font-medium text-gray-500">First:</span>
                                                            <span className={`font-bold ${f.availableSeats?.first === 0 ? 'text-red-400' : 'text-green-500'}`}>{f.availableSeats?.first || 0}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 whitespace-nowrap text-center text-sm font-medium">
                                                    <div className="flex justify-center space-x-3">
                                                        <button onClick={() => handleEdit(f)} className="text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded transition">Edit</button>
                                                        <button onClick={() => deleteFlight(f._id)} className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded transition">Delete</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table >
                                {
                                    flights.length === 0 && (
                                        <div className="py-12 text-center text-gray-500 bg-[#1e1e1e]">
                                            <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                            </svg>
                                            <p className="text-lg font-medium text-gray-400">No flights available</p>
                                            <p className="text-sm text-gray-500">Use the form above to add your first flight to the database.</p>
                                        </div>
                                    )
                                }
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'bookings' && (
                    <div className="bg-[#212121] rounded-xl shadow-lg border border-white/10 overflow-hidden">
                        <div className="px-6 py-5 border-b border-white/10 bg-[#1e1e1e] flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-gray-200">Booking Ledger</h2>
                            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-1 rounded-full font-medium">{bookings.length} total bookings</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-white/10">
                                <thead className="bg-[#1e1e1e] text-gray-400">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">PNR</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Flight Info</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Passenger Details</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Revenue</th>
                                        <th scope="col" className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {bookings.map(b => (
                                        <tr key={b._id} className="hover:bg-[#2a2a2a] transition">
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-sm font-bold text-gray-200 bg-[#333] px-2 py-1 rounded inline-block tracking-wider border border-white/10">{b.pnr}</div>
                                                <div className="text-xs text-gray-500 mt-2">{new Date(b.createdAt).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {b.flight ? (
                                                    <>
                                                        <div className="text-sm font-semibold text-gray-200 mb-1">{b.flight.flightNumber}</div>
                                                        <div className="text-xs text-gray-400 whitespace-nowrap">{b.flight.departureAirport} → {b.flight.destinationAirport}</div>
                                                        <div className="text-xs text-gray-500 mt-1 capitalize">{b.cabinClass} Class</div>
                                                    </>
                                                ) : (
                                                    <span className="text-gray-500 italic">Flight deleted</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-sm text-gray-300 font-medium mb-1 truncate max-w-[200px]" title={b.contactEmail}>
                                                    {b.contactEmail}
                                                </div>
                                                <div className="text-xs text-gray-400 bg-[#333] inline-block px-2 py-0.5 rounded border border-white/5">
                                                    {b.passengers?.length || 0} ticket(s)
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-sm font-bold text-gray-200">
                                                    ₹{b.totalAmount}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 uppercase">
                                                    {b.payment?.paymentMethod || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-center">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${b.bookingStatus === 'Confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : b.bookingStatus === 'Partially Cancelled' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                    {b.bookingStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {bookings.length === 0 && (
                                <div className="py-12 text-center text-gray-500 bg-[#1e1e1e]">
                                    <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    <p className="text-lg font-medium text-gray-400">No bookings yet</p>
                                    <p className="text-sm text-gray-500">When users book flights via the AI assistant, they will appear here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <style dangerouslySetInnerHTML={{
                    __html: `
                .css-date-icon-invert::-webkit-calendar-picker-indicator {
                    filter: invert(1);
                }
                `}} />
            </div>
        </div>
    );
}