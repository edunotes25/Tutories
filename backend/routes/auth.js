// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Verificar token de Firebase y crear sesión
router.post('/verify-login', async (req, res) => {
    try {
        const { idToken, tipo } = req.body;
        
        // Verificar el token de Firebase
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        
        // Buscar usuario en Firestore
        const db = admin.firestore();
        const userDoc = await db.collection('usuarios').doc(uid).get();
        
        if (!userDoc.exists) {
            return res.json({ 
                success: false, 
                error: 'Usuario no encontrado en la base de datos' 
            });
        }
        
        const userData = userDoc.data();
        
        // Verificar que el tipo coincida
        if (userData.tipo !== tipo) {
            return res.json({ 
                success: false, 
                error: 'Tipo de usuario incorrecto' 
            });
        }
        
        // Crear sesión
        req.session.userId = uid;
        req.session.userTipo = tipo;
        req.session.userEmail = decodedToken.email;
        
        // Determinar redirección
        let redirect = '/dashboard';
        if (tipo === 'profesor') {
            redirect = '/dashboard/profesor';
        } else {
            redirect = '/dashboard/padre';
        }
        
        res.json({ 
            success: true, 
            redirect: redirect,
            user: {
                uid: uid,
                email: decodedToken.email,
                tipo: tipo
            }
        });
        
    } catch (error) {
        console.error('Error verificando token:', error);
        res.json({ 
            success: false, 
            error: 'Token inválido o expirado' 
        });
    }
});

// Cerrar sesión
router.post('/logout', async (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

module.exports = router;