require('dotenv').config();
// POSA AIXÒ AL PRINCIPI DE server.js, DESPRÉS DE REQUIRE('dotenv').config()
console.log('=== DEBUG ENV VARS ===');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✓ present' : '✗ faltant');
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✓ present' : '✗ faltant');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✓ present' : '✗ faltant');
console.log('NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✓ present' : '✗ faltant');
console.log('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✓ present' : '✗ faltant');
console.log('NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✓ present' : '✗ faltant');
console.log('REGISTRE_PROFESSOR_CODI:', process.env.REGISTRE_PROFESSOR_CODI ? '✓ present' : '✗ faltant');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? '✓ present' : '✗ faltant');

const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
require('dotenv').config();

// Importar configuració de Firebase
const { db, auth, COLLECTIONS } = require('./backend/lib/firebase-admin.js');
// Importar rutes d'autenticació
const authRoutes = require('./backend/rutes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuració de seguretat
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://www.gstatic.com", "https://apis.google.com"],
            scriptSrcAttr: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'", "https://identitytoolkit.googleapis.com"],
        },
    },
}));

// Limitador de peticions
const limitador = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    missatge: 'Massa peticions des d\'aquesta IP'
});
app.use('/api/', limitador);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// IMPORTANT: Configurar trust proxy per a Vercel
// Això permet que les cookies funcionin correctament darrere del proxy de Vercel
app.set('trust proxy', 1);

// Configuració de sessions - VERSIÓ CORREGIDA (SENSE DOMINI)
if (process.env.NODE_ENV === 'production') {
    console.log('🔧 Configurant sessions per a producció (Vercel)');
    app.use(session({
        secret: process.env.SESSION_SECRET || 'clau-secreta-temporal',
        resave: false,
        saveUninitialized: false,
        name: 'tutories.sid',
        cookie: { 
            secure: true,
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
            sameSite: 'lax'
        },
        rolling: true
    }));
} else {
    app.use(session({
        secret: process.env.SESSION_SECRET || 'clau-secreta-temporal',
        resave: false,
        saveUninitialized: true,
        name: 'tutories.sid',
        cookie: { 
            secure: false,
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
            sameSite: 'lax'
        },
        rolling: true
    }));
}

app.use(flash());

// Middleware per a logging de sessions
app.use((req, res, next) => {
    console.log(`🌐 [${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log(`🍪 Cookies:`, req.cookies);
    console.log(`🆔 ID de Sessió:`, req.session.id);
    console.log(`👤 Usuari en sessió:`, req.session.usuari ? 'SÍ' : 'NO');
    if (req.session.usuari) {
        console.log(`   Email: ${req.session.usuari.email}`);
        console.log(`   Tipus: ${req.session.usuari.tipus}`);
    }
    next();
});

// Configuració de vistes
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'backend/vistes'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Arxius estàtics
app.use(express.static(path.join(__dirname, 'backend/public')));

// Middleware per passar variables d'entorn a les vistes
app.use((req, res, next) => {
    res.locals.usuari = req.session.usuari || null;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    res.locals.consentimentCookies = req.cookies.consentiment || false;
    res.locals.env = {
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };
    next();
});

// ============ RUTES D'AUTENTICACIÓ ============
app.use('/auth', authRoutes);

// Middleware d'autenticació MILLORAT amb logs
const authMiddleware = (req, res, next) => {
    console.log('='.repeat(50));
    console.log('🔐 MIDDLEWARE D\'AUTENTICACIÓ');
    console.log('🕒 Timestamp:', new Date().toISOString());
    console.log('🍪 Cookies:', req.cookies);
    console.log('🆔 ID de Sessió:', req.session.id);
    console.log('👤 Session usuari:', req.session.usuari ? 'PRESENT' : 'BUIDA');
    
    if (req.session.usuari) {
        console.log('✅ Usuari autenticat:', req.session.usuari.email);
        console.log('👤 Tipus:', req.session.usuari.tipus);
        console.log('➡️ Continuant a la ruta...');
        console.log('='.repeat(50));
        return next();
    }
    
    console.log('❌ No hi ha usuari en sessió');
    console.log('📦 Contingut de req.session:', req.session);
    console.log('🔍 Headers:', req.headers);
    console.log('➡️ Redirigint a /iniciar-sessio');
    console.log('='.repeat(50));
    
    req.flash('error', 'Si us plau, inicia sessió primer');
    return res.redirect('/iniciar-sessio');
};

const professorMiddleware = (req, res, next) => {
    if (!req.session.usuari || req.session.usuari.tipus !== 'professor') {
        console.log('❌ Accés no autoritzat a ruta de professor. Usuari:', req.session.usuari);
        req.flash('error', 'Accés no autoritzat');
        return res.redirect('/');
    }
    next();
};

// ============ RUTA DE DEPURACIÓ ============
app.get('/debug-sessio', (req, res) => {
    console.log('🔍 DEBUG SESSIÓ');
    console.log('ID de Sessió:', req.session.id);
    console.log('Sessió usuari:', req.session.usuari);
    console.log('Cookies:', req.cookies);
    
    res.json({
        sessionId: req.session.id,
        sessio: req.session,
        usuari: req.session.usuari || null,
        cookies: req.cookies,
        headers: req.headers
    });
});

// ============ RUTES PÚBLIQUES ============

app.get('/', (req, res) => {
    res.render('index', { 
        titol: 'Benvingut - Sistema de Tutories'
    });
});

app.get('/iniciar-sessio', (req, res) => {
    if (req.session.usuari) {
        return res.redirect(req.session.usuari.tipus === 'professor' ? '/professor/panell' : '/pare/professors');
    }
    res.render('iniciar-sessio', { 
        titol: 'Iniciar Sessió',
        error: null,
        success: null
    });
});

app.get('/registre', (req, res) => {
    res.render('registre', { titol: 'Registre de Professor' });
});

app.get('/registre-pare', (req, res) => {
    res.render('registre-pare', { titol: 'Registre de Pare/Mare' });
});

app.get('/avis-privacitat', (req, res) => {
    res.render('avis-privacitat', {
        titol: 'Avís de Privacitat - RGPD'
    });
});

app.post('/consentiment', (req, res) => {
    const { acceptar } = req.body;
    
    if (acceptar === 'true') {
        res.cookie('consentiment', 'true', {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: 'lax'
        });
    }
    
    res.redirect('/');
});
// Redireccions per compatibilitat (rutes antigues en castellà)
app.get('/login', (req, res) => {
    res.redirect('/iniciar-sessio');
});

app.get('/logout', (req, res) => {
    res.redirect('/tancar-sessio');
});

app.get('/registro', (req, res) => {
    res.redirect('/registre');
});

app.get('/registro-padre', (req, res) => {
    res.redirect('/registre-pare');
});
// ============ API D'AUTENTICACIÓ ============

/**
 * INICI DE SESSIÓ D'USUARIS (PARES I PROFESSORS)
 */
app.post('/iniciar-sessio', async (req, res) => {
    const { email, password, tipus } = req.body;
    
    try {
        console.log('🔐 Intent d\'inici de sessió:', { email, tipus });
        
        if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
            console.error('❌ NEXT_PUBLIC_FIREBASE_API_KEY no està configurada');
            req.flash('error', 'Error de configuració del servidor');
            return res.redirect('/iniciar-sessio?tipus=' + tipus);
        }
        
        try {
            const response = await axios.post(
                `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
                {
                    email: email,
                    password: password,
                    returnSecureToken: true
                }
            );
            
            const { localId, idToken } = response.data;
            console.log('✅ Credencials verificades a Firebase Auth:', localId);
            
            const userSnapshot = await db.collection(COLLECTIONS.USUARIS)
                .where('email', '==', email)
                .where('tipus', '==', tipus)
                .limit(1)
                .get();
            
            if (userSnapshot.empty) {
                console.log('❌ Usuari no trobat a Firestore');
                req.flash('error', 'Credencials incorrectes');
                return res.redirect('/iniciar-sessio?tipus=' + tipus);
            }
            
            const userDoc = userSnapshot.docs[0];
            const userData = userDoc.data();
            
            if (userData.uid !== localId) {
                console.log('❌ Discrepància en UID entre Auth i Firestore');
                req.flash('error', 'Error en la configuració del compte');
                return res.redirect('/iniciar-sessio?tipus=' + tipus);
            }
            
            req.session.usuari = {
                uid: userData.uid,
                nom: userData.nom,
                nomAlumne: userData.nomAlumne || '',
                email: userData.email,
                tipus: userData.tipus,
                telefon: userData.telefon,
                curs: userData.curs,
                idToken: idToken
            };
            
            req.session.save((err) => {
                if (err) {
                    console.error('❌ Error guardant sessió:', err);
                    req.flash('error', 'Error en iniciar sessió');
                    return res.redirect('/iniciar-sessio?tipus=' + tipus);
                }
                
                console.log('✅ Sessió guardada correctament');
                console.log('✅ Inici de sessió exitós:', userData.nom);
                
                const desti = userData.tipus === 'professor' ? '/professor/panell' : '/pare/professors';
                console.log('➡️ Redirigint a:', desti);
                res.redirect(desti);
            });
            
        } catch (axiosError) {
            console.error('❌ Error de Firebase Auth:', axiosError.response?.data || axiosError.message);
            
            let missatgeError = 'Email o contrasenya incorrectes';
            
            if (axiosError.response?.data?.error?.message) {
                const firebaseError = axiosError.response.data.error.message;
                switch (firebaseError) {
                    case 'EMAIL_NOT_FOUND':
                    case 'INVALID_PASSWORD':
                    case 'INVALID_LOGIN_CREDENTIALS':
                        missatgeError = 'Email o contrasenya incorrectes';
                        break;
                    case 'USER_DISABLED':
                        missatgeError = 'Aquest compte ha estat deshabilitat';
                        break;
                    case 'TOO_MANY_ATTEMPTS_TRY_LATER':
                        missatgeError = 'Massa intents fallits. Intenta més tard';
                        break;
                    default:
                        missatgeError = 'Error en iniciar sessió: ' + firebaseError;
                }
            }
            
            req.flash('error', missatgeError);
            return res.redirect('/iniciar-sessio?tipus=' + tipus);
        }
        
    } catch (error) {
        console.error('❌ Error inesperat en inici de sessió:', error);
        req.flash('error', 'Error en iniciar sessió');
        res.redirect('/iniciar-sessio?tipus=' + tipus);
    }
});

