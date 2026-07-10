// Firebase Config and Core Database Exports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    getDoc, 
    setDoc,
    addDoc, 
    deleteDoc, 
    updateDoc, 
    doc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase App Config
const firebaseConfig = {
  apiKey: "AIzaSyBZrXgt8sQ0mu6Fdb8g2lqUUsHtETsI6mQ",
  authDomain: "sualkuchi-handloom.firebaseapp.com",
  projectId: "sualkuchi-handloom",
  storageBucket: "sualkuchi-handloom.firebasestorage.app",
  messagingSenderId: "77573131044",
  appId: "1:77573131044:web:ad732ff173c4c70bc101b1",
  measurementId: "G-FSMRHGVKYD"
};

// Initialize Firebase Instance
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Export all configured functions
export { 
    db, 
    auth, 
    collection, 
    getDocs, 
    getDoc, 
    setDoc,
    addDoc, 
    deleteDoc, 
    updateDoc, 
    doc, 
    query,
    where,
    onAuthStateChanged, 
    signOut,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    GoogleAuthProvider,
    signInWithPopup
};
