import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';
import User from './models/User.js';

dotenv.config();

const seedHospital = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Find an existing ADMIN user
        const admin = await User.findOne({ role: 'ADMIN' });

        if (!admin) {
            console.log('No ADMIN user found.');
            console.log('Please create an ADMIN account first.');
            process.exit(1);
        }

        // Check if hospital already exists
        const existingHospital = await Hospital.findOne({
            name: 'NIT Jalandhar Hospital'
        });

        if (existingHospital) {
            console.log('Hospital already exists.');
            console.log(existingHospital);
            process.exit(0);
        }

        // Create verified hospital
        const hospital = await Hospital.create({
            adminId: admin._id,
            name: 'NIT Jalandhar Hospital',
            contactNumber: '0181-2690301',
            city: 'Jalandhar',
            postalCode: '144011',
            location: {
                type: 'Point',
                coordinates: [75.6547, 31.3969]
            },
            isExactLocation: false,
            verificationStatus: 'VERIFIED'
        });

        console.log('Hospital created successfully!');
        console.log(hospital);

        process.exit(0);

    } catch (error) {
        console.error('Failed to create hospital:', error);
        process.exit(1);
    }
};

seedHospital();
