// Author(s): GPT-4 & Jyan.

import AWS from 'aws-sdk';
import { URL } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env.local file
dotenv.config({ path: '.env.local' });

// Load environment variables
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION;


if (!accessKeyId || !secretAccessKey) {
    console.error('Missing AWS credentials. AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables must be set.');
    process.exit(1);
}


// Configure AWS S3
AWS.config.update({
    accessKeyId,
    secretAccessKey,
    region,
});

const s3 = new AWS.S3();

const bucketName = 'goodies-customer-public';

export type resourceType = 'food' | 'food-addons' | 'restaurant'

export const generatePresignedPutURL = async (
    restaurantID: string,
    resourceType: resourceType,
    resourceID: string
): Promise<string> => {
    const key = `${restaurantID}/${resourceType}/${resourceID}.jpeg`;
    const params = {
        Bucket: bucketName,
        Key: key,
        ContentType: 'image/jpeg',
        Expires: 3600, // 1 hour expiration
    };

    return new Promise((resolve, reject) => {
        s3.getSignedUrl('putObject', params, (err, url) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(url);
        });
    });
};

export const generatePresignedGetURL = async (
    restaurantID: string,
    resourceType: resourceType,
    resourceID: string
): Promise<string> => {
    const key = `${restaurantID}/${resourceType}/${resourceID}.jpeg`;
    const params = {
        Bucket: bucketName,
        Key: key,
        Expires: 43200, // 12 hours expiration
    };

    return new Promise((resolve, reject) => {
        s3.getSignedUrl('getObject', params, (err, url) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(url);
        });
    });
};


export const resourceExists = async (
    restaurantID: string,
    resourceType: resourceType,
    resourceID: string
): Promise<boolean> => {
    const key = `${restaurantID}/${resourceType}/${resourceID}.jpeg`;
    const params = {
        Bucket: bucketName,
        Key: key,
    };

    return new Promise((resolve) => {
        s3.headObject(params, (err, data) => {
            if (err) {
                if (err.code === 'NotFound') {
                    resolve(false);
                } else {
                    throw err;
                }
            } else {
                resolve(true);
            }
        });
    });
};