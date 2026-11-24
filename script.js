
const API_URL = "https://6afe42993a0e70bc8d5336c7.mockapi.io/respuestas";
const TOTAL_ESTUDIANTES = 325;

const carreras = [
  {
    id: "psico",
    nombre: "Tecnicatura Superior en Psicopedagogía",
    total: 74,
    anios: [
      { nombre: "1.er año", clave: "1", total: 23 },
      { nombre: "2.º año", clave: "2", total: 19 },
      { nombre: "3.er año", clave: "3", total: 16 },
      { nombre: "4.º año", clave: "4", total: 16 }
    ]
  },
  {
    id: "terapia",
    nombre: "Acompañamiento Terapéutico",
    total: 182,
    anios: [
      { nombre: "1.er año", clave: "1", total: 96 },
      { nombre: "2.º año", clave: "2", total: 38 },
      { nombre: "3.er año", clave: "3", total: 48 }
    ]
  },
  {
    id: "software",
    nombre: "Tecnicatura en Desarrollo de Software",
    total: 69,
    anios: [
      { nombre: "1.er año", clave: "1", total: 12 },
      { nombre: "2.º año", clave: "2", total: 23 },
      { nombre: "3.er año", clave: "3", total: 34 }
    ]
  }
];

const CAMPOS_MULTIPLES = [
  "dificultades",
  "gusta",
  "aspectos_mejorar",
  "porque"
];

const graficos = {};
let datosEncuesta = [];

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function estaRespondido(valor) {
  if (valor === null || valor === undefined) return false;
  if (Array.isArray(valor)) return valor.length > 0;
  return String(valor).trim() !== "";
}

function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caracter => {
    const equivalencias = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return equivalencias[caracter];
  });
}

function obtenerCarrera(valor) {
  const texto = normalizar(valor);

  if (texto.includes("psicopedagogia") || texto.includes("psico")) return "psico";
  if (texto.includes("acompanamiento") || texto.includes("terapeutico")) return "terapia";
  if (texto.includes("software") || texto.includes("desarrollo")) return "software";

  return "";
}

function obtenerAnio(valor) {
  const texto = normalizar(valor);

  if (/^(4|4to|4to ano|cuarto|cuarto ano|4.? ano)$/.test(texto)) return "4";
  if (/^(3|3er|3ro|3er ano|tercer|tercero|tercer ano|3.? ano)$/.test(texto)) return "3";
  if (/^(2|2do|2do ano|segundo|segundo ano|2.? ano)$/.test(texto)) return "2";
  if (/^(1|1er|1ro|1er ano|primer|primero|primer ano|1.? ano)$/.test(texto)) return "1";

  if (texto.includes("4") || texto.includes("cuarto")) return "4";
  if (texto.includes("3") || texto.includes("tercer") || texto.includes("tercero")) return "3";
  if (texto.includes("2") || texto.includes("segundo")) return "2";
  if (texto.includes("1") || texto.includes("primer") || texto.includes("primero")) return "1";

  return "";
}

function obtenerValores(valor) {
  if (!estaRespondido(valor)) return [];

  if (Array.isArray(valor)) {
    return valor.flatMap(item => obtenerValores(item)).filter(Boolean);
  }

  const texto = String(valor).trim();

  try {
    const posibleArray = JSON.parse(texto);
    if (Array.isArray(posibleArray)) {
      return posibleArray.flatMap(item => obtenerValores(item)).filter(Boolean);
    }
  } catch (error) {}

  return texto.split(/[,;\n|]+/).map(item => item.trim()).filter(Boolean);
}

function porcentaje(parte, total) {
  if (!total) return 0;
  return Math.round((parte / total) * 100);
}

function contarRespuestas(datos, campo) {
  const conteo = {};
  let total = 0;

  datos.forEach(respuesta => {
    if (!estaRespondido(respuesta[campo])) return;

    total++;

    const valores = CAMPOS_MULTIPLES.includes(campo)
      ? obtenerValores(respuesta[campo])
      : [String(respuesta[campo]).trim()];

    valores.forEach(valor => {
      if (!valor) return;
      conteo[valor] = (conteo[valor] || 0) + 1;
    });
  });

  return { conteo, total };
}

