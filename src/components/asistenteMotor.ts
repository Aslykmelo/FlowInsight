// Motor del asistente de FlowInsight.
//
// No es un modelo de lenguaje generativo: entiende preguntas en español corriente con técnicas
// sencillas (quita tildes y palabras vacías, reduce las palabras a su raíz, reconoce sinónimos y
// perdona un error de tipeo) y responde con una guía escrita a mano sobre la aplicación. Recuerda
// el tema de la conversación para entender seguimientos como "¿y cómo lo hago?". Si no entiende,
// lo dice y ofrece los temas que sí conoce; nunca inventa una respuesta.

export interface Tema {
  id: string;
  titulo: string;
  claves: string[];
  respuesta: string;
  pasos?: string[];
  ir?: { etiqueta: string; ruta: string };
  relacionados?: string[];
  soloAdmin?: boolean;
}

export interface Respuesta {
  texto: string;
  pasos?: string[];
  ir?: { etiqueta: string; ruta: string };
  sugerencias?: { id: string; titulo: string }[];
  temaId?: string;
}

export const TEMAS: Tema[] = [
  {
    id: "que-es",
    titulo: "¿Qué es FlowInsight?",
    claves: ["que es flowinsight", "para que sirve", "flowinsight", "aplicacion", "sistema", "proposito", "objetivo"],
    respuesta:
      "FlowInsight es el sistema de análisis de clientes y ventas de W&T Food. Reúne el historial de pedidos, " +
      "muestra cómo van las ventas, identifica qué clientes llevan tiempo sin comprar y ayuda a contactarlos con " +
      "mensajes de promoción.",
    relacionados: ["dashboard", "promociones", "predicciones"],
  },
  {
    id: "dashboard",
    titulo: "¿Qué muestra el Dashboard?",
    claves: ["dashboard", "inicio", "indicador", "kpi", "resumen", "venta diaria", "grafico", "tablero", "ventas del mes", "ticket"],
    respuesta:
      "El Dashboard es el resumen del negocio: total de clientes, ventas del mes, ticket promedio, ingresos " +
      "totales, ventas por mes, productos más vendidos, ventas por canal y los clientes en riesgo. Puede filtrar " +
      "por período arriba a la derecha.",
    ir: { etiqueta: "Ir al Dashboard", ruta: "/dashboard" },
    relacionados: ["reportes", "categorias"],
  },
  {
    id: "cargar",
    titulo: "¿Cómo cargo datos desde Excel?",
    claves: ["cargar", "subir", "excel", "xlsx", "importar", "archivo", "dato nuevo", "columna", "actualizar dato"],
    respuesta:
      "En Cargar Excel sube un archivo .xlsx o .xls (máximo 10 MB) con sus ventas. El sistema crea los clientes, " +
      "productos y pedidos nuevos y le muestra un resumen al terminar.",
    pasos: [
      "Abra Cargar Excel en el menú lateral.",
      "Marque la casilla que confirma que cuenta con la autorización de los clientes (Ley 1581).",
      "Seleccione el archivo y asocie cada campo con la columna correspondiente de su Excel.",
      "Envíe el archivo y revise el resumen de clientes, productos y pedidos creados.",
    ],
    ir: { etiqueta: "Ir a Cargar Excel", ruta: "/upload" },
    relacionados: ["datos-personales"],
  },
  {
    id: "predicciones",
    titulo: "¿Qué son las Predicciones?",
    claves: ["prediccion", "riesgo de abandono", "abandono", "fuga", "proxima compra", "alerta", "retencion", "machine learning", "ml", "probabilidad"],
    respuesta:
      "Predicciones lista a los clientes con la fecha estimada de su próxima compra y la probabilidad de que dejen " +
      "de comprar en 90 días: riesgo bajo hasta 30 %, medio entre 30 y 60 % y alto por encima de 60 %. Úsela como " +
      "apoyo: en \"Cómo funciona\" se explica qué tan confiable es hoy. También puede exportar la lista filtrada a CSV.",
    ir: { etiqueta: "Ir a Predicciones", ruta: "/predictions" },
    relacionados: ["modelo", "categorias"],
  },
  {
    id: "clientes",
    titulo: "¿Cómo busco un cliente?",
    claves: ["cliente", "buscar cliente", "historial", "pedidos de un cliente", "encontrar cliente", "ciudad", "ultima compra"],
    respuesta:
      "En Clientes está el historial de cada cliente de W&T Food. Puede buscarlo por nombre o ciudad, filtrar por " +
      "categoría, ciudad o fechas, y abrir \"Ver detalle\" para ver sus datos de contacto y sus compras.",
    ir: { etiqueta: "Ir a Clientes", ruta: "/clients" },
    relacionados: ["categorias", "promociones"],
  },
  {
    id: "reportes",
    titulo: "¿Cómo descargo un informe?",
    claves: ["reporte", "descargar", "pdf", "exportar", "generar reporte", "bajar informe", "documento", "imprimir"],
    respuesta:
      "En Reportes puede generar informes de ventas, clientes, riesgo de abandono o predicciones, en PDF o Excel. " +
      "El PDF incluye indicadores, hallazgos, gráficos y el detalle; el Excel trae las tablas para trabajar con " +
      "ellas. Los informes generados quedan en la lista y se pueden volver a descargar.",
    pasos: [
      "Abra Reportes en el menú lateral.",
      "Pulse \"Generar reporte\" y elija el tipo y el formato (PDF o Excel).",
      "Cuando el estado de la fila diga \"Listo\", pulse \"Descargar\".",
    ],
    ir: { etiqueta: "Ir a Reportes", ruta: "/reports" },
    relacionados: ["dashboard"],
  },
  {
    id: "promociones",
    titulo: "¿Cómo envío un mensaje de promoción?",
    claves: ["promocion", "mensaje", "whatsapp", "enviar", "enviar mensaje", "mensaje cliente", "asesor", "hacer pedido", "correo", "llamar cliente", "campana", "oferta", "descuento", "vender", "no ha comprado", "sin comprar", "recuperar cliente"],
    respuesta:
      "En Promociones se genera un mensaje personalizado para cada cliente, con su producto favorito. Puede " +
      "copiarlo, abrirlo en WhatsApp o enviarse una vista previa por correo, con los botones \"Hablar con un " +
      "asesor\" y \"Hacer un pedido\" cuando la empresa haya configurado su WhatsApp. Solo aparecen clientes que " +
      "autorizaron el uso de sus datos.",
    pasos: [
      "Abra Promociones y elija una categoría; \"En riesgo\" suele ser la prioridad.",
      "Pulse sobre un cliente de la lista para generar su mensaje.",
      "Revise el texto y use \"Copiar mensaje\", \"Abrir en WhatsApp\" o \"Enviarme una vista previa por correo\".",
    ],
    ir: { etiqueta: "Ir a Promociones", ruta: "/promotions" },
    relacionados: ["categorias", "datos-personales"],
  },
  {
    id: "mapa",
    titulo: "¿Cómo uso el mapa?",
    claves: ["mapa", "bogota", "localidad", "ubicacion", "donde estan", "tienda", "producto que consumen", "zona", "direccion", "quien compra", "donde compra", "consumen", "huevo", "pollo", "nuez", "almendra", "mani"],
    respuesta:
      "El mapa ubica a los clientes de Bogotá y muestra qué producto consume cada uno. Los colores indican si el " +
      "cliente está activo, ocasional o en riesgo. La ubicación es aproximada dentro de su localidad, porque los " +
      "datos cargados no traen coordenadas exactas.",
    pasos: [
      "Abra Mapa Bogotá en el menú lateral.",
      "En la vista \"Clientes\", elija un producto en el filtro para ver quién lo compra.",
      "Pulse un punto del mapa o un nombre del ranking para ver qué consume y cuántos días lleva sin comprar.",
    ],
    ir: { etiqueta: "Ir al mapa", ruta: "/sales-map" },
    relacionados: ["categorias"],
  },
  {
    id: "olap",
    titulo: "¿Qué es el cubo OLAP?",
    claves: ["olap", "cubo", "tabla de calor", "dimension", "cruzar", "producto por mes", "mapa de calor", "mejor mes"],
    respuesta:
      "El cubo OLAP cruza tres cosas: qué producto se vende, en qué mes y a qué tipo de cliente. En la tabla de " +
      "calor, entre más oscuro el azul, más se vendió. Arriba verá el producto líder, el mejor y el peor mes. " +
      "También existe una vista 3D con los mismos datos.",
    pasos: [
      "Abra Cubo OLAP y elija el año arriba a la derecha.",
      "Elija si mide en ingresos o en unidades vendidas.",
      "Active o desactive tipos de cliente para comparar.",
      "Pulse una casilla para ver el detalle de ese producto y mes por tipo de cliente.",
    ],
    ir: { etiqueta: "Ir al cubo OLAP", ruta: "/olap-cube" },
    relacionados: ["categorias"],
  },
  {
    id: "categorias",
    titulo: "¿Qué significan activo, ocasional y en riesgo?",
    claves: ["rfm", "recencia", "frecuencia", "monetario", "segmento", "categoria", "activo", "ocasional", "en riesgo", "riesgo", "inactivo", "estado del cliente", "dias sin comprar"],
    respuesta:
      "Los clientes se clasifican por los días transcurridos desde su última compra: Activo, hasta 30 días; " +
      "Ocasional, entre 31 y 90 días; En riesgo, más de 90 días sin comprar. Son las mismas categorías en " +
      "Clientes, Promociones, el mapa y el cubo OLAP. RFM es el método detrás: Recencia, Frecuencia y valor Monetario.",
    relacionados: ["promociones", "predicciones"],
  },
  {
    id: "modelo",
    titulo: "¿Qué tan confiable es el modelo?",
    claves: ["modelo", "confiable", "confianza", "precision", "efectividad", "f1", "r2", "acierta", "inteligencia artificial", "cobertura", "como funciona", "entrenamiento", "metrica", "tan confiable", "confiable prediccion", "prediccion confiable", "que tan bueno"],
    respuesta:
      "En \"Cómo funciona\" se muestran la precisión, la cobertura y el F1 reales del modelo. Hoy no alcanza las " +
      "metas del proyecto, porque se entrenó con datos simulados; conviene usarlo como apoyo y no como dato " +
      "definitivo. El número de días sin comprar es una señal más directa.",
    ir: { etiqueta: "Ver cómo funciona", ruta: "/model" },
    relacionados: ["predicciones", "categorias"],
  },
  {
    id: "perfil",
    titulo: "¿Cómo cambio mis datos o mi contraseña?",
    claves: ["perfil", "contrasena", "clave", "password", "telefono", "nombre", "cambiar", "cuenta", "avatar", "color", "mi actividad"],
    respuesta:
      "En Mi perfil puede cambiar su nombre, su teléfono y su contraseña, elegir el color de su avatar y ver su " +
      "actividad reciente, como los informes que ha generado.",
    pasos: [
      "Abra Mi perfil en el menú lateral.",
      "Edite su nombre o teléfono y pulse \"Guardar cambios\".",
      "Para la contraseña, escriba la actual y la nueva (mínimo 8 caracteres) y actualícela.",
    ],
    ir: { etiqueta: "Ir a Mi perfil", ruta: "/profile" },
  },
  {
    id: "olvide",
    titulo: "Olvidé mi contraseña",
    claves: ["olvide", "olvide contrasena", "no se contrasena", "no recuerdo contrasena", "recuperar contrasena", "restablecer", "codigo", "no puedo entrar", "no recuerdo", "bloqueado", "no puedo ingresar"],
    respuesta:
      "En la pantalla de inicio de sesión use \"¿Olvidaste tu contraseña?\". Recibirá un código de verificación por " +
      "SMS, si su cuenta tiene teléfono, o en su correo. El código vence en 10 minutos.",
    pasos: [
      "En el inicio de sesión pulse \"¿Olvidaste tu contraseña?\" y escriba su correo.",
      "Revise su mensaje de texto o su correo y copie el código de 6 dígitos.",
      "Ingrese el código y elija una nueva contraseña de al menos 8 caracteres.",
    ],
  },
  {
    id: "usuarios",
    titulo: "¿Cómo creo usuarios?",
    claves: ["usuario", "crear usuario", "agregar usuario", "rol", "permiso", "administrador", "analista", "desactivar", "dar acceso"],
    respuesta:
      "Solo el rol Administrador ve la pantalla Usuarios, donde se crean cuentas, se asigna el rol y se desactiva " +
      "el acceso de quien ya no debe entrar.",
    pasos: [
      "Abra Usuarios en el menú lateral.",
      "Pulse \"Agregar usuario\", complete nombre, correo y rol, y guarde.",
      "Use \"Editar\" para cambiar datos o \"Desactivar\" para quitar el acceso.",
    ],
    ir: { etiqueta: "Ir a Usuarios", ruta: "/users" },
    soloAdmin: true,
  },
  {
    id: "texto",
    titulo: "Quiero letra más grande",
    claves: ["letra", "texto grande", "tamano", "grande", "leer", "accesibilidad", "zoom", "pequeno", "vista"],
    respuesta:
      "En la parte inferior del menú lateral están los botones A- y A+ para cambiar el tamaño del texto; el " +
      "porcentaje del medio lo restablece.",
  },
  {
    id: "datos-personales",
    titulo: "¿Qué pasa con los datos de los clientes?",
    claves: ["dato personal", "autorizacion", "privacidad", "ley 1581", "habeas data", "proteccion", "seguridad de datos", "consentimiento"],
    respuesta:
      "FlowInsight solo muestra o contacta a clientes que autorizaron el uso de sus datos (Ley 1581 de 2012). Al " +
      "cargar un Excel debe confirmar que cuenta con esa autorización, y el envío de promociones al correo del " +
      "cliente está desactivado por defecto.",
    relacionados: ["cargar", "promociones"],
  },
];

