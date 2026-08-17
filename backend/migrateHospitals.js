import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hospital from './models/Hospital.js';

dotenv.config();

const migrateHospitals = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const hospitals = await Hospital.find({ isVerified: { $exists: true } });
        console.log(`Found ${hospitals.length} hospitals with legacy isVerified field.`);

        for (const hospital of hospitals) {
            // Because mongoose schema no longer has isVerified, we might need to access it via _doc or strict: false
            // Actually, we can just use mongoose updateMany to bypass schema strictness
        }

        const resultVerified = await mongoose.connection.collection('hospitals').updateMany(
            { isVerified: true },
            { $set: { verificationStatus: 'VERIFIED' }, $unset: { isVerified: "" } }
        );
        console.log(`Migrated ${resultVerified.modifiedCount} verified hospitals.`);

        const resultUnverified = await mongoose.connection.collection('hospitals').updateMany(
            { isVerified: false },
            { $set: { verificationStatus: 'PENDING' }, $unset: { isVerified: "" } }
        );
        console.log(`Migrated ${resultUnverified.modifiedCount} unverified/pending hospitals.`);

        const resultOthers = await mongoose.connection.collection('hospitals').updateMany(
            { isVerified: { $exists: true } },
            { $set: { verificationStatus: 'PENDING' }, $unset: { isVerified: "" } }
        );
        console.log(`Cleaned up ${resultOthers.modifiedCount} other legacy records.`);

        console.log('Migration complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrateHospitals();
