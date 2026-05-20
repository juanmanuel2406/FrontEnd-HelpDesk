import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService } from '../../../services-ticket/ticket-service';

interface Usuario {
  username: string;
  password: string;
  email: string;
  fullname: string;
}

interface PasswordRequirement {
  key: string;
  label: string;
  valid: boolean;
}

@Component({
  selector: 'app-registro',
  standalone: false,
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro {

  usuario: Usuario = this.resetFormulario();
  notificacion: { tipo: string; mensaje: string } | null = null;
  cargando: boolean = false;

  passwordTouched: boolean = false;
  private timeoutId: any = null;

  passwordReqs: PasswordRequirement[] = [
    { key: 'length', label: 'Al menos 6 caracteres', valid: false },
    { key: 'upper', label: 'Al menos una mayúscula (A-Z)', valid: false },
    { key: 'lower', label: 'Al menos una minúscula (a-z)', valid: false },
    { key: 'digit', label: 'Al menos un número (0-9)', valid: false },
  ];

  constructor(private service: TicketService, private router: Router) {}

  private mostrarNotificacion(tipo: string, mensaje: string): void {
    this.notificacion = { tipo, mensaje };
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.notificacion = null, 5000);
  }

  resetFormulario(): Usuario {
    this.passwordTouched = false;
    return {
      username: '',
      password: '',
      email: '',
      fullname: ''
    };
  }

  onPasswordChange(): void {
    const pwd = this.usuario.password;
    this.passwordReqs[0].valid = pwd.length >= 6;
    this.passwordReqs[1].valid = /[A-Z]/.test(pwd);
    this.passwordReqs[2].valid = /[a-z]/.test(pwd);
    this.passwordReqs[3].valid = /\d/.test(pwd);
  }

  get passwordValida(): boolean {
    return this.passwordReqs.every(r => r.valid);
  }

  RegistrarUsuario(): void {
    this.passwordTouched = true;

    if (!this.usuario.fullname || !this.usuario.username || !this.usuario.email || !this.usuario.password) {
      this.mostrarNotificacion('danger', 'Por favor completá todos los campos.');
      return;
    }

    if (!this.passwordValida) {
      this.mostrarNotificacion('danger', 'La contraseña no cumple con los requisitos.');
      return;
    }

    this.cargando = true;
    this.notificacion = null;

    this.service.RegistrarUsuario(this.usuario).subscribe({
      next: (resultado: any) => {
        this.cargando = false;
        if (resultado.estado) {
          this.mostrarNotificacion('success', resultado.mensaje || 'Usuario registrado exitosamente. Revisá tu correo para confirmar la cuenta.');
          this.usuario = this.resetFormulario();
        } else {
          this.mostrarNotificacion('danger', resultado.mensaje || 'Error al registrar el usuario.');
        }
      },
      error: (error: any) => {
        this.cargando = false;
        console.error('Error al registrar', error);
        this.mostrarNotificacion('danger', 'Error al conectar con el servidor.');
      }
    });
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }
}
