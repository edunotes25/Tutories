// backend/routes/auth.js
const express = require('express');
const router = express.Router();

// Importar Firebase Admin
const { db, auth, COLLECTIONS } = require('../lib/firebase-admin');

// Ruta para verificar el login de Firebase
router.post('/verify-login', async (req, res) => {
    console.log('='.repeat(50));
    console.log('🔄 /auth/verify-login - INICIO');
    console.log('📦 Body recibido:', { 
        tieneToken: !!req.body.idToken,
        tipo: req.body.tipo 
    });
    
    try {
        const { idToken, tipo } = req.body;
        
        if (!idToken) {
            console.log('❌ Token no proporcionado');
            return res.status(400).json({ 
                success: false, 
                error: 'Token no proporcionado' 
            });
        }

        console.log('🔍 Verificando token de Firebase...');
        console.log('📝 Token (primeros 50 chars):', idToken.substring(0, 50) + '...');
        
        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(idToken);
            console.log('✅ Token verificado exitosamente');
        } catch (verifyError) {
            console.error('❌ Error verificando token:', verifyError);
            console.error('Código:', verifyError.code);
            console.error('Mensaje:', verifyError.message);
            
            if (verifyError.code === 'auth/id-token-expired') {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Token expirado. Inicia sesión nuevamente' 
                });
            }
            
            if (verifyError.code === 'auth/argument-error') {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Token inválido o mal formado' 
                });
            }
            
            return res.status(401).json({ 
                success: false, 
                error: 'Error verificando token: ' + verifyError.message 
            });
        }
        
        const uid = decodedToken.uid;
        console.log('👤 UID del token:', uid);
        console.log('📧 Email del token:', decodedToken.email || 'no disponible');
        
        console.log('🔍 Buscando usuario en Firestore...');
        console.log('📚 Colección:', COLLECTIONS.USUARIOS);
        console.log('📄 Documento ID:', uid);
        
        const userDoc = await db.collection(COLLECTIONS.USUARIOS).doc(uid).get();
        
        if (!userDoc.exists) {
            console.log('❌ Usuario NO encontrado en Firestore');
            
            // Buscar por email como fallback
            console.log('🔍 Buscando por email como fallback...');
            const userByEmail = await db.collection(COLLECTIONS.USUARIOS)
                .where('email', '==', decodedToken.email)
                .limit(1)
                .get();
            
            if (!userByEmail.empty) {
                console.log('✅ Usuario encontrado por email! Actualizando UID...');
                const userData = userByEmail.docs[0].data();
                const oldUid = userByEmail.docs[0].id;
                
                // Actualizar el documento para usar el UID correcto
                await db.collection(COLLECTIONS.USUARIOS).doc(uid).set({
                    ...userData,
                    uid: uid,
                    oldUid: oldUid,
                    updatedAt: new Date().toISOString()
                });
                
                // Eliminar el documento antiguo
                await db.collection(COLLECTIONS.USUARIOS).doc(oldUid).delete();
                
                console.log('✅ UID actualizado correctamente');
                
                // Obtener el documento actualizado
                const updatedDoc = await db.collection(COLLECTIONS.USUARIOS).doc(uid).get();
                const userDataActualizado = updatedDoc.data();
                
                return crearSesionYResponder(req, res, userDataActualizado, tipo);
            }
            
            return res.status(404).json({ 
                success: false, 
                error: 'Usuario no encontrado en la base de datos' 
            });
        }
        
        const userData = userDoc.data();
        console.log('✅ Usuario encontrado en Firestore:');
        console.log('   Nombre:', userData.nombre);
        console.log('   Email:', userData.email);
        console.log('   Tipo en DB:', userData.tipo);
        console.log('   Tipo solicitado:', tipo);
        
        // Verificar que el tipo coincida
        if (userData.tipo !== tipo) {
            console.log('❌ Tipo de usuario incorrecto');
            console.log('   Esperado:', tipo);
            console.log('   Recibido:', userData.tipo);
            
            return res.status(403).json({ 
                success: false, 
                error: `Tipo de usuario incorrecto. Eres ${userData.tipo}, no ${tipo}` 
            });
        }
        
        // Verificar si el usuario está activo
        if (userData.activo === false) {
            console.log('❌ Usuario desactivado');
            return res.status(403).json({ 
                success: false, 
                error: 'Esta cuenta está desactivada' 
            });
        }
        
        // Crear sesión
        return crearSesionYResponder(req, res, userData, tipo);
        
    } catch (error) {
        console.error('='.repeat(50));
        console.error('❌ ERROR NO MANEJADO en verify-login:');
        console.error('Tipo:', error.constructor.name);
        console.error('Mensaje:', error.message);
        console.error('Código:', error.code);
        console.error('Stack:', error.stack);
        console.error('='.repeat(50));
        
        return res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor: ' + error.message 
        });
    }
});

// Función auxiliar para crear sesión y responder
function crearSesionYResponder(req, res, userData, tipo) {
    console.log('🔄 Creando sesión para usuario:', userData.uid);
    
    // Datos de sesión
    const sessionData = {
        uid: userData.uid,
        nombre: userData.nombre,
        nombreAlumno: userData.nombreAlumno || '',
        email: userData.email,
        tipo: userData.tipo,
        telefono: userData.telefono || '',
        curso: userData.curso || '',
        createdAt: new Date().toISOString()
    };
    
    console.log('📦 Datos de sesión:', sessionData);
    
    // Asignar a la sesión
    req.session.usuario = sessionData;
    
    // Guardar sesión explícitamente
    console.log('💾 Guardando sesión...');
    req.session.save((err) => {
        if (err) {
            console.error('❌ Error al guardar sesión:');
            console.error(err);
            
            return res.status(500).json({ 
                success: false, 
                error: 'Error al crear sesión: ' + err.message 
            });
        }
        
        console.log('✅ Sesión guardada correctamente');
        console.log('🆔 ID de sesión:', req.session.id);
        console.log('🍪 Cookie:', req.session.cookie);
        
        // Determinar redirección
        const redirect = userData.tipo === 'profesor' 
            ? '/profesor/dashboard' 
            : '/padre/profesores';
        
        console.log('➡️ Redirección determinada:', redirect);
        console.log('='.repeat(50));
        
        // Enviar respuesta exitosa
        return res.json({ 
            success: true, 
            redirect: redirect,
            usuario: {
                nombre: userData.nombre,
                tipo: userData.tipo
            }
        });
    });
}

// Ruta para verificar sesión (útil para depuración)
router.get('/check-session', (req, res) => {
    console.log('🔍 Verificando sesión actual...');
    
    if (req.session.usuario) {
        console.log('✅ Sesión activa:', req.session.usuario);
        return res.json({
            success: true,
            sesion: req.session.usuario
        });
    }
    
    console.log('❌ No hay sesión activa');
    return res.json({
        success: false,
        mensaje: 'No hay sesión activa'
    });
});

// Ruta para cerrar sesión
router.post('/logout', (req, res) => {
    console.log('🚪 Cerrando sesión...');
    
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Error al cerrar sesión:', err);
            return res.status(500).json({
                success: false,
                error: 'Error al cerrar sesión'
            });
        }
        
        console.log('✅ Sesión cerrada correctamente');
        res.clearCookie('connect.sid');
        
        return res.json({
            success: true,
            mensaje: 'Sesión cerrada'
        });
    });
});

module.exports = router;