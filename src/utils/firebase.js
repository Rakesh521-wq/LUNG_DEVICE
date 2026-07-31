// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDxjvl919Yc9xd_uYJsJCmU_ua09mL91mc",
    authDomain: "lungpatch-ai.firebaseapp.com",
    projectId: "lungpatch-ai",
    storageBucket: "lungpatch-ai.firebasestorage.app",
    messagingSenderId: "768569648224",
    appId: "1:768569648224:web:93644702de1ac97587cf05"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };