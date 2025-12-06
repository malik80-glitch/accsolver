export interface Attachment {
  data: string; // Base64 string
  mimeType: string;
  name: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  image?: string; // Legacy support for backward compatibility
  attachment?: Attachment;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  selectedSubject: string | null;
}