export const SUGERIDAS = ["categorias", "reportes", "promociones", "modelo", "mapa"];

// ---------------------------------------------------------------- lenguaje

const quitarTildes = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const limpiar = (t: string) => quitarTildes(t).replace(/[^a-z0-9ñ ]/g, " ").replace(/\s+/g, " ").trim();

const VACIAS = new Set(
  ("de la el los las un una unos unas que como cual cuales para por con sin del al y o u a en es son ser se lo le les " +
    "mi mis tu tus su sus me te nos quiero quisiera necesito puedo podria puede debo hay esta este esto esa ese eso " +
    "aqui alli muy mas menos ya si no pero sobre hacer favor ayuda dime").split(" "),
);

// Palabras que significan lo mismo para la aplicación.
const SINONIMOS: Record<string, string> = {
  bajar: "descargar", sacar: "descargar", exportar: "descargar", obtener: "descargar", guardar: "descargar",
  informe: "reporte", listado: "reporte", documento: "reporte", reportar: "reporte",
  mandar: "enviar", escribir: "enviar", escribirle: "enviar", contactar: "enviar", comunicar: "enviar",
  subir: "cargar", importar: "cargar", adjuntar: "cargar", meter: "cargar",
  grafica: "grafico", grafico: "grafico", estadistica: "grafico",
  clave: "contrasena", password: "contrasena", pass: "contrasena",
  olvido: "olvide", perdi: "olvide", recordar: "olvide", acuerdo: "olvide",
  fugar: "abandono", abandonar: "abandono", perder: "abandono", irse: "abandono",
  mapa: "mapa", plano: "mapa",
  tienda: "tienda", negocio: "tienda", local: "tienda",
  ia: "inteligencia", robot: "inteligencia", bot: "inteligencia",
};