function ordenarConteo(conteo, orden = []) {
  const claves = Object.keys(conteo);

  claves.sort((a, b) => {
    const na = normalizar(a);
    const nb = normalizar(b);
    const ia = orden.findIndex(opcion => na === normalizar(opcion));
    const ib = orden.findIndex(opcion => nb === normalizar(opcion));

    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }

    return conteo[b] - conteo[a];
  });

  return claves;
}

function buscarConteo(conteo, texto) {
  const buscado = normalizar(texto);
  const clave = Object.keys(conteo).find(item => normalizar(item) === buscado);
  return clave ? conteo[clave] : 0;
}

function contarSiNo(datos) {
  let si = 0;
  let no = 0;

  datos.forEach(respuesta => {
    const valor = normalizar(respuesta.asincronicas);

    if (valor.startsWith("si")) si++;
    else if (valor.startsWith("no")) no++;
  });

  return { si, no };
}

function cambiarEstado(conectado) {
  const punto = document.getElementById("puntoEstado");
  const texto = document.getElementById("textoEstado");

  if (!punto || !texto) return;

  punto.classList.remove("online", "offline");
  punto.classList.add(conectado ? "online" : "offline");

  texto.textContent = conectado
    ? "Datos actualizados"
    : "Sin conexión con MockAPI";
}

/* NAVEGACIÓN */

function cambiarPagina(pagina) {
  document.querySelectorAll(".page").forEach(seccion => {
    seccion.classList.remove("active");
  });

  document.querySelectorAll(".nav-btn").forEach(boton => {
    boton.classList.remove("active");
  });

  const seccion = document.getElementById(pagina);
  const boton = document.querySelector(`[data-page="${pagina}"]`);

  if (seccion) seccion.classList.add("active");
  if (boton) boton.classList.add("active");

  if (pagina === "pagina-resultados" && datosEncuesta.length > 0) {
    mostrarResultados(datosEncuesta);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-btn").forEach(boton => {
  boton.addEventListener("click", () => cambiarPagina(boton.dataset.page));
});

/* PANEL GENERAL */

function actualizarGeneral(datos) {
  const total = datos.length;
  const porcentajeGeneral = porcentaje(total, TOTAL_ESTUDIANTES);
  const conteoSiNo = contarSiNo(datos);

  document.getElementById("totalRespuestas").textContent = total;
  document.getElementById("totalEstudiantes").textContent = TOTAL_ESTUDIANTES;
  document.getElementById("porcentajeGeneral").textContent = porcentajeGeneral + "%";
  document.getElementById("totalSi").textContent = conteoSiNo.si;
  document.getElementById("avanceGeneral").textContent = porcentajeGeneral + "%";

  document.getElementById("barraGeneral").style.width =
    Math.min(porcentajeGeneral, 100) + "%";

  document.getElementById("ultimaActualizacion").textContent =
    new Date().toLocaleString("es-AR");

  const contenedor = document.getElementById("tarjetasCarreras");
  contenedor.innerHTML = "";

  carreras.forEach(carrera => {
    const respuestas = datos.filter(
      item => obtenerCarrera(item.carrera) === carrera.id
    );

    const participacion = porcentaje(respuestas.length, carrera.total);

    contenedor.innerHTML += `
      <article class="career-card">
        <h3>${escaparHTML(carrera.nombre)}</h3>
        <div class="career-number">${respuestas.length}</div>
        <p>Respuestas de ${carrera.total} estudiantes</p>
        <span class="career-percent">${participacion}% de participación</span>
        <div class="progress-track">
          <div class="progress-fill" style="width:${Math.min(participacion, 100)}%"></div>
        </div>
      </article>
    `;
  });
}

/* PÁGINAS DE CARRERAS */

function actualizarCarrera(id) {
  const carrera = carreras.find(item => item.id === id);
  if (!carrera) return;

  const respuestas = datosEncuesta.filter(
    item => obtenerCarrera(item.carrera) === id
  );

  const participacion = porcentaje(respuestas.length, carrera.total);

  document.getElementById(id + "Respuestas").textContent = respuestas.length;
  document.getElementById(id + "Porcentaje").textContent = participacion + "%";

  const contenedor = document.getElementById(id + "Anios");
  contenedor.innerHTML = "";

  carrera.anios.forEach(anio => {
    const cantidad = respuestas.filter(
      item => obtenerAnio(item.anio) === anio.clave
    ).length;

    const porcentajeAnio = porcentaje(cantidad, anio.total);

    contenedor.innerHTML += `
      <div class="year-item">
        <span class="year-name">${escaparHTML(anio.nombre)}</span>
        <div class="year-bar">
          <div class="year-bar-fill" style="width:${Math.min(porcentajeAnio, 100)}%"></div>
        </div>
        <span class="year-value">${cantidad} de ${anio.total} · ${porcentajeAnio}%</span>
      </div>
    `;
  });
}

