class MenuFlows {
    constructor() {
        this.userSessions = new Map();
    }

    getMainMenu() {
        return `¡Hola! Gracias por comunicarte con Coach D. method.

Estamos listos para ayudarte en tu camino hacia el bienestar. Por favor, selecciona una opción del menú principal para comenzar.

**Menú Principal**

1. Información sobre planes y programas
2. Ayuda con pagos
3. Soporte técnico (Aplicación, cuenta o dispositivos)
4. Otros enlaces (Contacto, Ayuda general)

*Por favor, responde con el número de tu opción (1, 2, 3, o 4)*`;
    }

    async handleMessage(userMessage, userPhone) {
        const session = this.userSessions.get(userPhone) || { state: 'main_menu' };

        try {
            let response = '';
            
            switch (session.state) {
                case 'main_menu':
                    response = this.handleMainMenu(userMessage, session);
                    break;
                case 'plans_info':
                    response = this.handlePlansInfo(userMessage, session);
                    break;
                case 'payment_help':
                    response = this.handlePaymentHelp(userMessage, session);
                    break;
                case 'tech_support':
                    response = this.handleTechSupport(userMessage, session);
                    break;
                case 'app_navigation':
                    response = this.handleAppNavigation(userMessage, session);
                    break;
                default:
                    response = this.getMainMenu();
            }

            this.userSessions.set(userPhone, session);
            return response;

        } catch (error) {
            console.error('Error in handleMessage:', error);
            return "⚠️ Lo siento, ha ocurrido un error. Volviendo al menú principal.\n\n" + this.getMainMenu();
        }
    }

    handleMainMenu(userMessage, session) {
        const option = userMessage.trim();
        
        switch (option) {
            case '1':
                session.state = 'plans_info';
                return `¡Excelente! Para darte la información correcta, ¿ya has revisado nuestros folletos (brochures) informativos?

*1.* No, aún no los he visto
*2.* Sí, pero tengo más preguntas

*Responde con 1 o 2*`;

            case '2':
                session.state = 'payment_help';
                return `Entendido. Para ayudarte mejor con el proceso de pago, ¿has podido ver nuestro video tutorial sobre cómo completarlo?

*1.* No he visto el tutorial
*2.* Ya vi el tutorial, pero sigo con dudas

*Responde con 1 o 2*`;

            case '3':
                session.state = 'tech_support';
                return `Estamos para ayudarte con la parte técnica. Por favor, indícanos qué tipo de asistencia necesitas.

*1.* Ayuda conectando dispositivos
*2.* Ayuda sincronizando MyFitnessPal
*3.* Ayuda navegando la aplicación
*4.* Problemas para acceder a mi cuenta
*5.* Reportar un inconveniente / error

*Responde con el número de tu opción (1-5)*`;

            case '4':
                session.state = 'main_menu';
                return `Aquí tienes nuestros enlaces de interés:

* Pagina web: [WEBSITE_URL]
* Página de Contacto: [CONTACT_PAGE_URL]
* Centro de Ayuda: [HELP_CENTER_URL]

Para volver al menú principal, escribe *menú* o cualquier mensaje.`;

            default:
                return this.getMainMenu();
        }
    }

    handlePlansInfo(userMessage, session) {
        const option = userMessage.trim();
        
        switch (option) {
            case '1':
                session.state = 'main_menu';
                return `Entendido. Aquí tienes los detalles de nuestros servicios principales para que puedas revisarlos:

* Plan On-Demand: [ON_DEMAND_BROCHURE_URL]
* Programa Intensivo de Control de Peso: [WEIGHT_PROGRAM_BROCHURE_URL]

Tómate tu tiempo para leerlos. Si tienes dudas después, simplemente escribe "Ayuda".

Para volver al menú principal, escribe *menú* o cualquier mensaje.`;

            case '2':
                session.state = 'main_menu';
                return `Perfecto, por favor espera un momento y un asesor te atenderá para resolver todas tus dudas. 

⏳ *Transferencia a humano en proceso...*

Mientras esperas, puedes escribir cualquier mensaje para volver al menú principal.`;

            default:
                return `Por favor responde con:
*1.* No, aún no los he visto
*2.* Sí, pero tengo más preguntas`;
        }
    }

