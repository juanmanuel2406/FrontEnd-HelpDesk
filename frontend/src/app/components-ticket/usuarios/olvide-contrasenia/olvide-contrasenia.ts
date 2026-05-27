import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService } from '../../../services-ticket/ticket-service';

@Component({
  selector: 'app-olvide-contrasenia',
  standalone: false,
  templateUrl: './olvide-contrasenia.html',
  styleUrl: './olvide-contrasenia.css',
})
export class OlvideContrasenia {

  email: string = '';
  notificacion: { tipo: string; mensaje: string } | null = null;
  enviado: boolean = false;
  cargando: boolean = false;
  private timeoutId: any = null;

  constructor(private service: TicketService, private router: Router) {}

  private mostrarNotificacion(tipo: string, mensaje: string): void {
    this.notificacion = { tipo, mensaje };
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.notificacion = null, 5000);
  }

  enviar(): void {
    if (!this.email) {
      this.mostrarNotificacion('danger', 'Por favor ingresá tu correo electrónico.');
      return;
    }

    this.cargando = true;
    setTimeout(() => {
      this.cargando = false;
      this.enviado = true;
      this.mostrarNotificacion('success', 'Si el correo existe, recibirás instrucciones para recuperar tu contraseña.');
    }, 1500);
  }

  volver(): void {
    this.router.navigate(['/login']);
  }
}
