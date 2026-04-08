import mongoose, { Schema, Model } from 'mongoose';

export interface IMessage {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  feedback?: 'up' | 'down';
  feedbackAt?: Date;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  conversationId: { type: String, ref: 'Conversation', required: true, index: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  feedback: { type: String, enum: ['up', 'down'] },
  feedbackAt: { type: Date },
}, {
  timestamps: true,
});

// Index for fetching conversation messages efficiently
MessageSchema.index({ conversationId: 1, createdAt: 1 });

const Message: Model<IMessage> =
  mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
