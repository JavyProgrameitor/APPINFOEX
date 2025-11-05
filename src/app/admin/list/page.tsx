'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import { Separator } from '@/components/ui/Separator';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { Copy, RefreshCcw, Search, User } from 'lucide-react';
// Select (shadcn/Radix)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

// Tipos básicos del dominio
interface Unidad { id: string; nombre: string; zona: string }
interface Municipio { id: string; nombre: string; zona: string }
interface Caseta { id: string; nombre: string; municipio_id: string }
interface UsuarioBF {
  id: string;
  dni: string | null;
  nombre: string;
  apellidos: string;
  unidad_id: string | null;
  caseta_id: string | null;
  creado_en: string;
  rol: 'bf' | 'jr' | 'admin';
}
interface Anotacion { id: string; fecha: string; hora_entrada: string; hora_salida: string; horas_extras: number }

type Scope = 'unidad' | 'caseta';

export default function AdminListBFPage() {

  // Datos base
  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [casetas, setCasetas] = useState<Caseta[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioBF[]>([]);

  // Estados UI
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [zona, setZona] = useState<string>('');
  const [scope, setScope] = useState<Scope>('unidad');
  const [unidadId, setUnidadId] = useState<string>('');
  const [casetaId, setCasetaId] = useState<string>('');

  const zonas = useMemo(() => {
    const z = new Set<string>();
    for (const u of unidades) z.add(u.zona);
    for (const m of municipios) z.add(m.zona);
    return Array.from(z).sort();
  }, [unidades, municipios]);

  // Sheet detalle
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<UsuarioBF | null>(null);
  const [anotaciones, setAnotaciones] = useState<Anotacion[] | null>(null);
  const [loadingAnot, setLoadingAnot] = useState(false);

  // Mapas de lookup
  const unidadById = useMemo(() => new Map(unidades.map(u => [u.id, u])), [unidades]);
  const municipioById = useMemo(() => new Map(municipios.map(m => [m.id, m])), [municipios]);
  const casetaById = useMemo(() => new Map(casetas.map(c => [c.id, c])), [casetas]);

  // Derivados por zona
  const unidadesEnZona = useMemo(() => unidades.filter(u => (zona ? u.zona === zona : true)), [unidades, zona]);
  const casetasEnZona = useMemo(() =>
    casetas.filter(c => {
      if (!zona) return true;
      const mun = municipioById.get(c.municipio_id);
      return mun?.zona === zona;
    }),
  [casetas, zona, municipioById]);

  // Carga inicial — llamadas a Supabase solo en cliente
  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined') return;
      const supa = getSupabaseBrowser();
      setLoading(true);
      try {
        const [{ data: u }, { data: m }, { data: c }, { data: per }] = await Promise.all([
          supa.from('unidades').select('id,nombre,zona').order('nombre'),
          supa.from('municipios').select('id,nombre,zona').order('nombre'),
          supa.from('casetas').select('id,nombre,municipio_id').order('nombre'),
          // ✅ Traer BF y JR
          supa
            .from('usuarios')
            .select('id,dni,nombre,apellidos,unidad_id,caseta_id,creado_en,rol')
            .in('rol', ['bf', 'jr'])
            .order('apellidos'),
        ]);
        setUnidades((u as Unidad[]) || []);
        setMunicipios((m as Municipio[]) || []);
        setCasetas((c as Caseta[]) || []);
        setUsuarios(((per as any[]) || []).map(v => ({
          id: v.id,
          dni: v.dni ?? null,
          nombre: v.nombre,
          apellidos: v.apellidos,
          unidad_id: v.unidad_id ?? null,
          caseta_id: v.caseta_id ?? null,
          creado_en: v.creado_en,
          rol: v.rol,
        })));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function refresh() {
    // recarga rápida de usuarios (por si cambian asignaciones)
    (async () => {
      if (typeof window === 'undefined') return;
      const supa = getSupabaseBrowser();
      setLoading(true);
      try {
        const { data } = await supa
          .from('usuarios')
          .select('id,dni,nombre,apellidos,unidad_id,caseta_id,creado_en,rol')
          .in('rol', ['bf', 'jr'])
          .order('apellidos');
        setUsuarios(((data as any[]) || []).map(v => ({
          id: v.id,
          dni: v.dni ?? null,
          nombre: v.nombre,
          apellidos: v.apellidos,
          unidad_id: v.unidad_id ?? null,
          caseta_id: v.caseta_id ?? null,
          creado_en: v.creado_en,
          rol: v.rol,
        })));
      } finally {
        setLoading(false);
      }
    })();
  }

  // Filtro principal: Zona -> (Unidad|Caseta) -> búsqueda
  const filtrados = useMemo(() => {
    let base = usuarios;

    if (zona) {
      if (scope === 'unidad') {
        base = base.filter(u => u.unidad_id && unidadById.get(u.unidad_id!)?.zona === zona);
        if (unidadId) base = base.filter(u => u.unidad_id === unidadId);
      } else {
        base = base.filter(u => {
          if (!u.caseta_id) return false;
          const cas = casetaById.get(u.caseta_id);
          const mun = cas ? municipioById.get(cas.municipio_id) : undefined;
          return mun?.zona === zona;
        });
        if (casetaId) base = base.filter(u => u.caseta_id === casetaId);
      }
    }

    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(u =>
      (u.dni || '').toLowerCase().includes(q) ||
      (u.nombre + ' ' + u.apellidos).toLowerCase().includes(q)
    );
  }, [usuarios, zona, scope, unidadId, casetaId, search, unidadById, casetaById, municipioById]);

  // Reset de selects al cambiar zona/scope
  useEffect(() => { setUnidadId(''); setCasetaId(''); }, [zona]);
  useEffect(() => { setUnidadId(''); setCasetaId(''); }, [scope]);

  // Abrir detalle — consulta sólo en cliente
  async function openDetalle(u: UsuarioBF) {
    setSelected(u);
    setOpen(true);
    setAnotaciones(null);
    setLoadingAnot(true);
    try {
      if (typeof window === 'undefined') return;
      const supa = getSupabaseBrowser();
      const { data } = await supa
        .from('anotaciones')
        .select('id,fecha,hora_entrada,hora_salida,horas_extras')
        .eq('users_id', u.id)
        .order('fecha', { ascending: false })
        .limit(8);
      setAnotaciones((data as Anotacion[]) || []);
    } finally {
      setLoadingAnot(false);
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-semibold">Listado por Zona: Jefe Servicio-- Bombero.F</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={refresh} aria-label="Recargar">
            <RefreshCcw className="h-4 w-4" />
          </Button>

          {/* Select de Zona */}
          <Select value={zona} onValueChange={setZona}>
            <SelectTrigger className="min-w-[10rem] rounded-sm">
              <SelectValue placeholder="Elegir zona" />
            </SelectTrigger>
            <SelectContent className="rounded-xs">
              {zonas.map(z => (
                <SelectItem key={z} value={z} className="text-center">
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Toggle de ámbito */}
          <div className="inline-flex rounded-sm border overflow-hidden">
            <Button
              type="button"
              variant={scope === 'unidad' ? 'default' : 'ghost'}
              className={`rounded-sm ${scope==='unidad' ? '' : 'bg-transparent'}`}
              onClick={() => setScope('unidad')}
            >
              Unidades
            </Button>
            <Button
              type="button"
              variant={scope === 'caseta' ? 'default' : 'ghost'}
              className={`rounded-sm border-l ${scope==='caseta' ? '' : 'bg-transparent'}`}
              onClick={() => setScope('caseta')}
            >
              Casetas
            </Button>
          </div>

          {/* Select de Unidad/Caseta dentro de la zona */}
          {scope === 'unidad' ? (
            <Select value={unidadId} onValueChange={setUnidadId} disabled={!zona}>
              <SelectTrigger className="min-w-[14rem] rounded-sm">
                <SelectValue placeholder={zona ? 'Elegir unidad…' : 'Primero elige zona'} />
              </SelectTrigger>
              <SelectContent className="rounded-xs max-h-64">
                {unidadesEnZona.map(u => (
                  <SelectItem key={u.id} value={u.id} className="text-center">
                    {u.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select value={casetaId} onValueChange={setCasetaId} disabled={!zona}>
              <SelectTrigger className="min-w-[14rem] rounded-sm">
                <SelectValue placeholder={zona ? 'Elegir caseta…' : 'Primero elige zona'} />
              </SelectTrigger>
              <SelectContent className="rounded-sm max-h-64">
                {casetasEnZona.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-center">
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <User className="h-5 w-5" /> Personal ({filtrados.length})
          </CardTitle>
          <div className="flex flex-col md:flex-row gap-2 md:items-center">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por DNI o nombre…"
                className="pl-8 rounded-sm"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {!zona && 'Elige una zona'}
              {zona && scope === 'unidad' && !unidadId && <> · Zona <span className="font-medium">{zona}</span> · Elige una unidad</>}
              {zona && scope === 'unidad' && !!unidadId && <> · Zona <span className="font-medium">{zona}</span> · Unidad <span className="font-medium">{unidadById.get(unidadId)?.nombre}</span></>}
              {zona && scope === 'caseta' && !casetaId && <> · Zona <span className="font-medium">{zona}</span> · Elige una caseta</>}
              {zona && scope === 'caseta' && !!casetaId && <> · Zona <span className="font-medium">{zona}</span> · Caseta <span className="font-medium">{casetaById.get(casetaId)?.nombre}</span></>}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(!zona || (scope==='unidad' && !unidadId) || (scope==='caseta' && !casetaId)) ? (
            <div className="text-sm text-muted-foreground">Selecciona zona y luego {scope === 'unidad' ? 'una unidad' : 'una caseta'} para ver el listado.</div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtrados.map(u => {
                const unidad = u.unidad_id ? unidadById.get(u.unidad_id) : undefined;
                const caseta = u.caseta_id ? casetaById.get(u.caseta_id) : undefined;
                return (
                  <div
                    key={u.id}
                    className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition cursor-pointer"
                    onClick={() => openDetalle(u)}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-sm truncate">{u.apellidos}, {u.nombre}</div>
                        <div className="flex items-center gap-1">
                          <div className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {unidad?.zona || (caseta ? municipioById.get(caseta.municipio_id)?.zona : '—')}
                          </div>
                          {/* Chip de rol */}
                          <div className="text-[10px] px-2 py-0.5 rounded-full border bg-background">
                            {u.rol === 'jr' ? 'JR' : 'BF'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-1 text-sm font-mono tracking-tight">
                        DNI: <span className="font-semibold">{u.dni || '—'}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground truncate">
                        {unidad ? `Unidad: ${unidad.nombre}` : caseta ? `Caseta: ${caseta.nombre}` : 'Sin asignación'}
                      </div>
                    </div>
                  </div>
                );
              })}
              {!filtrados.length && (
                <div className="text-sm text-muted-foreground">No hay resultados con ese filtro.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalle en Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Detalle del Bombero</SheetTitle>
          </SheetHeader>
          {!selected ? (
            <div className="p-4 text-sm text-muted-foreground">Selecciona un registro…</div>
          ) : (
            <div className="p-4 space-y-4">
              <div>
                <div className="text-xl font-semibold">{selected.apellidos}, {selected.nombre}</div>
                <div className="text-xs text-muted-foreground">
                  Usuario : <span className="font-medium">{selected.rol === 'jr' ? 'Jefe de Servicio' : 'Bombero Forestal'}</span>
                </div>
                <div className="text-xs text-muted-foreground">Creado el {new Date(selected.creado_en).toLocaleDateString()}</div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs uppercase text-muted-foreground mb-1">Identificación</div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-sm">{selected.dni || '—'}</span>
                  {!!selected.dni && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={async () => { await navigator.clipboard.writeText(selected.dni!); }}
                      aria-label="Copiar DNI"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-3 space-y-1">
                <div className="text-xs uppercase text-muted-foreground">Adscripción</div>
                <div className="text-sm">
                  {selected.unidad_id ? (
                    <>
                      <div>Unidad: <span className="font-medium">{unidadById.get(selected.unidad_id)?.nombre}</span></div>
                      <div>Zona: <span className="font-medium">{unidadById.get(selected.unidad_id)?.zona}</span></div>
                    </>
                  ) : selected.caseta_id ? (
                    <>
                      <div>Caseta: <span className="font-medium">{casetaById.get(selected.caseta_id)?.nombre}</span></div>
                      <div>Zona: <span className="font-medium">{municipioById.get(casetaById.get(selected.caseta_id!)!.municipio_id)?.zona}</span></div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">Sin asignación</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border">
                <div className="p-3">
                  <div className="text-xs uppercase text-muted-foreground">Últimas anotaciones</div>
                </div>
                <Separator />
                <div className="p-3 space-y-2">
                  {loadingAnot ? (
                    <div className="space-y-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-9 rounded bg-muted/50 animate-pulse" />
                      ))}
                    </div>
                  ) : !anotaciones?.length ? (
                    <div className="text-sm text-muted-foreground">Sin anotaciones recientes.</div>
                  ) : (
                    <ul className="space-y-2">
                      {anotaciones.map(a => (
                        <li key={a.id} className="text-sm flex items-center justify-between">
                          <div>
                            <div className="font-medium">{new Date(a.fecha).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground">Entrada {a.hora_entrada} · Salida {a.hora_salida}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">Extras: {a.horas_extras}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>Cerrar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
