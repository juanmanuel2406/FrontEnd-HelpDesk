import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: false,
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  creadores = [
    'LAURA JOSEPHINE ZALTRON',
    'FRANCO JOSÉ CAUDELI',
    'JUAN MANUEL GONCALVES DE FARIA',
    'RODRIGO PÉREZ',
  ];

  caracteristicas = [
    {
      icono: 'bi-person-plus',
      titulo: 'Registro de Usuarios',
      descripcion: 'Creación de cuentas con validación de contraseña segura y recuperación por correo electrónico.',
    },
    {
      icono: 'bi-shield-lock',
      titulo: 'Autenticación Segura',
      descripcion: 'Inicio de sesión con protección contra intentos fallidos y bloqueo temporal de cuenta.',
    },
    {
      icono: 'bi-ticket-perforated',
      titulo: 'Gestión de Tickets',
      descripcion: 'Creación, asignación y seguimiento de tickets de soporte técnico en tiempo real.',
    },
    {
      icono: 'bi-people',
      titulo: 'Roles y Permisos',
      descripcion: 'Usuarios con diferentes niveles de acceso: administradores, técnicos y solicitantes.',
    },
    {
      icono: 'bi-bell',
      titulo: 'Notificaciones',
      descripcion: 'Alertas y notificaciones ante cambios de estado, nuevas asignaciones y vencimientos.',
    },
    {
      icono: 'bi-graph-up-arrow',
      titulo: 'Reportes y Estadísticas',
      descripcion: 'Paneles con métricas de rendimiento, tiempos de resolución y carga de trabajo.',
    },
  ];

  pasos = [
    { icono: 'bi-person-plus', titulo: '1. Registrate', descripcion: 'Creá tu cuenta con tus datos personales.' },
    { icono: 'bi-box-arrow-in-right', titulo: '2. Iniciá sesión', descripcion: 'Accedé con tu usuario y contraseña.' },
    { icono: 'bi-ticket-detailed', titulo: '3. Creá un ticket', descripcion: 'Describí tu solicitud o incidencia.' },
    { icono: 'bi-check2-circle', titulo: '4. Seguilo', descripcion: 'Dale seguimiento hasta su resolución.' },
  ];

  constructor(private router: Router) {}

  irALogin(): void {
    this.router.navigate(['/login']);
  }

  irARegistro(): void {
    this.router.navigate(['/registro']);
  }

  scrollA(id: string): void {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
