import { v2 as cloudinary } from 'cloudinary';

export const CloudinaryProvider = {
    provide: 'CLOUDINARY',
    useFactory: () => {
        return cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'sharks-app',
            api_key: process.env.CLOUDINARY_API_KEY || '715814567355674',
            api_secret: process.env.CLOUDINARY_API_SECRET || '-KbZfjHulejXEtPBMCATurHUSGw',
        });
    },
};
