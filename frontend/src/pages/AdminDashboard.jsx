import React from 'react';
import { Users, Plane, DollarSign, Activity, Sparkles, Terminal, Bell, Shield, HeartPulse } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

const AdminDashboard = () => {
  const { formatCurrency } = useCurrency();

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white pt-28 pb-16 px-6 relative overflow-hidden">
      {/* Ambient background glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neonCyan/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neonPurple/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob animation-delay-2000"></div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-10">
        
        {/* Banner Title */}
        <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-[0_0_30px_rgba(0,240,255,0.05)] space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold uppercase tracking-wider text-neonPurple">
            <Shield size={12} /> Administrative Access Level
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-extrabold tracking-tight">
            Admin <span className="text-gradient">Control Hub</span>
          </h1>
          <p className="text-gray-400 font-light text-sm">Monitor neural search execution networks, real-time Stripe transits, and AI assistant latency graphs.</p>
        </div>

        {/* Dynamic High-Tech Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Neural Revenue', value: formatCurrency(45231), icon: <DollarSign />, color: 'text-green-400', bg: 'bg-green-500/10', border: 'hover:border-green-500/30' },
            { label: 'Active Flights', value: '124', icon: <Plane />, color: 'text-neonCyan', bg: 'bg-neonCyan/10', border: 'hover:border-neonCyan/30' },
            { label: 'Total Members', value: '8,432', icon: <Users />, color: 'text-neonPurple', bg: 'bg-neonPurple/10', border: 'hover:border-neonPurple/30' },
            { label: 'System Vitals', value: '99.9%', icon: <HeartPulse />, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'hover:border-pink-500/30' }
          ].map((stat, idx) => (
            <div 
              key={idx} 
              className={`glass-panel p-6 rounded-2xl border border-white/10 flex items-center space-x-4 transition-all duration-300 transform hover:scale-[1.02] ${stat.border}`}
            >
              <div className={`p-4 rounded-xl ${stat.bg} ${stat.color} shadow-md`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-extrabold text-white mt-0.5">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard Dual Panel Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Recent System Activity Log */}
          <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Terminal className="text-neonCyan" size={20} /> System Event Terminal
            </h2>
            <div className="space-y-4 flex-grow">
              <div className="flex justify-between items-center p-4 bg-white/2 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                <div>
                  <p className="font-semibold text-white">Flight FL-902 Delayed</p>
                  <p className="text-xs text-gray-400 mt-0.5">Socket.io tracking event dispatched to terminal BOM</p>
                </div>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Delay Alert
                </span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-white/2 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                <div>
                  <p className="font-semibold text-white">Refund Requested (#RF-442)</p>
                  <p className="text-xs text-gray-400 mt-0.5">Stripe transit validation pending for passenger john@example.com</p>
                </div>
                <span className="bg-neonCyan/10 text-neonCyan border border-neonCyan/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Pending
                </span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-white/2 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                <div>
                  <p className="font-semibold text-white">Neural User Sync Successful</p>
                  <p className="text-xs text-gray-400 mt-0.5">Account setup complete for user karthikraj@gmail.com</p>
                </div>
                <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Success
                </span>
              </div>
            </div>
          </div>
          
          {/* AI Chatbot Performance Panel */}
          <div className="glass-panel p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Sparkles className="text-neonPurple" size={20} /> AI Agent Intelligence Vitals
              </h2>
              <p className="text-sm text-gray-400 font-light leading-relaxed mb-6">
                Real-time tracking of neural conversational matrices, context matching caches, and automated route recommendations.
              </p>
            </div>
            
            <div className="p-8 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl bg-white/2">
              <Activity size={40} className="mb-4 text-neonPurple animate-pulse" />
              <p className="text-sm font-bold text-white">AI Agent Active & Fully Connected</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">1,204 dynamic passenger queries resolved today.</p>
              
              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden mt-6 border border-white/10">
                <div className="bg-gradient-to-r from-neonCyan to-neonPurple h-full w-[84%] rounded-full shadow-[0_0_10px_rgba(0,240,255,0.5)]"></div>
              </div>
              <div className="flex justify-between w-full mt-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                <span>Model Load: 16%</span>
                <span>Response SLA: 99.8%</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;