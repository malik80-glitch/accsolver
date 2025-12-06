import React from 'react';
import { Subject } from '../types';
import { SUBJECTS, INITIAL_SUGGESTIONS, CONCEPT_SUGGESTIONS } from '../constants';
import * as Icons from 'lucide-react';

interface WelcomeScreenProps {
  onSelectSubject: (subject: string) => void;
  onSelectSuggestion: (suggestion: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectSubject, onSelectSuggestion }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-4xl mx-auto p-6 overflow-y-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-600">
          <Icons.GraduationCap size={32} />
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">AcctSolver AI</h1>
        <p className="text-slate-500 max-w-lg mx-auto">
          Your professional tutor for Commerce & Business studies. Select a subject or ask a question to get started.
        </p>
      </div>

      {/* Subject Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-8">
        {SUBJECTS.map((sub) => {
          const IconComponent = (Icons as any)[sub.icon] || Icons.BookOpen;
          return (
            <button
              key={sub.id}
              onClick={() => onSelectSubject(sub.name)}
              className="flex flex-col items-center p-4 bg-white border border-slate-200 rounded-xl hover:border-brand-400 hover:shadow-md transition-all text-center group"
            >
              <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-600 flex items-center justify-center mb-3 transition-colors">
                <IconComponent size={20} />
              </div>
              <span className="font-semibold text-sm text-slate-700">{sub.name}</span>
              <span className="text-xs text-slate-400 mt-1">{sub.description}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Suggestions */}
      <div className="w-full mb-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">Quick Start</h3>
        <div className="flex flex-wrap gap-2 justify-center">
          {INITIAL_SUGGESTIONS.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => onSelectSuggestion(sug)}
              className="text-sm bg-white border border-slate-200 px-4 py-2 rounded-full text-slate-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-colors"
            >
              {sug}
            </button>
          ))}
        </div>
      </div>

      {/* Concept Suggestions */}
      <div className="w-full">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">Master Key Concepts</h3>
        <div className="flex flex-wrap gap-2 justify-center">
          {CONCEPT_SUGGESTIONS.map((concept, idx) => (
            <button
              key={idx}
              onClick={() => onSelectSuggestion(`Explain the concept of ${concept} with a practical example.`)}
              className="text-sm bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-full text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 transition-colors flex items-center gap-2"
            >
              <Icons.Lightbulb size={14} />
              {concept}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;