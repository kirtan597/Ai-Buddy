import { ChatSession } from '@/types/chat-v2';

export const exportChatAsText = (session: ChatSession): string => {
  const header = `AI Buddy Chat Export
Title: ${session.title}
Date: ${new Date(session.createdAt).toLocaleString()}
Messages: ${session.messages.length}
${'='.repeat(50)}

`;

  const messages = session.messages.map(msg => {
    const timestamp = new Date(msg.timestamp).toLocaleTimeString();
    const role = msg.role === 'user' ? 'You' : 'AI Buddy';
    const attachments = msg.attachments?.length 
      ? `\n[Attachments: ${msg.attachments.map(a => a.name).join(', ')}]`
      : '';
    
    return `[${timestamp}] ${role}:\n${msg.content}${attachments}\n`;
  }).join('\n');

  return header + messages;
};

export const exportChatAsJSON = (session: ChatSession): string => {
  return JSON.stringify({
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messages: session.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      attachments: msg.attachments?.map(att => ({
        name: att.name,
        type: att.type,
        size: att.size
      }))
    }))
  }, null, 2);
};

export const downloadChat = (content: string, filename: string, type: 'text' | 'json') => {
  const mimeType = type === 'json' ? 'application/json' : 'text/plain';
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};