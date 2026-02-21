// Enviar notificación al profesor específico
async enviarNotificacionProfesor({ profesorEmail, nombreAlumno, fecha, hora, nombrePadre, emailPadre, telefonoPadre }) {
    const mailOptions = {
        from: `"Sistema de Tutorías" <${process.env.EMAIL_FROM}>`,
        to: profesorEmail, // ← AHORA VA AL CORREO DEL PROFESOR
        subject: `📅 Nueva tutoría - ${nombreAlumno}`,
        html: this.generarEmailProfesor(profesorEmail, nombreAlumno, fecha, hora, nombrePadre, emailPadre, telefonoPadre)
    };

    try {
        await this.transporter.sendMail(mailOptions);
        console.log(`📧 Notificación enviada a profesor: ${profesorEmail}`);
    } catch (error) {
        console.error('Error enviando notificación al profesor:', error);
    }
}