/**
 * REGISTRE DE PROFESSORS
 */
app.post('/api/registre', async (req, res) => {
    console.log('📝 Dades rebudes en registre professor:', req.body);
    
    const { nom, email, password, telefon, curs, descripcio, codiRegistre } = req.body;
    
    try {
        if (!codiRegistre || codiRegistre !== process.env.REGISTRE_PROFESSOR_CODI) {
            console.log('❌ Codi incorrecte:', codiRegistre);
            req.flash('error', 'Codi de registre incorrecte');
            return res.redirect('/registre');
        }
        
        const userSnapshot = await db.collection(COLLECTIONS.USUARIS)
            .where('email', '==', email)
            .get();
        
        if (!userSnapshot.empty) {
            req.flash('error', 'L\'email ja està registrat');
            return res.redirect('/registre');
        }
        
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: nom
        });
        
        console.log('✅ Usuari professor creat a Auth:', userRecord.uid);
        
        await db.collection(COLLECTIONS.USUARIS).doc(userRecord.uid).set({
            uid: userRecord.uid,
            nom: nom,
            email: email,
            tipus: 'professor',
            telefon: telefon || '',
            curs: curs || '',
            descripcio: descripcio || '',
            createdAt: new Date().toISOString(),
            actiu: true
        });
        
        console.log('✅ Dades de professor guardades a Firestore');
        
        req.flash('success', 'Registre completat. Ja pots iniciar sessió');
        res.redirect('/iniciar-sessio?tipus=professor');
        
    } catch (error) {
        console.error('❌ Error en registre professor:', error);
        
        if (error.code === 'auth/email-already-exists') {
            req.flash('error', 'L\'email ja està registrat');
        } else {
            req.flash('error', 'Error en el registre: ' + error.message);
        }
        
        res.redirect('/registre');
    }
});

/**
 * REGISTRE DE PARES
 */
app.post('/api/registre-pare', async (req, res) => {
    console.log('📝 Dades rebudes en registre pare:', req.body);
    
    const { nom, nomAlumne, email, password, telefon } = req.body;
    
    try {
        console.log('1️⃣ Verificant si l\'email ja existeix...');
        const userSnapshot = await db.collection(COLLECTIONS.USUARIS)
            .where('email', '==', email)
            .get();
        
        if (!userSnapshot.empty) {
            console.log('❌ Email ja registrat');
            req.flash('error', 'L\'email ja està registrat');
            return res.redirect('/registre-pare');
        }
        console.log('✅ Email disponible');
        
        console.log('2️⃣ Creant usuari a Firebase Auth...');
        console.log('   Email:', email);
        console.log('   Longitud contrasenya:', password.length);
        
        let userRecord;
        try {
            userRecord = await auth.createUser({
                email: email,
                password: password,
                displayName: nom
            });
            console.log('✅ Usuari pare creat a Auth. UID:', userRecord.uid);
        } catch (authError) {
            console.error('❌ Error a Firebase Auth:', authError);
            console.error('Codi:', authError.code);
            console.error('Missatge:', authError.message);
            req.flash('error', 'Error en autenticació: ' + authError.message);
            return res.redirect('/registre-pare');
        }
        
        console.log('3️⃣ Guardant dades a Firestore...');
        console.log('   Col·lecció:', COLLECTIONS.USUARIS);
        console.log('   Document ID:', userRecord.uid);
        
        try {
            await db.collection(COLLECTIONS.USUARIS).doc(userRecord.uid).set({
                uid: userRecord.uid,
                nom: nom,
                nomAlumne: nomAlumne || '',
                email: email,
                tipus: 'pare',
                telefon: telefon || '',
                createdAt: new Date().toISOString(),
                actiu: true
            });
            console.log('✅ Dades de pare guardades a Firestore');
        } catch (firestoreError) {
            console.error('❌ Error a Firestore:', firestoreError);
            try {
                await auth.deleteUser(userRecord.uid);
                console.log('✅ Usuari de Auth eliminat per consistència');
            } catch (deleteError) {
                console.error('❌ No s\'ha pogut eliminar l\'usuari de Auth:', deleteError);
            }
            req.flash('error', 'Error al guardar dades de l\'usuari');
            return res.redirect('/registre-pare');
        }
        
        console.log('4️⃣ Registre completat amb èxit');
        req.flash('success', 'Registre completat. Ja pots iniciar sessió');
        console.log('5️⃣ Redirigint a /iniciar-sessio?tipus=pare');
        res.redirect('/iniciar-sessio?tipus=pare');
        
    } catch (error) {
        console.error('❌ Error general en registre pare:', error);
        console.error('Stack:', error.stack);
        req.flash('error', 'Error en el registre: ' + error.message);
        res.redirect('/registre-pare');
    }
});

app.get('/tancar-sessio', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Error en destruir sessió:', err);
        }
        res.redirect('/');
    });
});

// ============ RUTES DE PROFESSOR ============

app.get('/professor/panell', authMiddleware, professorMiddleware, async (req, res) => {
    try {
        const professorId = req.session.usuari.uid;        
        console.log('📊 Carregant panell per a professor:', professorId);
        
        const reservesSnapshot = await db.collection(COLLECTIONS.RESERVES)
            .where('professorId', '==', professorId)
            .where('estat', '==', 'pendent')
            .orderBy('data')
            .orderBy('hora')
            .get();
        
        const reserves = [];
        reservesSnapshot.forEach(doc => {
            reserves.push({ id: doc.id, ...doc.data() });
        });
        
        const horarisSnapshot = await db.collection(COLLECTIONS.HORARIS)
            .where('professorId', '==', professorId)
            .where('actiu', '==', true)
            .get();
        
        const horaris = [];
        horarisSnapshot.forEach(doc => {
            horaris.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('📊 Panell professor - Reserves:', reserves.length, 'Horaris:', horaris.length);
        
        res.render('professor/panell', {
            titol: 'Panell del Professor',
            reserves: reserves,
            horaris: horaris
        });
        
    } catch (error) {
        console.error('❌ Error en panell professor:', error);
        req.flash('error', 'Error en carregar el panell');
        res.redirect('/');
    }
});

app.get('/professor/horaris', authMiddleware, professorMiddleware, async (req, res) => {
    try {
        const professorId = req.session.usuari.uid;        
        console.log('📅 Carregant horaris per a professor:', professorId);
        
        const horarisSnapshot = await db.collection(COLLECTIONS.HORARIS)
            .where('professorId', '==', professorId)
            .get();
        
        const horaris = [];
        horarisSnapshot.forEach(doc => {
            horaris.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('✅ Trobats', horaris.length, 'horaris');
        
        res.render('professor/horaris', {
            titol: 'Gestionar Horaris',
            horaris: horaris
        });
        
    } catch (error) {
        console.error('❌ Error en carregar horaris:', error);
        req.flash('error', 'Error en carregar horaris');
        res.redirect('/professor/panell');
    }
});

// ============ RUTA CORREGIDA PER AFEGIR HORARIS AMB VALIDACIÓ ============
app.post('/professor/horaris/afegir', authMiddleware, professorMiddleware, async (req, res) => {
    const { dia_setmana, hora } = req.body;
    const professorId = req.session.usuari.uid;
    
    // Validar que l'hora tingui format correcte (HH:MM)
    const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!hora || !horaRegex.test(hora)) {
        console.log('❌ Format d\'hora invàlid:', hora);
        req.flash('error', 'Format d\'hora invàlid. Utilitza HH:MM (ex: 14:30, 09:00)');
        return res.redirect('/professor/horaris');
    }
    
    try {
        await db.collection(COLLECTIONS.HORARIS).add({
            professorId: professorId,
            diaSetmana: parseInt(dia_setmana),
            hora: hora,
            actiu: true,
            createdAt: new Date().toISOString()
        });
        
        req.flash('success', 'Horari afegit correctament');
        
    } catch (error) {
        console.error('❌ Error en afegir horari:', error);
        req.flash('error', 'Error en afegir horari');
    }
    
    res.redirect('/professor/horaris');
});

app.post('/professor/horaris/eliminar/:id', authMiddleware, professorMiddleware, async (req, res) => {
    const horariId = req.params.id;
    const professorId = req.session.usuari.uid;    
    try {
        const horariDoc = await db.collection(COLLECTIONS.HORARIS).doc(horariId).get();
        
        if (!horariDoc.exists || horariDoc.data().professorId !== professorId) {
            req.flash('error', 'No tens permís per eliminar aquest horari');
            return res.redirect('/professor/horaris');
        }
        
        await db.collection(COLLECTIONS.HORARIS).doc(horariId).delete();
        req.flash('success', 'Horari eliminat correctament');
        
    } catch (error) {
        console.error('❌ Error en eliminar horari:', error);
        req.flash('error', 'Error en eliminar horari');
    }
    
    res.redirect('/professor/horaris');
});

// ============ RUTA DE CALENDARI PER A PROFESSOR ============
app.get('/professor/calendari', authMiddleware, professorMiddleware, async (req, res) => {
    try {
        const professorId = req.session.usuari.uid;        
        console.log('📅 Carregant calendari per a professor:', professorId);
        
        const reservesSnapshot = await db.collection(COLLECTIONS.RESERVES)
            .where('professorId', '==', professorId)
            .orderBy('data', 'desc')
            .orderBy('hora', 'desc')
            .get();
        
        const reserves = [];
        reservesSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.estat !== 'cancel·lada') {
                reserves.push({ id: doc.id, ...data });
            }
        });
        
        console.log(`✅ Calendari: mostrant ${reserves.length} reserves (excloent cancel·lades)`);
        
        res.render('professor/calendari', {
            titol: 'Calendari de Reserves',
            totesReserves: reserves
        });
        
    } catch (error) {
        console.error('❌ Error en carregar calendari:', error);
        req.flash('error', 'Error en carregar el calendari');
        res.redirect('/professor/panell');
    }
});

// ============ RUTES DE RESERVES DE PROFESSOR ============