/* GRÁFICOS */

function esRespuestaNegativa(nombre) {
  const texto = normalizar(nombre);

  return (
    texto.startsWith("no") ||
    texto.includes("prefiero presencial") ||
    texto === "menos" ||
    texto === "nunca" ||
    texto === "casi nunca" ||
    texto.includes("falta de")
  );
}

function colorPorCategoria(nombre, indice) {
  if (esRespuestaNegativa(nombre)) return "#f07878";

  const colores = [
    "#8295ff", "#54d6c7", "#f2bd69", "#d18cff",
    "#78a9e8", "#8ed69a", "#e5a1ff", "#f1a27d"
  ];

  return colores[indice % colores.length];
}

function crearGrafico(id, datos, opciones = {}) {
  const canvas = document.getElementById(id);
  if (!canvas || typeof Chart === "undefined") return;

  if (graficos[id]) {
    graficos[id].destroy();
  }

  const etiquetas = datos.map(item => item.nombre);
  const valores = datos.map(item => item.cantidad);
  const horizontal = opciones.horizontal ?? false;

  const colores = etiquetas.map((nombre, indice) =>
    colorPorCategoria(nombre, indice)
  );

  graficos[id] = new Chart(canvas, {
    type: opciones.tipo || "bar",
    data: {
      labels: etiquetas,
      datasets: [{
        label: "Cantidad de respuestas",
        data: valores,
        backgroundColor: colores,
        borderRadius: 7,
        borderWidth: 0
      }]
    },
    options: {
      indexAxis: horizontal ? "y" : "x",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: opciones.tipo === "doughnut" || opciones.tipo === "pie",
          labels: {
            color: "#dce4f7",
            padding: 15,
            font: { size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: context => ` ${context.raw} respuestas`
          }
        }
      },
      scales: opciones.tipo === "doughnut" || opciones.tipo === "pie"
        ? {}
        : {
            x: {
              beginAtZero: true,
              ticks: { color: "#9ba9c2", precision: 0 },
              grid: { color: "#293650" }
            },
            y: {
              ticks: { color: "#dce4f7", font: { size: 11 } },
              grid: { display: false }
            }
          }
    }
  });
}

function datosParaGrafico(conteo, orden = []) {
  return ordenarConteo(conteo, orden).map(nombre => ({
    nombre,
    cantidad: conteo[nombre]
  }));
}

function mostrarCategoriaFija(id, datos, campo, opciones, tipo = "bar") {
  const resultado = contarRespuestas(datos, campo);

  const elementos = opciones.map(nombre => ({
    nombre,
    cantidad: buscarConteo(resultado.conteo, nombre)
  }));

  Object.keys(resultado.conteo).forEach(nombre => {
    const existe = opciones.some(opcion =>
      normalizar(opcion) === normalizar(nombre)
    );

    if (!existe) {
      elementos.push({ nombre, cantidad: resultado.conteo[nombre] });
    }
  });

  crearGrafico(id, elementos, {
    tipo,
    horizontal: tipo === "bar"
  });
}

/* LISTAS DE SELECCIÓN MÚLTIPLE */

function mostrarListaMultiple(id, datos, campo) {
  const contenedor = document.getElementById(id);
  if (!contenedor) return;

  const resultado = contarRespuestas(datos, campo);
  const opciones = ordenarConteo(resultado.conteo);

  if (!opciones.length || !resultado.total) {
    contenedor.innerHTML =
      '<p class="empty-message">Todavía no hay respuestas registradas.</p>';
    return;
  }

  contenedor.innerHTML = "";

  opciones.forEach(opcion => {
    const cantidad = resultado.conteo[opcion];
    const porcentajeOpcion = porcentaje(cantidad, resultado.total);
    const esNegativa = esRespuestaNegativa(opcion);

    contenedor.innerHTML += `
      <div class="answer-row ${esNegativa ? "negative" : ""}">
        <div class="answer-info">
          <span>${escaparHTML(opcion)}</span>
          <strong>${cantidad} · ${porcentajeOpcion}%</strong>
        </div>
        <div class="answer-track">
          <div class="answer-fill" style="width:${porcentajeOpcion}%"></div>
        </div>
      </div>
    `;
  });
}

/* RESULTADOS DE LA ENCUESTA */

function mostrarResultados(datos) {
  if (typeof Chart === "undefined") {
    console.error("No se pudo cargar Chart.js.");
    return;
  }

  const conAsincronicas = datos.filter(item =>
    normalizar(item.asincronicas).startsWith("si")
  );

  const sinAsincronicas = datos.filter(item =>
    normalizar(item.asincronicas).startsWith("no")
  );

  document.getElementById("resultadosTotal").textContent =
    `${datos.length} respuestas analizadas`;

  const porCarrera = carreras.map(carrera => ({
    nombre: carrera.nombre.replace("Tecnicatura Superior en ", ""),
    cantidad: datos.filter(
      item => obtenerCarrera(item.carrera) === carrera.id
    ).length
  }));

  crearGrafico("graficoCarreras", porCarrera, { tipo: "doughnut" });

  mostrarCategoriaFija("graficoAsincronicas", datos, "asincronicas", [
    "Sí, en varias materias",
    "Sí, en algunas materias",
    "No, en ninguna"
  ], "doughnut");

  mostrarCategoriaFija("graficoConformidad", conAsincronicas, "conformidad",
    ["1", "2", "3", "4", "5"]);

  mostrarCategoriaFija("graficoAprendizaje", conAsincronicas, "aprendizaje",
    ["Menos", "Igual", "Más"]);

  mostrarCategoriaFija("graficoMateriales", conAsincronicas, "materiales", [
    "Sí, totalmente",
    "Mayormente",
    "No, tengo que buscar material extra"
  ]);

  mostrarCategoriaFija("graficoAcompanamiento", conAsincronicas, "acompanamiento", [
    "Sí, siempre o casi siempre",
    "A veces",
    "Casi nunca",
    "Nunca"
  ]);

  mostrarListaMultiple("listaDificultades", conAsincronicas, "dificultades");
  mostrarListaMultiple("listaGusta", conAsincronicas, "gusta");
  mostrarListaMultiple("listaMejorar", conAsincronicas, "aspectos_mejorar");
  mostrarListaMultiple("listaPorque", conAsincronicas, "porque");

  mostrarCategoriaFija("graficoModalidad", conAsincronicas, "modalidad", [
    "Asincrónica", "Presencial", "Virtual en vivo", "Mixta"
  ], "doughnut");

  mostrarCategoriaFija("graficoMasMaterias", conAsincronicas, "mas_materias", [
    "Sí, en todas", "Sí, en algunas", "No"
  ], "doughnut");

  mostrarCategoriaFija("graficoMotivoNo", sinAsincronicas, "n_motivo", [
    "En mi carrera no se ofrecen",
    "Mi carrera es presencial por su naturaleza",
    "Por falta de equipo o conexión",
    "Otro"
  ]);

  mostrarCategoriaFija("graficoDeseo", sinAsincronicas, "n_quiere", [
    "Sí, en todas las materias",
    "Sí, en algunas materias",
    "Me es indiferente",
    "No, prefiero presencial"
  ], "doughnut");

  mostrarCategoriaFija("graficoVideos", sinAsincronicas, "n_videos", [
    "Sí, seguido",
    "A veces",
    "Casi nunca o nunca"
  ]);

  crearConclusiones(datos, conAsincronicas, sinAsincronicas);
}

/* CONCLUSIONES AUTOMÁTICAS */

function agregarConclusion(contenedor, texto) {
  const elemento = document.createElement("div");
  elemento.className = "conclusion-item";
  elemento.innerHTML = texto;
  contenedor.appendChild(elemento);
}

