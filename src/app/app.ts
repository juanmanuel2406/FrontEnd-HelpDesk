import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TicketService } from './services-ticket/ticket-service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App implements OnInit {
  estaLogueado: boolean = false;
  sidebarActiva: string = 'crear-ticket';
  usuario: string = '';
  mostrarInfoCuenta: boolean = false;
  userData: any = null;

  tickets: any[] = [];
  notificacion: { tipo: string; mensaje: string } | null = null;
  private timeoutId: any = null;

  createForm: any = { title: '', description: '', priority: 'medium' };
  editMode: boolean = false;
  editTicketId: number | null = null;
  tabTickets: string = 'enviados';

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router,
    private service: TicketService
  ) {}

  get esLanding(): boolean {
    return this.router.url === '/';
  }

  get inicialUsuario(): string {
    return this.usuario ? this.usuario.charAt(0).toUpperCase() : '?';
  }

  get token(): string {
    return sessionStorage.getItem('token') || '';
  }

  get ticketsVisibles(): any[] {
    return this.tickets.filter(t => !t.isDeleted);
  }

  get ticketsEnviados(): any[] {
    if (!this.userData) return [];
    return this.ticketsVisibles.filter(t => t.createdById === this.userData.userId);
  }

  get ticketsRecibidos(): any[] {
    if (!this.userData) return [];
    return this.ticketsVisibles.filter(t => t.assignedToId === this.userData.userId);
  }

  get totalEnviados(): number {
    return this.ticketsEnviados.length;
  }

  get completados(): number {
    return this.ticketsEnviados.filter(t => t.status === 'closed').length;
  }

  get progreso(): number {
    if (this.totalEnviados === 0) return 0;
    return Math.round((this.completados / this.totalEnviados) * 100);
  }

  ngOnInit(): void {
    this.verificarSesion();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => this.verificarSesion());
  }

  private verificarSesion(): void {
    this.estaLogueado = sessionStorage.getItem('logueado') === 'true';
    if (this.estaLogueado) {
      this.usuario = sessionStorage.getItem('usuario') || '';
      const raw = sessionStorage.getItem('userData');
      this.userData = raw ? JSON.parse(raw) : null;
      this.cargarTickets();
    }
    this.cdr.detectChanges();
  }

  cargarTickets(): void {
    if (!this.token) return;
    this.service.getTickets(this.token).subscribe({
      next: (data: any) => {
        this.tickets = data || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.tickets = [];
        this.cdr.detectChanges();
      }
    });
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

  resetForm(): void {
    this.createForm = { title: '', description: '', priority: 'medium' };
    this.editMode = false;
    this.editTicketId = null;
  }

  crearTicket(): void {
    if (!this.createForm.title || !this.createForm.description) {
      this.mostrarNotificacion('danger', 'Completá todos los campos obligatorios.');
      return;
    }
    const dto = {
      title: this.createForm.title.trim(),
      description: this.createForm.description.trim(),
      priority: this.createForm.priority
    };
    this.service.createTicket(dto, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          this.mostrarNotificacion('success', res.mensaje || 'Ticket creado correctamente.');
          this.resetForm();
          this.cargarTickets();
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al crear el ticket.');
        }
      },
      error: (err: any) => {
        const msg = err.error?.mensaje || err.error?.title || 'Error al conectar con el servidor.';
        this.mostrarNotificacion('danger', msg);
      }
    });
  }

  iniciarEdicion(ticket: any): void {
    this.createForm = {
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority
    };
    this.editMode = true;
    this.editTicketId = ticket.id;
    this.sidebarActiva = 'crear-ticket';
  }

  guardarEdicion(): void {
    if (!this.editTicketId) return;
    const dto = {
      title: this.createForm.title.trim(),
      description: this.createForm.description.trim(),
      priority: this.createForm.priority
    };
    this.service.updateTicket(this.editTicketId, dto, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          this.mostrarNotificacion('success', res.mensaje || 'Ticket actualizado correctamente.');
          this.resetForm();
          this.cargarTickets();
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al actualizar el ticket.');
        }
      },
      error: (err: any) => {
        const msg = err.error?.mensaje || err.error?.title || 'Error al conectar con el servidor.';
        this.mostrarNotificacion('danger', msg);
      }
    });
  }

  eliminarTicket(id: number): void {
    if (!confirm('¿Estás seguro de eliminar este ticket?')) return;
    this.service.deleteTicket(id, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          this.mostrarNotificacion('success', res.mensaje || 'Ticket eliminado correctamente.');
          this.cargarTickets();
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al eliminar el ticket.');
        }
      },
      error: (err: any) => {
        const msg = err.error?.mensaje || err.error?.title || 'Error al conectar con el servidor.';
        this.mostrarNotificacion('danger', msg);
      }
    });
  }

  toggleEstado(ticket: any): void {
    const nuevoStatus = ticket.status === 'closed' ? 'open' : 'closed';
    const dto = {
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: nuevoStatus
    };
    this.service.updateTicket(ticket.id, dto, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          ticket.status = nuevoStatus;
          this.mostrarNotificacion('success', nuevoStatus === 'closed' ? 'Ticket completado.' : 'Ticket reabierto.');
          this.cdr.detectChanges();
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al actualizar el estado.');
        }
      },
      error: (err: any) => {
        const msg = err.error?.mensaje || err.error?.title || 'Error al conectar con el servidor.';
        this.mostrarNotificacion('danger', msg);
      }
    });
  }

  estadoLabel(status: string): string {
    const map: any = { open: 'Pendiente', closed: 'Realizado', rejected: 'Rechazado' };
    return map[status] || status;
  }

  prioridadLabel(p: string): string {
    const map: any = { low: 'Baja', medium: 'Media', high: 'Alta' };
    return map[p] || p;
  }

  fechaLabel(f: string): string {
    if (!f) return '—';
    const d = new Date(f);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  cerrarSesion(): void {
    this.estaLogueado = false;
    this.sidebarActiva = 'crear-ticket';
    this.mostrarInfoCuenta = false;
    this.tickets = [];
    sessionStorage.removeItem('logueado');
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('token');
    this.router.navigate(['/login']);
    this.cdr.detectChanges();
  }

  scrollA(id: string): void {
    if (!this.esLanding) {
      this.router.navigate(['/']);
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }

  irARegistro(): void {
    this.router.navigate(['/registro']);
  }

  seleccionarOpcion(opcion: string): void {
    this.sidebarActiva = opcion;
    if (opcion === 'tus-tickets') {
      this.tabTickets = 'enviados';
    }
  }

  toggleInfoCuenta(event: Event): void {
    event.stopPropagation();
    this.mostrarInfoCuenta = !this.mostrarInfoCuenta;
  }

  cerrarInfoCuenta(): void {
    this.mostrarInfoCuenta = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.cerrarInfoCuenta();
  }
}
