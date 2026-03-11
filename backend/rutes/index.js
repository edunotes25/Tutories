/**
 * RUTES PRINCIPALS - Vistes dinàmiques
 * Genera les pàgines HTML des del servidor amb EJS
 */
require('dotenv').config();
const express = require('express');
const router = express.Router();
const horarisController = require('../controllers/horarisController');
const reservesController = require('../controllers/reservesController');

// Middleware per verificar consentiment RGPD
const verificarConsentiment = (req, res, next) => {
    if (!req.cookies.consentiment && req.path !== '/avis-privacitat') {
        return res.redirect('/avis-privacitat');
    }
    next();
};

// Pàgina principal - Llista de professors i horaris disponibles
router.get('/', verificarConsentiment, (req, res) => {
    const professors = horarisController.obtenirProfessors();
    const horaris = horarisController.obtenirHorarisDisponibles();
    
    res.render('index', {
        titol: 'Sistema de Reserves de Tutories',
        professors: professors,
        horaris: horaris,
        any: new Date().getFullYear(),
        usuari: req.session.usuari || null
    });
});

// Pàgina de reserves per a un professor específic
router.get('/reserves/:professorId', verificarConsentiment, (req, res) => {
    const professorId = req.params.professorId;
    const professor = horarisController.obtenirProfessorPerId(professorId);
    
    if (!professor) {
        return res.status(404).render('error', {
            missatge: 'Professor no trobat',
            titol: 'Error'
        });
    }
    
    const horarisProfessor = horarisController.obtenirHorarisProfessor(professorId);
    const reservesExistents = reservesController.obtenirReservesPerProfessor(professorId);
    
    res.render('reserves', {
        titol: `Reserves amb ${professor.nom}`,
        professor: professor,
        horaris: horarisProfessor,
        reserves: reservesExistents,
        any: new Date().getFullYear()
    });
});

// Pàgina de confirmació de reserva
router.get('/confirmacio/:reservaId', verificarConsentiment, (req, res) => {
    const reservaId = req.params.reservaId;
    const reserva = reservesController.obtenirReservaPerId(reservaId);
    
    if (!reserva) {
        return res.status(404).render('error', {
            missatge: 'Reserva no trobada',
            titol: 'Error'
        });
    }
    
    res.render('confirmacio', {
        titol: 'Reserva Confirmada',
        reserva: reserva,
        any: new Date().getFullYear()
    });
});

// Pàgina d'avís de privacitat (RGPD)
router.get('/avis-privacitat', (req, res) => {
    res.render('avis-privacitat', {
        titol: 'Avís de Privacitat - RGPD',
        any: new Date().getFullYear()
    });
});

// Acceptar cookies/consentiment RGPD
router.post('/consentiment', (req, res) => {
    const { acceptar } = req.body;
    
    if (acceptar === 'true') {
        res.cookie('consentiment', 'true', {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dies
            httpOnly: true,
            sameSite: 'strict'
        });
    }
    
    res.redirect('/');
});
// Aceptar cookies/consentimiento RGPD
router.post('/', (req, res) => {
    console.log('=== POST / recibido ===');
    console.log('Body:', req.body);
    console.log('Acceptar:', req.body.acceptar);
    
    const { acceptar } = req.body;
    
    if (acceptar === 'true') {
        console.log('✅ Estableciendo cookie consentiment');
        res.cookie('consentiment', 'true', {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
            httpOnly: true,
            sameSite: 'strict'
        });
    }
    
    console.log('🔄 Redirigiendo a /');
    res.redirect('/');
});
module.exports = router;