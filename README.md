# 🤖 Torneos Dashboard (Minisumo App)

Una plataforma integral diseñada para la gestión, organización y visualización de torneos de robótica (con foco en categorías como Minisumo). Este dashboard permite a los organizadores administrar eventos en un calendario, gestionar los robots inscritos, visualizar estadísticas detalladas y manejar la logística del evento mediante la generación y validación de códigos QR.

🔗 **Demo/Producción:** [https://apex-robotics-qr.netlify.app/](https://apex-robotics-qr.netlify.app/)

---

## 🚀 Tecnologías Principales

Este proyecto está construido con un stack moderno, priorizando el rendimiento, la seguridad y una experiencia de usuario fluida:

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (App Router) usando [React 19](https://react.dev/).
- **Lenguaje:** TypeScript, para un código robusto y tipado estático.
- **Estilos y UI:** [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), `lucide-react` para iconos y `framer-motion` para animaciones fluidas e interactivas.
- **Gráficos:** [ECharts](https://echarts.apache.org/) (vía `echarts-for-react`) para visualización de datos y panel de estadísticas.

### Gestión de Estado y Datos
- **Server State:** [TanStack Query](https://tanstack.com/query) (`@tanstack/react-query`) para la sincronización y caché de datos del backend.
- **Client State:** [Zustand](https://zustand-demo.pmnd.rs/) para un manejo de estado global ligero y rápido.
- **Formularios:** [TanStack Form](https://tanstack.com/form) combinado con [Zod](https://zod.dev/) para validación estricta de esquemas.

### Backend y Base de Datos
- **BaaS (Backend as a Service):** [Supabase](https://supabase.com/) (`@supabase/supabase-js`). Funciona como la base de datos PostgreSQL principal, gestionando eventos, equipos y robots registrados.

### Utilidades Extra
- Generación de códigos QR con la librería `qrcode`, esencial para la logística del evento.
- Manejo de fechas con `date-fns` y `react-day-picker`.

---

## 🔒 Arquitectura de Seguridad y Acceso (Fase 2)

El dashboard cuenta con un control de acceso para los organizadores de los torneos:

- **Autenticación Basada en Tokens:** La autenticación de los organizadores utiliza *scopes* por token y sesiones emitidas por el servidor configuradas como `httpOnly` para prevenir ataques XSS.
- **Mutaciones Seguras:** Los endpoints para escribir (ej. `/api/torneos/secure-write`) validan estrictamente que la sesión tenga acceso únicamente a los torneos autorizados.
- **Almacenamiento Seguro:** Los tokens de organizador se persisten usando un hash criptográfico (`scrypt + salt`) en la tabla `public.organizer_tokens` de Supabase.
- **Revocación de Sesiones:** Las sesiones activas se registran en `public.organizer_sessions`, permitiendo invalidarlas o revocarlas de forma individual o global.

*(Nota: De forma transitoria existe un fallback legacy para el token de organizador maestro desde la variable de entorno `ORGANIZER_MODE_TOKEN`, pero este se desactiva automáticamente en cuanto se registra el primer token seguro en la base de datos).*

---

## 💻 Desarrollo Local

### Requisitos Previos
- Node.js (v18+)
- Gestor de paquetes (`npm`, `yarn`, `pnpm` o `bun`)
- Proyecto de Supabase configurado y enlazado.

### Instalación

1. Clona el repositorio e instala las dependencias:
   ```bash
   npm install
   ```

2. Configura tus variables de entorno en un archivo `.env` basándote en los requerimientos de la aplicación (URL de Supabase, keys, etc).

3. Sincroniza la base de datos (si estás usando migraciones locales de Supabase):
   ```bash
   npx supabase db push
   ```

4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación local corriendo.

---

> El código es nuestra herramienta, pero entender el porqué es nuestra responsabilidad. ¡Buen código! 🚀
