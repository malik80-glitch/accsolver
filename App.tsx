import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatState, Message, Attachment } from './types';
import { sendMessageToGemini, extractTextFromImage } from './services/geminiService';
import WelcomeScreen from './components/WelcomeScreen';
import ChatMessage from './components/ChatMessage';
import InputArea from './components/InputArea';
import { Trash2, Menu, X, ArrowLeft, Search, Bot, FileText, Save } from 'lucide-react';
import { SUBJECTS } from './constants';

const STORAGE_KEY = 'acctsolver_chat_state';

const App: React.FC = () => {
  // Initialize state from localStorage if available
  const [state, setState] = useState<ChatState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Restore Date objects from string timestamps
        const messages = parsed.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        return {
          ...parsed,
          messages,
          isLoading: false // Always reset loading state on restore
        };
      }
    } catch (error) {
      console.error("Failed to load state from localStorage:", error);
    }
    return {
      messages: [],
      isLoading: false,
      selectedSubject: null,
    };
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Ref to hold the latest state for the auto-save interval
  const stateRef = useRef(state);

  // Sync ref with state whenever state changes
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (stateRef.current.messages.length > 0) {
        setIsSaving(true);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current));
        
        // Hide indicator after 2 seconds
        setTimeout(() => {
          setIsSaving(false);
        }, 2000);
      }
    }, 30000);

    return () => clearInterval(saveInterval);
  }, []);

  const scrollToBottom = () => {
    // Only scroll if not searching, to avoid jumping around while reading results
    if (!searchTerm) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, searchTerm, state.isLoading]);

  const handleSendMessage = async (text: string, attachment?: Attachment) => {
    // Clear search when sending a new message to return to full view
    if (searchTerm) setSearchTerm('');

    // 1. Add User Message
    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      text,
      timestamp: new Date(),
      attachment: attachment, // Store the full attachment object
    };

    // Capture current history before state update (for API call)
    const currentHistory = state.messages;

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isLoading: true
    }));

    // 2. Prepare Context
    let promptContext = text;
    if (state.selectedSubject) {
      promptContext = `[Subject: ${state.selectedSubject}] ${text}`;
    }

    // 3. Call API
    // Pass currentHistory so the model has context of previous turns
    // Use the attachment from the new message
    const response = await sendMessageToGemini(promptContext, currentHistory, attachment || null);

    // 4. Add AI Response
    const aiMsg: Message = {
      id: uuidv4(),
      role: 'model',
      text: response.text,
      timestamp: new Date(),
      image: response.generatedImage, // Attach generated image if present
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, aiMsg],
      isLoading: false
    }));
  };

  const handleSummarize = () => {
    if (state.messages.length === 0) return;
    
    // Send a summarization request
    const summaryPrompt = "Please provide a concise summary of our conversation so far. Highlight any numerical problems solved and key accounting theory concepts we discussed.";
    handleSendMessage(summaryPrompt);
    
    // Close sidebar on mobile
    setIsSidebarOpen(false);
  };

  const handleExtractText = async (image: string): Promise<string> => {
    return await extractTextFromImage(image);
  };

  const handleSubjectSelect = (subjectName: string) => {
    setState(prev => ({ ...prev, selectedSubject: subjectName }));
    setIsSidebarOpen(false); // Close sidebar on mobile
  };

  const resetChat = () => {
    if (window.confirm("Are you sure you want to clear the current chat session?")) {
      setState({
        messages: [],
        isLoading: false,
        selectedSubject: null,
      });
      setSearchTerm('');
      localStorage.removeItem(STORAGE_KEY); // Clear saved data immediately
    }
  };

  const goHome = () => {
    setState(prev => ({ ...prev, messages: [], selectedSubject: null }));
    setSearchTerm('');
  };

  // Filter messages based on search term
  const displayedMessages = searchTerm.trim()
    ? state.messages.filter(msg => 
        msg.text.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : state.messages;

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800">
             <div className="w-6 h-6 bg-brand-600 rounded-md flex items-center justify-center text-white text-xs">AI</div>
             <span>AcctSolver</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col h-[calc(100vh-64px)]">
          {/* Search Bar */}
          <div className="p-4 pb-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search messages..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={state.messages.length === 0}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-slate-400"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="p-4 overflow-y-auto flex-1">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 mt-2">Subjects</div>
            <nav className="space-y-1">
              {SUBJECTS.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handleSubjectSelect(sub.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    state.selectedSubject === sub.name 
                      ? 'bg-brand-50 text-brand-700 font-medium' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </nav>

            <div className="mt-8 border-t border-slate-100 pt-4 space-y-2">
              <button
                onClick={handleSummarize}
                disabled={state.messages.length === 0}
                className="flex items-center gap-2 text-sm text-slate-600 hover:bg-slate-50 w-full px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Summarize the current conversation"
              >
                <FileText size={16} />
                Summarize Chat
              </button>
              <button
                onClick={resetChat}
                className="flex items-center gap-2 text-sm text-red-500 hover:bg-red-50 w-full px-3 py-2 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
                Clear Conversation
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full w-full relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
             <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <Menu size={20} />
            </button>
            {state.messages.length > 0 && (
              <button onClick={goHome} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg hover:text-brand-600" title="Back to Home">
                 <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h2 className="font-semibold text-slate-800">
                {searchTerm 
                  ? "Search Results" 
                  : (state.selectedSubject || "Accounting Assistant")}
              </h2>
              {state.messages.length > 0 && state.selectedSubject && !searchTerm && (
                 <p className="text-xs text-brand-600 font-medium">Topic Active</p>
              )}
              {searchTerm && (
                <p className="text-xs text-slate-500 font-medium">
                  Found {displayedMessages.length} match{displayedMessages.length !== 1 ? 'es' : ''}
                </p>
              )}
            </div>
          </div>
          
          {/* Auto-save Indicator */}
          <div className={`flex items-center gap-2 text-xs font-medium text-slate-400 transition-opacity duration-300 ${isSaving ? 'opacity-100' : 'opacity-0'}`}>
             <Save size={14} />
             <span>Autosaving...</span>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth bg-slate-50">
          {state.messages.length === 0 ? (
            <WelcomeScreen 
              onSelectSubject={handleSubjectSelect} 
              onSelectSuggestion={(text) => handleSendMessage(text)}
            />
          ) : (
            <div className="max-w-4xl mx-auto pb-4">
              {searchTerm && displayedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Search size={48} className="mb-4 opacity-20" />
                  <p className="text-lg font-medium text-slate-500">No matching messages found</p>
                  <p className="text-sm">Try checking your spelling or use a different keyword.</p>
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="mt-4 text-brand-600 hover:underline text-sm font-medium"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                displayedMessages.map((msg) => (
                  <ChatMessage 
                    key={msg.id} 
                    message={msg} 
                    highlightTerm={searchTerm} 
                  />
                ))
              )}
              
              {state.isLoading && !searchTerm && (
                <div className="flex w-full mb-6 justify-start">
                  <div className="flex max-w-[90%] md:max-w-[80%] flex-row gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 bg-brand-100 text-brand-600">
                      <Bot size={18} />
                    </div>
                    <div className="flex flex-col items-start">
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex items-center gap-3">
                        <span className="text-sm text-slate-500 font-medium">AcctSolver is typing</span>
                        <div className="flex gap-1 mt-1">
                          <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <InputArea 
          onSendMessage={handleSendMessage} 
          isLoading={state.isLoading} 
          onExtractText={handleExtractText}
        />
      </main>
    </div>
  );
};

export default App;