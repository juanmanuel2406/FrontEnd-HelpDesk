import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { Login } from './components-ticket/usuarios/login/login';
import { Registro } from './components-ticket/usuarios/registro/registro';
import { OlvideContrasenia } from './components-ticket/usuarios/olvide-contrasenia/olvide-contrasenia';
import { ResetContrasenia } from './components-ticket/usuarios/reset-contrasenia/reset-contrasenia';
import { Landing } from './components-ticket/landing/landing';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', component: Landing },
  { path: 'login', component: Login },
  { path: 'registro', component: Registro },
  { path: 'olvide-contrasenia', component: OlvideContrasenia },
  { path: 'reset-contrasenia', component: ResetContrasenia },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {


 }
