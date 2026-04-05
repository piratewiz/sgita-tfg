import mongoose from 'mongoose';
import '../models/index.js'; // Import all models to register them

const connectDB = async () => {
    const url = process.env.MONGODB_URL

    if(!url) {
        throw new Error("Your url is not defined in environment variables");
    }

    try {
        await mongoose.connect(url);
        console.log(`MongoDB connected: ${mongoose.connection.host}`);
        
    } catch (error) {
        console.log("Error trying to connect Mongo", error);
        process.exit(1);
    }
};

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (error) => {
    console.log('MongoDB error:', error); 
});

export default connectDB;