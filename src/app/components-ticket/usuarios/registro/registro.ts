import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService, RegisterDTO } from '../../../services-ticket/ticket-service';

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

  registerDTO: RegisterDTO = {
    username: '',
    password: '',
    email: '',
    fullname: '',
    areaId: null
  };
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

  resetFormulario(): void {
    this.passwordTouched = false;
    this.registerDTO = {
      username: '',
      password: '',
      email: '',
      fullname: '',
      areaId: null
    };
  }

  onPasswordChange(): void {
    const pwd = this.registerDTO.password;
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

    if (!this.registerDTO.fullname || !this.registerDTO.username || !this.registerDTO.email || !this.registerDTO.password) {
      this.mostrarNotificacion('danger', 'Por favor completá todos los campos.');
      return;
    }

    if (!this.passwordValida) {
      this.mostrarNotificacion('danger', 'La contraseña no cumple con los requisitos.');
      return;
    }

    this.cargando = true;
    this.notificacion = null;
    this.service.Register(this.registerDTO).subscribe({
      next: (resultado: any) => {
        this.cargando = false;
        if (resultado.estado) {
          this.mostrarNotificacion('success', resultado.mensaje || 'Usuario registrado exitosamente. Revisá tu correo para confirmar la cuenta.');
          this.resetFormulario();
        } else {
          this.mostrarNotificacion('danger', resultado.mensaje || 'Error al registrar el usuario.');
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
