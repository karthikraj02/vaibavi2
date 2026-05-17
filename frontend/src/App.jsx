import React, { useContext, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import Login from './pages/Login';
import Register from './pages/Register';
import FlightSearch from './pages/FlightSearch';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Admin from './Admin';
import MyTickets from './pages/MyTickets';
import AIChat from './components/AIChat';
import { Plane, Sparkles } from 'lucide-react';

const Navbar = ({ onLoginClick }) => {
  const { user, logout } = useContext(AuthContext);
  return (
    <nav className="fixed w-full glass-nav z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-neonCyan to-neonPurple mr-3 shadow-[0_0_15px_rgba(0,240,255,0.5)] group-hover:shadow-[0_0_25px_rgba(0,240,255,0.8)] transition-all duration-300">
            <Plane className="text-white" size={24} />
          </div>
          <span className="font-display font-bold text-2xl tracking-wide text-white">
            Flight<span className="text-gradient">Agent</span>
          </span>
        </Link>
        <div className="flex items-center space-x-6">
          <Link to="/search" className="text-gray-300 hover:text-neonCyan font-medium transition-colors duration-300 flex items-center gap-1">
             Search Flights
          </Link>
          {user ? (
            <>
              <Link to="/dashboard" className="text-gray-300 hover:text-neonCyan font-medium transition-colors duration-300">Dashboard</Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="text-neonPurple hover:text-white font-bold transition-colors duration-300 drop-shadow-[0_0_8px_rgba(138,43,226,0.5)]">Admin Panel</Link>
              )}
              <button onClick={logout} className="px-5 py-2 rounded-full border border-red-500/30 text-red-400 font-medium hover:bg-red-500/10 hover:text-red-300 transition-all duration-300">
                Logout
              </button>
            </>
          ) : (
            <button onClick={onLoginClick} className="neon-button bg-gradient-to-r from-neonCyan to-blue-600 px-6 py-2.5 rounded-full">
              Login Portal
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

const Home = () => (
  <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 pt-20 relative overflow-hidden">
    {/* Glowing Background Orbs */}
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neonCyan/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
    <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-neonPurple/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
    <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000"></div>
    
    <div className="relative z-10 glass-panel p-12 md:p-20 rounded-3xl max-w-4xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] transform hover:scale-[1.01] transition-transform duration-500">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-float">
        <Sparkles className="text-neonCyan" size={16} />
        <span className="text-sm font-medium tracking-wider text-gray-300 uppercase">Next-Gen Travel Intelligence</span>
      </div>
      
      <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
        Travel Smarter with <br/>
        <span className="text-gradient">AI Power</span>
      </h1>
      
      <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
        Experience the future of bookings. FlightAgent uses neural networks to find optimal routes, automate refunds, and provide real-time socket tracking.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
        <Link to="/search" className="neon-button bg-gradient-to-r from-neonCyan to-blue-600 px-8 py-4 rounded-full text-lg font-bold w-full sm:w-auto">
          Initialize Search
        </Link>
        <Link to="/register" className="px-8 py-4 rounded-full text-lg font-bold w-full sm:w-auto border border-white/20 text-white hover:bg-white/5 hover:border-white/40 transition-all duration-300">
          Create Access
        </Link>
      </div>
    </div>
  </div>
);

function AppContent() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="relative min-h-screen text-gray-100 flex flex-col">
      <Navbar onLoginClick={() => setIsLoginModalOpen(true)} />
      <main className="flex-grow flex flex-col pt-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login isOpen={true} onClose={() => {}} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/search" element={<FlightSearch />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin-portal" element={<Admin />} />
          <Route path="/tickets" element={<MyTickets />} />
        </Routes>
      </main>
      <Login isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
      <AIChat />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <Router>
          <AppContent />
        </Router>
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App;