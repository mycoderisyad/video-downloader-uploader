// Example: MongoDB Implementation for YouTube Credentials
// File: database-example.js

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/video-downloader';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

class CredentialsDB {
    constructor() {
        this.client = null;
        this.db = null;
    }

    async connect() {
        try {
            this.client = new MongoClient(MONGODB_URI);
            await this.client.connect();
            this.db = this.client.db();
            console.log('Connected to MongoDB');
        } catch (error) {
            console.error('MongoDB connection error:', error);
            throw error;
        }
    }

    // Encrypt sensitive data
    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    // Decrypt sensitive data
    decrypt(encryptedText) {
        const textParts = encryptedText.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encrypted = textParts.join(':');
        const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    // Save credentials for a user
    async saveCredentials(userId, clientId, clientSecret, redirectUri) {
        try {
            const collection = this.db.collection('youtube_credentials');
            
            const credentialsDoc = {
                userId,
                clientId: this.encrypt(clientId),
                clientSecret: this.encrypt(clientSecret),
                redirectUri,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await collection.replaceOne(
                { userId },
                credentialsDoc,
                { upsert: true }
            );

            console.log(`Credentials saved for user: ${userId}`);
            return true;
        } catch (error) {
            console.error('Error saving credentials:', error);
            throw error;
        }
    }

    // Get credentials for a user
    async getCredentials(userId) {
        try {
            const collection = this.db.collection('youtube_credentials');
            const doc = await collection.findOne({ userId });

            if (!doc) {
                return null;
            }

            return {
                clientId: this.decrypt(doc.clientId),
                clientSecret: this.decrypt(doc.clientSecret),
                redirectUri: doc.redirectUri,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt
            };
        } catch (error) {
            console.error('Error getting credentials:', error);
            throw error;
        }
    }

    // Delete credentials for a user
    async deleteCredentials(userId) {
        try {
            const collection = this.db.collection('youtube_credentials');
            await collection.deleteOne({ userId });
            console.log(`Credentials deleted for user: ${userId}`);
            return true;
        } catch (error) {
            console.error('Error deleting credentials:', error);
            throw error;
        }
    }

    // Save auth tokens for a user
    async saveTokens(userId, tokens) {
        try {
            const collection = this.db.collection('youtube_tokens');
            
            const tokenDoc = {
                userId,
                accessToken: this.encrypt(tokens.access_token),
                refreshToken: this.encrypt(tokens.refresh_token),
                expiryDate: tokens.expiry_date,
                tokenType: tokens.token_type,
                scope: tokens.scope,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await collection.replaceOne(
                { userId },
                tokenDoc,
                { upsert: true }
            );

            console.log(`Tokens saved for user: ${userId}`);
            return true;
        } catch (error) {
            console.error('Error saving tokens:', error);
            throw error;
        }
    }

    // Get auth tokens for a user
    async getTokens(userId) {
        try {
            const collection = this.db.collection('youtube_tokens');
            const doc = await collection.findOne({ userId });

            if (!doc) {
                return null;
            }

            return {
                access_token: this.decrypt(doc.accessToken),
                refresh_token: this.decrypt(doc.refreshToken),
                expiry_date: doc.expiryDate,
                token_type: doc.tokenType,
                scope: doc.scope,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt
            };
        } catch (error) {
            console.error('Error getting tokens:', error);
            throw error;
        }
    }

    // Close connection
    async close() {
        if (this.client) {
            await this.client.close();
            console.log('MongoDB connection closed');
        }
    }
}

// Usage example:
async function example() {
    const db = new CredentialsDB();
    
    try {
        await db.connect();
        
        // Save credentials
        await db.saveCredentials(
            'user123',
            'your-client-id.googleusercontent.com',
            'your-client-secret',
            'https://yourdomain.com/callback'
        );
        
        // Get credentials
        const creds = await db.getCredentials('user123');
        console.log('Retrieved credentials:', creds);
        
        // Save tokens
        await db.saveTokens('user123', {
            access_token: 'access-token-here',
            refresh_token: 'refresh-token-here',
            expiry_date: Date.now() + 3600000,
            token_type: 'Bearer',
            scope: 'youtube.upload'
        });
        
        // Get tokens
        const tokens = await db.getTokens('user123');
        console.log('Retrieved tokens:', tokens);
        
    } catch (error) {
        console.error('Example error:', error);
    } finally {
        await db.close();
    }
}

module.exports = CredentialsDB;

// Uncomment to run example:
// example(); 