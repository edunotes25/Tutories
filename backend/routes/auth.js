// backend/routes/auth.js
const express = require('express');
const router = express.Router();  // ← Esto es lo que falta

// Importar Firebase Admin
const { db, auth, COLLECTIONS } = require('../lib/firebase-admin');

// Ruta para verificar el login de Firebase
router.post('/verify-login', async (req, res) => {
    try {
        const { idToken, tipo } = req.body;
        
        if (!idToken) {
            return res.status(400).json({ 
                success: false, 
                error: 'Token no proporcionado' 
            });
        }

        console.log('🔍 Verificando token de Firebase...');
        
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        
        console.log('✅ Token verificado para UID:', uid);
        
        const userDoc = await db.collection(COLLECTIONS.USUARIOS).doc(uid).get();
        
        if (!userDoc.exists) {
            return res.json({ 
                success: false, 
                error: 'Usuario no encontrado en la base de datos' 
            });
        }
        
        const userData = userDoc.data();
        console.log('✅ Usuario encontrado:', userData.nombre);
        
        if (userData.tipo !== tipo) {
            return res.json({ 
                success: false, 
                error: 'Tipo de usuario incorrecto' 
            });
        }
        
        req.session.usuario = {
            uid: userData.uid,
            nombre: userData.nombre,
            nombreAlumno: userData.nombreAlumno || '',
            email: userData.email,
            tipo: userData.tipo,
            telefono: userData.telefono,
            curso: userData.curso || ''
        };
        
        req.session.save((err) => {
            if (err) {
                return res.json({ 
                    success: false, 
                    error: 'Error al crear sesión' 
                });
            }
            
            const redirect = tipo === 'profesor' ? '/profesor/dashboard' : '/padre/profesores';
            
            res.json({ 
                success: true, 
                redirect: redirect
            });
        });
        
    } catch (error) {
        console.error('❌ Error en verify-login:', error);
    console.error('Código:', error.code);
    console.error('Mensaje completo:', error.message);

        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({ 
                success: false, 
                error: 'Token expirado' 
            });
        }
        
        if (error.code === 'auth/argument-error') {
            return res.status(401).json({ 
                success: false, 
                error: 'Token inválido' 
            });
        }
        
        res.status(401).json({ 
            success: false, 
            error: 'Error de autenticación' 
        });
    }
});

module.exports = router;