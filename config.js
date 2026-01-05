// Import the functions you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBZrXgt8sQ0mu6Fdb8g2lqUUsHtETsI6mQ",
  authDomain: "sualkuchi-handloom.firebaseapp.com",
  projectId: "sualkuchi-handloom",
  storageBucket: "sualkuchi-handloom.firebasestorage.app",
  messagingSenderId: "77573131044",
  appId: "1:77573131044:web:ad732ff173c4c70bc101b1",
  measurementId: "G-FSMRHGVKYD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Export these so other files can use them
export { db, auth, collection, getDocs, addDoc, deleteDoc, updateDoc, doc, signInWithEmailAndPassword, onAuthStateChanged, signOut };