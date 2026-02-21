/**
 * API REST - Para operaciones AJAX desde el frontend
 * Todas las operaciones son temporales (memoria/archivos temporales)
 */

const express = require('express');
const router = express.Router();
const reservasController = require('../controllers/reservasController');
const horariosController = require('../controllers/horariosController');
const emailService = require('../services/emailService');
const pdfService = require('../services/pdfService');
const { v4: uuidv4 } = require('uuid');

// Verificar disponibilidad de horario
router.post('/verificar-disponibilidad', (req, res) => {
    const { profesorId, fecha, hora } = req.body;
    
    const disponible = reservasController.verificarDisponibilidad(profesorId, fecha, hora);
    
    res.json({
        disponible: disponible,
        mensaje: disponible ? 'Horario disponible' : 'Horario no disponible'
    });
});

// Crear nueva reserva
router.post('/reservas', async (req, res) => {
    try {
        const { profesorId, fecha, hora, nombrePadre, emailPadre, telefono, comentarios, aceptaCondiciones } = req.body;
        
        // Validar consentimiento RGPD
        if (!aceptaCondiciones) {
            return res.status(400).json({
                error: 'Debe aceptar las condiciones de privacidad'
            });
        }
        
        // Verificar disponibilidad nuevamente
        if (!reservasController.verificarDisponibilidad(profesorId, fecha, hora)) {
            return res.status(400).json({
                error: 'El horario seleccionado ya no está disponible'
            });
        }
        
        // Crear reserva temporal
        const reservaId = uuidv4();
        const profesor = horariosController.obtenerProfesorPorId(profesorId);
        
        const reserva = {
            id: reservaId,
            profesorId,
            profesorNombre: profesor.nombre,
            fecha,
            hora,
            nombrePadre,
            emailPadre,
            telefono,
            comentarios: comentarios || '',
            fechaReserva: new Date().toISOString(),
            tokenAcceso: uuidv4() // Para cancelar/modificar sin login
        };
        
        // Guardar reserva (temporal)
        reservasController.guardarReserva(reserva);
        
        // Generar PDF de confirmación
        const pdfBuffer = await pdfService.generarConfirmacion(reserva);
        
        // Enviar email con confirmación y PDF
        try {
            await emailService.enviarConfirmacion(reserva, pdfBuffer);
        } catch (emailError) {
            console.error('Error al enviar email:', emailError);
            // Continuamos aunque falle el email, la reserva está hecha
        }
        
        // Establecer datos de sesión temporal
        req.session.ultimaReserva = reservaId;
        req.session.usuario = {
            nombre: nombrePadre,
            email: emailPadre
        };
        
        res.json({
            success: true,
            reservaId: reservaId,
            mensaje: 'Reserva confirmada',
            datos: reserva
        });
        
    } catch (error) {
        console.error('Error al crear reserva:', error);
        res.status(500).json({
            error: 'Error al procesar la reserva'
        });
    }
});

// Obtener horarios disponibles por profesor y fecha
router.get('/horarios-disponibles/:profesorId/:fecha', (req, res) => {
    const { profesorId, fecha } = req.params;
    
    const horarios = horariosController.obtenerHorariosProfesor(profesorId);
    const reservas = reservasController.obtenerReservasPorProfesorYFecha(profesorId, fecha);
    
    const horariosDisponibles = horarios.filter(horario => {
        return !reservas.some(reserva => reserva.hora === horario);
    });
    
    res.json({
        profesorId,
        fecha,
        horariosDisponibles
    });
});

// Cancelar reserva (con token)
router.post('/cancelar/:token', (req, res) => {
    const { token } = req.params;
    
    const cancelada = reservasController.cancelarReserva(token);
    
    if (cancelada) {
        res.json({
            success: true,
            mensaje: 'Reserva cancelada correctamente'
        });
    } else {
        res.status(404).json({
            error: 'Reserva no encontrada o ya cancelada'
        });
    }
});

// Exportar reservas a CSV (protegido, solo para administradores)
router.get('/exportar-csv', (req, res) => {
    // En un sistema real, aquí habría autenticación
    // Por simplicidad, generamos CSV de reservas actuales
    
    const reservas = reservasController.obtenerTodasLasReservas();
    
    if (reservas.length === 0) {
        return res.status(404).json({ error: 'No hay reservas para exportar' });
    }
    
    const csvData = reservasController.exportarACSV(reservas);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reservas-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvData);
});

// Limpiar datos antiguos (tarea programada)
router.post('/limpiar-datos-antiguos', (req, res) => {
    // Esta ruta debería estar protegida en producción
    const limpiados = reservasController.limpiarDatosAntiguos(24); // 24 horas
    
    res.json({
        success: true,
        mensaje: `Datos antiguos eliminados: ${limpiados} registros`
    });
});

module.exports = router;