app.get('/professor/reserves', authMiddleware, professorMiddleware, async (req, res) => {
    try {
        const professorId = req.session.usuari.uid;        
        console.log('📋 Carregant totes les reserves per a professor:', professorId);
        
        const reservesSnapshot = await db.collection(COLLECTIONS.RESERVES)
            .where('professorId', '==', professorId)
            .orderBy('data', 'desc')
            .orderBy('hora', 'desc')
            .get();
        
        const reserves = [];
        reservesSnapshot.forEach(doc => {
            reserves.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ Trobades ${reserves.length} reserves totals`);
        
        const reservesPendents = reserves.filter(r => r.estat === 'pendent' || r.estat === 'confirmada');
        const reservesHistorial = reserves.filter(r => r.estat === 'cancel·lada' || r.estat === 'completada');
        
        res.render('professor/reserves', {
            titol: 'Les Meves Reserves',
            reservesPendents: reservesPendents,
            reservesHistorial: reservesHistorial,
            totesReserves: reserves
        });
        
    } catch (error) {
        console.error('❌ Error en carregar reserves:', error);
        req.flash('error', 'Error en carregar les reserves');
        res.redirect('/professor/panell');
    }
});

app.post('/professor/reserves/estat/:reservaId', authMiddleware, professorMiddleware, async (req, res) => {
    const reservaId = req.params.reservaId;
    const { estat } = req.body;
    const professorId = req.session.usuari.uid;    
    try {
        console.log(`🔄 Canviant estat de reserva ${reservaId} a ${estat}`);
        
        const reservaDoc = await db.collection(COLLECTIONS.RESERVES).doc(reservaId).get();
        
        if (!reservaDoc.exists) {
            req.flash('error', 'Reserva no trobada');
            return res.redirect('/professor/reserves');
        }
        
        const reservaData = reservaDoc.data();
        
        if (reservaData.professorId !== professorId) {
            req.flash('error', 'No tens permís per modificar aquesta reserva');
            return res.redirect('/professor/reserves');
        }
        
        const estatAnterior = reservaData.estat;
        
        await db.collection(COLLECTIONS.RESERVES).doc(reservaId).update({
            estat: estat,
            dataActualitzacio: new Date().toISOString()
        });
        
        if (estat === 'cancel·lada' && estatAnterior !== 'cancel·lada') {
            try {
                const { enviarCancelacioPare } = require('./backend/serveis/emailService');
                
                const professorDoc = await db.collection(COLLECTIONS.USUARIS).doc(professorId).get();
                const professor = professorDoc.data();
                
                reservaData.professorNom = professor.nom;
                
                await enviarCancelacioPare(reservaData, professor);
                console.log('✅ Email de cancel·lació enviat al pare');
            } catch (emailError) {
                console.error('❌ Error en enviar email de cancel·lació:', emailError);
            }
        }
        
        req.flash('success', `Reserva ${estat === 'completada' ? 'marcada com a completada' : 'cancel·lada'} correctament`);
        res.redirect('/professor/reserves');
        
    } catch (error) {
        console.error('❌ Error en actualitzar reserva:', error);
        req.flash('error', 'Error en actualitzar la reserva');
        res.redirect('/professor/reserves');
    }
});

// ============ RUTES DE PARE ============

app.get('/pare/professors', authMiddleware, async (req, res) => {
    if (req.session.usuari.tipus !== 'pare') {
        console.log('❌ Usuari no és pare, redirigint a panell de professor');
        return res.redirect('/professor/panell');
    }
    
    try {
        console.log('👪 Carregant llista de professors per a pare');
        
        const professorsSnapshot = await db.collection(COLLECTIONS.USUARIS)
            .where('tipus', '==', 'professor')
            .where('actiu', '==', true)
            .get();
        
        const professors = [];
        
        for (const doc of professorsSnapshot.docs) {
            const professor = doc.data();
            
            const horarisSnapshot = await db.collection(COLLECTIONS.HORARIS)
                .where('professorId', '==', professor.uid)
                .where('actiu', '==', true)
                .get();
            
            professors.push({
                id: doc.id,
                ...professor,
                totalHoraris: horarisSnapshot.size || 0
            });
        }
        
        console.log('✅ Trobats', professors.length, 'professors');
        
        res.render('pare/professors', {
            titol: 'Professors Disponibles',
            professors: professors
        });
        
    } catch (error) {
        console.error('❌ Error en carregar professors:', error);
        req.flash('error', 'Error en carregar professors');
        res.redirect('/');
    }
});

app.get('/pare/reservar/:professorId', authMiddleware, async (req, res) => {
    const professorId = req.params.professorId;
    
    console.log('🔍 Accedint a reserva amb professorId:', professorId);
    console.log('👤 Usuari actual:', req.session.usuari);
    
    try {
        if (req.session.usuari.tipus !== 'pare') {
            console.log('❌ Usuari no és pare, és:', req.session.usuari.tipus);
            req.flash('error', 'Accés no autoritzat');
            return res.redirect('/');
        }
        
        if (!professorId) {
            console.log('❌ professorId buit');
            req.flash('error', 'ID de professor no vàlid');
            return res.redirect('/pare/professors');
        }
        
        console.log('📚 Cercant professor a Firestore amb ID:', professorId);
        
        const professorDoc = await db.collection(COLLECTIONS.USUARIS).doc(professorId).get();
        
        if (!professorDoc.exists) {
            console.log('❌ Professor no trobat a Firestore');
            req.flash('error', 'Professor no trobat');
            return res.redirect('/pare/professors');
        }
        
        const professorData = professorDoc.data();
        console.log('✅ Professor trobat:', professorData.nom);
        
        if (professorData.tipus !== 'professor') {
            console.log('❌ L\'usuari no és professor, és:', professorData.tipus);
            req.flash('error', 'L\'usuari seleccionat no és un professor');
            return res.redirect('/pare/professors');
        }
        
        const professor = { id: professorDoc.id, ...professorData };
        
        console.log('📅 Cercant horaris del professor...');
        const horarisSnapshot = await db.collection(COLLECTIONS.HORARIS)
            .where('professorId', '==', professorId)
            .where('actiu', '==', true)
            .get();
        
        const horaris = [];
        horarisSnapshot.forEach(doc => {
            horaris.push({ id: doc.id, ...doc.data() });
        });
        console.log(`✅ Trobats ${horaris.length} horaris`);
        
        console.log('📖 Cercant TOTES les reserves existents...');
        const reservesSnapshot = await db.collection(COLLECTIONS.RESERVES)
            .where('professorId', '==', professorId)
            .where('estat', 'in', ['pendent', 'confirmada'])
            .get();
        
        const reserves = [];
        reservesSnapshot.forEach(doc => {
            const data = doc.data();
            reserves.push({
                data: data.data,
                hora: data.hora,
                estat: data.estat
            });
        });
        
        console.log(`✅ Trobades ${reserves.length} reserves:`, reserves);
        
        console.log('🎨 Renderitzant vista pare/reserves');
        res.render('pare/reserves', {
            titol: `Reservar amb ${professor.nom}`,
            professor: professor,
            horaris: horaris,
            reserves: reserves
        });
        
    } catch (error) {
        console.error('❌ Error detallat:', error);
        console.error('❌ Stack trace:', error.stack);
        req.flash('error', 'Error en carregar la pàgina de reserva: ' + error.message);
        res.redirect('/pare/professors');
    }
});

app.post('/api/pare/reservar', authMiddleware, async (req, res) => {
    const { professorId, data, hora, nomPare, nomAlumne, emailPare, telefon, comentaris } = req.body;
    const reservaId = uuidv4();
    const tokenAcces = uuidv4();
    
    try {
        const reservesSnapshot = await db.collection(COLLECTIONS.RESERVES)
            .where('professorId', '==', professorId)
            .where('data', '==', data)
            .where('hora', '==', hora)
            .where('estat', 'in', ['pendent', 'confirmada'])
            .limit(1)
            .get();
        
        if (!reservesSnapshot.empty) {
            return res.json({ error: 'Horari no disponible' });
        }
        
        await db.collection(COLLECTIONS.RESERVES).doc(reservaId).set({
            reservaId: reservaId,
            professorId: professorId,
            pareId: req.session.usuari?.uid || null,
            nomPare: nomPare,
            nomAlumne: nomAlumne || '',
            emailPare: emailPare,
            telefonPare: telefon || '',
            data: data,
            hora: hora,
            comentaris: comentaris || '',
            estat: 'pendent',
            tokenAcces: tokenAcces,
            dataReserva: new Date().toISOString()
        });
        
        try {
            const { enviarConfirmacio } = require('./backend/serveis/emailService');
            
            const professorDoc = await db.collection(COLLECTIONS.USUARIS).doc(professorId).get();
            const professor = professorDoc.data();
            
            const reservaData = {
                reservaId: reservaId,
                nomPare: nomPare,
                emailPare: emailPare,
                nomAlumne: nomAlumne || '',
                data: data,
                hora: hora,
                comentaris: comentaris || '',
                tokenAcces: tokenAcces
            };
            
            await enviarConfirmacio(reservaData, professor);
            console.log('✅ Email de confirmació enviat al pare');
        } catch (emailError) {
            console.error('❌ Error en enviar email de confirmació:', emailError);
        }
        
        res.json({
            success: true,
            reservaId: reservaId,
            missatge: 'Reserva confirmada'
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.json({ error: 'Error en crear la reserva' });
    }
});

app.get('/confirmacio/:reservaId', authMiddleware, async (req, res) => {
    const reservaId = req.params.reservaId;
    
    try {
        const reservaDoc = await db.collection(COLLECTIONS.RESERVES).doc(reservaId).get();
        
        if (!reservaDoc.exists) {
            req.flash('error', 'Reserva no trobada');
            return res.redirect('/pare/professors');
        }
        
        const reserva = reservaDoc.data();
        
        const professorDoc = await db.collection(COLLECTIONS.USUARIS).doc(reserva.professorId).get();
        const professor = professorDoc.data();
        
        reserva.professorNom = professor.nom;
        
        res.render('pare/confirmacio', {
            titol: 'Reserva Confirmada',
            reserva: reserva
        });
        
    } catch (error) {
        console.error('Error:', error);
        req.flash('error', 'Error en carregar la confirmació');
        res.redirect('/pare/professors');
    }
});

// ============ RUTES DE CANCEL·LACIÓ ============

app.get('/cancelar/:token', async (req, res) => {
    const token = req.params.token;
    
    try {
        const reservesSnapshot = await db.collection(COLLECTIONS.RESERVES)
            .where('tokenAcces', '==', token)
            .limit(1)
            .get();
        
        if (reservesSnapshot.empty) {
            return res.send('Enllaç no vàlid o reserva ja cancel·lada');
        }
        
        const reservaDoc = reservesSnapshot.docs[0];
        const reserva = reservaDoc.data();
        
        const professorDoc = await db.collection(COLLECTIONS.USUARIS).doc(reserva.professorId).get();
        const professor = professorDoc.data();
        
        reserva.professorNom = professor.nom;
        
        res.render('cancelar', {
            titol: 'Cancel·lar Reserva',
            reserva: reserva,
            token: token,
            reservaId: reservaDoc.id
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.send('Error en processar la sol·licitud');
    }
});

app.post('/cancelar/:token', async (req, res) => {
    const token = req.params.token;
    
    try {
        const reservesSnapshot = await db.collection(COLLECTIONS.RESERVES)
            .where('tokenAcces', '==', token)
            .limit(1)
            .get();
        
        if (reservesSnapshot.empty) {
            return res.send('Enllaç no vàlid');
        }
        
        const reservaDoc = reservesSnapshot.docs[0];
        const reservaData = reservaDoc.data();
        
        const estatAnterior = reservaData.estat;
        
        await db.collection(COLLECTIONS.RESERVES).doc(reservaDoc.id).update({
            estat: 'cancel·lada',
            dataCancelacio: new Date().toISOString()
        });
        
        if (estatAnterior !== 'cancel·lada') {
            try {
                const professorDoc = await db.collection(COLLECTIONS.USUARIS).doc(reservaData.professorId).get();
                const professor = professorDoc.data();
                
                const pare = {
                    nom: reservaData.nomPare,
                    email: reservaData.emailPare,
                    telefon: reservaData.telefonPare || 'No especificat'
                };
                
                reservaData.professorNom = professor.nom;
                
                const { enviarCancelacioPare, enviarNotificacioProfessor } = require('./backend/serveis/emailService');
                
                await enviarCancelacioPare(reservaData, professor);
                console.log('✅ Email de confirmació de cancel·lació enviat al pare');
                
                await enviarNotificacioProfessor(reservaData, professor, pare);
                console.log('✅ Notificació de cancel·lació enviada al professor');
                
            } catch (emailError) {
                console.error('❌ Error en enviar emails:', emailError);
            }
        }
        
        res.send(`
            <html>
            <head>
                <title>Reserva Cancel·lada</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                    .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    h1 { color: #28a745; }
                    p { color: #666; line-height: 1.6; }
                    .btn { display: inline-block; padding: 10px 20px; background: #4a90e2; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✓ Reserva cancel·lada</h1>
                    <p>La reserva ha estat cancel·lada correctament.</p>
                    <p>Hem enviat un email de confirmació a <strong>${reservaData.emailPare}</strong></p>
                    <p>També hem notificat al professor.</p>
                    <a href="/" class="btn">Tornar a l'inici</a>
                </div>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('Error:', error);
        res.send('Error en cancel·lar la reserva');
    }
});

// ============ EXPORTAR PER A VERCEL ============
if (process.env.NODE_ENV === 'production') {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`✅ Servidor funcionant a http://localhost:${PORT}`);
    console.log(`🔥 Connectat a Firebase Project: ${process.env.FIREBASE_PROJECT_ID || 'no configurat'}`);
    console.log(`🔑 Codi de registre de professors configurat: ${process.env.REGISTRE_PROFESSOR_CODI ? 'SÍ' : 'NO'}`);
    console.log(`🔑 API Key de Firebase configurada: ${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SÍ' : 'NO'}`);
  });
}