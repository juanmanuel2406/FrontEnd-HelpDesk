import { Component } from '@angular/core';

// Las propiedades del ticket deben coincidir exactamente con los nombres
// que devuelve la API (UserRegisterDTO / TicketDTO) en camelCase.
// Si la API cambia, actualizar estos nombres para evitar errores de mapeo.

@Component({
  selector: 'app-ticket-form',
  standalone: false,
  templateUrl: './ticket-form.html',
  styleUrl: './ticket-form.css'
})
export class TicketForm {

  areas: string[] = ['Tecnologia', 'Recursos Humanos', 'Finanzas', 'Logistica', 'Infraestructura'];

  niveles: string[] = ['Alta', 'Media', 'Baja'];

  ticket: any = {
    titulo: '',
    descripcion: '',
    area: '',
    nivel: 'Media',
    estado: 'Pendiente',
    asignado: ''
  };

  errorTitulo: string = '';

  get usuarioActual(): string {
    return sessionStorage.getItem('username') || '';
  }

  get mostrarAsignar(): boolean {
    return this.ticket.asignado !== '' && this.usuarioActual.toLowerCase() === this.ticket.asignado.toLowerCase();
  }

  crearTicket(): void {
    this.errorTitulo = '';

    if (!this.ticket.titulo.trim()) {
      this.errorTitulo = 'El titulo es obligatorio';
      return;
    }

    // TODO: completar con dato de la API — enviar payload a /api/v1/Ticket
    console.log('Ticket a crear:', this.ticket);
  }

  asignarTicket(): void {
    // TODO: completar con dato de la API — enviar asignacion a /api/v1/Ticket/asignar
    console.log('Asignar ticket a:', this.ticket.asignado);
  }
}