const SUFIJOS = [
  "amiento", "imiento", "aciones", "uciones", "adoras", "adores", "antes", "mente", "acion", "ucion", "ando",
  "iendo", "ados", "idos", "adas", "idas", "ar", "er", "ir", "ado", "ido", "ada", "ida", "as", "es", "os", "an", "en",
  "a", "o", "e", "s",
].sort((a, b) => b.length - a.length);

function raizSimple(palabra: string): string {
  if (palabra.length <= 4) return palabra;
  for (const suf of SUFIJOS) {
    if (palabra.endsWith(suf) && palabra.length - suf.length >= 4) return palabra.slice(0, palabra.length - suf.length);
  }
  return palabra;
}

const SINONIMOS_RAIZ = new Map<string, string>(
  Object.entries(SINONIMOS).map(([clave, valor]) => [raizSimple(clave), raizSimple(valor)]),
);

function raiz(palabra: string): string {
  const r = raizSimple(palabra);
  return SINONIMOS_RAIZ.get(r) ?? r;
}

function raices(texto: string): string[] {
  return limpiar(texto)
    .split(" ")
    .filter((p) => p && !VACIAS.has(p))
    .map(raiz);
}

function distancia(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let anterior = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = temp;
    }
  }
  return prev[b.length];
}

function contiene(conjunto: string[], t: string): boolean {
  if (conjunto.includes(t)) return true;
  // perdona un error de tipeo en palabras de 5 letras o más
  return t.length >= 6 && conjunto.some((s) => s.length >= 6 && distancia(s, t) <= 1);
}

