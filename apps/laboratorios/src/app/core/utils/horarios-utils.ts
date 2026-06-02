export interface HorarioExtendido {
  codAula: string;
  diaSemana: string;
  nomAula?: string;
  horaInicio: string;
  horaFin: string;
  materia?: string;
  docente?: string;
  nombreClase?: string;
}

export function normalizar(str: string): string {
  return (str || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizarHorarios(items: unknown[] | null | undefined): HorarioExtendido[] {
  if (!items || !Array.isArray(items)) return [];
  return items.map((raw) => {
    const rawObj = raw as Record<string, unknown>;
    const codAula: string = (rawObj['codAula'] ?? rawObj['aula'] ?? rawObj['codigoAula'] ?? '').toString();
    const nomAula: string = (rawObj['nomAula'] ?? rawObj['nombreAula'] ?? rawObj['aulaNombre'] ?? '').toString();
    const diaSemana: string = (rawObj['diaSemana'] ?? rawObj['dia'] ?? '').toString();
    const horaInicio = aHHMMDesdeEntrada(rawObj['horaInicio'] ?? rawObj['inicio'] ?? rawObj['hora_ini']);
    const horaFin = aHHMMDesdeEntrada(rawObj['horaFin'] ?? rawObj['fin'] ?? rawObj['hora_fin']);
    const nombreClase = rawObj['nombreClase'] ?? rawObj['asignatura'] ?? rawObj['nombreAsignatura'] ?? rawObj['materia'] ?? rawObj['clase'] ?? rawObj['descripcion'] ?? rawObj['nombre'] ?? '';
    const materia = rawObj['materia'] ?? rawObj['asignatura'] ?? rawObj['nombreAsignatura'] ?? rawObj['nombre'] ?? undefined;
    return { codAula, nomAula, diaSemana, horaInicio, horaFin, nombreClase, materia } as HorarioExtendido;
  });
}

export function aHHMMDesdeEntrada(input: unknown): string {
  if (!input && input !== 0) return '';
  const s = String(input).trim();
  
  // Detectar formato 12h con AM/PM
  const lower = s.toLowerCase();
  const esPM = lower.includes('pm') || lower.includes('p.m');
  const esAM = lower.includes('am') || lower.includes('a.m');
  
  // Extraer hora y minutos
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (m) {
    let h = parseInt(m[1], 10);
    const mm = m[2];
    
    // Convertir de 12h a 24h si es necesario
    if (esPM || esAM) {
      if (esPM && h !== 12) {
        h += 12;
      } else if (esAM && h === 12) {
        h = 0;
      }
    }
    
    return `${String(h).padStart(2, '0')}:${mm}`;
  }
  
  // Try to parse ISO time or full datetime
  const asDate = new Date(s);
  if (!isNaN(asDate.getTime())) {
    const h = String(asDate.getHours()).padStart(2, '0');
    const mm = String(asDate.getMinutes()).padStart(2, '0');
    return `${h}:${mm}`;
  }
  return s;
}

export function aulaCoincide(h: HorarioExtendido, aulaNombre?: string, aulaCodigo?: string): boolean {
  const hNom = normalizar(h.nomAula || '');
  const hCod = normalizar(h.codAula || '');
  const n = normalizar(aulaNombre || '');
  const c = normalizar(aulaCodigo || '');
  return (!!n && hNom === n) || (!!c && hCod === c);
}

export function matchesMateria(mHor?: string, mNom?: string, mCod?: string): boolean {
  const H = normalizar(mHor || '');
  const N = normalizar(mNom || '');
  const C = normalizar(mCod || '');
  if (!H) return false;
  if (N && (H === N || H.includes(N) || N.includes(H))) return true;
  if (C && (H === C || H.includes(C) || C.includes(H))) return true;
  return false;
}

export function hhmmAMinutos(hhmm: string): number {
  const parts = (hhmm || '0:0').split(':').map(n => parseInt(n, 10));
  const h = isNaN(parts[0]) ? 0 : parts[0];
  const m = isNaN(parts[1]) ? 0 : parts[1];
  return h * 60 + m;
}

export function diffMinutosDesdeRef(h: HorarioExtendido, refMin: number): number {
  const ini = hhmmAMinutos(h.horaInicio || '00:00');
  if (refMin < 0) return ini;
  return Math.max(0, ini - refMin);
}

export function scoreMatch(
  h: HorarioExtendido,
  cand: { materiaNom?: string; materiaCod?: string; aulaNombre?: string; aulaCodigo?: string },
  refMin: number
): number {
  let s = 0;
  if (normalizar(h.nomAula || '') && normalizar(cand.aulaNombre || '') && normalizar(h.nomAula || '') === normalizar(cand.aulaNombre || '')) s += 1;
  if (normalizar(h.codAula || '') && normalizar(cand.aulaCodigo || '') && normalizar(h.codAula || '') === normalizar(cand.aulaCodigo || '')) s += 1;
  if (matchesMateria(h.materia, cand.materiaNom, cand.materiaCod)) s += 2;

  const ini = hhmmAMinutos(h.horaInicio || '');
  const fin = hhmmAMinutos(h.horaFin || '');
  if (refMin >= 0) {
    if (ini <= refMin && refMin <= fin) s += 3;
    else if (ini > refMin) s += 2;
  } else {
    s += 2;
  }
  return s;
}

export function minRefPara(fechaSel: Date): number {
  const hoy = new Date();
  const hoyMs = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  const selMs = new Date(fechaSel.getFullYear(), fechaSel.getMonth(), fechaSel.getDate()).getTime();
  if (hoyMs === selMs) {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }
  return -1;
}
