// Static content and model geometry for the "Explicacion" tab.
// Sizes are GiB, taken from the real GGUF files (Hugging Face API / local disk).
// KV geometry comes from the GGUF headers; see memory notes in the repo history.

export const GPU_TOTAL_GIB = 8;
export const RAM_TOTAL_GIB = 31;
export const GPU_BANDWIDTH_GBS = 448; // RTX 3070 GDDR6
export const RAM_BANDWIDTH_GBS = 40; // i5-12400F, dual-channel DDR4 (approx.)

// Bytes per element of each KV cache type (ggml block formats incl. scales).
export const KV_TYPES = {
  f16: { label: 'f16', bytes: 2 },
  q8_0: { label: 'q8_0', bytes: 1.0625 },
  q4_0: { label: 'q4_0', bytes: 0.5625 },
};

export const MODELS = {
  'qwen36-35b-a3b': {
    name: 'Qwen3.6-35B-A3B (MoE, el del video)',
    moe: true,
    layers: 40,
    kvLayers: 10, // full attention every 4th layer; the rest is linear attention
    kvHeads: 2,
    headDim: 256,
    experts: 256,
    expertsUsed: 8,
    mtpGiB: 0.45, // extra nextn block shipped only in the -MTP-GGUF repo
    mmprojGiB: 0.84,
    efficiency: 1,
    quants: {
      'UD-Q3_K_M': { file: 15.93, nonExpert: 2.6 },
      'UD-IQ4_XS': { file: 16.96, nonExpert: 2.8 },
      MXFP4_MOE: { file: 20.66, nonExpert: 3.0 },
      'UD-Q4_K_M': { file: 21.11, nonExpert: 3.1 },
    },
    defaultQuant: 'MXFP4_MOE',
  },
  'qwen35-9b': {
    name: 'Qwen3.5-9B (denso, qwen-claude-opus)',
    moe: false,
    layers: 32,
    kvLayers: 8,
    kvHeads: 4,
    headDim: 256,
    mtpGiB: 0,
    mmprojGiB: 0,
    efficiency: 1,
    quants: { Q4_K_M: { file: 5.24 } },
    defaultQuant: 'Q4_K_M',
  },
  bonsai: {
    name: 'Bonsai 2 27B ternario (denso)',
    moe: false,
    layers: 64,
    kvLayers: 16,
    kvHeads: 4,
    headDim: 256,
    mtpGiB: 0,
    mmprojGiB: 0,
    efficiency: 0.7, // ternary kernels are slower than plain Q4 per byte
    quants: { PTQ1_0: { file: 5.54 } },
    defaultQuant: 'PTQ1_0',
  },
};

