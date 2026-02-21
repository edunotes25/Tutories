/* Añadir al final de styles.css */

/* Estilos para login */
.login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-color) 100%);
    padding: 20px;
}

.login-box {
    background: white;
    border-radius: 15px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    width: 100%;
    max-width: 450px;
    padding: 30px;
}

.login-header {
    text-align: center;
    margin-bottom: 30px;
}

.login-header i {
    font-size: 4rem;
    color: var(--primary-color);
    margin-bottom: 15px;
}

.login-header h2 {
    color: var(--gray-800);
    margin-bottom: 5px;
}

.login-header p {
    color: var(--gray-600);
    font-size: 0.9rem;
}

.login-tabs {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    border-bottom: 2px solid var(--gray-200);
    padding-bottom: 10px;
}

.tab-btn {
    flex: 1;
    padding: 10px;
    border: none;
    background: none;
    color: var(--gray-600);
    cursor: pointer;
    font-size: 1rem;
    transition: var(--transition);
}

.tab-btn.active {
    color: var(--primary-color);
    border-bottom: 2px solid var(--primary-color);
}

.login-form {
    display: none;
}

.login-form.active {
    display: block;
}

.btn-login {
    width: 100%;
    padding: 12px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 5px;
    font-size: 1rem;
    cursor: pointer;
    transition: var(--transition);
    margin-top: 20px;
}

.btn-login:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
}

.login-footer {
    text-align: center;
    margin-top: 20px;
}

.login-footer a {
    color: var(--primary-color);
    text-decoration: none;
    font-size: 0.9rem;
}

.login-back {
    text-align: center;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--gray-200);
}

.login-back a {
    color: var(--gray-600);
    text-decoration: none;
}

.password-hint {
    font-size: 0.8rem;
    color: var(--gray-500);
    margin-top: 5px;
}

/* Dashboard */
.dashboard-container {
    display: flex;
    min-height: 100vh;
    background: var(--gray-100);
}

.sidebar {
    width: 280px;
    background: white;
    box-shadow: 2px 0 10px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
    position: fixed;
    height: 100vh;
}

.sidebar-header {
    padding: 30px 20px;
    text-align: center;
    border-bottom: 1px solid var(--gray-200);
}

.sidebar-header i {
    font-size: 3rem;
    color: var(--primary-color);
    margin-bottom: 10px;
}

.profesor-info {
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 15px;
    border-bottom: 1px solid var(--gray-200);
}

.profesor-avatar i {
    font-size: 2.5rem;
    color: var(--gray-500);
}

.profesor-detalles h4 {
    margin: 0;
    color: var(--gray-800);
}

.profesor-detalles p {
    margin: 5px 0 0;
    color: var(--gray-600);
    font-size: 0.9rem;
}

.sidebar-nav {
    flex: 1;
    padding: 20px 0;
}

.sidebar-nav a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    color: var(--gray-700);
    text-decoration: none;
    transition: var(--transition);
}

.sidebar-nav a:hover {
    background: var(--gray-100);
    color: var(--primary-color);
}

.sidebar-nav a.active {
    background: var(--primary-color);
    color: white;
}

.sidebar-footer {
    padding: 20px;
    border-top: 1px solid var(--gray-200);
}

.btn-logout {
    width: 100%;
    padding: 10px;
    background: var(--gray-200);
    color: var(--gray-700);
    border: none;
    border-radius: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: var(--transition);
}

.btn-logout:hover {
    background: var(--gray-300);
}

.dashboard-main {
    flex: 1;
    margin-left: 280px;
    padding: 30px;
}

.dashboard-section {
    display: none;
}

.dashboard-section.active {
    display: block;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
}

.section-header h2 {
    color: var(--gray-800);
}

.section-header h2 i {
    margin-right: 10px;
    color: var(--primary-color);
}

.filtros select {
    padding: 8px 12px;
    border: 1px solid var(--gray-300);
    border-radius: 5px;
    background: white;
}

.reservas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
}

.reserva-card {
    background: white;
    border-radius: 10px;
    box-shadow: var(--shadow);
    overflow: hidden;
    transition: var(--transition);
}

.reserva-card:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow-lg);
}

