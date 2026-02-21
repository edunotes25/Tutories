/**
 * RUTAS PRINCIPALES - Vistas dinámicas
 * Genera las páginas HTML desde el servidor con EJS
 */

const express = require('express');
const router = express.Router();
const horariosController = require('../controllers/horariosController');
const reservasController = require('../controllers/reservasController');

// Middleware para verificar consentimiento RGPD
const verificarConsentimiento = (req, res, next) => {
    if (!req.cookies.consentimiento && req.path !== '/aviso-privacidad') {
        return res.redirect('/aviso-privacidad');
    }
    next();
};

// Página principal - Lista de profesores y horarios disponibles
router.get('/', verificarConsentimiento, (req, res) => {
    const profesores = horariosController.obtenerProfesores();
    const horarios = horariosController.obtenerHorariosDisponibles();
    
    res.render('index', {
        titulo: 'Sistema de Reservas de Tutorías',
        profesores: profesores,
        horarios: horarios,
        año: new Date().getFullYear(),
        usuario: req.session.usuario || null
    });
});

// Página de reservas para un profesor específico
router.get('/reservas/:profesorId', verificarConsentimiento, (req, res) => {
    const profesorId = req.params.profesorId;
    const profesor = horariosController.obtenerProfesorPorId(profesorId);
    
    if (!profesor) {
        return res.status(404).render('error', {
            mensaje: 'Profesor no encontrado',
            titulo: 'Error'
        });
    }
    
    const horariosProfesor = horariosController.obtenerHorariosProfesor(profesorId);
    const reservasExistentes = reservasController.obtenerReservasPorProfesor(profesorId);
    
    res.render('reservas', {
        titulo: `Reservas con ${profesor.nombre}`,
        profesor: profesor,
        horarios: horariosProfesor,
        reservas: reservasExistentes,
        año: new Date().getFullYear()
    });
});

// Página de confirmación de reserva
router.get('/confirmacion/:reservaId', verificarConsentimiento, (req, res) => {
    const reservaId = req.params.reservaId;
    const reserva = reservasController.obtenerReservaPorId(reservaId);
    
    if (!reserva) {
        return res.status(404).render('error', {
            mensaje: 'Reserva no encontrada',
            titulo: 'Error'
        });
    }
    
    res.render('confirmacion', {
        titulo: 'Reserva Confirmada',
        reserva: reserva,
        año: new Date().getFullYear()
    });
});

// Página de aviso de privacidad (RGPD)
router.get('/aviso-privacidad', (req, res) => {
    res.render('aviso-privacidad', {
        titulo: 'Aviso de Privacidad - RGPD',
        año: new Date().getFullYear()
    });
});

// Aceptar cookies/consentimiento RGPD
router.post('/consentimiento', (req, res) => {
    const { aceptar } = req.body;
    
    if (aceptar === 'true') {
        res.cookie('consentimiento', 'true', {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
            httpOnly: true,
            sameSite: 'strict'
        });
    }
    
    res.redirect('/');
});

module.exports = router;