export const CONCEPTS = [
  {
    icon: 'grain',
    title: 'Parametros: las bolitas de plastilina',
    clay:
      'Imagina que el modelo es una escultura hecha con miles de millones de bolitas de plastilina. Cada bolita es un numero (un "parametro"). "35B" significa 35 mil millones de bolitas. Mas bolitas = la escultura puede tener mas detalle (sabe mas), pero pesa mas y cuesta mas moverla.',
    real:
      'Para generar cada token, la GPU tiene que LEER los parametros que participan. Por eso la velocidad depende mas de cuantos bytes se leen por token que de la potencia de calculo.',
  },
  {
    icon: 'compress',
    title: 'Cuantizacion: aplastar las bolitas',
    clay:
      'Cada bolita originalmente se guarda con 16 bits (BF16). Cuantizar es aplastarla para que ocupe 8, 4 o hasta ~1.6 bits. La escultura pierde un poco de detalle, pero entra en una caja mucho mas chica.',
    real:
      'Q4_K_M, IQ4_XS, MXFP4 son formas distintas de aplastar. MXFP4 agrupa 32 numeros que comparten una escala: 4 bits cada uno + 8 bits de escala por grupo = 4.25 bits por parametro. Bonsai es ternario: cada peso vale -1, 0 o +1.',
  },
  {
    icon: 'groups',
    title: 'MoE: una cocina con 256 cocineros',
    clay:
      'Un modelo "Mezcla de Expertos" es una cocina con 256 cocineros especialistas por piso (40 pisos). Para cada palabra, un portero (el router) elige solo 8 cocineros. El resto descansa.',
    real:
      '"35B-A3B" = 35B parametros totales, pero solo ~3B Activos por token. Memoria de un 35B, velocidad parecida a un 3B. Ese es el truco de todo el video.',
  },
  {
    icon: 'table_restaurant',
    title: 'VRAM, RAM y ancho de banda: la mesa y la estanteria',
    clay:
      'La VRAM (8 GB) es tu mesa de trabajo: chica pero todo esta a mano. La RAM (31 GB) es una estanteria en otro cuarto: entra mucho mas, pero cada viaje es mas lento.',
    real:
      'La 3070 lee ~448 GB/s de su VRAM; tu RAM DDR4 ~40-50 GB/s. Por eso un modelo que no entra en VRAM se vuelve 10 veces mas lento... salvo que lo que dejes afuera se lea poco.',
  },
  {
    icon: 'move_down',
    title: '--cpu-moe: los cocineros se quedan en la estanteria',
    clay:
      'Como solo 8 de 256 cocineros trabajan por palabra, conviene dejarlos a TODOS en la estanteria (RAM) y tener en la mesa (VRAM) lo que se usa siempre: la atencion, el router, la libreta de apuntes.',
    real:
      'Con --cpu-moe los pesos de los expertos (~17 GiB) quedan en RAM y la CPU los calcula; el resto (~3 GiB + KV cache) va a la GPU. Por token solo se leen ~0.5 GiB de expertos desde RAM. --n-cpu-moe N es la version fina: deja en RAM solo los expertos de las primeras N capas y sube el resto a la GPU si sobra lugar.',
  },
  {
    icon: 'menu_book',
    title: 'Ventana de contexto y KV cache: la libreta',
    clay:
      'El modelo lleva una libreta donde anota cada palabra leida para no releer todo. La ventana de contexto (131072) es cuantas paginas tiene la libreta. q8_0 en la KV cache es escribir con letra mas chica: la libreta ocupa la mitad.',
    real:
      'Qwen3.5/3.6 es hibrido: solo 1 de cada 4 capas lleva libreta (atencion completa); las otras usan un resumen de tamano fijo. Por eso 131k tokens de contexto ocupan solo ~1.3 GiB en q8_0 en este modelo.',
  },
  {
    icon: 'psychology',
    title: 'Razonamiento: el borrador antes de contestar',
    clay:
      'Con --reasoning on el modelo escribe un borrador (pensamiento) antes de la respuesta. Mas borrador = mejor respuesta, pero mas espera.',
    real:
      'Lo central del video: Bonsai 27B piensa muchisimo (respuesta "one-shot" mejor pero lenta); el 35B-A3B piensa menos y es rapido (respuesta mas simple, iteras vos). No hay ganador: depende de si queres que el modelo itere solo o iterar vos con el.',
  },
  {
    icon: 'fast_forward',
    title: 'MTP: el ayudante que adivina',
    clay:
      'Un ayudante rapido adivina las proximas 2 palabras. El chef las revisa todas de una sola vez: si el ayudante acerto, ganaste 2 palabras por el precio de casi 1. Si fallo, se tira lo adivinado y no se pierde nada (solo un poco de tiempo).',
    real:
      'Multi-Token Prediction: el modelo trae una capa extra (nextn) entrenada para predecir el token siguiente al siguiente. --spec-type draft-mtp la usa como borrador y --spec-draft-n-max 2 limita cuantos tokens adivina. Con expertos en RAM, verificar varios tokens activa mas expertos distintos, asi que adivinar demasiado deja de convenir.',
  },
  {
    icon: 'visibility',
    title: 'mmproj: los ojos del modelo',
    clay:
      'El mmproj es un traductor que convierte una imagen en "palabras" que el modelo entiende. --image-min-tokens 1024 es pedirle que describa la imagen con al menos 1024 piezas: mas detalle, mas memoria y tiempo.',
    real:
      'Es un archivo aparte (~0.84 GiB en BF16). Si no vas a mandar imagenes, no lo cargues y ahorras memoria.',
  },
  {
    icon: 'memory',
    title: 'Hardware: NVIDIA vs Intel Arc',
    clay:
      'Tener la mejor herramienta no sirve si el manual esta a medio escribir. Intel Arc trae mas VRAM por precio, pero el software (kernels de llama.cpp) esta mucho mas pulido para CUDA.',
    real:
      'Por eso en el video una 3060 de 12 GB iguala o supera a una Arc B60 en tokens/s en muchos modelos, aunque en papel la Arc sea mas potente.',
  },
];

