import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });
const { default: app } = await import('./app.js');
const port = Number(process.env.PORT ?? 4000);
const required = ['MONGODB_URI', 'SESSION_SECRET'];
const missing = required.filter(name => !process.env[name]);
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
if (process.env.AI_PROVIDER === 'gemini' && (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL)) throw new Error('GEMINI_API_KEY and GEMINI_MODEL are required when AI_PROVIDER=gemini.');
app.listen(port, () => console.log(`AI Mystery Room API listening on http://localhost:${port}`));
void mongoose.connect(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log('MongoDB connected.'))
  .catch(error => console.error('MongoDB connection failed:', error instanceof Error ? error.message : 'unknown error'));
