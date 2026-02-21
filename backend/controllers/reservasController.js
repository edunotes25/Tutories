/**
 * CONTROLADOR DE RESERVAS
 * Gestiona las reservas de forma temporal (en memoria y archivo temporal)
 * Cumple RGPD: datos se eliminan automáticamente
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Archivo temporal para persistencia entre reinicios (opcional)
const TEMP_FILE = path.join(__dirname, '../../data/reservas-temp.json');

// Almacenamiento en memoria
let reservas = [];

// Cargar reservas previas si existe archivo temporal
try {
    if (fs.existsSync(TEMP_FILE)) {
        const data = fs.readFileSync(TEMP_FILE, 'utf8');
        reservas = JSON.parse(data);
        console.log(`📂 Cargadas ${reservas.length} reservas temporales`);
    }
} catch (error) {
    console.error('Error al cargar reservas temporales:', error);
    reservas = [];
}

// Guardar reservas en archivo temporal (opcional)
const guardarEnArchivo = () => {
    try {
        const dir = path.dirname(TEMP_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(TEMP_FILE, JSON.stringify(reservas, null, 2));
    } catch (error) {
        console.error('Error al guardar reservas:', error);
    }
};

// Verificar disponibilidad de horario
const verificarDisponibilidad = (profesorId, fecha, hora) => {
    return !reservas.some(r => 
        r.profesorId === profesorId && 
        r.fecha === fecha && 
        r.hora === hora &&
        r.estado !== 'cancelada'
    );
};

// Guardar nueva reserva
const guardarReserva = (reserva) => {
    const nuevaReserva = {
        ...reserva,
        estado: 'confirmada',
        fechaCreacion: new Date().toISOString()
    };
    
    reservas.push(nuevaReserva);
    guardarEnArchivo();
    
    // Programar eliminación automática después de 24 horas
    setTimeout(() => {
        eliminarReservaAutomatica(nuevaReserva.id);
    }, 24 * 60 * 60 * 1000);
    
    return nuevaReserva;
};

// Eliminar reserva automáticamente (para RGPD)
const eliminarReservaAutomatica = (reservaId) => {
    const index = reservas.findIndex(r => r.id === reservaId);
    if (index !== -1) {
        const reservaEliminada = reservas[index];
        reservas.splice(index, 1);
        guardarEnArchivo();
        console.log(`🗑️ Reserva ${reservaId} eliminada automáticamente (RGPD)`);
    }
};

// Obtener reserva por ID
const obtenerReservaPorId = (id) => {
    return reservas.find(r => r.id === id);
};

// Obtener reservas por profesor
const obtenerReservasPorProfesor = (profesorId) => {
    return reservas.filter(r => r.profesorId === profesorId && r.estado === 'confirmada');
};

// Obtener reservas por profesor y fecha
const obtenerReservasPorProfesorYFecha = (profesorId, fecha) => {
    return reservas.filter(r => 
        r.profesorId === profesorId && 
        r.fecha === fecha && 
        r.estado === 'confirmada'
    );
};

// Obtener todas las reservas
const obtenerTodasLasReservas = () => {
    return reservas.filter(r => r.estado === 'confirmada');
};

// Cancelar reserva (mediante token)
const cancelarReserva = (token) => {
    const index = reservas.findIndex(r => r.tokenAcceso === token);
    
    if (index !== -1) {
        reservas[index].estado = 'cancelada';
        reservas[index].fechaCancelacion = new Date().toISOString();
        guardarEnArchivo();
        
        // Eliminar después de 1 hora (datos cancelados)
        setTimeout(() => {
            eliminarReservaAutomatica(reservas[index].id);
        }, 60 * 60 * 1000);
        
        return true;
    }
    
    return false;
};

// Exportar reservas a CSV (anonymized)
const exportarACSV = (reservasData) => {
    // Anonimizar datos para exportación (RGPD)
    const datosAnonimos = reservasData.map(r => ({
        'ID Reserva': r.id.substring(0, 8),
        'Profesor': r.profesorNombre,
        'Fecha': r.fecha,
        'Hora': r.hora,
        'Fecha Reserva': r.fechaReserva.split('T')[0],
        'Estado': r.estado
        // No incluimos datos personales del padre
    }));
    
    if (datosAnonimos.length === 0) return '';
    
    const headers = Object.keys(datosAnonimos[0]);
    const csvRows = [];
    
    csvRows.push(headers.join(','));
    
    for (const row of datosAnonimos) {
        const values = headers.map(header => {
            const val = row[header] || '';
            return `"${val.toString().replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
};

// Limpiar datos antiguos (para tareas programadas)
const limpiarDatosAntiguos = (horas = 24) => {
    const ahora = new Date();
    const limite = new Date(ahora.getTime() - (horas * 60 * 60 * 1000));
    
    const reservasAntiguas = reservas.filter(r => {
        const fechaReserva = new Date(r.fechaReserva);
        return fechaReserva < limite;
    });
    
    reservas = reservas.filter(r => {
        const fechaReserva = new Date(r.fechaReserva);
        return fechaReserva >= limite;
    });
    
    guardarEnArchivo();
    
    return reservasAntiguas.length;
};

module.exports = {
    verificarDisponibilidad,
    guardarReserva,
    obtenerReservaPorId,
    obtenerReservasPorProfesor,
    obtenerReservasPorProfesorYFecha,
    obtenerTodasLasReservas,
    cancelarReserva,
    exportarACSV,
    limpiarDatosAntiguos
};