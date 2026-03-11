// backend/routes/auth.js
const express = require('express');
const router = express.Router();

// Importar Firebase Admin
const { db, auth, COLLECTIONS } = require('../lib/firebase-admin');

// Ruta per verificar el login de Firebase
router.post('/verify-login', async (req, res) => {
    console.log('='.repeat(50));
    console.log('🔄 /auth/verify-login - INICI');
    console.log('📦 Body rebut:', { 
        teToken: !!req.body.idToken,
        tipus: req.body.tipus 
    });
    
    try {
        const { idToken, tipus } = req.body;
        
        if (!idToken) {
            console.log('❌ Token no proporcionat');
            return res.status(400).json({ 
                success: false, 
                error: 'Token no proporcionat' 
            });
        }

        console.log('🔍 Verificant token de Firebase...');
        console.log('📝 Token (primers 50 caràcters):', idToken.substring(0, 50) + '...');
        
        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(idToken);
            console.log('✅ Token verificat exitosament');
        } catch (verifyError) {
            console.error('❌ Error verificant token:', verifyError);
            console.error('Codi:', verifyError.code);
            console.error('Missatge:', verifyError.message);
            
            if (verifyError.code === 'auth/id-token-expired') {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Token expirat. Inicia sessió novament' 
                });
            }
            
            if (verifyError.code === 'auth/argument-error') {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Token invàlid o mal format' 
                });
            }
            
            return res.status(401).json({ 
                success: false, 
                error: 'Error verificant token: ' + verifyError.message 
            });
        }
        
        const uid = decodedToken.uid;
        console.log('👤 UID del token:', uid);
        console.log('📧 Email del token:', decodedToken.email || 'no disponible');
        
        console.log('🔍 Cercant usuari a Firestore...');
        console.log('📚 Col·lecció:', COLLECTIONS.USUARIS);
        console.log('📄 Document ID:', uid);
        
        const userDoc = await db.collection(COLLECTIONS.USUARIS).doc(uid).get();
        
        if (!userDoc.exists) {
            console.log('❌ Usuari NO trobat a Firestore');
            
            // Cercar per email com a fallback
            console.log('🔍 Cercant per email com a fallback...');
            const userByEmail = await db.collection(COLLECTIONS.USUARIS)
                .where('email', '==', decodedToken.email)
                .limit(1)
                .get();
            
            if (!userByEmail.empty) {
                console.log('✅ Usuari trobat per email! Actualitzant UID...');
                const userData = userByEmail.docs[0].data();
                const oldUid = userByEmail.docs[0].id;
                
                // Actualitzar el document per utilitzar el UID correcte
                await db.collection(COLLECTIONS.USUARIS).doc(uid).set({
                    ...userData,
                    uid: uid,
                    oldUid: oldUid,
                    updatedAt: new Date().toISOString()
                });
                
                // Eliminar el document antic
                await db.collection(COLLECTIONS.USUARIS).doc(oldUid).delete();
                
                console.log('✅ UID actualitzat correctament');
                
                // Obtenir el document actualitzat
                const updatedDoc = await db.collection(COLLECTIONS.USUARIS).doc(uid).get();
                const userDataActualitzat = updatedDoc.data();
                
                return crearSessioIRespondre(req, res, userDataActualitzat, tipus);
            }
            
            return res.status(404).json({ 
                success: false, 
                error: 'Usuari no trobat a la base de dades' 
            });
        }
        
        const userData = userDoc.data();
        console.log('✅ Usuari trobat a Firestore:');
        console.log('   Nom:', userData.nom);
        console.log('   Email:', userData.email);
        console.log('   Tipus a DB:', userData.tipus);
        console.log('   Tipus sol·licitat:', tipus);
        
        // Verificar que el tipus coincideixi
        if (userData.tipus !== tipus) {
            console.log('❌ Tipus d\'usuari incorrecte');
            console.log('   Esperat:', tipus);
            console.log('   Rebut:', userData.tipus);
            
            return res.status(403).json({ 
                success: false, 
                error: `Tipus d'usuari incorrecte. Ets ${userData.tipus}, no ${tipus}` 
            });
        }
        
        // Verificar si l'usuari està actiu
        if (userData.actiu === false) {
            console.log('❌ Usuari desactivat');
            return res.status(403).json({ 
                success: false, 
                error: 'Aquest compte està desactivat' 
            });
        }
        
        // Crear sessió
        return crearSessioIRespondre(req, res, userData, tipus);
        
    } catch (error) {
        console.error('='.repeat(50));
        console.error('❌ ERROR NO GESTIONAT a verify-login:');
        console.error('Tipus:', error.constructor.name);
        console.error('Missatge:', error.message);
        console.error('Codi:', error.code);
        console.error('Stack:', error.stack);
        console.error('='.repeat(50));
        
        return res.status(500).json({ 
            success: false, 
            error: 'Error intern del servidor: ' + error.message 
        });
    }
});

// Funció auxiliar per crear sessió i respondre
function crearSessioIRespondre(req, res, userData, tipus) {
    console.log('🔄 Creant sessió per a usuari:', userData.uid);
    
    // Dades de sessió
    const sessionData = {
        uid: userData.uid,
        nom: userData.nom,
        nomAlumne: userData.nomAlumne || '',
        email: userData.email,
        tipus: userData.tipus,
        telefon: userData.telefon || '',
        curs: userData.curs || '',
        createdAt: new Date().toISOString()
    };
    
    console.log('📦 Dades de sessió:', sessionData);
    
    // Assignar a la sessió
    req.session.usuari = sessionData;
    
    // Guardar sessió explícitament
    console.log('💾 Guardant sessió...');
    req.session.save((err) => {
        if (err) {
            console.error('❌ Error en guardar sessió:');
            console.error(err);
            
            return res.status(500).json({ 
                success: false, 
                error: 'Error en crear sessió: ' + err.message 
            });
        }
        
        console.log('✅ Sessió guardada correctament');
        console.log('🆔 ID de sessió:', req.session.id);
        console.log('🍪 Cookie:', req.session.cookie);
        
        // Determinar redirecció
        const redirect = userData.tipus === 'professor' 
            ? '/professor/dashboard' 
            : '/pare/professors';
        
        console.log('➡️ Redirecció determinada:', redirect);
        console.log('='.repeat(50));
        
        // Enviar resposta exitosa
        return res.json({ 
            success: true, 
            redirect: redirect,
            usuari: {
                nom: userData.nom,
                tipus: userData.tipus
            }
        });
    });
}

// Ruta per verificar sessió (útil per a depuració)
router.get('/check-session', (req, res) => {
    console.log('🔍 Verificant sessió actual...');
    
    if (req.session.usuari) {
        console.log('✅ Sessió activa:', req.session.usuari);
        return res.json({
            success: true,
            sessio: req.session.usuari
        });
    }
    
    console.log('❌ No hi ha sessió activa');
    return res.json({
        success: false,
        missatge: 'No hi ha sessió activa'
    });
});

// Ruta per tancar sessió
router.post('/logout', (req, res) => {
    console.log('🚪 Tancant sessió...');
    
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Error en tancar sessió:', err);
            return res.status(500).json({
                success: false,
                error: 'Error en tancar sessió'
            });
        }
        
        console.log('✅ Sessió tancada correctament');
        res.clearCookie('connect.sid');
        
        return res.json({
            success: true,
            missatge: 'Sessió tancada'
        });
    });
});

module.exports = router;