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
    this.service.ForgotPassword({ email: this.email }).subscribe({
      next: (res: any) => {
        this.cargando = false;
        if (res.estado) {
          this.enviado = true;
          this.mostrarNotificacion('success', res.mensaje || 'Si el correo existe, recibirás instrucciones para recuperar tu contraseña.');
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al procesar la solicitud.');
        }
      },
      error: () => {
        this.cargando = false;
        this.mostrarNotificacion('danger', 'Error al conectar con el servidor.');
      }
    });
  }

  volver(): void {
    this.router.navigate(['/login']);
  }
}
