// Enviar notificació al professor específic
async function enviarNotificacioProfessor({ professorEmail, nomAlumne, data, hora, nomPare, emailPare, telefonPare }) {
    const mailOptions = {
        from: `"Sistema de Tutories" <${process.env.EMAIL_FROM}>`,
        to: professorEmail, // ← ARA VA AL CORREU DEL PROFESSOR
        subject: `📅 Nova tutoria - ${nomAlumne}`,
        html: this.generarEmailProfessor(professorEmail, nomAlumne, data, hora, nomPare, emailPare, telefonPare)
    };

    try {
        await this.transporter.sendMail(mailOptions);
        console.log(`📧 Notificació enviada a professor: ${professorEmail}`);
    } catch (error) {
        console.error('Error enviant notificació al professor:', error);
    }
}