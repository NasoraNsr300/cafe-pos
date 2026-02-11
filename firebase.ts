
// @ts-ignore
import { initializeApp } from 'firebase/app';
// @ts-ignore - Fix: Consolidate multi-line import to allow @ts-ignore to cover all members (previously lines 6-15)
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'firebase/auth';
// @ts-ignore
import type { User } from 'firebase/auth';
// @ts-ignore
import { getFirestore } from 'firebase/firestore';

/**
 * 🛠️ Firestore Security Rules (คัดลอกไปวางใน Firebase Console -> Firestore Database -> Rules)
 * -------------------------------------------
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     
 *     // Rules for Products
 *     match /cafe/{document=**} {
 *       allow read: if true;
 *       allow write: if request.auth != null;
 *     }
 *     
 *     // Rules for Categories (New)
 *     match /categories/{document=**} {
 *       allow read: if true;
 *       allow write: if request.auth != null;
 *     }
 *   }
 * }
 * -------------------------------------------
 */

const firebaseConfig = {
  apiKey: "AIzaSyDy9Ku-ZVsNVtT4qfV2tTPzTMGvj7MyVeA",
  authDomain: "cafe-product-5ab75.firebaseapp.com",
  projectId: "cafe-product-5ab75",
  storageBucket: "cafe-product-5ab75.firebasestorage.app",
  messagingSenderId: "348408785590",
  appId: "1:348408785590:web:b208a622f444b0b6849417",
  measurementId: "G-WNQF0V428G"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    await setPersistence(auth, browserSessionPersistence);
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    throw error;
  }
};

export const logOut = () => signOut(auth);

export { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile 
};
export type { User };
