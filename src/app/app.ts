import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App implements OnInit {
  estaLogueado: boolean = false;
  mostrarDatosUsuario: boolean = false;
  selectedView: string = 'crear';

  get username(): string {
    return sessionStorage.getItem('username') || '';
  }

  get inicial(): string {
    const u = this.username;
    return u ? u.charAt(0).toUpperCase() : '?';
  }

  get userId(): string {
    return sessionStorage.getItem('userId') || '';
  }

  get role(): string {
    return sessionStorage.getItem('role') || '';
  }

  get colorAvatar(): string {
    const colores = [
      '#2563eb', '#7c3aed', '#db2777', '#dc2626',
      '#ea580c', '#ca8a04', '#16a34a', '#0891b2',
      '#4f46e5', '#c026d3', '#e11d48', '#f97316'
    ];
    let hash = 0;
    const u = this.username;
    for (let i = 0; i < u.length; i++) {
      hash = u.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colores[Math.abs(hash) % colores.length];
  }

  constructor(private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit(): void {
    this.verificarSesion();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.verificarSesion());
  }

  private verificarSesion(): void {
    this.estaLogueado = sessionStorage.getItem('logueado') === 'true';
    this.cdr.detectChanges();
  }

  irLogin(): void {
    this.router.navigate(['/login']);
  }

  irRegistro(): void {
    this.router.navigate(['/registro']);
  }

  cambiarVista(vista: string): void {
    this.selectedView = vista;
    this.mostrarDatosUsuario = false;
  }

  toggleDatosUsuario(): void {
    this.mostrarDatosUsuario = !this.mostrarDatosUsuario;
  }

  cerrarSesion(): void {
    this.estaLogueado = false;
    this.mostrarDatosUsuario = false;
    this.selectedView = 'crear';
    sessionStorage.removeItem('logueado');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('token');
    this.router.navigate(['/']);
    this.cdr.detectChanges();
  }
}
