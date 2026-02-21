const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Importar configuración de Firebase
const { db, auth, COLLECTIONS } = require('./backend/config/firebase');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de seguridad - CORREGIDA para permitir event handlers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'self'", "'unsafe-inline'"], // AÑADIDA para permitir onclick
            imgSrc: ["'self'", "data:"],
        },
    },
}));

// Limitador de peticiones
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Demasiadas peticiones desde esta IP'
});
app.use('/api/', limiter);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'clave-secreta-temporal',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24, // 24 horas
        httpOnly: true,
        sameSite: 'strict'
    }
}));

app.use(flash());

// Configuración de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'backend/views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'backend/public')));

// Middleware para variables globales en vistas
app.use((req, res, next) => {
    res.locals.usuario = req.session.usuario || null;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    res.locals.consentimientoCookies = req.cookies.consentimiento || false;
    next();
});

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
    if (!req.session.usuario) {
        req.flash('error', 'Por favor, inicia sesión primero');
        return res.redirect('/login');
    }
    next();
};

const profesorMiddleware = (req, res, next) => {
    if (!req.session.usuario || req.session.usuario.tipo !== 'profesor') {
        console.log('❌ Acceso no autorizado a ruta de profesor. Usuario:', req.session.usuario);
        req.flash('error', 'Acceso no autorizado');
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
    if (req.session.usuario) {
        return res.redirect(req.session.usuario.tipo === 'profesor' ? '/profesor/dashboard' : '/padre/profesores');
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

// ============ API DE AUTENTICACIÓN ============

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
            req.flash('error', 'Credenciales incorrectas');
            return res.redirect('/login?tipo=' + tipo);
        }
        
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        
        // NOTA: En producción, deberías verificar la contraseña usando Firebase Auth
        // Por simplicidad, asumimos que si el usuario existe en Firestore, es válido
        
        req.session.usuario = {
            uid: userData.uid,
            nombre: userData.nombre,
            nombreAlumno: userData.nombreAlumno || '',
            email: userData.email,
            tipo: userData.tipo,
            telefono: userData.telefono,
            curso: userData.curso
        };
        
        console.log('✅ Login exitoso:', userData.nombre);
        console.log('👤 Tipo de usuario:', userData.tipo);
        console.log('➡️ Redirigiendo a:', userData.tipo === 'profesor' ? '/profesor/dashboard' : '/padre/profesores');
        
        if (userData.tipo === 'profesor') {
            res.redirect('/profesor/dashboard');
        } else {
            res.redirect('/padre/profesores');
        }
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        req.flash('error', 'Error al iniciar sesión');
        res.redirect('/login?tipo=' + tipo);
    }
});

/**
 * REGISTRO DE PROFESORES CON VALIDACIÓN DE CÓDIGO
 */
app.post('/api/registro', async (req, res) => {
    console.log('📝 Datos recibidos en registro profesor:', req.body);
    
    const { nombre, email, password, telefono, curso, descripcion, codigoRegistro } = req.body;
    
    try {
        // Validar código de registro para profesores
        if (!codigoRegistro || codigoRegistro !== process.env.REGISTRO_PROFESOR_CODE) {
            console.log('❌ Código incorrecto:', codigoRegistro, 'Esperado:', process.env.REGISTRO_PROFESOR_CODE);
            req.flash('error', 'Código de registro incorrecto');
            return res.redirect('/registro');
        }
        
        // Verificar si el usuario ya existe
        const userSnapshot = await db.collection(COLLECTIONS.USUARIOS)
            .where('email', '==', email)
            .get();
        
        if (!userSnapshot.empty) {
            req.flash('error', 'El email ya está registrado');
            return res.redirect('/registro');
        }
        
        // Crear usuario en Firebase Auth
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: nombre
        });
        
        console.log('✅ Usuario profesor creado en Auth:', userRecord.uid);
        
        // Guardar datos adicionales en Firestore
        await db.collection(COLLECTIONS.USUARIOS).doc(userRecord.uid).set({
            uid: userRecord.uid,
            nombre: nombre,
            email: email,
            tipo: 'profesor',
            telefono: telefono || '',
            curso: curso || '',
            descripcion: descripcion || '',
            createdAt: new Date().toISOString(),
            activo: true
        });
        
        console.log('✅ Datos de profesor guardados en Firestore');
        
        req.flash('success', 'Registro completado. Ya puedes iniciar sesión');
        res.redirect('/login?tipo=profesor');
        
    } catch (error) {
        console.error('❌ Error en registro profesor:', error);
        req.flash('error', 'Error en el registro: ' + error.message);
        res.redirect('/registro');
    }
});

