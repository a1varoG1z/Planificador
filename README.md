# 🌿 Plantario

App PWA (instalable en el movil) para gestionar las plantas de casa entre dos personas:
identificacion automatica por foto (con varias fotos por planta), perfil de cuidados
generado con IA, calendario de riego/abono/poda/replantacion, notificaciones push,
estadisticas, diagnostico de enfermedades/plagas, identificacion de plantas silvestres,
historial fotografico, jardines con plantas activas/inactivas y lista de la compra.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind, como PWA (manifest + service worker)
- **Supabase**: base de datos Postgres, autenticacion y almacenamiento de fotos
- **PlantNet API**: identificacion de especies por foto (admite varias fotos/organos)
- **Perenual API**: datos de referencia de cuidados (se usan como apoyo)
- **Gemini API** (Google AI Studio, free tier): redaccion del perfil de cuidados completo,
  recomendaciones de mejora, remedios para enfermedades y ciclo de vida/replantacion
- **Plant.id API**: diagnostico de enfermedades/plagas por foto
- **web-push**: notificaciones push nativas (VAPID), disparadas por un cron diario de Vercel

## 1. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql).
   Antes de ejecutarlo, sustituye los dos correos en la funcion `is_household_member()`
   por los vuestros. El archivo es idempotente: si ya lo habias ejecutado antes, puedes
   volver a pegarlo entero sin problema para traer las tablas nuevas.
3. Ve a **Authentication -> Providers -> Email** y, si quereis que solo vosotros dos podais
   registraros, desactivad "Allow new users to sign up" despues de crear las dos cuentas
   (o dejadlo activo, ya que las policies de la base de datos igualmente bloquean a
   cualquier otro correo).
4. Copia estos valores desde **Project Settings -> API**:
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` -> `SUPABASE_SERVICE_ROLE_KEY` (la usa el cron de notificaciones)

## 2. Conseguir las API keys

| Servicio | Donde conseguirla | Coste |
|---|---|---|
| PlantNet | https://my.plantnet.org/ | Gratis (uso no comercial) |
| Perenual | https://perenual.com/docs/api | Gratis (limite diario) |
| Plant.id | https://web.plant.id/ | Free tier limitado, luego de pago |
| Gemini | https://aistudio.google.com/app/apikey | Gratis mientras no actives facturacion |

## 3. Generar las claves VAPID (notificaciones push)

```bash
npx web-push generate-vapid-keys
```

Te da un `Public Key` y un `Private Key`. Van en `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y
`VAPID_PRIVATE_KEY` respectivamente.

## 4. Variables de entorno

Copia `.env.example` a `.env.local` y rellena todos los valores:

```bash
cp .env.example .env.local
```

`ALLOWED_EMAILS` debe contener los mismos dos correos que pusiste en `is_household_member()`
dentro de `supabase/schema.sql`, separados por coma. `CRON_SECRET` es una cadena aleatoria
que tu mismo inventas (protege el endpoint que dispara las notificaciones).

## 5. Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:3000, crea las dos cuentas desde la pantalla de login (o desde el
dashboard de Supabase) y entra.

## 6. Desplegar en Vercel (para poder instalarla en el movil)

1. Sube este repositorio a GitHub (ya esta).
2. En [vercel.com](https://vercel.com), importa el repositorio.
3. Anade todas las variables de entorno del paso 4 en **Project Settings -> Environment
   Variables** (incluye `SUPABASE_SERVICE_ROLE_KEY`, las VAPID y `CRON_SECRET`).
4. Despliega. Vercel da HTTPS automaticamente, necesario para PWA y para las notificaciones
   push, y activa automaticamente el cron diario definido en `vercel.json`
   (`/api/cron/notify`, todos los dias a las 8:00 UTC) porque Vercel firma sus peticiones
   de cron con el header `Authorization: Bearer $CRON_SECRET`.
5. En el movil, abre la URL con Chrome/Safari y usa "Anadir a pantalla de inicio"
   (Android) o "Compartir -> Anadir a pantalla de inicio" (iOS).
6. Dentro de la app, en la pestana Jardines, activa las notificaciones con el interruptor
   "🔔 Notificaciones" (hazlo en cada movil por separado).

## Funcionalidades

1. **Foto -> perfil automatico**: identificacion con PlantNet (una o varias fotos:
   hoja/flor/fruto/corteza) + ficha de cuidados completa (riego, abono, poda, temperatura,
   reproduccion, mejora de floracion/fruto, toxicidad, ciclo de vida) generada con Gemini,
   usando Perenual como dato de apoyo. Tambien se puede anadir una planta sin foto.
   - Si cambias el nombre de la especie manualmente, se pregunta si quieres regenerar el
     perfil para la nueva especie.
2. **Notificaciones**: aviso push diario (8:00 UTC) con las tareas de ese dia (riego, abono,
   poda, replantacion) y cuantas tienes atrasadas.
3. **Calendario**: vista mensual con las tareas de todas las plantas activas, calculadas a
   partir de la frecuencia de cada perfil, mas los recordatorios de replantacion. Tocar una
   tarea la marca como hecha.
4. **Historial fotografico**: cada planta guarda todas las fotos que le vayas anadiendo con
   fecha, para ver su evolucion.
5. **Lista de la compra**: pestana propia para apuntar sustratos, macetas, productos...
   Las recomendaciones de IA se pueden anadir a la lista con un toque.
6. **Plantas activas/inactivas**: puedes quitar una planta del jardin (borrado permanente) o
   marcarla como inactiva (ej. una tomatera fuera de temporada) sin perder su historial;
   las inactivas dejan de generar tareas y se muestran aparte, replegadas.
7. **Replantacion**: al marcar como inactiva una planta de ciclo anual o bienal (ej. tomate),
   se anade automaticamente un recordatorio en el calendario con la epoca recomendada para
   volver a plantarla; para plantas perennes (ej. ciclamen) no aplica. Desde el recordatorio
   puedes ir directo a "Plantar ahora", que rellena el formulario de alta con la especie.
8. **Estadisticas**: plantas activas/archivadas por jardin, especies mas comunes, tareas
   completadas vs atrasadas, salud de las plantas segun diagnosticos.
9. **Propuestas de mejora**: recomendaciones generadas con IA por planta, basadas en su
   perfil y en el historial reciente de cuidados.
10. **Diagnostico de enfermedades**: foto -> Plant.id detecta plagas/enfermedades -> Gemini
    redacta remedios comerciales y caseros.
11. **Identificacion silvestre**: identifica cualquier planta/flor/arbol aunque no sea tuya,
    con opcion de anadirla a uno de tus jardines despues.
12. **Jardines**: las plantas se organizan y filtran por jardin (terraza, salon, exterior...).

## Posibles mejoras futuras

- Historial de precios/proveedores en la lista de la compra.
- Exportar/compartir el perfil de una planta.
- Widget de "hoy toca" en la pantalla de inicio del movil (mas alla de la notificacion).
