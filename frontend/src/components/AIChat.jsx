import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MessageCircle, X, Send, Sparkles, Bot, Trash2, ChevronDown } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Simple markdown renderer for AI responses
function RenderMarkdown({ text }) {
  if (!text) return null;

  // Process markdown into JSX
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    if (line.startsWith('### ')) {
      elements.push(<p key={i} className="font-bold text-neonCyan text-sm mt-2 mb-0.5">{line.slice(4)}</p>);
    } else if (line.startsWith('## ')) {
      elements.push(<p key={i} className="font-bold text-neonCyan text-base mt-2 mb-1">{line.slice(3)}</p>);
    } else if (line.startsWith('# ')) {
      elements.push(<p key={i} className="font-bold text-white text-base mt-2 mb-1">{line.slice(2)}</p>);
    }
    // Bullet points
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-1.5 my-0.5">
          <span className="text-neonCyan mt-1 shrink-0">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      elements.push(
        <div key={i} className="flex gap-1.5 my-0.5">
          <span className="text-neonCyan shrink-0 min-w-[1.2em]">{match[1]}.</span>
          <span>{renderInline(match[2])}</span>
        </div>
      );
    }
    // Horizontal rule
    else if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={i} className="border-white/10 my-2" />);
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-1.5" />);
    }
    // Normal text
    else {
      elements.push(<p key={i} className="my-0.5 leading-snug">{renderInline(line)}</p>);
    }
    i++;
  }

  return <div className="text-sm space-y-0">{elements}</div>;
}

function renderInline(text) {
  // Handle **bold**, *italic*, `code`, and [link](url)
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    // Italic
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)/s);
    // Code
    const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)/s);
    // Link
    const linkMatch = remaining.match(/^(.*?)\[(.+?)\]\((https?:\/\/[^\s)]+)\)(.*)/s);

    if (linkMatch && (!boldMatch || linkMatch[1].length <= boldMatch[1].length)) {
      if (linkMatch[1]) parts.push(<span key={key++}>{linkMatch[1]}</span>);
      parts.push(<a key={key++} href={linkMatch[3]} target="_blank" rel="noopener noreferrer" className="text-neonCyan underline hover:text-white transition-colors">{linkMatch[2]}</a>);
      remaining = linkMatch[4];
    } else if (boldMatch && (!codeMatch || boldMatch[1].length <= codeMatch[1].length)) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
      parts.push(<strong key={key++} className="font-bold text-white">{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
    } else if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>);
      parts.push(<code key={key++} className="bg-white/10 text-neonCyan px-1 py-0.5 rounded text-xs font-mono">{codeMatch[2]}</code>);
      remaining = codeMatch[3];
    } else if (italicMatch && italicMatch[1].length < 20) {
      if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>);
      parts.push(<em key={key++} className="italic text-gray-300">{italicMatch[2]}</em>);
      remaining = italicMatch[3];
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      remaining = '';
    }
  }

  return parts.length === 0 ? text : parts;
}

const INITIAL_MESSAGE = {
  role: 'assistant',
  content: "Hello! I'm your **FlightAgent AI Assistant** ✈️\n\nI can help you:\n- Search for available flights\n- Check booking status by PNR\n- Understand refund policies\n- Track your flight\n\nHow can I assist you today?",
};

const AIChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [aiModel, setAiModel] = useState('gemini');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Build the history to send (exclude the static initial greeting, keep real conversation)
    const historyToSend = newMessages
      .slice(1) // skip the static initial greeting
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const { data } = await axios.post(`${API}/api/chat`, {
        messages: historyToSend,
        aiModel,
        chatId,
      });

      if (data.chatId && !chatId) setChatId(data.chatId);

      const reply = data.message?.content || data.reply || "Sorry, I didn't get a response.";
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      console.error('[AIChat] Error:', error);
      // Fallback to simple endpoint
      try {
        const { data } = await axios.post(`${API}/api/ai/chat`, { message: trimmed });
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply || "I'm having trouble connecting. Please try again." }]);
      } catch (fallbackErr) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: '⚠️ Connection error. Please check the server is running and try again.' },
        ]);
      }
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setChatId(null);
    setInput('');
  };

  const modelLabel = aiModel === 'gemini' ? '✦ Gemini' : '⬡ GPT-4o';

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="glass-panel rounded-3xl shadow-[0_0_60px_rgba(0,240,255,0.12)] w-80 sm:w-96 mb-4 overflow-hidden border border-white/10 flex flex-col"
            style={{ height: '520px' }}
          >
            {/* Glowing top border */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-neonCyan via-neonPurple to-neonCyan z-20 rounded-t-3xl" />

            {/* Header */}
            <div className="bg-black/50 backdrop-blur-xl text-white px-4 py-3 flex justify-between items-center border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Sparkles className="text-neonCyan" size={18} />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-black animate-pulse" />
                </div>
                <span className="font-bold font-display">
                  Neural<span className="text-gradient">Assistant</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Model selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowModelMenu(p => !p)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-neonCyan border border-white/10 rounded-full px-2.5 py-1 transition-colors"
                  >
                    {modelLabel} <ChevronDown size={10} />
                  </button>
                  <AnimatePresence>
                    {showModelMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute right-0 top-8 bg-black/90 border border-white/10 rounded-xl shadow-xl z-30 overflow-hidden min-w-[130px]"
                      >
                        {['gemini', 'openai'].map(m => (
                          <button
                            key={m}
                            onClick={() => { setAiModel(m); setShowModelMenu(false); }}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors ${aiModel === m ? 'text-neonCyan bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                          >
                            {m === 'gemini' ? '✦ Gemini 2.0 Flash' : '⬡ GPT-4o Mini'}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button onClick={clearChat} title="Clear chat" className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded-full">
                  <Trash2 size={14} />
                </button>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-black/20 custom-scrollbar">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-neonCyan/20 to-neonPurple/20 border border-neonCyan/30 flex items-center justify-center mt-0.5">
                      <Bot size={12} className="text-neonCyan" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-neonCyan to-blue-600 text-white rounded-br-none shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                        : 'glass-panel border border-white/10 text-gray-200 rounded-bl-none'
                    }`}
                  >
                    {msg.role === 'assistant'
                      ? <RenderMarkdown text={msg.content} />
                      : <p className="leading-snug">{msg.content}</p>
                    }
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-2 justify-start">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-neonCyan/20 to-neonPurple/20 border border-neonCyan/30 flex items-center justify-center">
                    <Bot size={12} className="text-neonCyan" />
                  </div>
                  <div className="glass-panel border border-white/10 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-neonCyan rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-neonPurple rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-neonCyan rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-3 bg-black/50 backdrop-blur-xl border-t border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about flights, bookings…"
                  disabled={loading}
                  className="flex-1 bg-black/40 px-4 py-2.5 border border-white/10 rounded-full focus:outline-none focus:border-neonCyan/50 focus:ring-1 focus:ring-neonCyan/30 text-sm text-white placeholder-gray-500 transition-all disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="neon-button bg-gradient-to-r from-neonCyan to-blue-600 text-white p-2.5 rounded-full shadow-[0_0_15px_rgba(0,240,255,0.3)] transition disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_25px_rgba(0,240,255,0.5)] active:scale-95"
                >
                  <Send size={17} />
                </button>
              </div>
              <p className="text-center text-gray-600 text-[10px] mt-1.5">
                Press <kbd className="bg-white/5 border border-white/10 rounded px-1 py-0.5">Enter</kbd> to send
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(true)}
          className="neon-button bg-gradient-to-r from-neonCyan to-neonPurple text-white p-4 rounded-full shadow-[0_0_30px_rgba(0,240,255,0.5)] flex items-center justify-center border border-white/20 relative"
        >
          <MessageCircle size={26} />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-black animate-pulse" />
        </motion.button>
      )}
    </div>
  );
};

export default AIChat;
