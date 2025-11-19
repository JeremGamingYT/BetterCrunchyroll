import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User as UserIcon, Sparkles } from 'lucide-react';
import { AnimeDetails, ChatMessage, ChatRole } from '../types';
import { chatWithAnimeCompanion } from '../services/geminiService';

interface GeminiChatProps {
  isOpen: boolean;
  onClose: () => void;
  anime: AnimeDetails;
}

export const GeminiChat: React.FC<GeminiChatProps> = ({ isOpen, onClose, anime }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init', role: ChatRole.MODEL, text: `Hi! I'm your AI companion for ${anime.title}. Ask me anything about the plot or characters!` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: ChatRole.USER, text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Format history for Gemini SDK
    const history = messages.map(m => ({
        role: m.role === ChatRole.USER ? 'user' : 'model',
        parts: [{ text: m.text }]
    }));

    const responseText = await chatWithAnimeCompanion(history, userMsg.text, anime);
    
    const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: ChatRole.MODEL, text: responseText };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-end pointer-events-none p-4 sm:p-6">
      <div className="pointer-events-auto w-full sm:w-[400px] h-[600px] bg-[#121212] border border-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-[slide-in_0.3s_ease-out]">
        
        {/* Header */}
        <div className="bg-[#1a1a1a] p-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">Anime Companion</h3>
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                Online
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0a0a] scrollbar-thin scrollbar-thumb-gray-700">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === ChatRole.USER ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                msg.role === ChatRole.USER ? 'bg-gray-700' : 'bg-crunchy/20'
              }`}>
                {msg.role === ChatRole.USER ? <UserIcon size={14} /> : <Bot size={16} className="text-crunchy" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed ${
                msg.role === ChatRole.USER 
                  ? 'bg-gray-800 text-white rounded-tr-sm' 
                  : 'bg-[#1e1e1e] text-gray-200 rounded-tl-sm border border-gray-800'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex gap-3">
               <div className="w-8 h-8 rounded-full bg-crunchy/20 flex-shrink-0 flex items-center justify-center">
                 <Bot size={16} className="text-crunchy" />
               </div>
               <div className="bg-[#1e1e1e] rounded-2xl rounded-tl-sm p-4 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-200"></div>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-[#1a1a1a] border-t border-gray-800">
          <div className="relative">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about the episode..."
              className="w-full bg-[#0a0a0a] border border-gray-700 text-white text-sm rounded-full pl-4 pr-12 py-3 focus:outline-none focus:border-crunchy transition-colors"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-1.5 top-1.5 p-1.5 bg-crunchy text-black rounded-full hover:bg-crunchy-hover disabled:opacity-50 disabled:hover:bg-crunchy transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
