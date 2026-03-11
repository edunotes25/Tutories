/**
 * API REST - Per a operacions AJAX des del frontend
 * Totes les operacions són temporals (memòria/fitxers temporals)
 */

const express = require('express');
const router = express.Router();
const reservesController = require('../controllers/reservesController');
const horarisController = require('../controllers/horarisController');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const { v4: uuidv4 } = require('uuid');

// Verificar disponibilitat d'horari
router.post('/verificar-disponibilitat', (req, res) => {
    const { professorId, data, hora } = req.body;
    
    const disponible = reservesController.verificarDisponibilitat(professorId, data, hora);
    
    res.json({
        disponible: disponible,
        missatge: disponible ? 'Horari disponible' : 'Horari no disponible'
    });
});

// Crear nova reserva
router.post('/reserves', async (req, res) => {
    try {
        const { professorId, data, hora, nomPare, emailPare, telefon, comentaris, acceptaCondicions } = req.body;
        
        // Validar consentiment RGPD
        if (!acceptaCondicions) {
            return res.status(400).json({
                error: 'Heu d\'acceptar les condicions de privacitat'
            });
        }
        
        // Verificar disponibilitat novament
        if (!reservesController.verificarDisponibilitat(professorId, data, hora)) {
            return res.status(400).json({
                error: 'L\'horari seleccionat ja no està disponible'
            });
        }
        
        // Crear reserva temporal
        const reservaId = uuidv4();
        const professor = horarisController.obtenirProfessorPerId(professorId);
        
        const reserva = {
            id: reservaId,
            professorId,
            professorNom: professor.nom,
            data,
            hora,
            nomPare,
            emailPare,
            telefon,
            comentaris: comentaris || '',
            dataReserva: new Date().toISOString(),
            tokenAcces: uuidv4() // Per cancel·lar/modificar sense login
        };
        
        // Guardar reserva (temporal)
        reservesController.guardarReserva(reserva);
        
        // Generar PDF de confirmació
        const pdfBuffer = await pdfService.generarConfirmacio(reserva);
        
        // Enviar email amb confirmació i PDF
        try {
            await emailService.enviarConfirmacio(reserva, pdfBuffer);
        } catch (emailError) {
            console.error('Error en enviar email:', emailError);
            // Continuem encara que falli l'email, la reserva està feta
        }
        
        // Establir dades de sessió temporal
        req.session.ultimaReserva = reservaId;
        req.session.usuari = {
            nom: nomPare,
            email: emailPare
        };
        
        res.json({
            success: true,
            reservaId: reservaId,
            missatge: 'Reserva confirmada',
            dades: reserva
        });
        
    } catch (error) {
        console.error('Error en crear reserva:', error);
        res.status(500).json({
            error: 'Error en processar la reserva'
        });
    }
});

// Obtenir horaris disponibles per professor i data
router.get('/horaris-disponibles/:professorId/:data', (req, res) => {
    const { professorId, data } = req.params;
    
    const horaris = horarisController.obtenirHorarisProfessor(professorId);
    const reserves = reservesController.obtenirReservesPerProfessorIData(professorId, data);
    
    const horarisDisponibles = horaris.filter(horari => {
        return !reserves.some(reserva => reserva.hora === horari);
    });
    
    res.json({
        professorId,
        data,
        horarisDisponibles
    });
});

// Cancel·lar reserva (amb token)
router.post('/cancelar/:token', (req, res) => {
    const { token } = req.params;
    
    const cancelada = reservesController.cancelarReserva(token);
    
    if (cancelada) {
        res.json({
            success: true,
            missatge: 'Reserva cancel·lada correctament'
        });
    } else {
        res.status(404).json({
            error: 'Reserva no trobada o ja cancel·lada'
        });
    }
});

// Exportar reserves a CSV (protegit, només per a administradors)
router.get('/exportar-csv', (req, res) => {
    // En un sistema real, aquí hi hauria autenticació
    // Per simplicitat, generem CSV de reserves actuals
    
    const reserves = reservesController.obtenirTotesLesReserves();
    
    if (reserves.length === 0) {
        return res.status(404).json({ error: 'No hi ha reserves per exportar' });
    }
    
    const csvData = reservesController.exportarACSV(reserves);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reserves-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvData);
});

// Netejar dades antigues (tasca programada)
router.post('/netejar-dades-antigues', (req, res) => {
    // Aquesta ruta hauria d'estar protegida en producció
    const netejats = reservesController.netejarDadesAntigues(24); // 24 hores
    
    res.json({
        success: true,
        missatge: `Dades antigues eliminades: ${netejats} registres`
    });
});

module.exports = router;