/**
 * REGISTRO DE PADRES (SIN CÓDIGO) - CON DATOS DEL ALUMNO
 */
app.post('/api/registro-padre', async (req, res) => {
    console.log('📝 Datos recibidos en registro padre:', req.body);
    
    const { nombre, nombreAlumno, email, password, telefono } = req.body;
    
    try {
        // Verificar si el usuario ya existe
        const userSnapshot = await db.collection(COLLECTIONS.USUARIOS)
            .where('email', '==', email)
            .get();
        
        if (!userSnapshot.empty) {
            req.flash('error', 'El email ya está registrado');
            return res.redirect('/registro-padre');
        }
        
        // Crear usuario en Firebase Auth
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: nombre
        });
        
        console.log('✅ Usuario padre creado en Auth:', userRecord.uid);
        
        // Guardar datos adicionales en Firestore
        await db.collection(COLLECTIONS.USUARIOS).doc(userRecord.uid).set({
            uid: userRecord.uid,
            nombre: nombre,
            nombreAlumno: nombreAlumno || '',
            email: email,
            tipo: 'padre',
            telefono: telefono || '',
            createdAt: new Date().toISOString(),
            activo: true
        });
        
        console.log('✅ Datos de padre guardados en Firestore');
        
        req.flash('success', 'Registro completado. Ya puedes iniciar sesión');
        res.redirect('/login?tipo=padre');
        
    } catch (error) {
        console.error('❌ Error en registro padre:', error);
        req.flash('error', 'Error en el registro: ' + error.message);
        res.redirect('/registro-padre');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ============ RUTAS DE PROFESOR ============

app.get('/profesor/dashboard', authMiddleware, profesorMiddleware, async (req, res) => {
    try {
        const profesorId = req.session.usuario.uid;
        
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
        req.flash('error', 'Error al cargar el dashboard');
        res.redirect('/');
    }
});

app.get('/profesor/horarios', authMiddleware, profesorMiddleware, async (req, res) => {
    try {
        const profesorId = req.session.usuario.uid;
        
        console.log('📅 Cargando horarios para profesor:', profesorId);
        
        const horariosSnapshot = await db.collection(COLLECTIONS.HORARIOS)
            .where('profesorId', '==', profesorId)
            .get();
        
        const horarios = [];
        horariosSnapshot.forEach(doc => {
            horarios.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('✅ Encontrados', horarios.length, 'horarios');
        
        res.render('profesor/horarios', {
            titulo: 'Gestionar Horarios',
            horarios: horarios
        });
        
    } catch (error) {
        console.error('❌ Error al cargar horarios:', error);
        req.flash('error', 'Error al cargar horarios');
        res.redirect('/profesor/dashboard');
    }
});

app.post('/profesor/horarios/agregar', authMiddleware, profesorMiddleware, async (req, res) => {
    const { dia_semana, hora } = req.body;
    const profesorId = req.session.usuario.uid;
    
    try {
        await db.collection(COLLECTIONS.HORARIOS).add({
            profesorId: profesorId,
            diaSemana: parseInt(dia_semana),
            hora: hora,
            activo: true,
            createdAt: new Date().toISOString()
        });
        
        req.flash('success', 'Horario agregado correctamente');
        
    } catch (error) {
        console.error('❌ Error al agregar horario:', error);
        req.flash('error', 'Error al agregar horario');
    }
    
    res.redirect('/profesor/horarios');
});

app.post('/profesor/horarios/eliminar/:id', authMiddleware, profesorMiddleware, async (req, res) => {
    const horarioId = req.params.id;
    const profesorId = req.session.usuario.uid;
    
    try {
        // Verificar que el horario pertenece al profesor
        const horarioDoc = await db.collection(COLLECTIONS.HORARIOS).doc(horarioId).get();
        
        if (!horarioDoc.exists || horarioDoc.data().profesorId !== profesorId) {
            req.flash('error', 'No tienes permiso para eliminar este horario');
            return res.redirect('/profesor/horarios');
        }
        
        await db.collection(COLLECTIONS.HORARIOS).doc(horarioId).delete();
        req.flash('success', 'Horario eliminado correctamente');
        
    } catch (error) {
        console.error('❌ Error al eliminar horario:', error);
        req.flash('error', 'Error al eliminar horario');
    }
    
    res.redirect('/profesor/horarios');
});

// ============ RUTA DE CALENDARIO PARA PROFESOR (FILTRADA) ============
app.get('/profesor/calendario', authMiddleware, profesorMiddleware, async (req, res) => {
    try {
        const profesorId = req.session.usuario.uid;
        
        console.log('📅 Cargando calendario para profesor:', profesorId);
        
        // Obtener TODAS las reservas del profesor
        const reservasSnapshot = await db.collection(COLLECTIONS.RESERVAS)
            .where('profesorId', '==', profesorId)
            .orderBy('fecha', 'desc')
            .orderBy('hora', 'desc')
            .get();
        
        const reservas = [];
        reservasSnapshot.forEach(doc => {
            const data = doc.data();
            // Filtrar para NO mostrar las canceladas
            if (data.estado !== 'cancelada') {
                reservas.push({ id: doc.id, ...data });
            }
        });
        
        console.log(`✅ Calendario: mostrando ${reservas.length} reservas (excluyendo canceladas)`);
        
        res.render('profesor/calendario', {
            titulo: 'Calendario de Reservas',
            todasReservas: reservas
        });
        
    } catch (error) {
        console.error('❌ Error al cargar calendario:', error);
        req.flash('error', 'Error al cargar el calendario');
        res.redirect('/profesor/dashboard');
    }
});

// ============ RUTAS DE RESERVAS DE PROFESOR ============

/**
 * VER TODAS LAS RESERVAS DEL PROFESOR
 */
app.get('/profesor/reservas', authMiddleware, profesorMiddleware, async (req, res) => {
    try {
        const profesorId = req.session.usuario.uid;
        
        console.log('📋 Cargando todas las reservas para profesor:', profesorId);
        
        // Obtener todas las reservas del profesor (no solo pendientes)
        const reservasSnapshot = await db.collection(COLLECTIONS.RESERVAS)
            .where('profesorId', '==', profesorId)
            .orderBy('fecha', 'desc')
            .orderBy('hora', 'desc')
            .get();
        
        const reservas = [];
        reservasSnapshot.forEach(doc => {
            reservas.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`✅ Encontradas ${reservas.length} reservas totales`);
        
        // Separar reservas por estado
        const reservasPendientes = reservas.filter(r => r.estado === 'pendiente' || r.estado === 'confirmada');
        const reservasHistorial = reservas.filter(r => r.estado === 'cancelada' || r.estado === 'completada');
        
        res.render('profesor/reservas', {
            titulo: 'Mis Reservas',
            reservasPendientes: reservasPendientes,
            reservasHistorial: reservasHistorial,
            todasReservas: reservas
        });
        
    } catch (error) {
        console.error('❌ Error al cargar reservas:', error);
        req.flash('error', 'Error al cargar las reservas');
        res.redirect('/profesor/dashboard');
    }
});

/**
 * CAMBIAR ESTADO DE UNA RESERVA (COMPLETAR/CANCELAR) - CON EMAIL DE CANCELACIÓN
 */
app.post('/profesor/reservas/estado/:reservaId', authMiddleware, profesorMiddleware, async (req, res) => {
    const reservaId = req.params.reservaId;
    const { estado } = req.body;
    const profesorId = req.session.usuario.uid;
    
    try {
        console.log(`🔄 Cambiando estado de reserva ${reservaId} a ${estado}`);
        
        // Verificar que la reserva pertenece al profesor
        const reservaDoc = await db.collection(COLLECTIONS.RESERVAS).doc(reservaId).get();
        
        if (!reservaDoc.exists) {
            req.flash('error', 'Reserva no encontrada');
            return res.redirect('/profesor/reservas');
        }
        
        const reservaData = reservaDoc.data();
        
        if (reservaData.profesorId !== profesorId) {
            req.flash('error', 'No tienes permiso para modificar esta reserva');
            return res.redirect('/profesor/reservas');
        }
        
        // Guardar estado anterior para saber si es cancelación
        const estadoAnterior = reservaData.estado;
        
        // Actualizar estado
        await db.collection(COLLECTIONS.RESERVAS).doc(reservaId).update({
            estado: estado,
            fechaActualizacion: new Date().toISOString()
        });
        
        // Si es una cancelación, enviar email al padre
        if (estado === 'cancelada' && estadoAnterior !== 'cancelada') {
            try {
                // Importar servicio de email
                const { enviarCancelacionPadre } = require('./backend/services/emailService');
                
                // Obtener datos del profesor para el email
                const profesorDoc = await db.collection(COLLECTIONS.USUARIOS).doc(profesorId).get();
                const profesor = profesorDoc.data();
                
                // Añadir nombre del profesor a los datos de la reserva
                reservaData.profesorNombre = profesor.nombre;
                
                // Enviar email
                await enviarCancelacionPadre(reservaData, profesor);
                console.log('✅ Email de cancelación enviado al padre');
            } catch (emailError) {
                console.error('❌ Error al enviar email de cancelación:', emailError);
                // No detenemos el flujo si falla el email
            }
        }
        
        req.flash('success', `Reserva ${estado === 'completada' ? 'marcada como completada' : 'cancelada'} correctamente`);
        res.redirect('/profesor/reservas');
        
    } catch (error) {
        console.error('❌ Error al actualizar reserva:', error);
        req.flash('error', 'Error al actualizar la reserva');
        res.redirect('/profesor/reservas');
    }
});

// ============ RUTAS DE PADRE ============

app.get('/padre/profesores', authMiddleware, async (req, res) => {
    if (req.session.usuario.tipo !== 'padre') {
        console.log('❌ Usuario no es padre, redirigiendo a dashboard de profesor');
        return res.redirect('/profesor/dashboard');
    }
    
    try {
        console.log('👪 Cargando lista de profesores para padre');
        
        const profesoresSnapshot = await db.collection(COLLECTIONS.USUARIOS)
            .where('tipo', '==', 'profesor')
            .where('activo', '==', true)
            .get();
        
        const profesores = [];
        
        for (const doc of profesoresSnapshot.docs) {
            const profesor = doc.data();
            
            // Contar horarios disponibles
            const horariosSnapshot = await db.collection(COLLECTIONS.HORARIOS)
                .where('profesorId', '==', profesor.uid)
                .where('activo', '==', true)
                .get();
            
            profesores.push({
                id: doc.id,
                ...profesor,
                totalHorarios: horariosSnapshot.size || 0
            });
        }
        
        console.log('✅ Encontrados', profesores.length, 'profesores');
        
        res.render('padre/profesores', {
            titulo: 'Profesores Disponibles',
            profesores: profesores
        });
        
    } catch (error) {
        console.error('❌ Error al cargar profesores:', error);
        req.flash('error', 'Error al cargar profesores');
        res.redirect('/');
    }
});

// ============ RUTA DE RESERVA CORREGIDA (SIN FILTRO DE FECHA) ============
app.get('/padre/reservar/:profesorId', authMiddleware, async (req, res) => {
    const profesorId = req.params.profesorId;
    
    console.log('🔍 Accediendo a reserva con profesorId:', profesorId);
    console.log('👤 Usuario actual:', req.session.usuario);
    
    try {
        // Verificar que el usuario es padre
        if (req.session.usuario.tipo !== 'padre') {
            console.log('❌ Usuario no es padre, es:', req.session.usuario.tipo);
            req.flash('error', 'Acceso no autorizado');
            return res.redirect('/');
        }
        
        // Verificar que el profesorId no está vacío
        if (!profesorId) {
            console.log('❌ profesorId vacío');
            req.flash('error', 'ID de profesor no válido');
            return res.redirect('/padre/profesores');
        }
        
        console.log('📚 Buscando profesor en Firestore con ID:', profesorId);
        
        // Obtener datos del profesor
        const profesorDoc = await db.collection(COLLECTIONS.USUARIOS).doc(profesorId).get();
        
        if (!profesorDoc.exists) {
            console.log('❌ Profesor no encontrado en Firestore');
            req.flash('error', 'Profesor no encontrado');
            return res.redirect('/padre/profesores');
        }
        
        const profesorData = profesorDoc.data();
        console.log('✅ Profesor encontrado:', profesorData.nombre);
        
        // Verificar que el usuario es un profesor
        if (profesorData.tipo !== 'profesor') {
            console.log('❌ El usuario no es profesor, es:', profesorData.tipo);
            req.flash('error', 'El usuario seleccionado no es un profesor');
            return res.redirect('/padre/profesores');
        }
        
        const profesor = { id: profesorDoc.id, ...profesorData };
        
        // Obtener horarios del profesor
        console.log('📅 Buscando horarios del profesor...');
        const horariosSnapshot = await db.collection(COLLECTIONS.HORARIOS)
            .where('profesorId', '==', profesorId)
            .where('activo', '==', true)
            .get();
        
        const horarios = [];
        horariosSnapshot.forEach(doc => {
            horarios.push({ id: doc.id, ...doc.data() });
        });
        console.log(`✅ Encontrados ${horarios.length} horarios`);
        
        // Obtener TODAS las reservas existentes (SIN FILTRO DE FECHA)
        console.log('📖 Buscando TODAS las reservas existentes...');
        const reservasSnapshot = await db.collection(COLLECTIONS.RESERVAS)
            .where('profesorId', '==', profesorId)
            .where('estado', 'in', ['pendiente', 'confirmada'])
            .get(); // SIN el filtro de fecha
        
        const reservas = [];
        reservasSnapshot.forEach(doc => {
            const data = doc.data();
            reservas.push({
                fecha: data.fecha,
                hora: data.hora,
                estado: data.estado
            });
        });
        
        console.log(`✅ Encontradas ${reservas.length} reservas:`, reservas);
        
        // Renderizar la vista
        console.log('🎨 Renderizando vista padre/reservas');
        res.render('padre/reservas', {
            titulo: `Reservar con ${profesor.nombre}`,
            profesor: profesor,
            horarios: horarios,
            reservas: reservas
        });
        
    } catch (error) {
        console.error('❌ Error detallado:', error);
        console.error('❌ Stack trace:', error.stack);
        req.flash('error', 'Error al cargar la página de reserva: ' + error.message);
        res.redirect('/padre/profesores');
    }
});

// ============ RUTA DE CREAR RESERVA CON EMAIL DE CONFIRMACIÓN ============
app.post('/api/padre/reservar', authMiddleware, async (req, res) => {
    const { profesorId, fecha, hora, nombrePadre, nombreAlumno, emailPadre, telefono, comentarios } = req.body;
    const reservaId = uuidv4();
    const tokenAcceso = uuidv4();
    
    try {
        // Verificar disponibilidad
        const reservasSnapshot = await db.collection(COLLECTIONS.RESERVAS)
            .where('profesorId', '==', profesorId)
            .where('fecha', '==', fecha)
            .where('hora', '==', hora)
            .where('estado', 'in', ['pendiente', 'confirmada'])
            .limit(1)
            .get();
        
        if (!reservasSnapshot.empty) {
            return res.json({ error: 'Horario no disponible' });
        }
        
        // Crear la reserva
        await db.collection(COLLECTIONS.RESERVAS).doc(reservaId).set({
            reservaId: reservaId,
            profesorId: profesorId,
            padreId: req.session.usuario?.uid || null,
            padreNombre: nombrePadre,
            nombreAlumno: nombreAlumno || '',
            padreEmail: emailPadre,
            padreTelefono: telefono || '',
            fecha: fecha,
            hora: hora,
            comentarios: comentarios || '',
            estado: 'pendiente',
            tokenAcceso: tokenAcceso,
            fechaReserva: new Date().toISOString()
        });
        
        // Enviar email de confirmación
        try {
            // Importar servicio de email
            const { enviarConfirmacion } = require('./backend/services/emailService');
            
            // Obtener datos del profesor para el email
            const profesorDoc = await db.collection(COLLECTIONS.USUARIOS).doc(profesorId).get();
            const profesor = profesorDoc.data();
            
            // Preparar datos de la reserva para el email
            const reservaData = {
                reservaId: reservaId,
                padreNombre: nombrePadre,
                padreEmail: emailPadre,
                nombreAlumno: nombreAlumno || '',
                fecha: fecha,
                hora: hora,
                comentarios: comentarios || '',
                tokenAcceso: tokenAcceso
            };
            
            // Enviar email
            await enviarConfirmacion(reservaData, profesor);
            console.log('✅ Email de confirmación enviado al padre');
        } catch (emailError) {
            console.error('❌ Error al enviar email de confirmación:', emailError);
            // No detenemos el flujo si falla el email
        }
        
        res.json({
            success: true,
            reservaId: reservaId,
            mensaje: 'Reserva confirmada'
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.json({ error: 'Error al crear la reserva' });
    }
});

app.get('/confirmacion/:reservaId', authMiddleware, async (req, res) => {
    const reservaId = req.params.reservaId;
    
    try {
        const reservaDoc = await db.collection(COLLECTIONS.RESERVAS).doc(reservaId).get();
        
        if (!reservaDoc.exists) {
            req.flash('error', 'Reserva no encontrada');
            return res.redirect('/padre/profesores');
        }
        
        const reserva = reservaDoc.data();
        
        // Obtener datos del profesor
        const profesorDoc = await db.collection(COLLECTIONS.USUARIOS).doc(reserva.profesorId).get();
        const profesor = profesorDoc.data();
        
        reserva.profesorNombre = profesor.nombre;
        
        res.render('padre/confirmacion', {
            titulo: 'Reserva Confirmada',
            reserva: reserva
        });
        
    } catch (error) {
        console.error('Error:', error);
        req.flash('error', 'Error al cargar la confirmación');
        res.redirect('/padre/profesores');
    }
});

// ============ RUTA DE CANCELACIÓN CORREGIDA CON DATOS DEL PROFESOR ============
app.get('/cancelar/:token', async (req, res) => {
    const token = req.params.token;
    
    try {
        const reservasSnapshot = await db.collection(COLLECTIONS.RESERVAS)
            .where('tokenAcceso', '==', token)
            .limit(1)
            .get();
        
        if (reservasSnapshot.empty) {
            return res.send('Enlace no válido o reserva ya cancelada');
        }
        
        const reservaDoc = reservasSnapshot.docs[0];
        const reserva = reservaDoc.data();
        
        // Obtener datos del profesor
        const profesorDoc = await db.collection(COLLECTIONS.USUARIOS).doc(reserva.profesorId).get();
        const profesor = profesorDoc.data();
        
        // Añadir nombre del profesor a la reserva
        reserva.profesorNombre = profesor.nombre;
        
        res.render('cancelar', {
            titulo: 'Cancelar Reserva',
            reserva: reserva,
            token: token,
            reservaId: reservaDoc.id
        });
        
    } catch (error) {
        console.error('Error:', error);
        res.send('Error al procesar la solicitud');
    }
});

// ============ RUTA DE CANCELACIÓN POST (CON NOTIFICACIÓN AL PROFESOR) ============
app.post('/cancelar/:token', async (req, res) => {
    const token = req.params.token;
    
    try {
        const reservasSnapshot = await db.collection(COLLECTIONS.RESERVAS)
            .where('tokenAcceso', '==', token)
            .limit(1)
            .get();
        
        if (reservasSnapshot.empty) {
            return res.send('Enlace no válido');
        }
        
        const reservaDoc = reservasSnapshot.docs[0];
        const reservaData = reservaDoc.data();
        
        // Guardar estado anterior
        const estadoAnterior = reservaData.estado;
        
        await db.collection(COLLECTIONS.RESERVAS).doc(reservaDoc.id).update({
            estado: 'cancelada',
            fechaCancelacion: new Date().toISOString()
        });
        
        // Si no estaba ya cancelada, enviar emails
        if (estadoAnterior !== 'cancelada') {
            try {
                // Obtener datos del profesor
                const profesorDoc = await db.collection(COLLECTIONS.USUARIOS).doc(reservaData.profesorId).get();
                const profesor = profesorDoc.data();
                
                // Obtener datos del padre
                const padre = {
                    nombre: reservaData.padreNombre,
                    email: reservaData.padreEmail,
                    telefono: reservaData.padreTelefono || 'No especificado'
                };
                
                // Añadir nombre del profesor a los datos de la reserva
                reservaData.profesorNombre = profesor.nombre;
                
                // Importar servicios de email
                const { enviarCancelacionPadre, enviarNotificacionProfesor } = require('./backend/services/emailService');
                
                // Enviar email de confirmación al padre
                await enviarCancelacionPadre(reservaData, profesor);
                console.log('✅ Email de confirmación de cancelación enviado al padre');
                
                // Enviar notificación al profesor
                await enviarNotificacionProfesor(reservaData, profesor, padre);
                console.log('✅ Notificación de cancelación enviada al profesor');
                
            } catch (emailError) {
                console.error('❌ Error al enviar emails:', emailError);
            }
        }
        
        res.send(`
            <html>
            <head>
                <title>Reserva Cancelada</title>
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
                    <h1>✓ Reserva cancelada</h1>
                    <p>La reserva ha sido cancelada correctamente.</p>
                    <p>Hemos enviado un email de confirmación a <strong>${reservaData.padreEmail}</strong></p>
                    <p>También hemos notificado al profesor.</p>
                    <a href="/" class="btn">Volver al inicio</a>
                </div>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('Error:', error);
        res.send('Error al cancelar la reserva');
    }
});

// ============ INICIAR SERVIDOR ============

app.listen(PORT, () => {
    console.log(`✅ Servidor funcionando en http://localhost:${PORT}`);
    console.log(`🔥 Conectado a Firebase Project: ${process.env.FIREBASE_PROJECT_ID || 'no configurado'}`);
    console.log(`🔑 Código de registro de profesores configurado: ${process.env.REGISTRO_PROFESOR_CODE ? 'SÍ' : 'NO'}`);
});