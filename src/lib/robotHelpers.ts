export interface RobotData {
  n?: string;
  c?: string;
  t?: string;
  p?: string;
  s?: string;
  w?: number;
  d?: string;
  y?: string;
  f?: string;
  k?: string;
  a?: string;
  l?: string[];
}

export interface NormalizedRobot {
  robot_id: string;
  nombre: string;
  categoria: string;
  equipo: string;
  controlador: string;
  escuela: string;
  peso_g: number | null;
  dimensiones_mm: string;
  tipo_control: string;
  frecuencia_protocolo: string;
  contacto: string;
  inspeccion_estado: string;
  inspeccion_checklist: string;
  foto_url: string | null;
  qr_link: string | null;
  created_at: string;
  team_id: string | null;
  rawData: RobotData;
}

export function extractRobotFields(robot: any): NormalizedRobot {
  let data: RobotData = {};

  if (typeof robot.data === 'string') {
    try {
      data = JSON.parse(robot.data);
    } catch {
      data = {};
    }
  } else if (typeof robot.data === 'object' && robot.data !== null) {
    data = robot.data;
  }

  const nombre =
    robot.robot_nombre ||
    data.n ||
    '';

  const categoria =
    robot.categoria ||
    data.c ||
    '';

  const equipo =
    robot.equipo ||
    data.t ||
    '';

  const controlador =
    robot.controlador ||
    data.p ||
    '';

  const escuela =
    robot.escuela ||
    data.s ||
    '';

  const peso_g =
    robot.peso_g !== undefined && robot.peso_g !== null
      ? robot.peso_g
      : data.w ?? null;

  const dimensiones_mm =
    robot.dimensiones_mm ||
    data.d ||
    '';

  const tipo_control =
    robot.tipo_control ||
    data.y ||
    '';

  const frecuencia_protocolo =
    robot.frecuencia_protocolo ||
    data.f ||
    '';

  const contacto =
    robot.contacto ||
    data.k ||
    '';

  const inspeccion_estado =
    robot.inspeccion_estado ||
    data.a ||
    '';

  const inspeccion_checklist =
    robot.inspeccion_checklist ||
    (Array.isArray(data.l) ? data.l.join(', ') : '') ||
    '';

  const foto_url =
    robot.foto_url ||
    null;

  const qr_link =
    robot.qr_link ||
    null;

  const created_at =
    robot.created_at ||
    '';

  const team_id =
    robot.team_id ||
    null;

  return {
    robot_id: robot.robot_id || '',
    nombre,
    categoria,
    equipo,
    controlador,
    escuela,
    peso_g,
    dimensiones_mm,
    tipo_control,
    frecuencia_protocolo,
    contacto,
    inspeccion_estado,
    inspeccion_checklist,
    foto_url,
    qr_link,
    created_at,
    team_id,
    rawData: data,
  };
}
