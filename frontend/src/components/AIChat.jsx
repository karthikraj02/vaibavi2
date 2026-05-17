import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ sender: 'ai', text: 'Hello! I am your FlightAgent AI. How can I assist you with your travels, bookings, or refunds today?' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await axios.post(`${API}/api/ai/chat`, { message: userMsg });
      setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, I am having trouble connecting to my AI core right now.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 50, scale: 0.9 }} 
            className="glass-panel rounded-3xl shadow-[0_0_50px_rgba(0,240,255,0.15)] w-80 sm:w-96 mb-4 overflow-hidden border border-white/10 flex flex-col h-[500px] relative"
          >
            {/* Glowing top border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neonCyan to-neonPurple z-10"></div>
            
            <div className="bg-black/40 backdrop-blur-md text-white p-4 flex justify-between items-center border-b border-white/10 relative z-10">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="text-neonCyan" size={20} /> 
                <span className="font-display font-bold">Neural<span className="text-gradient">Assistant</span></span>
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20 custom-scrollbar relative z-10">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                    msg.sender === 'user' 
                    ? 'bg-gradient-to-br from-neonCyan to-blue-600 text-white rounded-br-none shadow-[0_0_15px_rgba(0,240,255,0.2)]' 
                    : 'glass-panel border border-white/10 text-gray-200 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                   <div className="glass-panel border border-white/10 text-gray-400 rounded-2xl rounded-bl-none p-3 text-xs flex items-center space-x-1">
                     <span className="animate-bounce delay-75 w-1.5 h-1.5 bg-neonCyan rounded-full"></span>
                     <span className="animate-bounce delay-150 w-1.5 h-1.5 bg-neonPurple rounded-full"></span>
                     <span className="animate-bounce delay-300 w-1.5 h-1.5 bg-neonCyan rounded-full"></span>
                   </div>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-black/40 backdrop-blur-md border-t border-white/10 flex items-center gap-2 relative z-10">
              <input 
                type="text" 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && handleSend()} 
                placeholder="Initialize query..." 
                className="flex-1 bg-black/30 px-4 py-2.5 border border-white/10 rounded-full focus:outline-none focus:border-neonCyan/50 focus:ring-1 focus:ring-neonCyan/50 text-sm text-white placeholder-gray-500 transition-all" 
              />
              <button 
                onClick={handleSend} 
                className="neon-button bg-gradient-to-r from-neonCyan to-blue-600 text-white p-2.5 rounded-full shadow-[0_0_15px_rgba(0,240,255,0.3)] transition"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!isOpen && (
        <motion.button 
          whileHover={{ scale: 1.1 }} 
          whileTap={{ scale: 0.9 }} 
          onClick={() => setIsOpen(true)} 
          className="neon-button bg-gradient-to-r from-neonCyan to-neonPurple text-white p-4 rounded-full shadow-[0_0_25px_rgba(0,240,255,0.5)] flex items-center justify-center transition border border-white/20"
        >
          <MessageCircle size={28} />
        </motion.button>
      )}
    </div>
  );
};

export default AIChat;