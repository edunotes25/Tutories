// backend/routes/auth.js
// Prueba de Firebase Admin
console.log('=== TEST FIREBASE ADMIN ===');
console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Client Email:', process.env.FIREBASE_CLIENT_EMAIL ? '✓ presente' : '✗ faltante');
console.log('Private Key:', process.env.FIREBASE_PRIVATE_KEY ? '✓ presente (longitud: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : '✗ faltante');
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
        console.log('Token recibido (primeros 50 chars):', idToken.substring(0, 50) + '...');
        
        try {
            // Verificar el token con Firebase Admin
            const decodedToken = await auth.verifyIdToken(idToken);
            const uid = decodedToken.uid;
            
            console.log('✅ Token verificado para UID:', uid);
            console.log('✅ Email del token:', decodedToken.email);
            
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
            
            req.session.save((err) => {
                if (err) {
                    console.error('❌ Error guardando sesión:', err);
                    return res.json({ 
                        success: false, 
                        error: 'Error al crear sesión' 
                    });
                }
                
                console.log('✅ Sesión guardada para:', userData.nombre);
                
                const redirect = tipo === 'profesor' ? '/profesor/dashboard' : '/padre/profesores';
                
                res.json({ 
                    success: true, 
                    redirect: redirect
                });
            });
            
        } catch (verifyError) {
            console.error('❌ Error al verificar token:', verifyError);
            console.error('Código de error:', verifyError.code);
            console.error('Mensaje:', verifyError.message);
            
            // Devolver más información sobre el error
            return res.status(401).json({ 
                success: false, 
                error: 'Token inválido',
                details: verifyError.message,
                code: verifyError.code
            });
        }
        
    } catch (error) {
        console.error('❌ Error general en verify-login:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});