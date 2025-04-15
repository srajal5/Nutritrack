import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import storage from './storage';
import { cert } from 'firebase-admin/app';
import { UserDocument } from './storage';

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')),
});

export const auth = getAuth(app);
export { storage };

// This function will be used to verify Firebase ID tokens
export async function verifyFirebaseToken(token: string): Promise<UserDocument | null> {
  try {
    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';
    const displayName = decodedToken.name || '';
    
    // Check if user exists in our database
    let user = await storage.getUserByFirebaseId(uid);
    
    // If not, create a new user
    if (!user) {
      // Generate a random password for the user (they'll use Firebase for auth)
      const randomPassword = Math.random().toString(36).slice(-8);
      
      user = await storage.createUser({
        username: email.split('@')[0] || `user_${uid.slice(0, 8)}`,
        password: randomPassword,
        email: email,
        displayName: displayName,
        firebaseId: uid,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return user;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return null;
  }
}