    handlePaymentHelp(userMessage, session) {
        const option = userMessage.trim();
        
        switch (option) {
            case '1':
                session.state = 'main_menu';
                return `¡No hay problema! Puedes ver el tutorial completo y realizar tu pago de forma segura en este enlace: [PAYMENT_TUTORIAL_URL]

Para volver al menú principal, escribe *menú* o cualquier mensaje.`;

            case '2':
                session.state = 'main_menu';
                return `Comprendo. Por favor espera un momento y un miembro del equipo te asistirá con el pago.

⏳ *Transferencia a humano en proceso...*

Mientras esperas, puedes escribir cualquier mensaje para volver al menú principal.`;

            default:
                return `Por favor responde con:
*1.* No he visto el tutorial
*2.* Ya vi el tutorial, pero sigo con dudas`;
        }
    }

    handleTechSupport(userMessage, session) {
        const option = userMessage.trim();
        
        switch (option) {
            case '1':
                session.state = 'main_menu';
                return `Puedes encontrar ayuda para conectar dispositivos en nuestro artículo de ayuda: [DEVICES_HELP_URL]

Para volver al menú principal, escribe *menú* o cualquier mensaje.`;

            case '2':
                session.state = 'main_menu';
                return `Aquí tienes la guía para sincronizar MyFitnessPal: [MYFITNESSPAL_SYNC_URL]

Para volver al menú principal, escribe *menú* o cualquier mensaje.`;

            case '3':
                session.state = 'app_navigation';
                return `Perfecto. Tenemos un video de demostración que explica cómo usar todas las funciones de la aplicación. ¿Ya lo has visto?

*1.* No he visto el video
*2.* Sí, pero necesito más ayuda

*Responde con 1 o 2*`;

            case '4':
                session.state = 'main_menu';
                return `Para problemas de acceso a tu cuenta, un agente te asistirá personalmente.

⏳ *Transferencia a humano en proceso...*

Mientras esperas, puedes escribir cualquier mensaje para volver al menú principal.`;

            case '5':
                session.state = 'main_menu';
                return `Para reportar un inconveniente o error, por favor visita: [REPORT_ISSUE_URL]

Para volver al menú principal, escribe *menú* o cualquier mensaje.`;

            default:
                return `Por favor responde con el número de tu opción (1-5):
*1.* Ayuda conectando dispositivos
*2.* Ayuda sincronizando MyFitnessPal
*3.* Ayuda navegando la aplicación
*4.* Problemas para acceder a mi cuenta
*5.* Reportar un inconveniente / error`;
        }
    }

    handleAppNavigation(userMessage, session) {
        const option = userMessage.trim();
        
        switch (option) {
            case '1':
                session.state = 'main_menu';
                return `Aquí tienes el video de demostración de la aplicación: [APP_DEMO_VIDEO_URL]

Después de verlo, si tienes más preguntas, escribe "Ayuda" para hablar con un agente.

Para volver al menú principal, escribe *menú* o cualquier mensaje.`;

            case '2':
                session.state = 'main_menu';
                return `Entendido. Un especialista te ayudará con la navegación de la aplicación.

⏳ *Transferencia a humano en proceso...*

Mientras esperas, puedes escribir cualquier mensaje para volver al menú principal.`;

            default:
                return `Por favor responde con:
*1.* No he visto el video
*2.* Sí, pero necesito más ayuda`;
        }
    }
}

module.exports = new MenuFlows();
module.exports.getMainMenu = module.exports.getMainMenu;
module.exports.handleMessage = module.exports.handleMessage;
