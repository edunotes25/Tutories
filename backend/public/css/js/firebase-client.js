// backend/public/js/firebase-client.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword,
    signOut 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

// Tu configuración de Firebase (obtenla de Firebase Console)
const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Hacer disponible globalmente
window.firebaseAuth = auth;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;