// One entry per line of the .bat shown in the video.
export const FLAGS = [
  { flag: 'llama-server.exe', what: 'El servidor de llama.cpp. Expone una API compatible con OpenAI. Aca usamos /home/juan/bin/llama-cuda/llama-server detras de llama-swap.' },
  { flag: '--model ...MXFP4_MOE.gguf', what: 'El archivo de pesos. OJO: tiene que ser el del repo unsloth/Qwen3.6-35B-A3B-MTP-GGUF; el del repo normal NO trae la capa MTP (verificado: 40 bloques, 0 tensores nextn).' },
  { flag: '--mmproj mmproj-BF16.gguf', what: 'Los "ojos": proyector de vision para mandarle imagenes.' },
  { flag: '--fit off', what: 'Apaga el ajuste automatico que elige capas en GPU/contexto para que entre en memoria. Off = vos decidis todo a mano.' },
  { flag: '--cpu-moe', what: 'Todos los expertos MoE quedan en RAM/CPU. Lo demas va a la GPU.' },
  { flag: '--spec-type draft-mtp', what: 'Decodificacion especulativa usando la capa MTP del propio modelo como "ayudante que adivina".' },
  { flag: '--spec-draft-n-max 2', what: 'Maximo de tokens que adivina el ayudante por paso.' },
  { flag: '--reasoning on', what: 'Fuerza el modo pensamiento (borrador antes de responder).' },
  { flag: '--ctx-size 131072', what: 'Ventana de contexto: 128k tokens (las paginas de la libreta).' },
  { flag: '--cache-type-k q8_0', what: 'Las claves (K) de la libreta se guardan en 8 bits en vez de 16.' },
  { flag: '--cache-type-v q8_0', what: 'Los valores (V) de la libreta tambien en 8 bits.' },
  { flag: '--parallel 1', what: 'Un solo usuario a la vez: toda la libreta para una conversacion. En modelos hibridos Qwen3.5 lo necesitamos para no quedarnos sin VRAM.' },
  { flag: '--temp 0.6', what: 'Temperatura: que tan "creativo" es al elegir la siguiente palabra. Proba el playground de abajo.' },
  { flag: '--top-p 0.95', what: 'Solo considera las palabras que juntas suman el 95% de probabilidad.' },
  { flag: '--top-k 20', what: 'Solo considera las 20 palabras mas probables.' },
  { flag: '--min-p 0.0', what: 'Descarta palabras con menos de X veces la probabilidad de la mejor. 0 = apagado.' },
  { flag: '--repeat-penalty 1.0', what: 'Castigo por repetir tokens. 1.0 = sin castigo.' },
  { flag: '--presence-penalty 0.0', what: 'Castigo por mencionar algo que ya aparecio. 0 = apagado (bueno para razonar: el pensamiento repite terminos a proposito).' },
  { flag: '--log-verbosity 4', what: 'Cuanto detalle escribe en los logs. Solo para depurar.' },
  { flag: '--image-min-tokens 1024', what: 'Minimo de tokens por imagen, lo que recomienda Qwen para que "vea" bien.' },
  { flag: '--alias Qwen3.6-35B-A3B', what: 'El nombre que muestra la API en /v1/models.' },
];

export const FACT_CHECKS = [
  {
    claim: '"MXFP4 se calcula de forma nativa en CPU con AVX/AVX2"',
    verdict: 'Impreciso',
    why: 'Ninguna CPU x86 de consumo tiene aritmetica FP4 nativa. llama.cpp desempaqueta los 4 bits en registros con AVX2 (tablas de busqueda) y es rapido, pero no es nativo. Lo que de verdad ayuda es que son 4.25 bits: menos bytes que traer de la RAM por token.',
  },
  {
    claim: '"Speculative recording con MTP"',
    verdict: 'Es "speculative decoding"',
    why: 'Error de transcripcion. Y requiere que el GGUF incluya la capa MTP: el repo normal de unsloth no la trae, el repo -MTP-GGUF si.',
  },
  {
    claim: '"Esfuerzo de razonamiento da igual, este modelo no lo tiene"',
    verdict: 'Correcto',
    why: 'Qwen3.6 solo tiene pensamiento on/off. Lo que si existe en llama.cpp es --reasoning-budget para cortar el pensamiento a N tokens.',
  },
  {
    claim: '"El modelo mas chico es peor porque es menos inteligente"',
    verdict: 'Matiz importante',
    why: 'En el video el 35B-A3B a veces hace menos errores que Bonsai 27B, no por ser mas listo sino porque intenta hacer menos cosas y esta menos cuantizado. Velocidad de tokens no es lo mismo que velocidad de respuesta: importa cuantos tokens de razonamiento necesita.',
  },
];
