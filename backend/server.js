import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import http from 'http';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initSocket } from './socket.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Security Headers (Helmet)
app.use(helmet());

// CORS Configuration
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173';
const allowedOrigins = frontendUrl.split(',');

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    handler: (req, res) => {
        res.status(429).json({ message: 'Too many requests from this IP, please try again later.' });
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 login/register requests per windowMs
    handler: (req, res) => {
        res.status(429).json({ message: 'Too many authentication attempts, please try again after 15 minutes.' });
    }
});

app.use(express.json({ limit: '10kb' })); // Limit body size to prevent payload DOS
app.use(cookieParser());
app.use('/api', globalLimiter); // Apply global limit to all /api routes

import authRoutes from './routes/authRoutes.js';
import donorRoutes from './routes/donorRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import donationRoutes from './routes/donationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Test Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'BloodLink API is running securely' });
});

// Error Handling Middleware (must be after routes)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

// Database Connection & Server Start
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB', err);
    });
