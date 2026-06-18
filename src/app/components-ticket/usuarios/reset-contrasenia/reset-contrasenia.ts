import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { TicketService } from '../../../services-ticket/ticket-service';

@Component({
  selector: 'app-reset-contrasenia',
  standalone: false,
  templateUrl: './reset-contrasenia.html',
  styleUrl: './reset-contrasenia.css',
})
export class ResetContrasenia implements OnInit {

  email: string = '';
  token: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  notificacion: { tipo: string; mensaje: string } | null = null;
  cargando: boolean = false;
  exito: boolean = false;
  private timeoutId: any = null;

  constructor(
    private service: TicketService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      this.token = params['token'] || '';
    });
  }

  private mostrarNotificacion(tipo: string, mensaje: string): void {
    this.notificacion = { tipo, mensaje };
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.notificacion = null, 5000);
  }

  resetear(): void {
    if (!this.email || !this.token) {
      this.mostrarNotificacion('danger', 'Enlace inválido o expirado. Solicitá un nuevo restablecimiento.');
      return;
    }

    if (!this.newPassword || this.newPassword.length < 6) {
      this.mostrarNotificacion('danger', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.mostrarNotificacion('danger', 'Las contraseñas no coinciden.');
      return;
    }

    this.cargando = true;
    this.service.ResetPassword({
      email: this.email,
      token: this.token,
      newPassword: this.newPassword
    }).subscribe({
      next: (res: any) => {
        this.cargando = false;
        if (res.estado) {
          this.exito = true;
          this.mostrarNotificacion('success', res.mensaje || 'Contraseña restablecida correctamente.');
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al restablecer la contraseña.');
        }
      },
      error: () => {
        this.cargando = false;
        this.mostrarNotificacion('danger', 'Error al conectar con el servidor.');
      }
    });
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }
}
