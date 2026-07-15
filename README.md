# 🌿 Plantario

App PWA (instalable en el movil) para gestionar las plantas de casa entre dos personas:
identificacion automatica por foto, perfil de cuidados generado con IA, calendario de
riego/abono/poda, estadisticas, diagnostico de enfermedades/plagas e identificacion de
plantas silvestres.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind, como PWA (manifest + service worker)
- **Supabase**: base de datos Postgres, autenticacion y almacenamiento de fotos
- **PlantNet API**: identificacion de especies por foto
- **Perenual API**: datos de referencia de cuidados (se usan como apoyo)
- **Gemini API** (Google AI Studio, free tier): redaccion del perfil de cuidados completo,
  recomendaciones de mejora y remedios para enfermedades
- **Plant.id API**: diagnostico de enfermedades/plagas por foto

## 1. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql).
   Antes de ejecutarlo, sustituye los dos correos en la funcion `is_household_member()`
   por los vuestros.
3. Ve a **Authentication -> Providers -> Email** y, si quereis que solo vosotros dos podais
   registraros, desactivad "Allow new users to sign up" despues de crear las dos cuentas
   (o dejadlo activo, ya que las policies de la base de datos igualmente bloquean a
   cualquier otro correo).
4. Copia estos valores desde **Project Settings -> API**:
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` -> `SUPABASE_SERVICE_ROLE_KEY` (no se usa por ahora pero conviene tenerla)

## 2. Conseguir las API keys

| Servicio | Donde conseguirla | Coste |
|---|---|---|
| PlantNet | https://my.plantnet.org/ (ya la tienes: `plantnetkey`) | Gratis (uso no comercial) |
| Perenual | https://perenual.com/docs/api (ya la tienes: `perenualkey`) | Gratis (limite diario) |
| Plant.id | https://web.plant.id/ | Free tier limitado, luego de pago |
| Gemini | https://aistudio.google.com/app/apikey | Gratis mientras no actives facturacion |

## 3. Variables de entorno

Copia `.env.example` a `.env.local` y rellena todos los valores:

```bash
cp .env.example .env.local
```

`ALLOWED_EMAILS` debe contener los mismos dos correos que pusiste en `is_household_member()`
dentro de `supabase/schema.sql`, separados por coma.

## 4. Desarrollo local

```bash
npm install
npm run dev
```

Abre http://localhost:3000, crea las dos cuentas desde la pantalla de login (o desde el
dashboard de Supabase) y entra.

## 5. Desplegar en Vercel (para poder instalarla en el movil)

1. Sube este repositorio a GitHub (ya esta).
2. En [vercel.com](https://vercel.com), importa el repositorio.
3. Anade las mismas variables de entorno del paso 3 en **Project Settings -> Environment
   Variables**.
4. Despliega. Vercel da HTTPS automaticamente, necesario para que el navegador permita
   instalar la PWA.
5. En el movil, abre la URL con Chrome/Safari y usa "Anadir a pantalla de inicio"
   (Android) o "Compartir -> Anadir a pantalla de inicio" (iOS).

Nota: las claves que ya anadiste como *GitHub Secrets* (`plantnetkey`, `perenualkey`) solo
se usan dentro de GitHub Actions (CI), no llegan automaticamente a la app desplegada. Hay
que anadirlas tambien como variables de entorno en Vercel (paso 3) para que la app
funcione en produccion.

## Funcionalidades

1. **Foto -> perfil automatico**: identificacion con PlantNet + ficha de cuidados completa
   (riego, abono, poda, temperatura, reproduccion, mejora de floracion/fruto, toxicidad)
   generada con Gemini, usando Perenual como dato de apoyo cuando esta disponible.
   - Si cambias el nombre de la especie manualmente, se pregunta si quieres regenerar el
     perfil para la nueva especie.
2. **Calendario**: vista mensual con las tareas de riego/abono/poda de todas las plantas,
   calculadas a partir de la frecuencia de cada perfil. Tocar una tarea la marca como hecha.
3. **Estadisticas**: plantas por jardin, especies mas comunes, tareas completadas vs
   atrasadas, salud de las plantas segun diagnosticos.
4. **Propuestas de mejora**: recomendaciones generadas con IA por planta, basadas en su
   perfil y en el historial reciente de cuidados.
5. **Diagnostico de enfermedades**: foto -> Plant.id detecta plagas/enfermedades -> Gemini
   redacta remedios comerciales y caseros.
6. **Identificacion silvestre**: identifica cualquier planta/flor/arbol aunque no sea tuya,
   con opcion de anadirla a uno de tus jardines despues.
7. **Jardines**: las plantas se organizan y filtran por jardin (terraza, salon, exterior...).

## Posibles mejoras futuras

- Notificaciones push para avisar el dia que toca regar/abonar/podar (requiere configurar
  Web Push, algo mas de trabajo en iOS).
- Subir varias fotos por identificacion (hoja + flor) para mejorar la precision de PlantNet.
- Registro de fotos historicas por planta para ver su evolucion en el tiempo.
- Modo "lista de la compra de jardineria" (sustratos, macetas, productos) ligado a las
  recomendaciones generadas.
