const URL_PILOTOS = 'data/pilotos.json';
const URL_CONSTRUCTORES = 'data/constructores.json';
const URL_CARRERAS_INDEX = 'data/carreras_index.json';

// Duraciones en milisegundos
const DURACION_CARRERA = 3 * 60 * 60 * 1000; // 3 horas para FINALIZADA
const DURACION_EN_DIRECTO = 0; 

/**
 * Función genérica para obtener datos de un JSON
 * @param {string} url - La ruta del archivo JSON.
 */
async function fetchData(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error al cargar ${url}`);
    }
    return response.json();
}

/**
 * Función principal para cargar el contenido según los elementos presentes en la página.
 */
async function cargarContenidoPagina() {
    try {
        // --- 1. Cargar y renderizar Calendario (si existe el contenedor) ---
        // Esto cubre a index.html
        if (document.getElementById('calendario-list')) {
            const carreraUrls = await fetchData(URL_CARRERAS_INDEX);
            const carreraPromises = carreraUrls.map(url => fetchData(url));
            const calendario = await Promise.all(carreraPromises);
            
            renderizarCalendario(calendario);
            
            // Actualizar el estado del calendario cada segundo
            setInterval(() => renderizarCalendario(calendario, true), 1000);
        }

        // --- 2. Cargar y renderizar Tablas (si existe alguna tabla) ---
        // Esto cubre a pilotos.html y constructores.html
        if (document.getElementById('pilotos-table') || document.getElementById('constructores-table')) {
            const pilotos = await fetchData(URL_PILOTOS);
            const constructores = await fetchData(URL_CONSTRUCTORES);
            renderizarTablas(pilotos, constructores);
        }

    } catch (error) {
        console.error("Hubo un problema al cargar los datos:", error);
    }
}

/**
 * Renderiza las tablas de Pilotos y Constructores, SÓLO si el ID de tabla existe.
 */
function renderizarTablas(pilotosData, constructoresData) {
    
    // 1. Ordenar Pilotos por puntos (mayor a menor)
    const pilotosOrdenados = pilotosData.sort((a, b) => b.puntos - a.puntos);
    
    // 2. Ordenar Constructores por puntos (mayor a menor)
    const constructoresOrdenados = constructoresData.sort((a, b) => b.puntos - a.puntos);


    // --- Campeonato de Pilotos ---
    const tbodyPilotos = document.querySelector('#pilotos-table tbody');
    if (tbodyPilotos) {
        tbodyPilotos.innerHTML = '';
        pilotosOrdenados.forEach((p, index) => {
            const row = tbodyPilotos.insertRow();
            
            row.insertCell().textContent = index + 1; // Posición
            
            const fotoCell = row.insertCell();
            fotoCell.innerHTML = `<img src="${p.fotoURL}" alt="${p.piloto}" class="piloto-foto">`;

            row.insertCell().textContent = p.piloto;
            
            const equipoCell = row.insertCell();
            equipoCell.innerHTML = `<img src="${p.logoURL}" alt="${p.equipo} logo" class="equipo-logo">${p.equipo}`;
            
            row.insertCell().textContent = p.puntos;
        });
    }

    // --- Campeonato de Constructores ---
    const tbodyConstructores = document.querySelector('#constructores-table tbody');
    if (tbodyConstructores) {
        tbodyConstructores.innerHTML = '';
        constructoresOrdenados.forEach((c, index) => {
            const row = tbodyConstructores.insertRow();
            
            const posCell = row.insertCell();
            posCell.textContent = index + 1;
            posCell.classList.add('pos-col');
            
            const logoCell = row.insertCell();
            logoCell.innerHTML = `<img src="${c.logoURL}" alt="${c.equipo} logo" class="equipo-logo">`;
            logoCell.classList.add('logo-col');

            row.insertCell().textContent = c.equipo;
            
            const puntosCell = row.insertCell();
            puntosCell.textContent = c.puntos;
            puntosCell.classList.add('puntos-col');
        });
    }
}

/**
 * Renderiza y actualiza las tarjetas del calendario.
 */
function renderizarCalendario(calendario, soloActualizar = false) {
    const listContainer = document.getElementById('calendario-list');
    
    if (!listContainer) return; // Salir si el contenedor no existe

    if (!soloActualizar) {
        listContainer.innerHTML = ''; 
        // Primero ordenamos el calendario por fecha
        calendario.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        calendario.forEach(carrera => {
            const card = document.createElement('div');
            card.className = 'carrera-card';
            card.id = `carrera-${carrera.id}`;
            
            // Formatear la fecha a la zona horaria local del usuario
            const fechaLocal = new Date(carrera.fecha).toLocaleString('es-ES', { 
                day: 'numeric', month: 'short', year: 'numeric', 
                hour: '2-digit', minute: '2-digit', 
                timeZoneName: 'short' 
            });

            card.innerHTML = `
                <h3>${carrera.carrera}</h3>
                <p><strong>Pista:</strong> ${carrera.pista}</p>
                <p><strong>Inicio:</strong> ${fechaLocal}</p>
                <img src="${carrera.trackURL}" alt="Esquema de pista de ${carrera.carrera}" class="track-schema">
                <div class="status-box">
                    <span class="estado" id="status-${carrera.id}">...</span>
                </div>
            `;
            listContainer.appendChild(card);
        });
    }

    // Actualizar el estado de cada carrera (sea la carga inicial o la actualización de intervalo)
    calendario.forEach(carrera => {
        const card = document.getElementById(`carrera-${carrera.id}`);
        const statusElement = document.getElementById(`status-${carrera.id}`);
        if (card && statusElement) {
            actualizarEstadoCarrera(carrera, card, statusElement);
        }
    });
}

/**
 * Calcula y actualiza el estado (Cuenta Regresiva, En Directo, Finalizada).
 */
function actualizarEstadoCarrera(carrera, card, statusElement) {
    const ahora = new Date().getTime();
    const tiempoInicio = new Date(carrera.fecha).getTime();
    const tiempoFin = tiempoInicio + DURACION_CARRERA;
    const diferencia = tiempoInicio - ahora;

    statusElement.classList.remove('cuenta-regresiva', 'en-directo', 'finalizada');

    if (diferencia > DURACION_EN_DIRECTO) {
        // --- Cuenta Regresiva ---
        const dias = Math.floor(diferencia / (1000 * 60 * 60 * 24));
        const horas = Math.floor((diferencia % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutos = Math.floor((diferencia % (1000 * 60 * 60)) / (1000 * 60));
        const segundos = Math.floor((diferencia % (1000 * 60)) / 1000);

        statusElement.textContent = `Cuenta regresiva: ${dias}d ${horas}h ${minutos}m ${segundos}s`;
        statusElement.classList.add('cuenta-regresiva');
        card.style.opacity = 1;

    } else if (ahora < tiempoFin) {
        // --- EN DIRECTO ---
        statusElement.textContent = '🔴 EN DIRECTO';
        statusElement.classList.add('en-directo');
        card.style.opacity = 1;
        
    } else {
        // --- FINALIZADA (3 horas después del inicio) ---
        statusElement.textContent = '✅ FINALIZADA';
        statusElement.classList.add('finalizada');
        card.style.opacity = 0.8; 
    }
}

// Iniciar la aplicación al cargar el documento
document.addEventListener('DOMContentLoaded', cargarContenidoPagina);