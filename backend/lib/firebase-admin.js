const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const admin = require('firebase-admin');
require('dotenv').config();

// Inicializar Firebase Admin SDK con variables de entorno
let serviceAccount;

if (process.env.FIREBASE_PRIVATE_KEY) {
  // Usar variables de entorno
  serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL
  };
  
  console.log('✅ Usando configuración de Firebase desde variables de entorno');
} else {
  console.error('❌ No se encontraron las variables de entorno de Firebase');
  console.error('📥 Asegúrate de tener configuradas:');
  console.error('   FIREBASE_PROJECT_ID');
  console.error('   FIREBASE_PRIVATE_KEY');
  console.error('   FIREBASE_CLIENT_EMAIL');
  process.exit(1);
}

// Inicializar Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
  
  console.log(`✅ Firebase Admin inicializado correctamente`);
  console.log(`📁 Proyecto: ${process.env.FIREBASE_PROJECT_ID}`);
} catch (error) {
  console.error('❌ Error al inicializar Firebase:', error);
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

// Configurar Firestore para usar región europea (RGPD)
db.settings({
  timestampsInSnapshots: true,
  ignoreUndefinedProperties: true
});

// Colecciones
const COLLECTIONS = {
  USUARIS: 'usuarios',
  PROFESSORS: 'profesores',
  HORARIS: 'horarios',
  RESERVES: 'reservas',
  CONFIG: 'config'
};

module.exports = {
  admin,
  db,
  auth,
  COLLECTIONS
};