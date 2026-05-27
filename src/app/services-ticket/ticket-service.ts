import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TicketService {

  constructor(private http: HttpClient) { }

  urlUser = "https://localhost:7124/api/v1/User/"
  urlTicket = "https://localhost:7124/api/v1/Ticket/"

  private headers(token: string): { headers: HttpHeaders } {
    return { headers: new HttpHeaders({ 'Authorization': `Bearer ${token}` }) };
  }

  Login(obj: any) {
    return this.http.post(this.urlUser + "login", obj)
  }

  RegistrarUsuario(obj: any) {
    return this.http.post(this.urlUser + "register", obj)
  }

  getTickets(token: string) {
    return this.http.get(this.urlTicket, this.headers(token))
  }

  getTicketById(id: number, token: string) {
    return this.http.get(this.urlTicket + id, this.headers(token))
  }

  createTicket(dto: any, token: string) {
    return this.http.post(this.urlTicket, dto, this.headers(token))
  }

  updateTicket(id: number, dto: any, token: string) {
    return this.http.put(this.urlTicket + id, dto, this.headers(token))
  }

  deleteTicket(id: number, token: string) {
    return this.http.delete(this.urlTicket + id, this.headers(token))
  }
}
