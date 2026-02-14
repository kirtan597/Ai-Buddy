import mongoose, { Schema, Model } from 'mongoose';

export interface IMessage {
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
    conversationId: { type: String, ref: 'Conversation', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
}, {
    timestamps: true,
});

const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
