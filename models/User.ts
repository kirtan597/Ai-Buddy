import mongoose, { Schema, Model } from 'mongoose';

export interface IUser {
    name: string;
    email: string;
    image?: string;
    createdAt: Date;
    lastLoginAt: Date;
}

const UserSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String },
    lastLoginAt: { type: Date, default: Date.now },
}, {
    timestamps: true,
});

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
