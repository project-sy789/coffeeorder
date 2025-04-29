import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Import routes
import { registerRoutes } from './routes';
import { setupFirestoreStorage } from './firestoreStorage';

// Initialize Express app
const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// Setup storage with Firestore
setupFirestoreStorage();

// Register all routes
registerRoutes(app);

// Export Express app as Firebase Cloud Function
export const api = functions.https.onRequest(app);