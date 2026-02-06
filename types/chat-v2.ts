export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  isStreaming?: boolean;
  metadata?: MessageMetadata;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'code';
  url: string;
  size: number;
  mimeType: string;
  processed?: boolean;
}

export interface MessageMetadata {
  model?: string;
  tokens?: number;
  processingTime?: number;
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  settings: ChatSettings;
}

export interface ChatSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;
}

export interface ChatState {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  isStreaming: boolean;
  isUploading: boolean;
  error: string | null;
}