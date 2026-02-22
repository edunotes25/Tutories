// backend/routes/auth.js
const express = require('express');
const router = express.Router();

// Importar Firebase Admin (ajusta la ruta según tu estructura)
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
        
        // Verificar el token con Firebase Admin
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        
        console.log('✅ Token verificado para UID:', uid);
        
        // Buscar usuario en Firestore
        const userDoc = await db.collection(COLLECTIONS.USUARIOS).doc(uid).get();
        
        if (!userDoc.exists) {
            console.log('❌ Usuario no encontrado en Firestore');
            return res.json({ 
                success: false, 
                error: 'Usuario no encontrado en la base de datos' 
            });
        }
        
        const userData = userDoc.data();
        console.log('✅ Usuario encontrado:', userData.nombre);
        
        // Verificar tipo de usuario
        if (userData.tipo !== tipo) {
            console.log('❌ Tipo incorrecto. Esperado:', tipo, 'Obtenido:', userData.tipo);
            return res.json({ 
                success: false, 
                error: 'Tipo de usuario incorrecto' 
            });
        }
        
        // Guardar en sesión
        req.session.usuario = {
            uid: userData.uid,
            nombre: userData.nombre,
            nombreAlumno: userData.nombreAlumno || '',
            email: userData.email,
            tipo: userData.tipo,
            telefono: userData.telefono,
            curso: userData.curso || ''
        };
        
        // Guardar sesión explícitamente
        req.session.save((err) => {
            if (err) {
                console.error('❌ Error guardando sesión:', err);
                return res.json({ 
                    success: false, 
                    error: 'Error al crear sesión' 
                });
            }
            
            console.log('✅ Sesión guardada para:', userData.nombre);
            
            // Determinar redirección
            const redirect = tipo === 'profesor' ? '/profesor/dashboard' : '/padre/profesores';
            
            res.json({ 
                success: true, 
                redirect: redirect,
                user: {
                    uid: uid,
                    email: decodedToken.email,
                    nombre: userData.nombre,
                    tipo: tipo
                }
            });
        });
        
    } catch (error) {
        console.error('❌ Error en verify-login:', error);
        
        // Si el error es de token inválido
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