import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: (process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173').split(','),
            credentials: true
        }
    });

    io.use((socket, next) => {
        try {
            const cookieHeader = socket.handshake.headers.cookie;
            if (!cookieHeader) {
                return next(new Error('Authentication error: No cookies'));
            }

            const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                const [key, value] = cookie.split('=').map(c => c.trim());
                acc[key] = value;
                return acc;
            }, {});
            const token = cookies.token;

            if (!token) {
                return next(new Error('Authentication error: No token'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (error) {
            console.error('Socket Authentication Error:', error.message);
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        // Authenticated user securely joins their private room
        const roomName = `user:${socket.user.userId}`;
        socket.join(roomName);
        console.log(`Socket connected and joined room: ${roomName}`);

        // Phase 8: Real-Time Chat Authorization
        socket.on('join_donation_room', async (donationId, callback) => {
            try {
                const Donation = (await import('./models/Donation.js')).default;
                const Hospital = (await import('./models/Hospital.js')).default;
                
                const donation = await Donation.findById(donationId).populate('requestId');
                if (!donation) {
                    return callback({ status: 'error', message: 'Donation not found' });
                }

                if (donation.status !== 'ACCEPTED' && donation.status !== 'ARRIVED' && donation.status !== 'COMPLETED') {
                    return callback({ status: 'error', message: 'Chat is not available' });
                }

                const hospital = await Hospital.findById(donation.requestId.hospitalId);
                
                const isDonor = socket.user.role === 'DONOR' && donation.donorId.toString() === socket.user.userId;
                const isHospitalAdmin = socket.user.role === 'HOSPITAL_ADMIN' && hospital && hospital.adminId.toString() === socket.user.userId;

                if (!isDonor && !isHospitalAdmin) {
                    return callback({ status: 'error', message: 'Not authorized for this chat room' });
                }

                const room = `donation:${donationId}`;
                socket.join(room);
                callback({ status: 'success', message: 'Joined chat room securely' });
            } catch (err) {
                console.error('Socket join_donation_room error:', err);
                if (callback) callback({ status: 'error', message: 'Server error during join' });
            }
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected from room: ${roomName}`);
        });
    });

    return io;
};

export const getIo = () => {
    if (!io) {
        throw new Error('Socket.io is not initialized!');
    }
    return io;
};
