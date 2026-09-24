import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Phone, Shuffle, Trophy, ArrowLeftRight } from 'lucide-react'
import { supabase, mensajeError } from '../../lib/supabase'
import type { InscriptoAdmin, PartidoVista, Sede, Torneo, TorneoCategoriaVista, Zona } from '../../lib/types'
import { aInputLocal, desdeInputLocal, ESTADO_CATEGORIA_LABEL, fechaHora } from '../../lib/formato'
import { resumenSets } from '../../lib/resultado'
import { Alerta, Badge, Button, Card, Field, Input, Select, Spinner, Tabs, Titulo, Vacio } from '../../components/ui'
import { ZonaTabla } from '../../components/Zonas'
import { etiquetaPartido } from '../../components/Partidos'
import Bracket from '../../components/Bracket'
import ResultadoModal from '../../components/ResultadoModal'

type Tab = 'inscriptos' | 'zonas' | 'programacion' | 'playoff'

export default function AdminTorneoCategoria() {
  const { id, tcId } = useParams()
  const [torneo, setTorneo] = useState<Torneo | null>(null)
  const [tc, setTc] = useState<TorneoCategoriaVista | null>(null)
  const [inscriptos, setInscriptos] = useState<InscriptoAdmin[]>([])
  const [zonas, setZonas] = useState<(Zona & { zona_parejas: { inscripcion_id: string }[] })[]>([])
  const [partidos, setPartidos] = useState<PartidoVista[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [tab, setTab] = useState<Tab>('inscriptos')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; txt: string } | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [elegido, setElegido] = useState<PartidoVista | null>(null)

  const cargar = useCallback(async () => {
    const [t, c, i, z, p, s] = await Promise.all([
      supabase.from('torneos').select('*').eq('id', id!).single(),
      supabase.from('v_torneo_categorias').select('*').eq('id', tcId!).single(),
      supabase.rpc('admin_inscriptos', { p_torneo_categoria: tcId }),
      supabase.from('zonas').select('*, zona_parejas(inscripcion_id)').eq('torneo_categoria_id', tcId!).order('nombre'),
      supabase.from('v_partidos').select('*').eq('torneo_categoria_id', tcId!).order('ronda').order('orden'),
      supabase.from('sedes').select('*').eq('activa', true).order('nombre'),
    ])
    setTorneo(t.data as Torneo)
    setTc(c.data as TorneoCategoriaVista)
    setInscriptos((i.data as InscriptoAdmin[]) ?? [])
    setZonas((z.data as typeof zonas) ?? [])
    setPartidos((p.data as PartidoVista[]) ?? [])
    setSedes((s.data as Sede[]) ?? [])
  }, [id, tcId])
  useEffect(() => { cargar() }, [cargar])

  const activos = inscriptos.filter((i) => i.estado === 'activa')
  const nombres = useMemo(() => Object.fromEntries(inscriptos.map((i) => [i.id, i.pareja])), [inscriptos])
  const horarios = useMemo(() => Object.fromEntries(inscriptos.map((i) => [i.id, i.problemas_horario])), [inscriptos])

  async function ejecutar(fn: () => PromiseLike<{ error: unknown }>, okTxt: string) {
    setMsg(null)
    setTrabajando(true)
    const { error } = await fn()
    setTrabajando(false)
    if (error) return setMsg({ tipo: 'error', txt: mensajeError(error) })
    setMsg({ tipo: 'ok', txt: okTxt })
    cargar()
  }

  if (!torneo || !tc) return <Spinner />
  const cierreVencido = new Date(torneo.cierre_inscripcion).getTime() <= Date.now()
  const zonaPartidos = partidos.filter((p) => p.fase === 'zona')
  const playoff = partidos.filter((p) => p.fase !== 'zona')
  const pendientesZona = zonaPartidos.filter((p) => p.estado === 'pendiente').length

  return (
    <>
      <Link to="/admin/torneos" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-noche/60 hover:text-noche"><ArrowLeft className="h-4 w-4" aria-hidden /> Armado de torneos</Link>
      <Titulo
        bajada={<>{torneo.nombre} · <span className="num">{activos.length}/{tc.cupo_max}</span> parejas · cierre {fechaHora(torneo.cierre_inscripcion)}</>}
        accion={<div className="flex items-center gap-2"><Badge tono="azul">{ESTADO_CATEGORIA_LABEL[tc.estado]}</Badge><Link to={`/torneos/${torneo.id}?cat=${tc.id}`} className="text-sm font-semibold text-cancha">Ver público</Link></div>}
      >
        {tc.categoria}
      </Titulo>

      {msg && <div className="mb-4"><Alerta tipo={msg.tipo}>{msg.txt}</Alerta></div>}

      <Tabs<Tab>
        valor={tab}
        onChange={(t) => { setTab(t); setMsg(null) }}
        opciones={[
          { id: 'inscriptos', label: 'Inscriptos' },
          { id: 'zonas', label: 'Zonas' },
          { id: 'programacion', label: 'Programación' },
          { id: 'playoff', label: 'Playoff' },
        ]}
      />

      <div className="mt-6">
        {tab === 'inscriptos' && (
          <Inscriptos
            lista={inscriptos}
            tc={tc}
            trabajando={trabajando}
            onPagada={(i) => ejecutar(() => supabase.from('inscripciones').update({ pagada: !i.pagada }).eq('id', i.id), i.pagada ? 'Pago desmarcado' : 'Pago registrado')}
            onCancelar={(i) => confirm(`¿Cancelar la inscripción de ${i.jugador1} y ${i.jugador2}?`) && ejecutar(() => supabase.from('inscripciones').update({ estado: 'cancelada' }).eq('id', i.id), 'Inscripción cancelada')}
            onSuspender={() => confirm('¿Suspender la categoría por falta de parejas?') && ejecutar(() => supabase.from('torneo_categorias').update({ estado: 'suspendida' }).eq('id', tc.id), 'Categoría suspendida')}
            onReabrir={() => ejecutar(() => supabase.from('torneo_categorias').update({ estado: 'inscripcion' }).eq('id', tc.id), 'Categoría reabierta')}
          />
        )}

        {tab === 'zonas' && (
          <GestionZonas
            n={activos.length}
            tc={tc}
            cierreVencido={cierreVencido}
            zonas={zonas}
            partidos={zonaPartidos}
            nombres={nombres}
            trabajando={trabajando}
            onGenerar={(cant, aleatorio) => ejecutar(() => supabase.rpc('generar_zonas', { p_torneo_categoria: tc.id, p_cantidad_zonas: cant, p_aleatorio: aleatorio }), 'Zonas generadas con sus partidos')}
            onIntercambiar={(a, b) => ejecutar(() => supabase.rpc('intercambiar_parejas_zona', { p_ins1: a, p_ins2: b }), 'Parejas intercambiadas')}
          />
        )}

        {tab === 'programacion' && (
          partidos.filter((p) => p.estado !== 'bye').length === 0 ? <Vacio titulo="No hay partidos para programar">Primero generá las zonas.</Vacio> : (
            <div className="space-y-3">
              <Alerta>Asigná sede, cancha, día y hora. Debajo de cada pareja ves sus problemas de horario.</Alerta>
              {partidos.filter((p) => p.estado !== 'bye').map((p) => (
                <FilaProgramacion key={p.id} p={p} sedes={sedes} horarios={horarios} onGuardado={cargar} onResultado={() => setElegido(p)} />
              ))}
            </div>
          )
        )}

        {tab === 'playoff' && (
          <div className="space-y-4">
            <Card className="flex flex-wrap items-center justify-between gap-4">
              <div className="max-w-xl text-sm text-noche/75">
                <p className="font-display text-xl font-semibold text-noche">Cuadro de playoff</p>
                Clasifican 1° y 2° de zonas de 3, y 1°, 2° y 3° de zonas de 4. Primero van los 1° de zona, después los 2° y los 3°; si faltan parejas para completar el cuadro, los mejores pasan directo.
                {pendientesZona > 0 && <p className="mt-2 text-amber-800">Faltan {pendientesZona} resultados de zona.</p>}
              </div>
              <Button onClick={() => (playoff.length === 0 || confirm('Se va a regenerar el cuadro. ¿Continuar?')) && ejecutar(() => supabase.rpc('generar_playoff', { p_torneo_categoria: tc.id }), 'Cuadro generado')} disabled={pendientesZona > 0 || zonas.length === 0} cargando={trabajando}>
                <Trophy className="h-4 w-4" aria-hidden /> {playoff.length ? 'Regenerar cuadro' : 'Generar cuadro'}
              </Button>
            </Card>
            {playoff.length > 0 && <Bracket partidos={playoff} onElegir={setElegido} />}
          </div>
        )}
      </div>

      {elegido && <ResultadoModal partido={elegido} esAdmin onCerrar={() => setElegido(null)} onGuardado={() => { setElegido(null); cargar() }} />}
    </>
  )
}

