import mongoose, { Schema, Model } from 'mongoose';

export interface IConversation {
    _id: string;
    userId: mongoose.Types.ObjectId;
    title: string;
    createdAt: Date;
    updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>({
    _id: { type: String, required: true }, // Explicitly define _id as String
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
}, {
    timestamps: true,
    _id: false, // Disable auto _id generation since we provide it
});

// Index to quickly fetch user's conversations sorted by update time
ConversationSchema.index({ userId: 1, updatedAt: -1 });

const Conversation: Model<IConversation> = mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);

export default Conversation;
