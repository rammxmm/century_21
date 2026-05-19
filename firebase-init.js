import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDC0pn1O0qcZE9gJgckUc41CQFHep2400M",
    authDomain: "century-21-c9829.firebaseapp.com",
    projectId: "century-21-c9829",
    storageBucket: "century-21-c9829.firebasestorage.app",
    messagingSenderId: "225809422246",
    appId: "1:225809422246:web:900397926e363bc04fe167",
    measurementId: "G-3W62KR8BK6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const storage = getStorage(app);

export { app, auth, db, googleProvider, storage };
