/**
 * CONTROLADOR D'HORARIS
 * Gestiona els horaris disponibles dels professors
 * Dades precarregades per a demostració
 */

// Dades de professors (en producció vindrien d'una BD)
const professors = [
    {
        id: 'prof1',
        nom: 'Ana García',
        email: 'ana.garcia@colegio.edu',
        assignatures: ['Matemàtiques', 'Física'],
        horariBase: {
            dilluns: ['16:00', '17:00', '18:00'],
            dimarts: ['16:00', '17:00', '18:00'],
            dimecres: ['16:00', '17:00'],
            dijous: ['17:00', '18:00'],
            divendres: ['16:00', '17:00']
        }
    },
    {
        id: 'prof2',
        nom: 'Carlos Rodríguez',
        email: 'carlos.rodriguez@colegio.edu',
        assignatures: ['Llengua', 'Literatura'],
        horariBase: {
            dilluns: ['17:00', '18:00'],
            dimarts: ['16:00', '17:00'],
            dimecres: ['16:00', '17:00', '18:00'],
            dijous: ['16:00', '17:00'],
            divendres: ['17:00', '18:00']
        }
    },
    {
        id: 'prof3',
        nom: 'María López',
        email: 'maria.lopez@colegio.edu',
        assignatures: ['Anglès', 'Francès'],
        horariBase: {
            dilluns: ['16:00', '17:00'],
            dimarts: ['17:00', '18:00'],
            dimecres: ['16:00', '17:00'],
            dijous: ['16:00', '17:00', '18:00'],
            divendres: ['16:00']
        }
    },
    {
        id: 'prof4',
        nom: 'David Martínez',
        email: 'david.martinez@colegio.edu',
        assignatures: ['Història', 'Geografia'],
        horariBase: {
            dilluns: ['17:00', '18:00'],
            dimarts: ['16:00', '17:00'],
            dimecres: ['16:00'],
            dijous: ['16:00', '17:00'],
            divendres: ['16:00', '17:00', '18:00']
        }
    }
];

// Obtenir llista de tots els professors
const obtenirProfessors = () => {
    return professors.map(({ id, nom, assignatures }) => ({
        id,
        nom,
        assignatures
    }));
};

// Obtenir professor per ID
const obtenirProfessorPerId = (id) => {
    return professors.find(p => p.id === id);
};

// Obtenir horaris disponibles d'un professor per als propers dies
const obtenirHorarisProfessor = (professorId, dies = 5) => {
    const professor = obtenirProfessorPerId(professorId);
    if (!professor) return [];

    const horarisDisponibles = [];
    const avui = new Date();
    
    // Generar horaris per als propers 'dies' dies
    for (let i = 0; i < dies; i++) {
        const data = new Date(avui);
        data.setDate(avui.getDate() + i);
        
        const diaSetmana = getDiaSetmanaEnCatala(data);
        const horariDia = professor.horariBase[diaSetmana];
        
        if (horariDia && horariDia.length > 0) {
            horariDia.forEach(hora => {
                horarisDisponibles.push({
                    data: data.toISOString().split('T')[0],
                    dia: diaSetmana,
                    hora: hora,
                    disponible: true
                });
            });
        }
    }
    
    return horarisDisponibles;
};

// Obtenir tots els horaris disponibles (tots els professors)
const obtenirHorarisDisponibles = (dies = 5) => {
    let totsHoraris = [];
    
    professors.forEach(professor => {
        const horarisProfessor = obtenirHorarisProfessor(professor.id, dies);
        totsHoraris = [...totsHoraris, ...horarisProfessor];
    });
    
    return totsHoraris;
};

// Convertir data a dia de la setmana en català
const getDiaSetmanaEnCatala = (data) => {
    const dies = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
    return dies[data.getDay()];
};

module.exports = {
    obtenirProfessors,
    obtenirProfessorPerId,
    obtenirHorarisProfessor,
    obtenirHorarisDisponibles
};