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
  sidebarActiva: string = 'tus-tickets';
  usuario: string = '';
  mostrarDrawer: boolean = false;
  userData: any = null;
  rolUsuario: string = 'viewer';
  userTeamsList: any[] = [];

  tickets: any[] = [];
  notificacion: { tipo: string; mensaje: string } | null = null;
  private timeoutId: any = null;

  createForm: any = { title: '', description: '', priority: 'medium', teamId: null };
  editMode: boolean = false;
  editTicketId: number | null = null;
  tabTickets: string = 'enviados';

  ticketSeleccionado: any = null;
  ticketHistory: any[] = [];

  // === Mi Equipo ===
  tabEquipo: string = 'agentes';
  usuarios: any[] = [];
  teams: any[] = [];
  teamMembersMap: any = {};
  selectedTeamId: number | null = null;
  showInviteModal: boolean = false;
  inviteEmail: string = '';
  inviteTeamId: number | null = null;
  inviteRole: string = 'agent';
  showTeamModal: boolean = false;
  newTeamName: string = '';
  newTeamMemberIds: number[] = [];
  showAddMemberModal: boolean = false;
  addMemberUserId: number | null = null;

  // === Invitación pendiente ===
  invitacionPendiente: any = null;

  // === Notificaciones de asignación ===
  notificacionesAsignadas: any[] = [];
  mostrarPanelNotificaciones: boolean = false;
  notificacionesVistas: Set<number> = new Set();

  constructor(
    private cdr: ChangeDetectorRef,
    private router: Router,
    private service: TicketService
  ) {}

  get esLanding(): boolean {
    return this.router.url === '/';
  }

  get esAdmin(): boolean {
    return this.rolUsuario === 'admin';
  }

  get esAgent(): boolean {
    return this.rolUsuario === 'agent';
  }

  get esViewer(): boolean {
    return this.rolUsuario === 'viewer';
  }

  get puedeEditarBorrar(): boolean {
    return this.esAdmin || this.esAgent;
  }

  get puedeAsignarTicket(): boolean {
    return this.esAdmin || this.esAgent;
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
    const userId = this.userData.userId;
    const userTeamIds = this.obtenerTeamIdsUsuario();
    return this.ticketsVisibles.filter(t =>
      t.assignedToId === userId ||
      (userTeamIds.includes(t.teamId) && !t.assignedToId)
    );
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

  get notificacionesNoLeidas(): any[] {
    if (!this.userData) return [];
    return this.notificacionesAsignadas.filter(n => !this.notificacionesVistas.has(n.id));
  }

  private obtenerTeamIdsUsuario(): number[] {
    const ids: number[] = [];

    for (const teamId of Object.keys(this.teamMembersMap)) {
      const members = this.teamMembersMap[teamId] || [];
      if (members.some((m: any) => m.userId === this.userData?.userId || m.id === this.userData?.userId)) {
        ids.push(Number(teamId));
      }
    }

    if (this.userTeamsList && this.userTeamsList.length > 0) {
      for (const team of this.userTeamsList) {
        const tid = team.id || team.teamId;
        if (tid && !ids.includes(tid)) {
          ids.push(tid);
        }
      }
    }

    return ids;
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
      this.rolUsuario = (this.userData?.role || 'viewer').toLowerCase();
      this.cargarTickets();
      this.cargarUsuarios();
      this.cargarTeams();
      this.verificarInvitacionPendiente();
      this.cargarUserTeams();
    }
    this.cdr.detectChanges();
  }

  // === INVITACIÓN PENDIENTE (usuario invitado) ===
  verificarInvitacionPendiente(): void {
    if (!this.token) return;
    this.service.getMyPendingInvitation(this.token).subscribe({
      next: (res: any) => {
        this.invitacionPendiente = res?.invitacion || null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.invitacionPendiente = null;
      }
    });
  }

  aceptarInvitacion(): void {
    if (!this.invitacionPendiente?.id) return;
    this.service.respondInvitation(this.invitacionPendiente.id, true, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          this.mostrarNotificacion('success', 'Invitación aceptada. Bienvenido al equipo.');
          this.invitacionPendiente = null;
          this.cargarTeams();
        }
      },
      error: () => this.mostrarNotificacion('danger', 'Error al aceptar la invitación.')
    });
  }

  rechazarInvitacion(): void {
    if (!this.invitacionPendiente?.id) return;
    this.service.respondInvitation(this.invitacionPendiente.id, false, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          this.mostrarNotificacion('success', 'Invitación rechazada.');
          this.invitacionPendiente = null;
        }
      },
      error: () => this.mostrarNotificacion('danger', 'Error al rechazar la invitación.')
    });
  }

  // === USER TEAMS PARA DRAWER ===
  cargarUserTeams(): void {
    if (!this.userData?.userId || !this.token) return;
    this.service.getUserTeams(this.userData.userId, this.token).subscribe({
      next: (data: any) => {
        this.userTeamsList = data || [];
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  // === SIDE DRAWER ===
  toggleDrawer(event: Event): void {
    event.stopPropagation();
    this.mostrarDrawer = !this.mostrarDrawer;
    if (this.mostrarDrawer) {
      this.cargarUserTeams();
    }
    this.cdr.detectChanges();
  }

  cerrarDrawer(): void {
    this.mostrarDrawer = false;
    this.cdr.detectChanges();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrarDrawer();
  }

  // === TICKETS ===
  cargarTickets(): void {
    if (!this.token) return;
    this.service.getTickets(this.token).subscribe({
      next: (data: any) => {
        this.tickets = data || [];
        this.detectarNuevasAsignaciones();
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges()
    });
  }

  private detectarNuevasAsignaciones(): void {
    if (!this.userData) return;
    const userId = this.userData.userId;
    const vistos = this.leerVistosStorage();

    const misAsignados = this.ticketsVisibles.filter(t =>
      t.assignedToId === userId && !t.isDeleted
    );

    for (const t of misAsignados) {
      if (!vistos.has(t.id)) {
        const yaExiste = this.notificacionesAsignadas.some(n => n.id === t.id);
        if (!yaExiste) {
          this.notificacionesAsignadas.unshift({
            id: t.id,
            title: t.title,
            assignedByName: t.assignedToName || 'Sistema',
            createdAt: t.createdAt,
            priority: t.priority
          });
        }
      }
    }

    this.notificacionesAsignadas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (this.notificacionesAsignadas.length > 0) {
      const reciente = this.notificacionesAsignadas[0];
      if (!vistos.has(reciente.id)) {
        this.mostrarNotificacion('info', 'Nuevo ticket asignado: ' + reciente.title);
      }
    }
  }

  private leerVistosStorage(): Set<number> {
    try {
      const raw = sessionStorage.getItem('notificacionesVistas');
      return new Set<number>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set<number>();
    }
  }

  private guardarVistosStorage(): void {
    sessionStorage.setItem('notificacionesVistas', JSON.stringify(Array.from(this.notificacionesVistas)));
  }

  togglePanelNotificaciones(event: Event): void {
    event.stopPropagation();
    this.mostrarPanelNotificaciones = !this.mostrarPanelNotificaciones;
    if (!this.mostrarPanelNotificaciones) {
      this.marcarNotificacionesLeidas();
    }
    this.cdr.detectChanges();
  }

  marcarNotificacionesLeidas(): void {
    for (const n of this.notificacionesAsignadas) {
      this.notificacionesVistas.add(n.id);
    }
    this.guardarVistosStorage();
    this.cdr.detectChanges();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (this.mostrarPanelNotificaciones) {
      const target = event.target as HTMLElement;
      if (!target.closest('.notif-panel-wrapper') && !target.closest('.notif-bell-btn')) {
        this.mostrarPanelNotificaciones = false;
        this.marcarNotificacionesLeidas();
        this.cdr.detectChanges();
      }
    }
  }

  cargarUsuarios(): void {
    if (!this.token) return;
    this.service.getUsers(this.token).subscribe({
      next: (data: any) => {
        this.usuarios = data || [];
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  cargarTeams(): void {
    if (!this.token) return;
    this.service.getTeams(this.token).subscribe({
      next: (data: any) => {
        this.teams = data || [];
        this.teams.forEach(t => this.cargarTeamMembers(t.id));
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  cargarTeamMembers(teamId: number): void {
    this.service.getTeamMembers(teamId, this.token).subscribe({
      next: (data: any) => {
        this.teamMembersMap[teamId] = data || [];
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  getTeamMembers(teamId: number): any[] {
    return this.teamMembersMap[teamId] || [];
  }

  // === NOTIFICACIONES ===
  private mostrarNotificacion(tipo: string, mensaje: string): void {
    this.notificacion = { tipo, mensaje };
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.notificacion = null;
      this.cdr.detectChanges();
    }, 5000);
    this.cdr.detectChanges();
  }

  // === TICKET FORM ===
  resetForm(): void {
    this.createForm = { title: '', description: '', priority: 'medium', teamId: null };
    this.editMode = false;
    this.editTicketId = null;
    this.ticketSeleccionado = null;
    this.ticketHistory = [];
  }

  get miembrosDelAreaSeleccionada(): any[] {
    if (!this.createForm.teamId) return [];
    return this.getTeamMembers(this.createForm.teamId);
  }

  crearTicket(): void {
    if (!this.createForm.title || !this.createForm.description) {
      this.mostrarNotificacion('danger', 'Completá todos los campos obligatorios.');
      return;
    }
    const dto: any = {
      title: this.createForm.title.trim(),
      description: this.createForm.description.trim(),
      priority: this.createForm.priority
    };

    if (this.createForm.teamId) {
      dto.teamId = this.createForm.teamId;
    }

    if (this.puedeAsignarTicket && this.createForm.assignedToId) {
      dto.assignedToId = this.createForm.assignedToId;
    }

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
      priority: ticket.priority,
      teamId: ticket.teamId || null
    };
    this.editMode = true;
    this.editTicketId = ticket.id;
    this.ticketSeleccionado = ticket;
    this.cargarHistorialTicket(ticket.id);
    this.sidebarActiva = 'crear-ticket';
    this.cdr.detectChanges();
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
          this.tickets = this.tickets.filter(t => t.id !== id);
          this.mostrarNotificacion('success', res.mensaje || 'Ticket eliminado correctamente.');
          this.cdr.detectChanges();
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

  asignarTicket(ticket: any): void {
    if (!this.userData) return;
    this.service.assignTicket(ticket.id, this.userData.userId, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          ticket.assignedToId = this.userData.userId;
          this.notificacionesAsignadas.unshift({
            id: ticket.id,
            title: ticket.title,
            assignedByName: this.userData.fullname || this.userData.username,
            createdAt: new Date().toISOString(),
            priority: ticket.priority
          });
          this.mostrarNotificacion('success', 'Ticket #' + ticket.id + ' asignado correctamente.');
          this.cdr.detectChanges();
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al asignar el ticket.');
        }
      },
      error: (err: any) => {
        const msg = err.error?.mensaje || err.error?.title || 'Error al conectar con el servidor.';
        this.mostrarNotificacion('danger', msg);
      }
    });
  }

  puedeAsignarTicketBtn(ticket: any): boolean {
    if (!this.userData || this.esViewer) return false;
    if (ticket.assignedToId) return false;
    const userTeamIds = this.obtenerTeamIdsUsuario();
    return userTeamIds.includes(ticket.teamId);
  }

  cargarHistorialTicket(ticketId: number): void {
    this.service.getTicketHistory(ticketId, this.token).subscribe({
      next: (data: any) => {
        this.ticketHistory = data || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.ticketHistory = [];
        this.cdr.detectChanges();
      }
    });
  }

  verHistorial(ticket: any): void {
    this.ticketSeleccionado = ticket;
    this.sidebarActiva = 'historial-ticket';
    this.service.getTicketHistory(ticket.id, this.token).subscribe({
      next: (data: any) => {
        this.ticketHistory = data || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.ticketHistory = [];
        this.cdr.detectChanges();
      }
    });
  }

  // === REFRESCO REACTIVO ===
  cambiarTabTickets(tab: string): void {
    this.tabTickets = tab;
    this.cargarTickets();
    this.cdr.detectChanges();
  }

  // === ROLES ===
  cambiarRol(userId: number, newRole: string): void {
    this.service.updateUserRole(userId, newRole, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          this.mostrarNotificacion('success', 'Rol actualizado correctamente.');
          this.cargarUsuarios();
        }
      },
      error: () => this.mostrarNotificacion('danger', 'Error al actualizar el rol.')
    });
  }

  // === DISPONIBILIDAD ===
  cambiarDisponibilidad(userId: number, newAvailability: string): void {
    if (!this.token) return;
    this.service.updateUserAvailability(userId, newAvailability, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          this.mostrarNotificacion('success', 'Disponibilidad actualizada.');
          this.cargarUsuarios();
        }
      },
      error: () => this.mostrarNotificacion('danger', 'Error al actualizar disponibilidad.')
    });
  }

  toggleMiDisponibilidad(): void {
    if (!this.userData) return;
    const nueva = this.userData.availability === 'available' ? 'busy' : 'available';
    this.service.updateUserAvailability(this.userData.userId, nueva, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          this.userData.availability = nueva;
          sessionStorage.setItem('userData', JSON.stringify(this.userData));
          this.mostrarNotificacion('success', nueva === 'available' ? 'Ahora aceptás tickets.' : 'Te marcaste como ocupado.');
          this.cargarUsuarios();
        }
      },
      error: () => this.mostrarNotificacion('danger', 'Error al actualizar disponibilidad.')
    });
  }

  // === INVITACIONES (Admin) ===
  abrirInviteModal(): void {
    this.inviteEmail = '';
    this.inviteTeamId = null;
    this.inviteRole = 'agent';
    this.showInviteModal = true;
  }

  cerrarInviteModal(): void {
    this.showInviteModal = false;
  }

  enviarInvitacion(): void {
    if (!this.inviteEmail) {
      this.mostrarNotificacion('danger', 'Ingresá un correo electrónico.');
      return;
    }
    this.service.inviteAgent(this.inviteEmail, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          if (this.inviteTeamId && res.userId) {
            this.service.addTeamMember(this.inviteTeamId, res.userId, this.token).subscribe({
              next: () => {
                this.mostrarNotificacion('success', 'Invitación enviada y asignada al equipo.');
                this.cerrarInviteModal();
                this.cargarUsuarios();
              },
              error: () => {
                this.mostrarNotificacion('success', 'Invitación enviada (error al asignar equipo).');
                this.cerrarInviteModal();
                this.cargarUsuarios();
              }
            });
          } else {
            this.mostrarNotificacion('success', 'Invitación enviada correctamente.');
            this.cerrarInviteModal();
            this.cargarUsuarios();
          }
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al enviar la invitación.');
        }
      },
      error: () => this.mostrarNotificacion('danger', 'Error al conectar con el servidor.')
    });
  }

  reenviarInvitacion(email: string): void {
    this.service.resendInvitation(email, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          this.mostrarNotificacion('success', 'Recordatorio enviado a ' + email);
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al reenviar.');
        }
      },
      error: () => this.mostrarNotificacion('danger', 'Error al conectar con el servidor.')
    });
  }

  // === TEAMS ===
  abrirTeamModal(): void {
    this.newTeamName = '';
    this.newTeamMemberIds = [];
    this.showTeamModal = true;
  }

  cerrarTeamModal(): void {
    this.showTeamModal = false;
    this.newTeamMemberIds = [];
  }

  toggleNewTeamMember(userId: number): void {
    const idx = this.newTeamMemberIds.indexOf(userId);
    if (idx >= 0) {
      this.newTeamMemberIds.splice(idx, 1);
    } else {
      this.newTeamMemberIds.push(userId);
    }
  }

  crearTeam(): void {
    if (!this.newTeamName) {
      this.mostrarNotificacion('danger', 'Ingresá un nombre para el equipo.');
      return;
    }
    this.service.createTeam({ name: this.newTeamName }, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          const teamId = res.id || res.teamId;
          if (teamId && this.newTeamMemberIds.length > 0) {
            let pendientes = this.newTeamMemberIds.length;
            for (const uid of this.newTeamMemberIds) {
              this.service.addTeamMember(teamId, uid, this.token).subscribe({
                next: () => {
                  pendientes--;
                  if (pendientes === 0) {
                    this.mostrarNotificacion('success', 'Equipo creado con miembros asignados.');
                    this.cerrarTeamModal();
                    this.cargarTeams();
                  }
                },
                error: () => {
                  pendientes--;
                  if (pendientes === 0) {
                    this.mostrarNotificacion('success', 'Equipo creado (algunos miembros no se pudieron asignar).');
                    this.cerrarTeamModal();
                    this.cargarTeams();
                  }
                }
              });
            }
          } else {
            this.mostrarNotificacion('success', 'Equipo creado correctamente.');
            this.cerrarTeamModal();
            this.cargarTeams();
          }
        } else {
          this.mostrarNotificacion('danger', res.mensaje || 'Error al crear el equipo.');
        }
      },
      error: () => this.mostrarNotificacion('danger', 'Error al conectar con el servidor.')
    });
  }

  abrirAddMemberModal(teamId: number): void {
    this.selectedTeamId = teamId;
    this.addMemberUserId = null;
    this.showAddMemberModal = true;
  }

  cerrarAddMemberModal(): void {
    this.showAddMemberModal = false;
    this.selectedTeamId = null;
  }

  agregarMiembroTeam(): void {
    if (!this.selectedTeamId || !this.addMemberUserId) {
      this.mostrarNotificacion('danger', 'Seleccioná un usuario.');
      return;
    }
    this.service.addTeamMember(this.selectedTeamId, this.addMemberUserId, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          this.mostrarNotificacion('success', 'Miembro agregado correctamente.');
          this.cerrarAddMemberModal();
          this.cargarTeamMembers(this.selectedTeamId!);
        }
      },
      error: () => this.mostrarNotificacion('danger', 'Error al agregar miembro.')
    });
  }

  quitarMiembroTeam(teamId: number, userId: number): void {
    if (!confirm('¿Quitar este miembro del equipo?')) return;
    this.service.removeTeamMember(teamId, userId, this.token).subscribe({
      next: (res: any) => {
        if (res.estado) {
          this.mostrarNotificacion('success', 'Miembro quitado del equipo.');
          this.cargarTeamMembers(teamId);
        }
      },
      error: () => this.mostrarNotificacion('danger', 'Error al quitar miembro.')
    });
  }

  // === LABELS ===
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

  // === AVATAR COLOR ===
  avatarColor(nombre: string): string {
    const colors = ['#d946ef', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    let hash = 0;
    for (let i = 0; i < (nombre || '').length; i++) {
      hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  inicialDe(nombre: string): string {
    return (nombre || '?').charAt(0).toUpperCase();
  }

  // === SESION ===
  cerrarSesion(): void {
    this.estaLogueado = false;
    this.sidebarActiva = 'tus-tickets';
    this.mostrarDrawer = false;
    this.tickets = [];
    this.usuarios = [];
    this.teams = [];
    this.teamMembersMap = {};
    this.ticketSeleccionado = null;
    this.ticketHistory = [];
    this.invitacionPendiente = null;
    this.notificacionesAsignadas = [];
    this.notificacionesVistas = new Set();
    this.mostrarPanelNotificaciones = false;
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
      this.cargarTickets();
    } else if (opcion === 'crear-ticket') {
      this.resetForm();
    } else if (opcion === 'mi-equipo') {
      this.cargarUsuarios();
      this.cargarTeams();
    } else if (opcion === 'historial-ticket') {
      // keep current ticketSeleccionado
    }
    this.cerrarDrawer();
    this.cdr.detectChanges();
  }
}
