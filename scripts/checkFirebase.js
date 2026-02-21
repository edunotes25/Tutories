// scripts/checkFirebase.js
const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

async function checkFirebase() {
    console.log('🔍 Verificando configuración de Firebase...\n');

    try {
        // Verificar variables de entorno
        console.log('📋 Variables de entorno:');
        console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅' : '❌');
        console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅' : '❌');
        console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅' : '❌');
        console.log('');

        // Inicializar Firebase
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKey: privateKey,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL
            })
        });

        console.log('🔄 Probando conexión...');
        
        // Intentar listar usuarios
        const listUsersResult = await admin.auth().listUsers(1);
        console.log('✅ Conexión exitosa a Firebase Authentication');
        console.log(`📊 Total usuarios: ${listUsersResult.users.length}`);

        // Intentar acceder a Firestore
        const db = admin.firestore();
        const testDoc = db.collection('test').doc('connection');
        await testDoc.set({ timestamp: new Date().toISOString() });
        await testDoc.delete();
        console.log('✅ Conexión exitosa a Firestore');
        
        console.log('\n📍 Región: nam5 (US Central)');
        console.log('\n✨ Firebase configurado correctamente!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        
        if (error.message.includes('projectId')) {
            console.log('\n💡 Solución: Verifica que FIREBASE_PROJECT_ID es correcto');
        }
        if (error.message.includes('private key')) {
            console.log('\n💡 Solución: Verifica el formato de FIREBASE_PRIVATE_KEY');
            console.log('Debe incluir "-----BEGIN PRIVATE KEY-----" y "-----END PRIVATE KEY-----"');
        }
    } finally {
        process.exit();
    }
}

checkFirebase();