const CLAVES_TEMA = new Map<string, string[][]>(
  TEMAS.map((t) => [t.id, t.claves.map((c) => raices(c)).filter((r) => r.length > 0)]),
);

function puntuar(tema: Tema, pregunta: string[]): number {
  let puntos = 0;
  for (const clave of CLAVES_TEMA.get(tema.id) ?? []) {
    if (clave.every((t) => contiene(pregunta, t))) puntos += clave.length > 1 ? 2.5 : 1;
  }
  return puntos;
}

// ---------------------------------------------------------------- conversación

const es = (q: string, patron: RegExp) => patron.test(q);

function sugerir(ids: string[], esAdmin: boolean, excluir?: string) {
  return ids
    .map((id) => TEMAS.find((t) => t.id === id))
    .filter((t): t is Tema => !!t && t.id !== excluir && (!t.soloAdmin || esAdmin))
    .map((t) => ({ id: t.id, titulo: t.titulo }));
}

export function responderTema(tema: Tema, pideDetalle: boolean, esAdmin: boolean): Respuesta {
  return {
    texto: tema.respuesta,
    pasos: pideDetalle ? tema.pasos : undefined,
    ir: tema.ir,
    sugerencias: sugerir(tema.relacionados ?? [], esAdmin, tema.id),
    temaId: tema.id,
  };
}

