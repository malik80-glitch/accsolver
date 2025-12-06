import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { Bot, User, FileText } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  highlightTerm?: string;
}

// Utility component to highlight matching text
const HighlightText: React.FC<{ text: string; term: string }> = ({ text, term }) => {
  if (!term || !text) return <>{text}</>;
  
  // Escape special regex characters in term
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedTerm})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === term.toLowerCase() ? 
          <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5 font-medium">{part}</mark> : 
          part
      )}
    </>
  );
};

// Recursive helper to highlight text strings within React children
const highlightNodes = (children: React.ReactNode, term: string): React.ReactNode => {
  if (!term) return children;

  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      return <HighlightText text={child} term={term} />;
    }
    // Note: We don't recurse into React Elements (like <strong>) here because we 
    // rely on the Markdown components (p, strong, etc.) to call this function on their own children.
    return child;
  });
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, highlightTerm = '' }) => {
  const isUser = message.role === 'user';
  
  // Determine attachment details
  const attachmentData = message.attachment?.data || message.image;
  const isImage = message.image || message.attachment?.mimeType.startsWith('image/');
  const fileName = message.attachment?.name || 'Attachment';
  const fileType = message.attachment?.mimeType.split('/')[1] || 'FILE';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
          isUser ? 'bg-indigo-100 text-indigo-600' : 'bg-brand-100 text-brand-600'
        }`}>
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`rounded-2xl px-5 py-4 shadow-sm markdown-body overflow-x-auto ${
            isUser 
              ? 'bg-indigo-600 text-white rounded-tr-none' 
              : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
          }`}>
            {attachmentData && (
              <div className="mb-3">
                {isImage ? (
                  <img 
                    src={attachmentData} 
                    alt="Attachment" 
                    className="max-h-64 rounded-lg border border-white/20" 
                  />
                ) : (
                  <div className={`flex items-center gap-3 p-3 rounded-lg border ${isUser ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`p-2 rounded-full ${isUser ? 'bg-white/20' : 'bg-slate-200'}`}>
                      <FileText size={20} className={isUser ? 'text-white' : 'text-slate-600'} />
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-sm font-medium ${isUser ? 'text-white' : 'text-slate-800'}`}>{fileName}</span>
                      <span className={`text-xs uppercase ${isUser ? 'text-white/70' : 'text-slate-500'}`}>{fileType}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {isUser ? (
              <div className="whitespace-pre-wrap">
                {highlightTerm ? <HighlightText text={message.text} term={highlightTerm} /> : message.text}
              </div>
            ) : (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  // Containers that usually hold text
                  p: ({node, children, ...props}) => <p {...props}>{highlightNodes(children, highlightTerm)}</p>,
                  li: ({node, children, ...props}) => <li className="mb-1" {...props}>{highlightNodes(children, highlightTerm)}</li>,
                  h1: ({node, children, ...props}) => <h1 className="text-xl font-bold mb-3 mt-4 text-slate-900" {...props}>{highlightNodes(children, highlightTerm)}</h1>,
                  h2: ({node, children, ...props}) => <h2 className="text-lg font-bold mb-2 mt-3 text-slate-800" {...props}>{highlightNodes(children, highlightTerm)}</h2>,
                  h3: ({node, children, ...props}) => <h3 className="text-md font-bold mb-2 mt-2 text-slate-800" {...props}>{highlightNodes(children, highlightTerm)}</h3>,
                  strong: ({node, children, ...props}) => <span className="font-bold text-indigo-700" {...props}>{highlightNodes(children, highlightTerm)}</span>,
                  em: ({node, children, ...props}) => <em className="italic" {...props}>{highlightNodes(children, highlightTerm)}</em>,
                  
                  // Table specific highlighting
                  table: ({node, ...props}) => (
                    <div className="overflow-x-auto my-4 border border-slate-200 rounded-lg">
                       <table className="min-w-full divide-y divide-slate-200" {...props} />
                    </div>
                  ),
                  thead: ({node, ...props}) => <thead className="bg-slate-50" {...props} />,
                  th: ({node, children, ...props}) => (
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200" {...props}>
                       {highlightNodes(children, highlightTerm)}
                    </th>
                  ),
                  td: ({node, children, ...props}) => (
                    <td className="px-4 py-3 text-sm text-slate-700 border-b border-slate-100 whitespace-nowrap" {...props}>
                      {highlightNodes(children, highlightTerm)}
                    </td>
                  ),
                  
                  // Lists
                  ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                }}
              >
                {message.text}
              </ReactMarkdown>
            )}
          </div>
          <span className="text-xs text-slate-400 mt-1 px-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;