/**
 * CONTROLADOR DE RESERVES
 * Gestiona les reserves de forma temporal (en memòria i fitxer temporal)
 * Compleix RGPD: les dades s'eliminen automàticament
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Fitxer temporal per a persistència entre reinicis (opcional)
const TEMP_FILE = path.join(__dirname, '../../data/reserves-temp.json');

// Emmagatzematge en memòria
let reserves = [];

// Carregar reserves prèvies si existeix fitxer temporal
try {
    if (fs.existsSync(TEMP_FILE)) {
        const data = fs.readFileSync(TEMP_FILE, 'utf8');
        reserves = JSON.parse(data);
        console.log(`📂 Carregades ${reserves.length} reserves temporals`);
    }
} catch (error) {
    console.error('Error en carregar reserves temporals:', error);
    reserves = [];
}

// Guardar reserves en fitxer temporal (opcional)
const guardarEnFitxer = () => {
    try {
        const dir = path.dirname(TEMP_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(TEMP_FILE, JSON.stringify(reserves, null, 2));
    } catch (error) {
        console.error('Error en guardar reserves:', error);
    }
};

// Verificar disponibilitat d'horari
const verificarDisponibilitat = (professorId, data, hora) => {
    return !reserves.some(r => 
        r.professorId === professorId && 
        r.data === data && 
        r.hora === hora &&
        r.estat !== 'cancel·lada'
    );
};

// Guardar nova reserva
const guardarReserva = (reserva) => {
    const novaReserva = {
        ...reserva,
        estat: 'confirmada',
        dataCreacio: new Date().toISOString()
    };
    
    reserves.push(novaReserva);
    guardarEnFitxer();
    
    // Programar eliminació automàtica després de 24 hores
    setTimeout(() => {
        eliminarReservaAutomatica(novaReserva.id);
    }, 24 * 60 * 60 * 1000);
    
    return novaReserva;
};

// Eliminar reserva automàticament (per RGPD)
const eliminarReservaAutomatica = (reservaId) => {
    const index = reserves.findIndex(r => r.id === reservaId);
    if (index !== -1) {
        const reservaEliminada = reserves[index];
        reserves.splice(index, 1);
        guardarEnFitxer();
        console.log(`🗑️ Reserva ${reservaId} eliminada automàticament (RGPD)`);
    }
};

// Obtenir reserva per ID
const obtenirReservaPerId = (id) => {
    return reserves.find(r => r.id === id);
};

// Obtenir reserves per professor
const obtenirReservesPerProfessor = (professorId) => {
    return reserves.filter(r => r.professorId === professorId && r.estat === 'confirmada');
};

// Obtenir reserves per professor i data
const obtenirReservesPerProfessorIData = (professorId, data) => {
    return reserves.filter(r => 
        r.professorId === professorId && 
        r.data === data && 
        r.estat === 'confirmada'
    );
};

// Obtenir totes les reserves
const obtenirTotesLesReserves = () => {
    return reserves.filter(r => r.estat === 'confirmada');
};

// Cancel·lar reserva (mitjançant token)
const cancelarReserva = (token) => {
    const index = reserves.findIndex(r => r.tokenAcces === token);
    
    if (index !== -1) {
        reserves[index].estat = 'cancel·lada';
        reserves[index].dataCancelacio = new Date().toISOString();
        guardarEnFitxer();
        
        // Eliminar després d'1 hora (dades cancel·lades)
        setTimeout(() => {
            eliminarReservaAutomatica(reserves[index].id);
        }, 60 * 60 * 1000);
        
        return true;
    }
    
    return false;
};

// Exportar reserves a CSV (anonimitzades)
const exportarACSV = (reservesData) => {
    // Anonimitzar dades per a exportació (RGPD)
    const dadesAnonimes = reservesData.map(r => ({
        'ID Reserva': r.id.substring(0, 8),
        'Professor': r.professorNom,
        'Data': r.data,
        'Hora': r.hora,
        'Data Reserva': r.dataReserva.split('T')[0],
        'Estat': r.estat
        // No incloem dades personals del pare/mare
    }));
    
    if (dadesAnonimes.length === 0) return '';
    
    const headers = Object.keys(dadesAnonimes[0]);
    const csvRows = [];
    
    csvRows.push(headers.join(','));
    
    for (const row of dadesAnonimes) {
        const values = headers.map(header => {
            const val = row[header] || '';
            return `"${val.toString().replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
};

// Netejar dades antigues (per a tasques programades)
const netejarDadesAntigues = (hores = 24) => {
    const ara = new Date();
    const limit = new Date(ara.getTime() - (hores * 60 * 60 * 1000));
    
    const reservesAntigues = reserves.filter(r => {
        const dataReserva = new Date(r.dataReserva);
        return dataReserva < limit;
    });
    
    reserves = reserves.filter(r => {
        const dataReserva = new Date(r.dataReserva);
        return dataReserva >= limit;
    });
    
    guardarEnFitxer();
    
    return reservesAntigues.length;
};

module.exports = {
    verificarDisponibilitat,
    guardarReserva,
    obtenirReservaPerId,
    obtenirReservesPerProfessor,
    obtenirReservesPerProfessorIData,
    obtenirTotesLesReserves,
    cancelarReserva,
    exportarACSV,
    netejarDadesAntigues
};