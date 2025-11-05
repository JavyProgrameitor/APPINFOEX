'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { RefreshCcw, Calendar as CalendarIcon, Search } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Calendar } from '@/components/ui/Calendar';
import { cn } from '@/lib/utils';

// --- Tipos ---
interface Anotacion {
  id: string;
  users_id: string;
  fecha: string; // YYYY-MM-DD
  codigo: string | null;
  hora_entrada: string;
  hora_salida: string;
  horas_extras: number;
}
interface Usuario {
  id: string;
  dni: string | null;
  nombre: string;
  apellidos: string;
}

type Row = {
  anot: Anotacion;
  user?: Usuario;
};

// --- Helpers ---
function formatDateLocalYYYYMMDD(d: Date) {
  // Construye YYYY-MM-DD en zona local (no UTC) para cuadrar con columna DATE de Postgres
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${day.length === 2 ? month : `0${month}`}-${day}`;
}
// (corrección: mes ya está con padStart; dejamos función simple y segura)
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function formatNice(d: Date) {
  try {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: '2-digit' });
  } catch {
    return ymd(d);
  }
}

export default function AdminHomePage() {
  // Fecha seleccionada (por defecto hoy)
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  // Datos
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');

  const dateStr = useMemo(() => ymd(date), [date]);

  // Cargar anotaciones del día
  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined') return;
      const supa = getSupabaseBrowser();
      setLoading(true);
      try {
        const { data: anot } = await supa
          .from('anotaciones')
          .select('id,users_id,fecha,codigo,hora_entrada,hora_salida,horas_extras')
          .eq('fecha', dateStr)
          .order('hora_entrada', { ascending: true });

        const list = (anot as Anotacion[]) || [];
        const userIds = Array.from(new Set(list.map(a => a.users_id))).filter(Boolean);

        let usersMap = new Map<string, Usuario>();
        if (userIds.length) {
          const { data: users } = await supa
            .from('usuarios')
            .select('id,dni,nombre,apellidos')
            .in('id', userIds);

          for (const u of (users as Usuario[]) || []) {
            usersMap.set(u.id, u);
          }
        }

        setRows(
          list.map(a => ({
            anot: a,
            user: usersMap.get(a.users_id),
          }))
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [dateStr]);

  function refresh() {
    // Simplemente fuerza el mismo efecto cambiando el estado de fecha a una copia
    setDate(d => new Date(d.getTime()));
  }

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return rows;
    return rows.filter(r => {
      const name = r.user ? `${r.user.nombre} ${r.user.apellidos}`.toLowerCase() : '';
      const dni = (r.user?.dni || '').toLowerCase();
      const cod = (r.anot.codigo || '').toLowerCase();
      return (
        name.includes(text) ||
        dni.includes(text) ||
        cod.includes(text)
      );
    });
  }, [rows, q]);

  const count = filtered.length;

  return (
    <main className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl md:text-2xl font-semibold">Anotaciones del día</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker (shadcn Calendar + Popover) */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn('rounded-sm gap-2')}>
                <CalendarIcon className="h-4 w-4" />
                {formatNice(date)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-sm">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="secondary"
            className="rounded-sm"
            onClick={() => setDate(new Date())}
          >
            Hoy
          </Button>

          <Button variant="outline" size="icon" onClick={refresh} aria-label="Recargar">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            {formatNice(date)} · {count} anotación{count === 1 ? '' : 'es'}
          </CardTitle>
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, DNI o código…"
              className="pl-8 rounded-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : !filtered.length ? (
            <p className="text-sm text-muted-foreground">
              No hay anotaciones para la fecha seleccionada.
            </p>
          ) : (
            <ul className="divide-y rounded-xs border overflow-hidden">
              {filtered.map(({ anot, user }) => (
                <li key={anot.id} className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {user ? `${user.apellidos}, ${user.nombre}` : '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      DNI: <span className="font-mono">{user?.dni || '—'}</span>
                      {anot.codigo ? (
                        <> · Código: <span className="font-mono">{anot.codigo}</span></>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground sm:text-right">
                    Entrada <span className="font-medium">{anot.hora_entrada}</span> · Salida{' '}
                    <span className="font-medium">{anot.hora_salida}</span> · Extras:{' '}
                    <span className="font-medium">{anot.horas_extras}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
