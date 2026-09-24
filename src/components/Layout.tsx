import { NavLink, Outlet } from 'react-router-dom'
import { Trophy, ClipboardList, Users, CalendarDays, UserRound, LogOut, Settings2, IdCard, MapPin, Layers } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROL_LABEL } from '../lib/formato'

const MENU = [
  { to: '/torneos', label: 'Torneos', icono: Trophy },
  { to: '/mis-inscripciones', label: 'Mis Inscripciones', icono: ClipboardList },
  { to: '/mis-parejas', label: 'Mis Parejas', icono: Users },
  { to: '/mis-torneos', label: 'Mis Torneos', icono: CalendarDays },
  { to: '/perfil', label: 'Perfil', icono: UserRound },
]

const ADMIN = [
  { to: '/admin/torneos', label: 'Armado de torneos', icono: Settings2 },
  { to: '/admin/jugadores', label: 'Jugadores', icono: IdCard },
  { to: '/admin/categorias', label: 'Categorías', icono: Layers },
  { to: '/admin/sedes', label: 'Sedes', icono: MapPin },
]

function Enlace({ to, label, icono: Icono }: (typeof MENU)[number]) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          isActive ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      <Icono className="h-4 w-4" aria-hidden />
      {label}
    </NavLink>
  )
}

export default function Layout() {
  const { jugador, esAdmin, salir, categorias } = useAuth()
  const cat = categorias.find((c) => c.id === jugador?.categoria_id)

  return (
    <div className="min-h-screen lg:flex">
      {/* Lateral escritorio */}
      <aside className="hidden w-64 shrink-0 flex-col bg-noche px-4 py-6 lg:flex">
        <Marca />
        <nav className="mt-8 flex flex-col gap-1" aria-label="Principal">
          {MENU.map((m) => <Enlace key={m.to} {...m} />)}
        </nav>
        {esAdmin && (
          <nav className="mt-8 flex flex-col gap-1" aria-label="Administración">
            <p className="px-3 pb-1 text-xs font-medium text-white/40">Administración</p>
            {ADMIN.map((m) => <Enlace key={m.to} {...m} />)}
          </nav>
        )}
        <div className="mt-auto border-t border-white/10 pt-4">
          <p className="truncate text-sm font-semibold text-white">{jugador?.nombre} {jugador?.apellido}</p>
          <p className="text-xs text-white/55">
            {cat?.nombre}
            {jugador && jugador.rol !== 'jugador' && ` · ${ROL_LABEL[jugador.rol]}`}
          </p>
          <button onClick={salir} className="mt-3 flex items-center gap-2 text-xs font-medium text-white/60 hover:text-white">
            <LogOut className="h-3.5 w-3.5" /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Barra superior móvil */}
      <header className="flex items-center justify-between bg-noche px-4 py-3 lg:hidden" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <Marca />
        <div className="flex items-center gap-3">
          {esAdmin && (
            <NavLink to="/admin/torneos" className="rounded-md bg-white/10 px-2 py-1 text-xs font-semibold text-white">Admin</NavLink>
          )}
          <button onClick={salir} aria-label="Cerrar sesión" className="text-white/70"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-12 lg:pt-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Tab bar móvil */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-noche/10 bg-white lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {MENU.map(({ to, label, icono: Icono }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium leading-tight ${isActive ? 'text-cancha' : 'text-noche/55'}`
            }
          >
            <Icono className="h-5 w-5" aria-hidden />
            <span className="text-center">{label.replace('Mis ', '')}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Marca({ oscuro = true }: { oscuro?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={`${import.meta.env.BASE_URL}logo-el-clasico.webp`}
        alt="El Clásico Fútbol & Pádel"
        width={44}
        height={44}
        className={`h-11 w-11 shrink-0 ${oscuro ? '' : 'rounded-lg'}`}
      />
      <div className="leading-none">
        <span className={`block font-display text-2xl font-bold ${oscuro ? 'text-white' : 'text-noche'}`}>Torneos de Pádel</span>
        <span className={`mt-0.5 block text-xs font-medium ${oscuro ? 'text-white/60' : 'text-noche/60'}`}>organiza El Clásico</span>
      </div>
    </div>
  )
}