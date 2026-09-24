import { useCallback, useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { supabase, mensajeError } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Jugador, Rol } from '../../lib/types'
import { ROL_LABEL } from '../../lib/formato'
import { Alerta, Input, Select, Spinner, Titulo, Vacio } from '../../components/ui'

export default function AdminJugadores() {
  const { categorias, jugador: yo } = useAuth()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [lista, setLista] = useState<Jugador[] | null>(null)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; txt: string } | null>(null)

  const buscar = useCallback(async () => {
    let query = supabase.from('jugadores').select('*').order('apellido').order('nombre').limit(100)
    const t = q.trim()
    if (t) query = /^\d+$/.test(t) ? query.like('dni', `${t}%`) : query.or(`apellido.ilike.%${t}%,nombre.ilike.%${t}%`)
    if (cat) query = query.eq('categoria_id', Number(cat))
    const { data } = await query
    setLista((data as Jugador[]) ?? [])
  }, [q, cat])

  useEffect(() => {
    const h = setTimeout(buscar, 250)
    return () => clearTimeout(h)
  }, [buscar])

  async function actualizar(j: Jugador, cambios: Partial<Jugador>, txt: string) {
    setMsg(null)
    const { error } = await supabase.from('jugadores').update(cambios).eq('id', j.id)
    if (error) return setMsg({ tipo: 'error', txt: mensajeError(error) })
    setMsg({ tipo: 'ok', txt })
    buscar()
  }

  return (
    <>
      <Titulo bajada="Recategorizá jugadores (ascensos o ajustes) y asigná roles. Cada cambio de categoría queda en el historial del jugador.">Jugadores</Titulo>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-noche/40" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por apellido, nombre o DNI" className="pl-9" aria-label="Buscar jugador" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-48" aria-label="Filtrar por categoría">
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </Select>
      </div>
      {msg && <div className="mb-4"><Alerta tipo={msg.tipo}>{msg.txt}</Alerta></div>}
      {!lista ? <Spinner /> : lista.length === 0 ? <Vacio titulo="Sin resultados" /> : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-noche/10">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-noche/10 text-left text-xs text-noche/55">
                <th className="px-4 py-2 font-medium">Jugador</th>
                <th className="py-2 font-medium">DNI</th>
                <th className="py-2 font-medium">Teléfono</th>
                <th className="py-2 font-medium">Categoría</th>
                <th className="py-2 font-medium">Rol</th>
                <th className="px-4 py-2 font-medium">Activo</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((j) => (
                <tr key={j.id} className={`border-b border-noche/5 last:border-0 ${j.activo ? '' : 'opacity-50'}`}>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{j.apellido}, {j.nombre}</p>
                    {j.email && <p className="text-xs text-noche/55">{j.email}</p>}
                  </td>
                  <td className="num">{j.dni}</td>
                  <td><a className="text-cancha" href={`tel:${j.telefono}`}>{j.telefono}</a></td>
                  <td className="pr-3">
                    <Select
                      value={j.categoria_id}
                      aria-label={`Categoría de ${j.apellido}`}
                      onChange={(e) => {
                        const nueva = categorias.find((c) => c.id === Number(e.target.value))!
                        if (confirm(`¿Recategorizar a ${j.nombre} ${j.apellido} en ${nueva.nombre}?`))
                          actualizar(j, { categoria_id: nueva.id }, `${j.apellido} ahora es ${nueva.nombre}`)
                      }}
                    >
                      {categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </Select>
                  </td>
                  <td className="pr-3">
                    <Select
                      value={j.rol}
                      aria-label={`Rol de ${j.apellido}`}
                      disabled={j.id === yo?.id}
                      onChange={(e) => actualizar(j, { rol: e.target.value as Rol }, `Rol actualizado: ${ROL_LABEL[e.target.value as Rol]}`)}
                    >
                      {(Object.keys(ROL_LABEL) as Rol[]).map((r) => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                    </Select>
                  </td>
                  <td className="px-4">
                    <input
                      type="checkbox"
                      checked={j.activo}
                      disabled={j.id === yo?.id}
                      aria-label={`Activo ${j.apellido}`}
                      onChange={() => actualizar(j, { activo: !j.activo }, j.activo ? 'Jugador desactivado' : 'Jugador activado')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-noche/55">Se muestran hasta 100 jugadores; usá la búsqueda para encontrar el resto.</p>
    </>
  )
}
