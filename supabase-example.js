// Example: Supabase Implementation for YouTube Credentials
// File: supabase-example.js

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);

class SupabaseCredentialsDB {
    constructor() {
        this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
            const { data, error } = await this.supabase
                .from('youtube_credentials')
                .upsert({
                    user_id: userId,
                    client_id: this.encrypt(clientId),
                    client_secret: this.encrypt(clientSecret),
                    redirect_uri: redirectUri,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

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
            const { data, error } = await this.supabase
                .from('youtube_credentials')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (!data) return null;

            return {
                clientId: this.decrypt(data.client_id),
                clientSecret: this.decrypt(data.client_secret),
                redirectUri: data.redirect_uri,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        } catch (error) {
            console.error('Error getting credentials:', error);
            throw error;
        }
    }

    // Delete credentials for a user
    async deleteCredentials(userId) {
        try {
            const { error } = await this.supabase
                .from('youtube_credentials')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;

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
            const { data, error } = await this.supabase
                .from('youtube_tokens')
                .upsert({
                    user_id: userId,
                    access_token: this.encrypt(tokens.access_token),
                    refresh_token: this.encrypt(tokens.refresh_token),
                    expiry_date: new Date(tokens.expiry_date).toISOString(),
                    token_type: tokens.token_type,
                    scope: tokens.scope,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

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
            const { data, error } = await this.supabase
                .from('youtube_tokens')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (!data) return null;

            return {
                access_token: this.decrypt(data.access_token),
                refresh_token: this.decrypt(data.refresh_token),
                expiry_date: new Date(data.expiry_date).getTime(),
                token_type: data.token_type,
                scope: data.scope,
                createdAt: data.created_at,
                updatedAt: data.updated_at
            };
        } catch (error) {
            console.error('Error getting tokens:', error);
            throw error;
        }
    }

    // Create tables (run once during setup)
    async createTables() {
        try {
            // Create credentials table
            const credentialsSQL = `
                CREATE TABLE IF NOT EXISTS youtube_credentials (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(255) UNIQUE NOT NULL,
                    client_id TEXT NOT NULL,
                    client_secret TEXT NOT NULL,
                    redirect_uri TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `;

            // Create tokens table
            const tokensSQL = `
                CREATE TABLE IF NOT EXISTS youtube_tokens (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(255) UNIQUE NOT NULL,
                    access_token TEXT NOT NULL,
                    refresh_token TEXT NOT NULL,
                    expiry_date TIMESTAMP NOT NULL,
                    token_type VARCHAR(50) DEFAULT 'Bearer',
                    scope TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `;

            console.log('Tables created successfully');
            console.log('Note: Run these SQL commands in Supabase SQL Editor:');
            console.log(credentialsSQL);
            console.log(tokensSQL);

        } catch (error) {
            console.error('Error creating tables:', error);
            throw error;
        }
    }
}

// Usage example:
async function example() {
    const db = new SupabaseCredentialsDB();
    
    try {
        // Create tables (run once)
        await db.createTables();
        
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
    }
}

module.exports = SupabaseCredentialsDB;

// Setup Instructions:
/*
1. Create Supabase project: https://supabase.com
2. Get your URL and anon key from Settings > API
3. Run the SQL commands from createTables() in SQL Editor
4. Set environment variables:
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ENCRYPTION_KEY=your-32-byte-encryption-key
5. Install: npm install @supabase/supabase-js
*/

// Uncomment to run example:
// example(); 