.reserva-header {
    padding: 15px;
    background: var(--gray-100);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.reserva-header h4 {
    margin: 0;
    color: var(--gray-800);
}

.estado {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 600;
}

.estado.confirmada {
    background: #d4edda;
    color: #155724;
}

.estado.completada {
    background: #cce5ff;
    color: #004085;
}

.estado.cancelada {
    background: #f8d7da;
    color: #721c24;
}

.reserva-body {
    padding: 15px;
}

.reserva-body p {
    margin: 8px 0;
    color: var(--gray-700);
}

.reserva-body i {
    width: 20px;
    color: var(--primary-color);
    margin-right: 8px;
}

.reserva-footer {
    padding: 15px;
    background: var(--gray-100);
    display: flex;
    gap: 10px;
}

.btn-small {
    flex: 1;
    padding: 8px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: var(--transition);
}

.btn-small:first-child {
    background: var(--primary-color);
    color: white;
}

.btn-small:last-child {
    background: var(--gray-300);
    color: var(--gray-700);
}

.btn-small:hover {
    transform: translateY(-2px);
}

/* Horario config */
.horario-semana {
    background: white;
    border-radius: 10px;
    padding: 20px;
    margin-bottom: 20px;
}

.dias-semana {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 15px;
    margin-top: 15px;
}

.dia-card {
    background: var(--gray-100);
    padding: 15px;
    border-radius: 8px;
}

.dia-card h4 {
    margin: 0 0 10px;
    color: var(--gray-700);
}

.horas-checkbox {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.hora-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}

/* Asistente IA */
.ia-container {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
}

.ia-chat {
    background: white;
    border-radius: 10px;
    padding: 20px;
    height: 500px;
    display: flex;
    flex-direction: column;
}

.chat-messages {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 15px;
}

.message {
    display: flex;
    gap: 10px;
    margin-bottom: 15px;
}

.message.ia i {
    font-size: 1.5rem;
    color: var(--primary-color);
}

.message.user {
    justify-content: flex-end;
}

.message.user .message-content {
    background: var(--primary-color);
    color: white;
    padding: 10px 15px;
    border-radius: 15px 15px 0 15px;
    max-width: 70%;
}

.message.ia .message-content {
    background: var(--gray-100);
    padding: 10px 15px;
    border-radius: 15px 15px 15px 0;
    max-width: 70%;
}

.chat-input {
    display: flex;
    gap: 10px;
}

.chat-input input {
    flex: 1;
    padding: 10px;
    border: 1px solid var(--gray-300);
    border-radius: 5px;
}

.chat-input button {
    width: 40px;
    height: 40px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

.ia-sugerencias {
    background: white;
    border-radius: 10px;
    padding: 20px;
}

.ia-sugerencias h3 {
    margin: 0 0 15px;
    color: var(--gray-800);
}

.ia-sugerencias button {
    display: block;
    width: 100%;
    padding: 10px;
    margin-bottom: 10px;
    background: var(--gray-100);
    border: none;
    border-radius: 5px;
    cursor: pointer;
    text-align: left;
    transition: var(--transition);
}

.ia-sugerencias button:hover {
    background: var(--primary-light);
    color: white;
}

/* Análisis */
.analisis-container {
    display: grid;
    gap: 20px;
}

.analisis-card {
    background: white;
    border-radius: 10px;
    padding: 20px;
}

.estadisticas-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-top: 15px;
}

.stat-card {
    background: var(--gray-100);
    padding: 20px;
    border-radius: 8px;
    text-align: center;
}

.stat-number {
    display: block;
    font-size: 2rem;
    font-weight: bold;
    color: var(--primary-color);
    margin-bottom: 5px;
}

.stat-label {
    color: var(--gray-600);
    font-size: 0.9rem;
}

/* Perfil */
.perfil-container {
    background: white;
    border-radius: 10px;
    padding: 30px;
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 30px;
}

#perfilForm .form-group {
    margin-bottom: 20px;
}

#perfilForm label {
    display: block;
    margin-bottom: 5px;
    color: var(--gray-700);
    font-weight: 500;
}

#perfilForm input {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--gray-300);
    border-radius: 5px;
    background: var(--gray-100);
}

.stats {
    display: grid;
    gap: 15px;
    margin-top: 15px;
}

.stat-item {
    background: var(--gray-100);
    padding: 15px;
    border-radius: 8px;
    text-align: center;
}

/* Chat ayuda para padres */
.chat-ayuda {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
}

.chat-toggle {
    width: 60px;
    height: 60px;
    background: var(--primary-color);
    color: white;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    transition: var(--transition);
}

.chat-toggle:hover {
    transform: scale(1.1);
}

.chat-toggle i {
    font-size: 1.5rem;
}

.chat-toggle span {
    font-size: 0.7rem;
    margin-top: 2px;
}

.chat-window {
    position: absolute;
    bottom: 80px;
    right: 0;
    width: 350px;
    height: 500px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 5px 20px rgba(0,0,0,0.2);
    display: none;
    flex-direction: column;
    overflow: hidden;
}

.chat-window.active {
    display: flex;
}

.chat-header {
    padding: 15px;
    background: var(--primary-color);
    color: white;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.chat-header h3 {
    margin: 0;
    font-size: 1rem;
}

.chat-header h3 i {
    margin-right: 5px;
}

.chat-header button {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
}

/* Consejos */
.consejos-container {
    background: #fff3cd;
    border: 1px solid #ffeeba;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 20px;
    position: relative;
    animation: slideDown 0.3s ease;
}

.consejos-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
}

.consejos-header i {
    color: #856404;
    font-size: 1.2rem;
}

.consejos-header h3 {
    margin: 0;
    color: #856404;
    font-size: 1rem;
}

.consejos-header button {
    margin-left: auto;
    background: none;
    border: none;
    color: #856404;
    cursor: pointer;
    font-size: 1.2rem;
}

.consejos-list p {
    margin: 5px 0;
    color: #856404;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Responsive */
@media (max-width: 768px) {
    .sidebar {
        width: 100%;
        height: auto;
        position: relative;
    }
    
    .dashboard-main {
        margin-left: 0;
    }
    
    .dashboard-container {
        flex-direction: column;
    }
    
    .ia-container {
        grid-template-columns: 1fr;
    }
    
    .reservas-grid {
        grid-template-columns: 1fr;
    }
    
    .perfil-container {
        grid-template-columns: 1fr;
    }
}