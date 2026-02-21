// scripts/createAdmin.js
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const readline = require('readline');

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function createAdmin() {
    try {
        // Inicializar Firebase
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                privateKey: privateKey,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL
            })
        });

        console.log('📝 Creando usuario administrador');
        console.log('--------------------------------');

        // Preguntar datos
        const email = await question('Email del administrador: ');
        const password = await question('Contraseña (mínimo 8 caracteres): ');
        const nombre = await question('Nombre completo: ');

        // Crear usuario
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: nombre,
            disabled: false
        });

        // Establecer claims de admin
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            admin: true,
            profesor: true,
            nombre: nombre
        });

        console.log('\n✅ Usuario administrador creado exitosamente!');
        console.log('📧 Email:', email);
        console.log('🆔 UID:', userRecord.uid);
        console.log('\n🔐 Ahora puedes iniciar sesión en /login');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        rl.close();
        process.exit();
    }
}

function question(query) {
    return new Promise(resolve => {
        rl.question(query, resolve);
    });
}

createAdmin();