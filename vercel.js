const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const expressLayouts = require('express-ejs-layouts');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Importar configuración de Firebase
const { db, auth, COLLECTIONS } = require('./backend/config/firebase');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-jwt-cambiame-en-produccion';

// Configuración de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:"],
        },
    },
}));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Configuración de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'backend/views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'backend/public')));

// Middleware para variables globales en vistas
app.use((req, res, next) => {
    // Verificar token JWT en cookies
    const token = req.cookies.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.usuario = decoded;
            res.locals.usuario = decoded;
        } catch (err) {
            // Token inválido, lo ignoramos
            res.locals.usuario = null;
        }
    } else {
        res.locals.usuario = null;
    }
    
    res.locals.error = [];
    res.locals.success = [];
    res.locals.consentimientoCookies = req.cookies.consentimiento || false;
    next();
});

// Middleware de autenticación (JWT)
const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        res.locals.error = ['Por favor, inicia sesión primero'];
        return res.redirect('/login');
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.usuario = decoded;
        res.locals.usuario = decoded;
        next();
    } catch (err) {
        res.locals.error = ['Sesión inválida o expirada'];
        res.clearCookie('token');
        return res.redirect('/login');
    }
};

const profesorMiddleware = (req, res, next) => {
    if (!req.usuario || req.usuario.tipo !== 'profesor') {
        console.log('❌ Acceso no autorizado a ruta de profesor. Usuario:', req.usuario);
        res.locals.error = ['Acceso no autorizado'];
        return res.redirect('/');
    }
    next();
};

// ============ RUTAS PÚBLICAS ============

app.get('/', (req, res) => {
    res.render('index', { 
        titulo: 'Bienvenido - Sistema de Tutorías'
    });
});

app.get('/login', (req, res) => {
    if (req.usuario) {
        return res.redirect(req.usuario.tipo === 'profesor' ? '/profesor/dashboard' : '/padre/profesores');
    }
    res.render('login', { titulo: 'Iniciar Sesión' });
});

app.get('/registro', (req, res) => {
    res.render('registro', { titulo: 'Registro de Profesor' });
});

app.get('/registro-padre', (req, res) => {
    res.render('registro-padre', { titulo: 'Registro de Padre/Madre' });
});

app.get('/aviso-privacidad', (req, res) => {
    res.render('aviso-privacidad', {
        titulo: 'Aviso de Privacidad - RGPD'
    });
});

app.post('/consentimiento', (req, res) => {
    const { aceptar } = req.body;
    
    if (aceptar === 'true') {
        res.cookie('consentimiento', 'true', {
            maxAge: 30 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: 'strict'
        });
    }
    
    res.redirect('/');
});

// ============ API DE AUTENTICACIÓN (JWT) ============

/**
 * LOGIN DE USUARIOS (PADRES Y PROFESORES)
 */
app.post('/api/login', async (req, res) => {
    const { email, password, tipo } = req.body;
    
    try {
        console.log('🔐 Intento de login:', { email, tipo });
        
        // Buscar usuario en Firestore
        const userSnapshot = await db.collection(COLLECTIONS.USUARIOS)
            .where('email', '==', email)
            .where('tipo', '==', tipo)
            .limit(1)
            .get();
        
        if (userSnapshot.empty) {
            console.log('❌ Usuario no encontrado');
            res.locals.error = ['Credenciales incorrectas'];
            return res.redirect('/login?tipo=' + tipo);
        }
        
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        
        // Crear token JWT
        const token = jwt.sign(
            {
                uid: userData.uid,
                nombre: userData.nombre,
                nombreAlumno: userData.nombreAlumno || '',
                email: userData.email,
                tipo: userData.tipo,
                telefono: userData.telefono,
                curso: userData.curso
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Guardar token en cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 horas
        });
        
        console.log('✅ Login exitoso:', userData.nombre);
        console.log('👤 Tipo de usuario:', userData.tipo);
        
        if (userData.tipo === 'profesor') {
            res.redirect('/profesor/dashboard');
        } else {
            res.redirect('/padre/profesores');
        }
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.locals.error = ['Error al iniciar sesión'];
        res.redirect('/login?tipo=' + tipo);
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

// ============ RUTAS DE PROFESOR ============

app.get('/profesor/dashboard', authMiddleware, profesorMiddleware, async (req, res) => {
    try {
        const profesorId = req.usuario.uid;
        
        console.log('📊 Cargando dashboard para profesor:', profesorId);
        
        // Obtener reservas del profesor
        const reservasSnapshot = await db.collection(COLLECTIONS.RESERVAS)
            .where('profesorId', '==', profesorId)
            .where('estado', '==', 'pendiente')
            .orderBy('fecha')
            .orderBy('hora')
            .get();
        
        const reservas = [];
        reservasSnapshot.forEach(doc => {
            reservas.push({ id: doc.id, ...doc.data() });
        });
        
        // Obtener horarios del profesor
        const horariosSnapshot = await db.collection(COLLECTIONS.HORARIOS)
            .where('profesorId', '==', profesorId)
            .where('activo', '==', true)
            .get();
        
        const horarios = [];
        horariosSnapshot.forEach(doc => {
            horarios.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('📊 Dashboard profesor - Reservas:', reservas.length, 'Horarios:', horarios.length);
        
        res.render('profesor/dashboard', {
            titulo: 'Panel del Profesor',
            reservas: reservas,
            horarios: horarios
        });
        
    } catch (error) {
        console.error('❌ Error en dashboard profesor:', error);
        res.locals.error = ['Error al cargar el dashboard'];
        res.redirect('/');
    }
});

// ... (el resto de rutas son iguales, cambiando req.session.usuario por req.usuario)

// ============ EXPORTAR PARA VERCEL ============
module.exports = app;