function Inscriptos({
  lista, tc, trabajando, onPagada, onCancelar, onSuspender, onReabrir,
}: {
  lista: InscriptoAdmin[]
  tc: TorneoCategoriaVista
  trabajando: boolean
  onPagada: (i: InscriptoAdmin) => void
  onCancelar: (i: InscriptoAdmin) => void
  onSuspender: () => void
  onReabrir: () => void
}) {
  const activos = lista.filter((i) => i.estado === 'activa')
  return (
    <div className="space-y-4">
      {tc.estado === 'inscripcion' && activos.length < tc.cupo_min && (
        <Alerta tipo="aviso">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Hay {activos.length} parejas y el mínimo es {tc.cupo_min}. Si no se completa, podés suspender la categoría.</span>
            <Button variante="peligro" onClick={onSuspender} disabled={trabajando}>Suspender categoría</Button>
          </div>
        </Alerta>
      )}
      {tc.estado === 'suspendida' && (
        <Alerta tipo="aviso"><div className="flex flex-wrap items-center justify-between gap-3"><span>La categoría está suspendida.</span><Button variante="secundario" onClick={onReabrir}>Reabrir inscripción</Button></div></Alerta>
      )}
      {lista.length === 0 ? <Vacio titulo="Todavía no hay inscriptos" /> : (
        <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-noche/10">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-noche/10 text-left text-xs text-noche/55">
                <th className="px-4 py-2 font-medium">Pareja</th>
                <th className="py-2 font-medium">Problemas de horario</th>
                <th className="py-2 font-medium">Zona</th>
                <th className="py-2 font-medium">Pago</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {lista.map((i) => (
                <tr key={i.id} className={`border-b border-noche/5 align-top last:border-0 ${i.estado === 'cancelada' ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    {[[i.jugador1, i.categoria1, i.telefono1, i.dni1], [i.jugador2, i.categoria2, i.telefono2, i.dni2]].map(([n, c, t, d]) => (
                      <div key={d} className="mb-1 last:mb-0">
                        <span className="font-medium">{n}</span> <span className="text-xs text-noche/55">{c} · DNI {d}</span>
                        <a href={`tel:${t}`} className="ml-2 inline-flex items-center gap-1 text-xs text-cancha"><Phone className="h-3 w-3" aria-hidden />{t}</a>
                      </div>
                    ))}
                    {i.estado === 'cancelada' && <Badge tono="rojo">Cancelada</Badge>}
                  </td>
                  <td className="max-w-xs whitespace-pre-line py-3 pr-4 text-noche/80">{i.problemas_horario || '—'}</td>
                  <td className="py-3">{i.zona ?? '—'}</td>
                  <td className="py-3">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={i.pagada} onChange={() => onPagada(i)} disabled={trabajando} /> {i.pagada ? 'Pagada' : 'Pendiente'}
                    </label>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {i.estado === 'activa' && !i.zona && <Button variante="fantasma" onClick={() => onCancelar(i)} disabled={trabajando}>Cancelar</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function GestionZonas({
  n, tc, cierreVencido, zonas, partidos, nombres, trabajando, onGenerar, onIntercambiar,
}: {
  n: number
  tc: TorneoCategoriaVista
  cierreVencido: boolean
  zonas: (Zona & { zona_parejas: { inscripcion_id: string }[] })[]
  partidos: PartidoVista[]
  nombres: Record<string, string>
  trabajando: boolean
  onGenerar: (cant: number, aleatorio: boolean) => void
  onIntercambiar: (a: string, b: string) => void
}) {
  const min = Math.ceil(n / 4)
  const max = Math.floor(n / 3)
  const [cant, setCant] = useState(max)
  const [aleatorio, setAleatorio] = useState(true)
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  useEffect(() => setCant(max), [max])

  const hayResultados = partidos.some((p) => p.estado === 'finalizado' || p.estado === 'wo')
  const de4 = n - 3 * cant
  const clasifican = de4 * 3 + (cant - de4) * 2
  const todas = zonas.flatMap((z) => z.zona_parejas.map((zp) => ({ id: zp.inscripcion_id, zona: z.nombre })))

  return (
    <div className="space-y-6">
      {tc.estado !== 'playoff' && tc.estado !== 'finalizada' && !hayResultados && (
        <Card>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-40">
              <Field label="Cantidad de zonas">
                <Select value={cant} onChange={(e) => setCant(Number(e.target.value))} disabled={n < tc.cupo_min}>
                  {n >= tc.cupo_min && Array.from({ length: max - min + 1 }, (_, k) => min + k).map((z) => <option key={z} value={z}>{z}</option>)}
                </Select>
              </Field>
            </div>
            <label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={aleatorio} onChange={(e) => setAleatorio(e.target.checked)} /> Sorteo aleatorio</label>
            <Button
              onClick={() => (zonas.length === 0 || confirm('Se borran las zonas y partidos actuales. ¿Continuar?')) && onGenerar(cant, aleatorio)}
              disabled={n < tc.cupo_min}
              cargando={trabajando}
            >
              <Shuffle className="h-4 w-4" aria-hidden /> {zonas.length ? 'Regenerar zonas' : 'Generar zonas'}
            </Button>
          </div>
          <p className="mt-3 text-sm text-noche/70">
            {n < tc.cupo_min
              ? `Hay ${n} parejas; se necesitan al menos ${tc.cupo_min}.`
              : `${n} parejas → ${cant - de4} zona(s) de 3 y ${de4} de 4 · clasifican ${clasifican} al playoff.`}
            {!cierreVencido && ' La inscripción todavía está abierta: si generás ahora, las parejas ya no podrán cancelar.'}
          </p>
        </Card>
      )}

      {zonas.length > 0 && !hayResultados && (
        <Card>
          <p className="mb-3 font-display text-xl font-semibold">Mover parejas entre zonas</p>
          <div className="flex flex-wrap items-end gap-3">
            {[[a, setA], [b, setB]].map(([v, setV], k) => (
              <div key={k} className="min-w-[12rem] flex-1">
                <Field label={k === 0 ? 'Pareja' : 'Intercambiar con'}>
                  <Select value={v as string} onChange={(e) => (setV as (x: string) => void)(e.target.value)}>
                    <option value="">Elegí</option>
                    {todas.map((t) => <option key={t.id} value={t.id}>Zona {t.zona} · {nombres[t.id]}</option>)}
                  </Select>
                </Field>
              </div>
            ))}
            <Button variante="secundario" onClick={() => a && b && onIntercambiar(a, b)} disabled={!a || !b || trabajando}>
              <ArrowLeftRight className="h-4 w-4" aria-hidden /> Intercambiar
            </Button>
          </div>
        </Card>
      )}

      {zonas.length === 0 ? <Vacio titulo="Todavía no hay zonas" /> : (
        <div className="grid gap-5 lg:grid-cols-2">
          {zonas.map((z) => (
            <ZonaTabla key={z.id} zona={z} nombres={nombres} cantidad={z.zona_parejas.length} partidos={partidos.filter((p) => p.zona_id === z.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilaProgramacion({
  p, sedes, horarios, onGuardado, onResultado,
}: {
  p: PartidoVista
  sedes: Sede[]
  horarios: Record<string, string>
  onGuardado: () => void
  onResultado: () => void
}) {
  const [sede, setSede] = useState(p.sede_id ?? '')
  const [fh, setFh] = useState(aInputLocal(p.fecha_hora))
  const [cancha, setCancha] = useState(p.cancha ?? '')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const cambiado = sede !== (p.sede_id ?? '') || fh !== aInputLocal(p.fecha_hora) || cancha !== (p.cancha ?? '')

  async function guardar() {
    setGuardando(true)
    setError('')
    const { error } = await supabase.from('partidos').update({ sede_id: sede || null, fecha_hora: desdeInputLocal(fh), cancha: cancha.trim() || null }).eq('id', p.id)
    setGuardando(false)
    if (error) return setError(mensajeError(error))
    onGuardado()
  }

  return (
    <div className="grid gap-3 rounded-xl bg-white p-4 ring-1 ring-noche/10 lg:grid-cols-[1.4fr_2fr_auto] lg:items-center">
      <div className="min-w-0">
        <p className="font-display text-lg font-semibold">{etiquetaPartido(p)}</p>
        {[[p.pareja_a, p.pareja_a_id], [p.pareja_b, p.pareja_b_id]].map(([n, pid], k) => (
          <div key={k} className="text-sm">
            <span className={n ? 'font-medium' : 'italic text-noche/45'}>{n ?? 'A definir'}</span>
            {pid && horarios[pid] && <span className="block truncate text-xs text-amber-800" title={horarios[pid]}>Horario: {horarios[pid]}</span>}
          </div>
        ))}
        {p.estado !== 'pendiente' && <p className="mt-1 text-xs font-semibold text-emerald-800">{resumenSets(p)}</p>}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1.2fr_5rem]">
        <Select value={sede} onChange={(e) => setSede(e.target.value)} aria-label="Sede">
          <option value="">Sede</option>
          {sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </Select>
        <Input type="datetime-local" value={fh} onChange={(e) => setFh(e.target.value)} aria-label="Fecha y hora" />
        <Input value={cancha} onChange={(e) => setCancha(e.target.value)} placeholder="Cancha" aria-label="Cancha" />
        {error && <p className="text-xs text-red sm:col-span-3">{error}</p>}
      </div>
      <div className="flex gap-2 lg:justify-end">
        <Button variante="secundario" onClick={guardar} disabled={!cambiado} cargando={guardando}>Guardar</Button>
        {p.pareja_a_id && p.pareja_b_id && <Button variante="fantasma" onClick={onResultado}>{p.estado === 'pendiente' ? 'Resultado' : 'Editar'}</Button>}
      </div>
    </div>
  )
}
