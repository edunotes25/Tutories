// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    try {
        // Obtener token del header o de la sesión
        const token = req.headers.authorization?.split('Bearer ')[1] || req.session?.token;
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token no proporcionado'
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Añadir información del usuario a la request
        req.usuario = decoded;
        
        next();
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

module.exports = { verificarToken };