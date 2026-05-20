import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService } from '../../../services-ticket/ticket-service';

interface UserLoginDTO {
  username: string;
  password: string;
}

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, OnDestroy {

  loginDTO: UserLoginDTO = { username: '', password: '' };
  notificacion: { tipo: string; mensaje: string } | null = null;
  recordar: boolean = false;
  bloqueado: boolean = false;
  tiempoRestante: number = 0;
  private intervalId: any = null;
  private timeoutId: any = null;

  constructor(
    private service: TicketService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const isLogged = localStorage.getItem('isLogged');
    if (isLogged === 'True') {
      this.recordar = true;
      const savedEmail = localStorage.getItem('emailRecordado');
      const savedPass = localStorage.getItem('passRecordado');
      if (savedEmail) this.loginDTO.username = savedEmail;
      if (savedPass) this.loginDTO.password = savedPass;
    }
    this.verificarBloqueo();
  }

  ngOnDestroy(): void {
    this.detenerContador();
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }

  private verificarBloqueo(): void {
    const raw = localStorage.getItem('bloqueoHasta');
    if (!raw) return;
    const hasta = parseInt(raw, 10);
    const ahora = Date.now();
    if (hasta > ahora) {
      this.bloqueado = true;
      this.tiempoRestante = Math.ceil((hasta - ahora) / 1000);
      this.iniciarContador(hasta);
      this.cdr.detectChanges();
    } else {
      localStorage.removeItem('bloqueoHasta');
      localStorage.removeItem('intentosFallidos');
    }
  }

  private iniciarContador(hasta: number): void {
    this.detenerContador();
    this.intervalId = setInterval(() => {
      const ahora = Date.now();
      if (ahora >= hasta) {
        this.bloqueado = false;
        this.tiempoRestante = 0;
        localStorage.removeItem('bloqueoHasta');
        localStorage.removeItem('intentosFallidos');
        this.detenerContador();
      } else {
        this.tiempoRestante = Math.ceil((hasta - ahora) / 1000);
      }
      this.cdr.detectChanges();
    }, 1000);
  }

  private detenerContador(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private mostrarNotificacion(tipo: string, mensaje: string): void {
    this.notificacion = { tipo, mensaje };
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.notificacion = null;
      this.cdr.detectChanges();
    }, 5000);
    this.cdr.detectChanges();
  }

  Login(): void {
    if (this.bloqueado) return;

    if (!this.loginDTO.username || !this.loginDTO.password) {
      this.mostrarNotificacion('danger', 'Por favor ingresá usuario y contraseña.');
      return;
    }

    this.service.Login(this.loginDTO).subscribe({
      next: (resultado: any) => {
        if (resultado.estado) {
          if (this.recordar) {
            localStorage.setItem('isLogged', 'True');
            localStorage.setItem('emailRecordado', this.loginDTO.username);
            localStorage.setItem('passRecordado', this.loginDTO.password);
          } else {
            localStorage.removeItem('isLogged');
            localStorage.removeItem('emailRecordado');
            localStorage.removeItem('passRecordado');
          }
          localStorage.removeItem('bloqueoHasta');
          localStorage.removeItem('intentosFallidos');
          sessionStorage.setItem('logueado', 'true');
          sessionStorage.setItem('username', resultado.username || '');
          sessionStorage.setItem('userId', resultado.userId || '');
          sessionStorage.setItem('role', resultado.role || '');
          sessionStorage.setItem('token', resultado.token || '');
          this.router.navigate(['/']);

        } else {
          this.mostrarNotificacion('danger', resultado.mensaje || 'Credenciales incorrectas.');
          this.manejarFallo();
        }
      },
      error: (_err: any) => {
        this.mostrarNotificacion('danger', 'Error al conectar con el servidor.');
        this.manejarFallo();
      }
    });
  }

  private manejarFallo(): void {
    let intentos = parseInt(localStorage.getItem('intentosFallidos') || '0', 10);
    intentos++;
    localStorage.setItem('intentosFallidos', intentos.toString());

    if (intentos >= 3) {
      const bloqueoHasta = Date.now() + 3 * 60 * 1000;
      localStorage.setItem('bloqueoHasta', bloqueoHasta.toString());
      this.bloqueado = true;
      this.tiempoRestante = 180;
      this.iniciarContador(bloqueoHasta);
      this.mostrarNotificacion('warning', 'Demasiados intentos fallidos. Acceso bloqueado por 3 minutos.');
    }
    this.cdr.detectChanges();
  }

  olvideContrasenia(): void {
    this.router.navigate(['/olvide-contrasenia']);
  }

  get minutosBloqueo(): number {
    return Math.floor(this.tiempoRestante / 60);
  }

  get segundosBloqueo(): number {
    return this.tiempoRestante % 60;
  }

}