function crearConclusiones(datos, conAsincronicas, sinAsincronicas) {
  const contenedor = document.getElementById("conclusiones");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  const total = datos.length;
  const conteoSiNo = contarSiNo(datos);
  const participacion = porcentaje(total, TOTAL_ESTUDIANTES);
  const porcentajeSi = porcentaje(conteoSiNo.si, total);
  const porcentajeNo = porcentaje(conteoSiNo.no, total);

  agregarConclusion(
    contenedor,
    `Se recibieron <strong>${total} respuestas</strong> de una población de ${TOTAL_ESTUDIANTES} estudiantes. Esto representa una participación del <strong>${participacion}%</strong>.`
  );

  agregarConclusion(
    contenedor,
    `Sobre la disponibilidad de clases asincrónicas, <strong>${conteoSiNo.si} estudiantes (${porcentajeSi}%)</strong> indicaron que sí tienen esta modalidad, mientras que <strong>${conteoSiNo.no} (${porcentajeNo}%)</strong> respondieron que no.`
  );

  if (conAsincronicas.length > 0) {
    const conformidad = contarRespuestas(conAsincronicas, "conformidad");

    if (conformidad.total > 0) {
      const positivas =
        buscarConteo(conformidad.conteo, "4") +
        buscarConteo(conformidad.conteo, "5");

      agregarConclusion(
        contenedor,
        `Entre quienes tienen clases asincrónicas, ${conformidad.total} respondieron la pregunta sobre conformidad. ${positivas} eligieron las calificaciones 4 o 5 (${porcentaje(positivas, conformidad.total)}%).`
      );
    }

    const aprendizaje = contarRespuestas(conAsincronicas, "aprendizaje");

    if (aprendizaje.total > 0) {
      const claveMayor = ordenarConteo(aprendizaje.conteo, [
        "Menos", "Igual", "Más"
      ])[0];

      if (claveMayor) {
        agregarConclusion(
          contenedor,
          `En relación con el aprendizaje, la respuesta más frecuente fue <strong>“${escaparHTML(claveMayor)}”</strong>, seleccionada por ${aprendizaje.conteo[claveMayor]} estudiantes (${porcentaje(aprendizaje.conteo[claveMayor], aprendizaje.total)}%).`
        );
      }
    }

    const modalidad = contarRespuestas(conAsincronicas, "modalidad");

    if (modalidad.total > 0) {
      const claveMayor = ordenarConteo(modalidad.conteo)[0];

      agregarConclusion(
        contenedor,
        `La modalidad más elegida fue <strong>“${escaparHTML(claveMayor)}”</strong>, con ${modalidad.conteo[claveMayor]} respuestas (${porcentaje(modalidad.conteo[claveMayor], modalidad.total)}%).`
      );
    }
  }

  if (sinAsincronicas.length > 0) {
    const deseo = contarRespuestas(sinAsincronicas, "n_quiere");

    if (deseo.total > 0) {
      const interes = Object.entries(deseo.conteo)
        .filter(([opcion]) => normalizar(opcion).startsWith("si"))
        .reduce((suma, [, cantidad]) => suma + cantidad, 0);

      agregarConclusion(
        contenedor,
        `Entre quienes no tienen clases asincrónicas, ${interes} de ${deseo.total} manifestaron interés en incorporarlas en todas o algunas materias (${porcentaje(interes, deseo.total)}%).`
      );
    }
  }

  agregarConclusion(
    contenedor,
    "Los resultados permiten conocer las experiencias y opiniones de los estudiantes. Para interpretar las tendencias, es importante considerar la cantidad de respuestas obtenidas y que la participación no necesariamente representa a toda la población."
  );
}

/* CONEXIÓN CON MOCKAPI */

async function cargarDatos() {
  try {
    const respuesta = await fetch(API_URL);

    if (!respuesta.ok) {
      throw new Error("No se pudieron obtener las respuestas de MockAPI.");
    }

    const datos = await respuesta.json();

    if (!Array.isArray(datos)) {
      throw new Error("El formato recibido no es una lista de respuestas.");
    }

    datosEncuesta = datos;

    cambiarEstado(true);
    actualizarGeneral(datosEncuesta);

    actualizarCarrera("psico");
    actualizarCarrera("terapia");
    actualizarCarrera("software");

    mostrarResultados(datosEncuesta);

  } catch (error) {
    console.error("Error al cargar la encuesta:", error);
    cambiarEstado(false);

    document.getElementById("ultimaActualizacion").textContent =
      "No se pudieron actualizar los datos";
  }
}

cargarDatos();
setInterval(cargarDatos, 30000);
