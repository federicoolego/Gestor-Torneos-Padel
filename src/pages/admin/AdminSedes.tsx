import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase, mensajeError } from '../../lib/supabase'
import type { Sede } from '../../lib/types'
import { Alerta, Badge, Button, Card, Field, Input, Spinner, Titulo } from '../../components/ui'

export default function AdminSedes() {
  const [sedes, setSedes] = useState<Sede[] | null>(null)
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [canchas, setCanchas] = useState('1')
  const [editando, setEditando] = useState<Sede | null>(null)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    const { data } = await supabase.from('sedes').select('*').order('nombre')
    setSedes((data as Sede[]) ?? [])
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError('')
    const datos = { nombre: nombre.trim(), direccion: direccion.trim() || null, canchas: Math.max(1, Number(canchas) || 1) }
    const { error } = editando
      ? await supabase.from('sedes').update(datos).eq('id', editando.id)
      : await supabase.from('sedes').insert(datos)
    if (error) return setError(mensajeError(error))
    setNombre(''); setDireccion(''); setCanchas('1'); setEditando(null)
    cargar()
  }

  async function alternar(s: Sede) {
    const { error } = await supabase.from('sedes').update({ activa: !s.activa }).eq('id', s.id)
    if (error) return setError(mensajeError(error))
    cargar()
  }

  if (!sedes) return <Spinner />
  return (
    <>
      <Titulo bajada="Los complejos donde se juegan los partidos. Las sedes inactivas no aparecen al programar.">Sedes</Titulo>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ul className="space-y-3">
          {sedes.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-noche/10">
              <div>
                <p className="font-display text-xl font-bold">{s.nombre}</p>
                <p className="text-sm text-noche/60">{s.direccion ?? 'Sin dirección'} · {s.canchas} {s.canchas === 1 ? 'cancha' : 'canchas'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tono={s.activa ? 'verde' : 'neutro'}>{s.activa ? 'Activa' : 'Inactiva'}</Badge>
                <Button variante="fantasma" onClick={() => { setEditando(s); setNombre(s.nombre); setDireccion(s.direccion ?? ''); setCanchas(String(s.canchas)) }}>Editar</Button>
                <Button variante="secundario" onClick={() => alternar(s)}>{s.activa ? 'Desactivar' : 'Activar'}</Button>
              </div>
            </li>
          ))}
        </ul>
        <Card>
          <form onSubmit={guardar} className="space-y-4">
            <h2 className="font-display text-2xl font-bold">{editando ? `Editar ${editando.nombre}` : 'Nueva sede'}</h2>
            <Field label="Nombre"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} required /></Field>
            <Field label="Dirección (opcional)"><Input value={direccion} onChange={(e) => setDireccion(e.target.value)} /></Field>
            <Field label="Cantidad de canchas" hint="Se usa para programar y ver la ocupación.">
              <Input type="number" min={1} max={20} value={canchas} onChange={(e) => setCanchas(e.target.value)} required />
            </Field>
            {error && <Alerta tipo="error">{error}</Alerta>}
            <div className="flex gap-2">
              <Button type="submit">{editando ? 'Guardar sede' : 'Agregar sede'}</Button>
              {editando && <Button variante="secundario" type="button" onClick={() => { setEditando(null); setNombre(''); setDireccion(''); setCanchas('1') }}>Cancelar</Button>}
            </div>
          </form>
        </Card>
      </div>
    </>
  )
}