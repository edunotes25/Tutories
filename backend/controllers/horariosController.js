/**
 * CONTROLADOR DE HORARIOS
 * Gestiona los horarios disponibles de los profesores
 * Datos precargados para demostración
 */

// Datos de profesores (en producción vendrían de una BD)
const profesores = [
    {
        id: 'prof1',
        nombre: 'Ana García',
        email: 'ana.garcia@colegio.edu',
        asignaturas: ['Matemáticas', 'Física'],
        horarioBase: {
            lunes: ['16:00', '17:00', '18:00'],
            martes: ['16:00', '17:00', '18:00'],
            miércoles: ['16:00', '17:00'],
            jueves: ['17:00', '18:00'],
            viernes: ['16:00', '17:00']
        }
    },
    {
        id: 'prof2',
        nombre: 'Carlos Rodríguez',
        email: 'carlos.rodriguez@colegio.edu',
        asignaturas: ['Lengua', 'Literatura'],
        horarioBase: {
            lunes: ['17:00', '18:00'],
            martes: ['16:00', '17:00'],
            miércoles: ['16:00', '17:00', '18:00'],
            jueves: ['16:00', '17:00'],
            viernes: ['17:00', '18:00']
        }
    },
    {
        id: 'prof3',
        nombre: 'María López',
        email: 'maria.lopez@colegio.edu',
        asignaturas: ['Inglés', 'Francés'],
        horarioBase: {
            lunes: ['16:00', '17:00'],
            martes: ['17:00', '18:00'],
            miércoles: ['16:00', '17:00'],
            jueves: ['16:00', '17:00', '18:00'],
            viernes: ['16:00']
        }
    },
    {
        id: 'prof4',
        nombre: 'David Martínez',
        email: 'david.martinez@colegio.edu',
        asignaturas: ['Historia', 'Geografía'],
        horarioBase: {
            lunes: ['17:00', '18:00'],
            martes: ['16:00', '17:00'],
            miércoles: ['16:00'],
            jueves: ['16:00', '17:00'],
            viernes: ['16:00', '17:00', '18:00']
        }
    }
];

// Obtener lista de todos los profesores
const obtenerProfesores = () => {
    return profesores.map(({ id, nombre, asignaturas }) => ({
        id,
        nombre,
        asignaturas
    }));
};

// Obtener profesor por ID
const obtenerProfesorPorId = (id) => {
    return profesores.find(p => p.id === id);
};

// Obtener horarios disponibles de un profesor para los próximos días
const obtenerHorariosProfesor = (profesorId, dias = 5) => {
    const profesor = obtenerProfesorPorId(profesorId);
    if (!profesor) return [];

    const horariosDisponibles = [];
    const hoy = new Date();
    
    // Generar horarios para los próximos 'dias' días
    for (let i = 0; i < dias; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() + i);
        
        const diaSemana = getDiaSemanaEnEspanol(fecha);
        const horarioDia = profesor.horarioBase[diaSemana];
        
        if (horarioDia && horarioDia.length > 0) {
            horarioDia.forEach(hora => {
                horariosDisponibles.push({
                    fecha: fecha.toISOString().split('T')[0],
                    dia: diaSemana,
                    hora: hora,
                    disponible: true
                });
            });
        }
    }
    
    return horariosDisponibles;
};

// Obtener todos los horarios disponibles (todos los profesores)
const obtenerHorariosDisponibles = (dias = 5) => {
    let todosHorarios = [];
    
    profesores.forEach(profesor => {
        const horariosProfesor = obtenerHorariosProfesor(profesor.id, dias);
        todosHorarios = [...todosHorarios, ...horariosProfesor];
    });
    
    return todosHorarios;
};

// Convertir fecha a día de la semana en español
const getDiaSemanaEnEspanol = (fecha) => {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return dias[fecha.getDay()];
};

module.exports = {
    obtenerProfesores,
    obtenerProfesorPorId,
    obtenerHorariosProfesor,
    obtenerHorariosDisponibles
};