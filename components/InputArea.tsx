import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X, Loader2, Lightbulb, Zap, Mic, MicOff, Camera, PieChart, ScanText, Paperclip, FileText, FileSpreadsheet } from 'lucide-react';
import { Attachment } from '../types';

interface InputAreaProps {
  onSendMessage: (text: string, attachment?: Attachment) => void;
  isLoading: boolean;
  onExtractText: (image: string) => Promise<string>;
}

const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, isLoading, onExtractText }) => {
  const [inputText, setInputText] = useState('');
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setIsSpeechSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          // We only care about final results to avoid duplicating text in the input
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          
          if (finalTranscript) {
            setInputText(prev => {
              const needsSpace = prev.length > 0 && !prev.endsWith(' ');
              return prev + (needsSpace ? ' ' : '') + finalTranscript;
            });
          }
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [inputText]);

  // Ensure focus when attachment is added
  useEffect(() => {
    if (selectedAttachment) {
      textareaRef.current?.focus();
    }
  }, [selectedAttachment]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        let mimeType = file.type;
        const ext = file.name.split('.').pop()?.toLowerCase();

        // Robust MIME type detection
        // Browsers often miss CSV, MD, or return generic octet-stream for unknown types
        if (!mimeType || mimeType === 'application/octet-stream') {
            switch (ext) {
                case 'csv': mimeType = 'text/csv'; break;
                case 'md': mimeType = 'text/markdown'; break;
                case 'json': mimeType = 'application/json'; break;
                case 'pdf': mimeType = 'application/pdf'; break;
                case 'txt': mimeType = 'text/plain'; break;
                case 'tsv': mimeType = 'text/tab-separated-values'; break;
                case 'xml': mimeType = 'text/xml'; break;
                case 'yml': 
                case 'yaml': mimeType = 'text/yaml'; break;
            }
        }

        setSelectedAttachment({
          data: reader.result as string,
          mimeType: mimeType || 'application/octet-stream',
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
    // Reset value so same file can be selected again
    e.target.value = '';
  };

  const removeAttachment = () => {
    setSelectedAttachment(null);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleScan = async () => {
    if (!selectedAttachment || !selectedAttachment.mimeType.startsWith('image') || isExtracting) return;
    setIsExtracting(true);
    try {
      const text = await onExtractText(selectedAttachment.data);
      if (text) {
        setInputText(prev => {
          const prefix = prev ? prev + "\n\n" : "";
          return prefix + text;
        });
      }
    } catch (e) {
      console.error("Failed to extract text", e);
    } finally {
      setIsExtracting(false);
      textareaRef.current?.focus();
    }
  };

  const handleExplainClick = () => {
    const prefix = "Explain the concept of ";
    const prefixesToRemove = ["Exam Note: ", "Generate Image: "];
    let newText = inputText;
    
    // Remove conflicting prefixes
    prefixesToRemove.forEach(p => {
      if (newText.startsWith(p)) newText = newText.substring(p.length);
    });
    
    // Toggle current prefix
    if (newText.startsWith(prefix)) {
      setInputText(newText.substring(prefix.length));
    } else {
      setInputText(prefix + newText);
    }
    
    textareaRef.current?.focus();
  };

  const handleExamModeClick = () => {
    const prefix = "Exam Note: ";
    const prefixesToRemove = ["Explain the concept of ", "Generate Image: "];
    let newText = inputText;
    
    // Remove conflicting prefixes
    prefixesToRemove.forEach(p => {
      if (newText.startsWith(p)) newText = newText.substring(p.length);
    });

    // Toggle current prefix
    if (newText.startsWith(prefix)) {
      setInputText(newText.substring(prefix.length));
    } else {
      setInputText(prefix + newText);
    }
    
    textareaRef.current?.focus();
  };

  const handleChartClick = () => {
    const prefix = "Generate Image: ";
    const prefixesToRemove = ["Explain the concept of ", "Exam Note: "];
    let newText = inputText;
    
    // Remove conflicting prefixes
    prefixesToRemove.forEach(p => {
      if (newText.startsWith(p)) newText = newText.substring(p.length);
    });

    // Toggle current prefix
    if (newText.startsWith(prefix)) {
      setInputText(newText.substring(prefix.length));
    } else {
      setInputText(prefix + newText);
    }
    
    textareaRef.current?.focus();
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      textareaRef.current?.focus();
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        textareaRef.current?.focus();
      } catch (err) {
        console.error("Failed to start recording:", err);
        setIsRecording(false);
      }
    }
  };

  const handleSend = () => {
    if ((!inputText.trim() && !selectedAttachment) || isLoading) return;
    
    // Stop recording if active when sending
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    onSendMessage(inputText, selectedAttachment || undefined);
    setInputText('');
    setSelectedAttachment(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    // Keep focus for continuous chatting
    textareaRef.current?.focus();
  };

  // Helper to determine if attachment is an image
  const isImage = selectedAttachment?.mimeType.startsWith('image/');
  
  // Helper for file icon based on type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return <FileText className="text-red-500" size={24} />;
    if (mimeType.includes('csv') || mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <FileSpreadsheet className="text-emerald-500" size={24} />;
    if (mimeType.includes('text') || mimeType.includes('plain')) return <FileText className="text-slate-500" size={24} />;
    return <FileText className="text-brand-500" size={24} />;
  };

  return (
    <div className="w-full bg-white border-t border-slate-200 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Attachment Preview */}
        {selectedAttachment && (
          <div className="relative inline-block mb-3 group animate-in fade-in zoom-in duration-200">
            {isImage ? (
              <img 
                src={selectedAttachment.data} 
                alt="Preview" 
                className="h-24 w-auto rounded-lg border border-slate-200 shadow-sm" 
              />
            ) : (
              <div className="h-24 w-48 bg-slate-50 rounded-lg border border-slate-200 flex flex-col items-center justify-center p-3 text-center shadow-sm">
                <div className="bg-white p-2 rounded-full mb-2 shadow-sm">
                  {getFileIcon(selectedAttachment.mimeType)}
                </div>
                <span className="text-xs text-slate-700 font-medium truncate w-full px-1">{selectedAttachment.name}</span>
                <span className="text-[10px] text-slate-400 uppercase font-mono mt-0.5">{selectedAttachment.mimeType.split('/')[1] || 'FILE'}</span>
              </div>
            )}
            
            <button
              onClick={removeAttachment}
              className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 shadow-md hover:bg-red-500 transition-colors z-20"
              title="Remove attachment"
            >
              <X size={12} />
            </button>
            
            {isImage && (
              <button
                onClick={handleScan}
                disabled={isExtracting}
                className="absolute -bottom-2 -right-2 bg-indigo-500 text-white rounded-full p-1 shadow-md hover:bg-indigo-600 transition-colors disabled:opacity-70 z-20"
                title="Extract text from image (OCR)"
              >
                {isExtracting ? <Loader2 size={12} className="animate-spin" /> : <ScanText size={12} />}
              </button>
            )}
          </div>
        )}

        <div className="flex items-end gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-brand-200 focus-within:border-brand-400 transition-all">
          
          {/* Explain Concept Button */}
          <button
            onClick={handleExplainClick}
            className={`p-2 rounded-xl transition-colors mb-0.5 ${
              inputText.startsWith("Explain the concept of ") 
                ? 'bg-indigo-100 text-indigo-600' 
                : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
            title="Explain Concept"
          >
            <Lightbulb size={20} />
          </button>

          {/* Exam Mode Button */}
          <button
            onClick={handleExamModeClick}
             className={`p-2 rounded-xl transition-colors mb-0.5 ${
              inputText.startsWith("Exam Note: ") 
                ? 'bg-amber-100 text-amber-600' 
                : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50'
            }`}
            title="Exam Note (Short Answer)"
          >
            <Zap size={20} />
          </button>

          {/* Chart Generation Button */}
          <button
            onClick={handleChartClick}
             className={`p-2 rounded-xl transition-colors mb-0.5 ${
              inputText.startsWith("Generate Image: ") 
                ? 'bg-emerald-100 text-emerald-600' 
                : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'
            }`}
            title="Generate Chart/Graph Image"
          >
            <PieChart size={20} />
          </button>

          {/* Voice Input Button */}
          {isSpeechSupported && (
            <button
              onClick={toggleRecording}
              className={`p-2 rounded-xl transition-all mb-0.5 ${
                isRecording 
                  ? 'bg-red-100 text-red-600 animate-pulse ring-1 ring-red-400' 
                  : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
              }`}
              title={isRecording ? "Stop Recording" : "Dictate Question"}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}

          {/* File Button */}
          <button
            onClick={() => documentInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors mb-0.5"
            title="Attach File (PDF, CSV, TXT)"
          >
            <Paperclip size={20} />
          </button>
          <input
            type="file"
            ref={documentInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.csv,.txt,.json,.md"
            className="hidden"
          />

          {/* Camera Button */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors mb-0.5"
            title="Take photo of problem"
          >
            <Camera size={20} />
          </button>
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {/* Image Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors mb-0.5"
            title="Upload image"
          >
            <ImageIcon size={20} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*"
            className="hidden"
          />

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Listening..." : "Type your question..."}
            className={`flex-1 max-h-[150px] bg-transparent border-none focus:ring-0 resize-none py-3 px-1 text-slate-700 placeholder:text-slate-400 text-sm md:text-base leading-relaxed ${isRecording ? 'placeholder:text-red-400' : ''}`}
            rows={1}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={(!inputText.trim() && !selectedAttachment) || isLoading}
            className={`p-2 rounded-xl mb-0.5 transition-all flex items-center justify-center
              ${(!inputText.trim() && !selectedAttachment) || isLoading
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-brand-600 text-white hover:bg-brand-700 shadow-md hover:shadow-lg'
              }`}
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
        <div className="text-center mt-2">
           <p className="text-[10px] text-slate-400">AI can make mistakes. Please verify important financial data.</p>
        </div>
      </div>
    </div>
  );
};

export default InputArea;