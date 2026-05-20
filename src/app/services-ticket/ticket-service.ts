import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TicketService {

  constructor(private http:HttpClient){}

  url = "https://localhost:7124/api/v1/User/"

  Login(obj: any) {
    return this.http.post(this.url + "login", obj)
  }

  RegistrarUsuario(obj: any) {
    return this.http.post(this.url + "register", obj)
  }
}
