// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

// Middleware para verificar token JWT
const verificarToken = async (req, res, next) => {
    try {
        // Obtener token del header Authorization
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        // Si no hay token en header, intentar obtener de la sesión
        const sessionToken = req.session?.token;
        
        const tokenFinal = token || sessionToken;
        
        if (!tokenFinal) {
            return res.status(401).json({
                success: false,
                error: 'Token no proporcionado'
            });
        }

        // Verificar token con JWT
        const decoded = jwt.verify(tokenFinal, process.env.JWT_SECRET);
        
        // Verificar que el usuario existe en Firebase
        try {
            const user = await admin.auth().getUser(decoded.uid);
            
            // Añadir información del usuario a la request
            req.usuario = {
                uid: decoded.uid,
                email: decoded.email || user.email,
                nombre: decoded.nombre || user.displayName,
                asignatura: decoded.asignatura,
                profesor: user.customClaims?.profesor || decoded.profesor || true,
                admin: user.customClaims?.admin || decoded.admin || false
            };
            
            req.token = tokenFinal;
            
            next();
        } catch (firebaseError) {
            console.error('❌ Usuario no encontrado en Firebase:', firebaseError);
            return res.status(401).json({
                success: false,
                error: 'Usuario no válido'
            });
        }
        
    } catch (error) {
        console.error('❌ Error verificando token:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Token inválido'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expirado'
            });
        }
        
        return res.status(500).json({
            success: false,
            error: 'Error al verificar autenticación'
        });
    }
};

// Middleware para verificar que es profesor
const verificarProfesor = (req, res, next) => {
    if (!req.usuario) {
        return res.status(401).json({
            success: false,
            error: 'No autenticado'
        });
    }
    
    if (!req.usuario.profesor && !req.usuario.admin) {
        return res.status(403).json({
            success: false,
            error: 'Acceso denegado. Se requieren permisos de profesor'
        });
    }
    
    next();
};

// Middleware para verificar que es administrador
const verificarAdmin = (req, res, next) => {
    if (!req.usuario) {
        return res.status(401).json({
            success: false,
            error: 'No autenticado'
        });
    }
    
    if (!req.usuario.admin) {
        return res.status(403).json({
            success: false,
            error: 'Acceso denegado. Se requieren permisos de administrador'
        });
    }
    
    next();
};

// Middleware opcional (no falla si no hay token, solo añade info si existe)
const verificarTokenOpcional = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.usuario = decoded;
        }
        next();
    } catch (error) {
        // Si hay error, simplemente continuamos sin usuario
        next();
    }
};

// Middleware para verificar que el usuario tiene acceso a un recurso específico
const verificarAccesoRecurso = (req, res, next) => {
    const { profesorId } = req.params;
    
    if (!req.usuario) {
        return res.status(401).json({
            success: false,
            error: 'No autenticado'
        });
    }
    
    // Si es admin, puede acceder a todo
    if (req.usuario.admin) {
        return next();
    }
    
    // Si es profesor, solo puede acceder a sus propios recursos
    if (req.usuario.profesor && req.usuario.uid === profesorId) {
        return next();
    }
    
    return res.status(403).json({
        success: false,
        error: 'No tienes permiso para acceder a este recurso'
    });
};

module.exports = {
    verificarToken,
    verificarProfesor,
    verificarAdmin,
    verificarTokenOpcional,
    verificarAccesoRecurso
};