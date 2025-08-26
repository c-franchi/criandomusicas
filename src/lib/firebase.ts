import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCotPdAj9GNz32HLAv0Cv27rJTF1pIayi0",
  authDomain: "sua-musica-8da85.firebaseapp.com",
  projectId: "sua-musica-8da85",
  storageBucket: "sua-musica-8da85.firebasestorage.app",
  messagingSenderId: "273195556369",
  appId: "1:273195556369:web:289be4a504fea071295bb0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);