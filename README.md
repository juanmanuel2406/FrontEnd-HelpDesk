# FrontEnd-HelpDesk

Sistema de HelpDesk con Angular + .NET.

## Estructura del proyecto

```
/
├── frontend/          → Aplicación Angular
├── backend/           → API .NET (Web API + models + services)
├── OBSERVACIONES_CAMBIOS.txt   → Detalle de errores y cambios realizados
└── README.md
```

## Frontend (Angular)

```bash
cd frontend
npm install
ng serve
```

## Backend (.NET)

```bash
cd backend
dotnet restore
dotnet run --project api.helpdesk
```
