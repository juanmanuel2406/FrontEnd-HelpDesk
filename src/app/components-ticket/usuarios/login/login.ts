import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService } from '../../../services-ticket/ticket-service';

interface LoginDTO {
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

  loginDTO: LoginDTO = { username: '', password: '' };
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

  private getCuentas(): { [u: string]: { intentos: number; bloqueoHasta: number | null } } {
    try {
      return JSON.parse(localStorage.getItem('cuentasBloqueadas') || '{}');
    } catch {
      return {};
    }
  }

  private guardarCuentas(cuentas: { [u: string]: { intentos: number; bloqueoHasta: number | null } }): void {
    localStorage.setItem('cuentasBloqueadas', JSON.stringify(cuentas));
  }

  verificarBloqueo(): void {
    const user = this.loginDTO.username;
    if (!user) {
      this.bloqueado = false;
      this.tiempoRestante = 0;
      this.detenerContador();
      this.cdr.detectChanges();
      return;
    }

    const cuentas = this.getCuentas();
    const data = cuentas[user];
    if (!data || !data.bloqueoHasta) {
      this.bloqueado = false;
      this.tiempoRestante = 0;
      this.detenerContador();
      this.cdr.detectChanges();
      return;
    }

    const ahora = Date.now();
    if (data.bloqueoHasta > ahora) {
      this.bloqueado = true;
      this.tiempoRestante = Math.ceil((data.bloqueoHasta - ahora) / 1000);
      this.iniciarContador(data.bloqueoHasta, user);
    } else {
      delete cuentas[user];
      this.guardarCuentas(cuentas);
      this.bloqueado = false;
      this.tiempoRestante = 0;
      this.detenerContador();
    }
    this.cdr.detectChanges();
  }

  private iniciarContador(hasta: number, usuario: string): void {
    this.detenerContador();
    this.intervalId = setInterval(() => {
      const ahora = Date.now();
      if (ahora >= hasta) {
        const cuentas = this.getCuentas();
        delete cuentas[usuario];
        this.guardarCuentas(cuentas);
        this.bloqueado = false;
        this.tiempoRestante = 0;
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


  
  private decodeToken(token: string): any {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
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
          const cuentas = this.getCuentas();
          delete cuentas[this.loginDTO.username];
          this.guardarCuentas(cuentas);
          if (this.recordar) {
            localStorage.setItem('isLogged', 'True');
            localStorage.setItem('emailRecordado', this.loginDTO.username);
            localStorage.setItem('passRecordado', this.loginDTO.password);
          } else {
            localStorage.removeItem('isLogged');
            localStorage.removeItem('emailRecordado');
            localStorage.removeItem('passRecordado');
          }
          sessionStorage.setItem('logueado', 'true');
          sessionStorage.setItem('usuario', this.loginDTO.username);
          if (resultado.token) {
            sessionStorage.setItem('token', resultado.token);
            const decoded = this.decodeToken(resultado.token);
            if (decoded) {
              const tokenRole = (decoded.role || decoded.rol || '').toLowerCase();
              const apiRole = (resultado.role || '').toLowerCase();
              if (tokenRole && apiRole && tokenRole !== apiRole) {
                console.warn('[JWT] Rol del token no coincide con el de la API. Usando rol del token.');
              }
              const finalRole = tokenRole || apiRole;
              resultado.role = finalRole;
            }
          }
          if (resultado.userId) {
            sessionStorage.setItem('userData', JSON.stringify({
              userId: resultado.userId,
              username: resultado.username,
              fullname: resultado.fullname,
              email: resultado.email,
              role: resultado.role,
              active: resultado.active,
              availability: resultado.availability || 'available'
            }));
          }
          this.router.navigate(['/']);
        } else {
          const msg = resultado.mensaje || 'Credenciales incorrectas.';
          this.mostrarNotificacion('danger', msg);
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
    const user = this.loginDTO.username;
    if (!user) return;

    const cuentas = this.getCuentas();
    const data = cuentas[user] || { intentos: 0, bloqueoHasta: null };
    data.intentos++;

    if (data.intentos >= 3) {
      data.bloqueoHasta = Date.now() + 3 * 60 * 1000;
      cuentas[user] = data;
      this.guardarCuentas(cuentas);
      this.bloqueado = true;
      this.tiempoRestante = 180;
      this.iniciarContador(data.bloqueoHasta, user);
      this.mostrarNotificacion('warning', `Cuenta "${user}" bloqueada por 3 minutos por demasiados intentos fallidos.`);
    } else {
      cuentas[user] = data;
      this.guardarCuentas(cuentas);
      this.mostrarNotificacion('warning', `Intento ${data.intentos} de 3. Tras 3 fallos la cuenta se bloqueará.`);
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
