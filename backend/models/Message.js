import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    donationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donation',
        required: true,
        index: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    }
}, {
    timestamps: true
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