export function responder(pregunta: string, esAdmin: boolean, ultimoTema?: string): Respuesta {
  const q = limpiar(pregunta);
  const visibles = TEMAS.filter((t) => !t.soloAdmin || esAdmin);
  const temasBase = SUGERIDAS.concat(["cargar", "perfil"]);

  if (!q) return { texto: "Escriba su consulta y con gusto le oriento.", sugerencias: sugerir(SUGERIDAS, esAdmin) };

  if (es(q, /^(hola|holi|buenas|buenos dias|buen dia|buenas tardes|buenas noches|hey|saludos|que tal)\b/)) {
    return {
      texto: "Buen día. Soy el asistente de FlowInsight. ¿En qué puedo orientarle?",
      sugerencias: sugerir(SUGERIDAS, esAdmin),
    };
  }
  if (es(q, /\b(gracias|muy amable|perfecto|listo|excelente|genial|vale|ok|entendido)\b/) && q.split(" ").length <= 4) {
    return { texto: "Con gusto. Si necesita algo más, aquí estoy.", sugerencias: sugerir(SUGERIDAS, esAdmin) };
  }
  if (es(q, /\b(chao|adios|hasta luego|nos vemos|hasta pronto)\b/)) {
    return { texto: "Hasta pronto. Cuando lo necesite, puede abrirme desde el botón de ayuda." };
  }
  if (es(q, /(eres|sos|es usted) (una |un )?(ia|inteligencia|bot|robot|persona|humano|real)|quien eres|que eres|como te llamas|con quien hablo/)) {
    return {
      texto:
        "Soy el asistente virtual de FlowInsight. No soy una inteligencia artificial generativa: entiendo preguntas " +
        "en lenguaje sencillo y respondo con la guía de la aplicación, sin inventar datos. Si algo no lo sé, se lo digo.",
      sugerencias: sugerir(SUGERIDAS, esAdmin),
    };
  }
  if (es(q, /(que|en que) (puedes|puede|sabes|sabe) (hacer|ayudar)|que haces|ayudame|necesito ayuda|^ayuda$|que preguntas|menu/)) {
    return {
      texto: "Puedo orientarle sobre cualquiera de estos temas. Toque uno o escriba su pregunta con sus palabras.",
      sugerencias: sugerir(temasBase, esAdmin),
    };
  }

  const pideDetalle = es(q, /\b(como|pasos|paso a paso|hago|detalle|explica|explicame|donde|procedimiento|instrucciones|quiero|quisiera|necesito|puedo|me ayuda)\b/);
  const seguimiento =
    es(q, /\b(paso|pasos|paso a paso|detalle|detalles|ejemplo|no entendi|no entiendo|explica|explicame|mas informacion|como lo hago|como hago|y como|donde esta|donde queda)\b/) &&
    q.split(" ").length <= 6;

  const pregunta_ = raices(pregunta);
  const todos = TEMAS.map((t) => ({ t, p: puntuar(t, pregunta_) })).sort((a, b) => b.p - a.p);
  if (!esAdmin && todos[0].p >= 1 && todos[0].t.soloAdmin) {
    return {
      texto:
        "Esa opción está disponible solo para el rol Administrador. Si la necesita, solicítela a la persona que " +
        "administra FlowInsight en su empresa.",
      sugerencias: sugerir(SUGERIDAS, esAdmin),
    };
  }
  const ranking = visibles
    .map((t) => ({ t, p: puntuar(t, pregunta_) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p);

  // Seguimiento corto ("¿y cómo lo hago?") sobre el tema anterior
  if (seguimiento && ultimoTema && (ranking.length === 0 || ranking[0].p < 2)) {
    const previo = visibles.find((t) => t.id === ultimoTema);
    if (previo) {
      if (previo.pasos) {
        return {
          texto: "Con gusto, estos son los pasos:",
          pasos: previo.pasos,
          ir: previo.ir,
          sugerencias: sugerir(previo.relacionados ?? [], esAdmin, previo.id),
          temaId: previo.id,
        };
      }
      return { ...responderTema(previo, true, esAdmin), texto: previo.respuesta };
    }
  }

  if (ranking.length > 0) {
    const mejor = ranking[0];
    const r = responderTema(mejor.t, pideDetalle, esAdmin);
    const cercano = ranking[1];
    if (cercano && mejor.p - cercano.p <= 0.5) {
      const extra = sugerir([cercano.t.id], esAdmin);
      r.sugerencias = [...extra, ...(r.sugerencias ?? [])].slice(0, 3);
      r.texto = `${r.texto}\n\nSi se refería a otra cosa, también puedo ayudarle con lo que aparece abajo.`;
    }
    return r;
  }

  return {
    texto:
      "No logré identificar su consulta con certeza. Puedo orientarle sobre los temas que aparecen abajo; también " +
      "puede reformular la pregunta con otras palabras, por ejemplo: \"¿cómo descargo un informe?\".",
    sugerencias: sugerir(temasBase, esAdmin),
  };
}

// ---------------------------------------------------------------- clientes y prioridades

export interface ClienteBasico {
  id_cliente: number;
  nombre_cliente: string;
}

/**
 * Busca en la pregunta el nombre de un cliente. Exige que aparezca el apellido o nombre propio (la
 * última palabra: "Rojas" en "Panadería Rojas"), porque el tipo de negocio ("panadería") por sí solo no
 * identifica a nadie. Devuelve los mejores candidatos: uno si es claro, varios si hay que preguntar.
 */
export function reconocerClientes(pregunta: string, clientes: ClienteBasico[]): ClienteBasico[] {
  const q = limpiar(pregunta).split(" ").filter(Boolean);
  const aparece = (token: string) => q.includes(token) || (token.length >= 6 && q.some((w) => w.length >= 6 && distancia(w, token) <= 1));
  const encontrados: { c: ClienteBasico; puntos: number }[] = [];
  for (const c of clientes) {
    const tokens = limpiar(c.nombre_cliente).split(" ").filter((t) => t.length >= 3);
    if (tokens.length === 0) continue;
    const propio = tokens[tokens.length - 1];
    if (!aparece(propio)) continue;
    const puntos = tokens.filter(aparece).length;
    encontrados.push({ c, puntos });
  }
  if (encontrados.length === 0) return [];
  const maximo = Math.max(...encontrados.map((e) => e.puntos));
  return encontrados.filter((e) => e.puntos === maximo).slice(0, 5).map((e) => e.c);
}

/** ¿Pide saber a qué clientes contactar primero? */
export function pideClientesPrioritarios(pregunta: string): boolean {
  const q = limpiar(pregunta);
  const prioridad = /\b(a quien|a cuales|cuales|quienes|prioridad|prioritario|prioritarios|primero|urgente|urgentes|importantes)\b/.test(q);
  const accion = /\b(cliente|clientes|llamo|llamar|contacto|contactar|escribo|escribir|atender|atiendo|gestionar|visitar|visito)\b/.test(q);
  return prioridad && accion;
}
