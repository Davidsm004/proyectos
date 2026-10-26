# Liberty Project Pipeline

Sitio en GitHub Pages: https://davidsm004.github.io/proyectos/

Funciona igual que teleton-2026: no usa servicios externos. Los proyectos, comentarios, historial, usuarios y archivos se guardan **cifrados (AES-256)** en la rama `datos` de este repositorio. Solo quien tiene usuario y contraseña puede leerlos.

## Primer uso (una sola vez)
1. Crea un token en https://github.com/settings/personal-access-tokens/new → Repository access: *Only select* → `proyectos` → Permissions → *Contents: Read and write*.
2. Abre el sitio: aparece «Configuración inicial». Ingresa usuario administrador, contraseña y el token.
3. Entra con tu usuario y, en «Ingresar proyectos», importa el Excel de proyectos.

## Roles
Admin: todo + usuarios · Editor: crear/editar · Lector: solo ver (no recibe el token de escritura).

## Si vence el token
Crea uno nuevo y, como admin, menú del avatar → «Actualizar token de GitHub».
