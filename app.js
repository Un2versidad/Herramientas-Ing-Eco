const maxPeriodAllowed = 20;
let canvas, ctx;
let alternativas = [];
let escenarios = [];

let cashFlows = [{
    period: 0,
    amount: -120000
}, {
    period: 2,
    amount: 50000
}, {
    period: 7,
    amount: 50000
}, {
    period: 13,
    amount: 40000
}];

document.body.style.overflow = 'hidden';
document.body.addEventListener('wheel', (event) => {
    window.scrollBy({
        top: event.deltaY,
        behavior: 'smooth'
    });
});

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    // Seleccionar elementos relevantes
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const navTabs = document.querySelectorAll('.nav-tab, .nav-tab-mobile');
    const tabContents = document.querySelectorAll('.tab-content');

    // Función para alternar el menú móvil
    menuToggle.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    function actualizarCopyright() {
        const elementoCopyright = document.querySelector('footer div.border-t.border-gray-800.mt-8.pt-8.text-center.text-gray-400 p');
        if (elementoCopyright) {
            const añoActual = new Date().getFullYear();
            let textoCopyright = elementoCopyright.textContent;
            // Buscar y reemplazar el año en el texto de copyright
            textoCopyright = textoCopyright.replace(/© \d{4}/, `© ${añoActual}`);
            elementoCopyright.textContent = textoCopyright;
        }
    }

    // Función para manejar la activación de pestañas
    function activateTab(tab) {
        // Desactivar todas las pestañas
        navTabs.forEach((navTab) => {
            navTab.classList.remove('active');
        });

        // Ocultar todos los contenidos de las pestañas
        tabContents.forEach((content) => {
            content.classList.add('hidden');
        });

        // Activar la pestaña seleccionada
        tab.classList.add('active');

        // Mostrar el contenido correspondiente a la pestaña
        const targetTab = tab.getAttribute('data-tab');
        const targetContent = document.getElementById(targetTab);
        if (targetContent) {
            targetContent.classList.remove('hidden');
        }
    }

    // Agregar eventos a las pestañas
    navTabs.forEach((navTab) => {
        navTab.addEventListener('click', () => {
            activateTab(navTab);

            // Cerrar el menú móvil si está abierto
            if (!mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
            }
        });
    });

    // Activar la primera pestaña por defecto
    const defaultTab = document.querySelector('.nav-tab.active') || navTabs[0];
    if (defaultTab) {
        activateTab(defaultTab);
    }

    // Inicializar el canvas para el diagrama de flujo
    canvas = document.getElementById('cashFlowCanvas');
    ctx = canvas.getContext('2d');

    // Inicializar búsqueda para cada sección
    initializeSearch();

    // Inicializar actualizador para copyright
    actualizarCopyright();
});

const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fade-in`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
};

function calcularFactores() {
    var tasa = parseFloat(document.getElementById('tasa').value) / 100;
    var periodos = parseInt(document.getElementById('periodos').value);

    if (isNaN(tasa) || isNaN(periodos)) {
        showToast('Por favor, ingrese valores numéricos válidos para la tasa de interés y el número de períodos.');
        return;
    }

    if (tasa <= 0 || periodos <= 0) {
        showToast('Por favor, ingrese valores positivos para la tasa de interés y el número de períodos.');
        return;
    }

    var factorFP = Math.pow(1 + tasa, periodos);
    var factorPF = 1 / factorFP;
    var factorAF = tasa / (factorFP - 1);
    var factorFA = 1 / factorAF;
    var factorAP = (factorFP - 1) / (tasa * factorFP);
    var factorPA = 1 / factorAP;
    var factorPG_num = factorPF * ((Math.pow(1 + tasa, periodos) - (tasa * periodos) - 1) / Math.pow(tasa, 2));
    var factorPG_den = 1;
    var factorPG = factorPG_num / factorPG_den;

    var factorAG = (1 / tasa) - (periodos / (factorFP - 1));


    document.getElementById('factor-FP').textContent = factorFP.toFixed(3);
    document.getElementById('factor-PF').textContent = factorPF.toFixed(3);
    document.getElementById('factor-AF').textContent = factorAF.toFixed(3);
    document.getElementById('factor-FA').textContent = factorFA.toFixed(3);
    document.getElementById('factor-AP').textContent = factorAP.toFixed(3);
    document.getElementById('factor-PA').textContent = factorPA.toFixed(3);
    document.getElementById('factor-PG').textContent = factorPG.toFixed(3);
    document.getElementById('factor-AG').textContent = factorAG.toFixed(3);
}

function calcularValorPresente() {
    var vf = parseFloat(document.getElementById('vp-vf').value);
    var tasa = parseFloat(document.getElementById('vp-tasa').value) / 100;
    var periodos = parseInt(document.getElementById('vp-periodos').value);

    if (isNaN(vf) || isNaN(tasa) || isNaN(periodos)) {
        showToast('Por favor, ingrese valores numéricos válidos para el valor futuro, la tasa de interés y el número de períodos.');
        return;
    }
    if (tasa <= 0 || periodos <= 0) {
        showToast('Por favor, ingrese valores positivos para la tasa de interés y el número de períodos.');
        return;
    }


    var vp = vf / Math.pow(1 + tasa, periodos);

    document.getElementById('valor-presente').textContent = vp.toFixed(2);
}

function calcularValorFuturo() {
    var vp = parseFloat(document.getElementById('vf-vp').value);
    var tasa = parseFloat(document.getElementById('vf-tasa').value) / 100;
    var periodos = parseInt(document.getElementById('vf-periodos').value);

    if (isNaN(vp) || isNaN(tasa) || isNaN(periodos)) {
        showToast('Por favor, ingrese valores numéricos válidos para el valor presente, la tasa de interés y el número de períodos.');
        return;
    }
    if (tasa <= 0 || periodos <= 0) {
        showToast('Por favor, ingrese valores positivos para la tasa de interés y el número de períodos.');
        return;
    }

    var vf = vp * Math.pow(1 + tasa, periodos);

    document.getElementById('valor-futuro').textContent = vf.toFixed(2);
}

function calcularVPN() {
    var inversion = parseFloat(document.getElementById('vpn-inversion').value);
    var tasaDescuento = parseFloat(document.getElementById('vpn-tasa-descuento').value) / 100;
    var flujoCaja = parseFloat(document.getElementById('vpn-flujo-caja').value);
    var periodos = parseInt(document.getElementById('vpn-periodos').value);

    if (isNaN(inversion) || isNaN(tasaDescuento) || isNaN(flujoCaja) || isNaN(periodos)) {
        showToast('Por favor, ingrese valores numéricos válidos para todos los campos de la calculadora VPN.');
        return;
    }
    if (tasaDescuento <= 0 || periodos <= 0) {
        showToast('Por favor, ingrese valores positivos para la tasa de descuento y el número de períodos.');
        return;
    }

    var vpn = -inversion;
    for (let i = 1; i <= periodos; i++) {
        vpn += flujoCaja / Math.pow(1 + tasaDescuento, i);
    }

    document.getElementById('valor-vpn').textContent = vpn.toFixed(2);
}

// Función para calcular factores de ingeniería económica
function calcularFactores() {
    const tasa = parseFloat(document.getElementById('tasa').value) / 100;
    const periodos = parseInt(document.getElementById('periodos').value);

    if (isNaN(tasa) || isNaN(periodos)) {
        showToast('Por favor ingrese valores válidos');
        return;
    }

    // Calcular factores
    const factores = {
        'FP': Math.pow(1 + tasa, periodos),
        'PF': 1 / Math.pow(1 + tasa, periodos),
        'AF': tasa / (Math.pow(1 + tasa, periodos) - 1),
        'FA': (Math.pow(1 + tasa, periodos) - 1) / tasa,
        'AP': (tasa * Math.pow(1 + tasa, periodos)) / (Math.pow(1 + tasa, periodos) - 1),
        'PA': (Math.pow(1 + tasa, periodos) - 1) / (tasa * Math.pow(1 + tasa, periodos)),
        'PG': (Math.pow(1 + tasa, periodos) - tasa * periodos - 1) / (Math.pow(tasa, 2) * Math.pow(1 + tasa, periodos)),
        'AG': 1 / tasa - periodos / (Math.pow(1 + tasa, periodos) - 1)
    };

    // Actualizar resultados en la interfaz
    Object.keys(factores).forEach(factor => {
        document.getElementById(`factor-${factor}`).textContent = factores[factor].toFixed(4);
    });
}

// Función para calcular valor del bono
function calcularBono() {
    const valorNominal = parseFloat(document.getElementById('bondFaceValue').value);
    const tasaCupon = parseFloat(document.getElementById('bondCouponRate').value) / 100;
    const tasaMercado = parseFloat(document.getElementById('bondMarketRate').value) / 100;
    const anos = parseInt(document.getElementById('bondYears').value);
    const frecuenciaPago = parseInt(document.getElementById('bondPaymentFreq').value);

    if ([valorNominal, tasaCupon, tasaMercado, anos].some(isNaN)) {
        showToast('Por favor ingrese todos los valores');
        return;
    }

    const n = anos * frecuenciaPago;
    const i = tasaMercado / frecuenciaPago;
    const cupon = (tasaCupon * valorNominal) / frecuenciaPago;

    // Calcular valor presente
    let vp = 0;
    let duracion = 0;
    let convexidad = 0;

    for (let t = 1; t <= n; t++) {
        const factor = 1 / Math.pow(1 + i, t);
        vp += cupon * factor;
        duracion += t * cupon * factor;
        convexidad += t * (t + 1) * cupon * factor;
    }

    // Añadir valor nominal
    vp += valorNominal / Math.pow(1 + i, n);
    duracion += n * valorNominal / Math.pow(1 + i, n);
    convexidad += n * (n + 1) * valorNominal / Math.pow(1 + i, n);

    // Calcular métricas finales
    duracion = duracion / vp / frecuenciaPago;
    convexidad = convexidad / (vp * Math.pow(1 + i, 2)) / Math.pow(frecuenciaPago, 2);
    const prima = vp - valorNominal;

    // Actualizar resultados
    document.getElementById('bondPV').textContent = vp.toFixed(2);
    document.getElementById('bondPremium').textContent = prima.toFixed(2);
    document.getElementById('bondDuration').textContent = duracion.toFixed(2);
    document.getElementById('bondConvexity').textContent = convexidad.toFixed(4);

    // Generar tabla de amortización
    generarTablaAmortizacion(valorNominal, cupon, n);
}

function generarTablaAmortizacion(valorNominal, cupon, periodos) {
    const tabla = document.getElementById('bondAmortizationTable');
    tabla.innerHTML = '';

    let saldoInicial = valorNominal;

    for (let t = 1; t <= periodos; t++) {
        const interes = cupon;
        const amortizacion = t === periodos ? saldoInicial : 0;
        const pagoTotal = interes + amortizacion;
        const saldoFinal = saldoInicial - amortizacion;

        const row = tabla.insertRow();
        row.innerHTML = `
<td class='px-6 py-4 text-sm text-gray-900 text-center'>${t}</td>
<td class='px-6 py-4 text-sm text-gray-900 text-center'>${saldoInicial.toFixed(2)}</td>
<td class='px-6 py-4 text-sm text-gray-900 text-center'>${interes.toFixed(2)}</td>
<td class='px-6 py-4 text-sm text-gray-900 text-center'>${amortizacion.toFixed(2)}</td>
<td class='px-6 py-4 text-sm text-gray-900 text-center'>${pagoTotal.toFixed(2)}</td>
<td class='px-6 py-4 text-sm text-gray-900 text-center'>${saldoFinal.toFixed(2)}</td>
`;

        saldoInicial = saldoFinal;
    }
}

// Funciones para el análisis de reemplazo
function calcularReemplazo() {
    const costoNuevo = parseFloat(document.getElementById('newAssetCost').value);
    const valorMercado = parseFloat(document.getElementById('currentMarketValue').value);
    const costosOMActuales = parseFloat(document.getElementById('currentOM').value);
    const costosOMNuevos = parseFloat(document.getElementById('newOM').value);
    const tasa = parseFloat(document.getElementById('replacementRate').value) / 100;

    if ([costoNuevo, valorMercado, costosOMActuales, costosOMNuevos, tasa].some(isNaN)) {
        showToast('Por favor ingrese todos los valores');
        return;
    }

    const ahorroAnual = costosOMActuales - costosOMNuevos;
    const inversionInicial = costoNuevo - valorMercado;
    const vpn = -inversionInicial + (ahorroAnual / tasa) * (1 - 1 / Math.pow(1 + tasa, 10));

    const decision = document.getElementById('replacementDecision');
    decision.textContent = vpn > 0 ?
        'Se recomienda reemplazar el activo' :
        'No se recomienda reemplazar el activo';
    decision.className = vpn > 0 ? 'text-green-600' : 'text-red-600';
}
// Funciones para el análisis de depreciación
function calcularDepreciacion() {
    const costoInicial = parseFloat(document.getElementById('depCost').value);
    const valorSalvamento = parseFloat(document.getElementById('depSalvage').value);
    const vidaUtil = parseInt(document.getElementById('depLife').value);
    const metodo = document.getElementById('depMethod').value;

    if ([costoInicial, valorSalvamento, vidaUtil].some(isNaN)) {
        showToast('Por favor ingrese todos los valores');
        return;
    }

    const tabla = document.getElementById('depTableBody');
    tabla.innerHTML = '';

    let valorLibros = costoInicial;
    const depreciable = costoInicial - valorSalvamento;

    for (let año = 1; año <= vidaUtil; año++) {
        let depreciacion;

        switch (metodo) {
            case 'sl': // Línea recta
                depreciacion = depreciable / vidaUtil;
                break;
            case 'syd': // Suma de años dígitos
                const suma = (vidaUtil * (vidaUtil + 1)) / 2;
                depreciacion = (depreciable * (vidaUtil - año + 1)) / suma;
                break;
            case 'db': // Saldo decreciente
                depreciacion = valorLibros * (2 / vidaUtil);
                if (año === vidaUtil) {
                    depreciacion = valorLibros - valorSalvamento;
                }
                break;
        }

        valorLibros -= depreciacion;

        const row = tabla.insertRow();
        row.innerHTML = `
   <td class='px-6 py-4 text-sm text-gray-900 text-center'>${año}</td>
   <td class='px-6 py-4 text-sm text-gray-900 text-center'>${depreciacion.toFixed(2)}</td>
   <td class='px-6 py-4 text-sm text-gray-900 text-center'>${valorLibros.toFixed(2)}</td>
  `;
    }
}


// Funciones para el análisis de sensibilidad
function analizarSensibilidad() {
    // Obtener valores de entrada
    const inversionInicial = parseFloat(document.getElementById('sensInitialInv').value);
    const flujoBase = parseFloat(document.getElementById('sensBaseFlow').value);
    const tasaBase = parseFloat(document.getElementById('sensBaseRate').value) / 100;
    const variacion = parseFloat(document.getElementById('sensVariation').value) / 100;

    // Validar que todos los valores sean números
    if ([inversionInicial, flujoBase, tasaBase, variacion].some(isNaN)) {
        showToast('Por favor ingrese todos los valores');
        return;
    }

    // Calcular puntos para el gráfico
    const puntos = [];
    for (let i = -2; i <= 2; i++) {
        const flujo = flujoBase * (1 + i * variacion);
        const vpn = -inversionInicial + flujo * ((1 - Math.pow(1 + tasaBase, -10)) / tasaBase);
        puntos.push({
            x: i,
            y: vpn
        });
    }

    // Extraer datos para el gráfico
    const labels = puntos.map(p => p.x); // Eje X
    const data = puntos.map(p => p.y); // Eje Y

    // Configurar el gráfico con Chart.js
    const ctx = document.getElementById('sensitivityChart').getContext('2d');

    // Destruir el gráfico anterior si existe
    if (window.sensitivityChart instanceof Chart) {
        window.sensitivityChart.destroy();
    }

    // Crear el nuevo gráfico
    window.sensitivityChart = new Chart(ctx, {
        type: 'line', // Tipo de gráfico
        data: {
            labels: labels, // Etiquetas del eje X
            datasets: [{
                label: 'VPN',
                data: data, // Datos del eje Y
                borderColor: 'blue', // Color de la línea
                borderWidth: 2, // Grosor de la línea
                fill: false, // No rellenar debajo de la línea
                pointBackgroundColor: 'blue', // Color de los puntos
                pointRadius: 4 // Tamaño de los puntos
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Variación (%)' // Etiqueta del eje X
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Valor Presente Neto (VPN)' // Etiqueta del eje Y
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    enabled: true
                }
            }
        }
    });
}

function agregarEscenario() {
    const tipo = document.getElementById('scenarioType').value;
    const probabilidad = parseFloat(document.getElementById('scenarioProb').value) / 100;
    const vpn = parseFloat(document.getElementById('scenarioNPV').value);

    if ([probabilidad, vpn].some(isNaN)) {
        showToast('Por favor ingrese todos los valores');
        return;
    }

    escenarios.push({
        tipo,
        probabilidad,
        vpn
    });
    actualizarTablaEscenarios();
}

function actualizarTablaEscenarios() {
    const tabla = document.getElementById('scenariosTable');
    tabla.innerHTML = '';

    escenarios.forEach(escenario => {
        const vpnPonderado = escenario.vpn * escenario.probabilidad;
        const row = tabla.insertRow();
        row.innerHTML = `
<td class='px-6 py-4 text-sm text-gray-900 text-center'>${escenario.tipo}</td>
<td class='px-6 py-4 text-sm text-gray-900 text-center'>${(escenario.probabilidad * 100).toFixed(1)}%</td>
<td class='px-6 py-4 text-sm text-gray-900 text-center'>${escenario.vpn.toFixed(2)}</td>
<td class='px-6 py-4 text-sm text-gray-900 text-center'>${vpnPonderado.toFixed(2)}</td>
`;
    });
}

function calcularEscenarios() {
    if (escenarios.length === 0) {
        showToast('Agregue al menos un escenario');
        return;
    }

    const sumProb = escenarios.reduce((sum, e) => sum + e.probabilidad, 0);
    if (Math.abs(sumProb - 1) > 0.01) {
        showToast('La suma de probabilidades debe ser 100%');
        return;
    }

    // Calcular VPN esperado
    const vpnEsperado = escenarios.reduce((sum, e) => sum + e.vpn * e.probabilidad, 0);

    // Calcular desviación estándar
    const varianza = escenarios.reduce((sum, e) => {
        return sum + e.probabilidad * Math.pow(e.vpn - vpnEsperado, 2);
    }, 0);
    const desviacion = Math.sqrt(varianza);

    document.getElementById('expectedNPV').textContent = vpnEsperado.toFixed(2);
    document.getElementById('npvStdDev').textContent = desviacion.toFixed(2);
}

// Función para agregar un flujo de efectivo
function addCashFlow() {
    const periodInput = document.getElementById('period');
    const amountInput = document.getElementById('amount');

    const period = parseInt(periodInput.value);
    const amount = parseFloat(amountInput.value);

    // Validación de entradas
    if (isNaN(period) || period < 0 || period > maxPeriodAllowed) {
        showToast(`Por favor, introduce un período válido entre 0 y ${maxPeriodAllowed}.`);
        return;
    }
    if (isNaN(amount)) {
        showToast('Por favor, introduce un monto válido.');
        return;
    }

    // Verificar si ya existe un flujo para este período
    const existingIndex = cashFlows.findIndex(cf => cf.period === period);
    if (existingIndex !== -1) {
        cashFlows[existingIndex].amount = amount; // Actualizar el monto existente
    } else {
        cashFlows.push({
            period,
            amount
        }); // Agregar un nuevo flujo
    }

    // Ordenar flujos por período
    cashFlows.sort((a, b) => a.period - b.period);

    // Limpiar campos de entrada
    periodInput.value = '';
    amountInput.value = '';

    // Actualizar tabla y diagrama
    updateCashFlowTable();
    drawCashFlowDiagram();
}

// Función para actualizar la tabla de flujos de efectivo
function updateCashFlowTable() {
    const tbody = document.getElementById('cashFlowTableBody');
    tbody.innerHTML = ''; // Limpiar tabla
    cashFlows.forEach((flow, index) => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50 transition-colors';

        // Celda de período
        const periodCell = document.createElement('td');
        periodCell.className = 'px-6 py-4 text-sm text-gray-900 text-center';
        periodCell.textContent = flow.period;

        // Celda de monto
        const amountCell = document.createElement('td');
        amountCell.className = 'px-6 py-4 text-sm text-center';
        const amountSpan = document.createElement('span');
        amountSpan.className = flow.amount >= 0 ? 'text-green-600' : 'text-red-600';
        amountSpan.textContent = new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(flow.amount);
        amountCell.appendChild(amountSpan);

        // Celda de acción
        const actionCell = document.createElement('td');
        actionCell.className = 'px-6 py-4 text-center';
        const deleteButton = document.createElement('button');
        deleteButton.className =
            'text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 rounded-full p-1';
        deleteButton.onclick = () => removeCashFlow(index);
        deleteButton.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    `;
        actionCell.appendChild(deleteButton);

        // Agregar celdas a la fila
        row.appendChild(periodCell);
        row.appendChild(amountCell);
        row.appendChild(actionCell);

        // Agregar fila a la tabla
        tbody.appendChild(row);
    });
}

// Función para eliminar un flujo de efectivo
function removeCashFlow(index) {
    cashFlows.splice(index, 1);
    updateCashFlowTable();
    drawCashFlowDiagram();
}

// Función para limpiar todos los flujos de efectivo
function clearAllCashFlows() {
    cashFlows = [];
    updateCashFlowTable();
    drawCashFlowDiagram();
}
// Función para dibujar el diagrama de flujo de efectivo
function drawCashFlowDiagram() {
    const canvas = document.getElementById('cashFlowCanvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpiar el canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Configuración inicial
    const margin = 40;
    const width = canvas.width - 2 * margin;
    const height = canvas.height - 2 * margin;
    const originY = canvas.height / 2;

    // Dibujar línea de tiempo
    ctx.beginPath();
    ctx.moveTo(margin, originY);
    ctx.lineTo(canvas.width - margin, originY);
    ctx.strokeStyle = '#6b7280'; // Color de la línea de tiempo
    ctx.stroke();

    if (cashFlows.length === 0) return;

    // Encontrar el período máximo
    const maxPeriod = Math.max(...cashFlows.map(cf => cf.period));
    const periodWidth = width / (maxPeriod + 1);

    // Dibujar marcadores de período
    ctx.fillStyle = '#6b7280'; // Color del texto y marcas de período
    ctx.textAlign = 'center';
    ctx.font = '12px Arial, sans-serif';

    for (let i = 0; i <= maxPeriod; i++) {
        const x = margin + i * periodWidth;
        ctx.beginPath();
        ctx.moveTo(x, originY - 5);
        ctx.lineTo(x, originY + 5);
        ctx.stroke();
        ctx.fillText(`n=${i}`, x, originY + 20);
    }

    // Encontrar el flujo máximo para escalar
    const maxFlow = Math.max(...cashFlows.map(cf => Math.abs(cf.amount)));

    // Límite máximo para el escalado
    const maxScaleLimit = 1000000000; // 1B como valor máximo para el escalado

    // Mínimo visible para los valores pequeños
    const minVisibleHeight = 20; // Altura mínima para que las flechas sean visibles

    // Función de escalado híbrido
    function hybridScale(value, maxValue) {
        const scaledValue = Math.sqrt(Math.abs(value)) / Math.sqrt(maxValue); // Escalado suavizado
        const rawHeight = scaledValue * (height / 2); // Altura sin ajustes
        return Math.max(rawHeight, minVisibleHeight); // Asegurar un mínimo visible
    }

    // Función para formatear valores grandes con denominaciones
    function formatLargeNumber(value) {
        if (Math.abs(value) >= 1000000000) {
            return `${(value / 1000000000).toFixed(1)}B`; // Billones (B)
        } else if (Math.abs(value) >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`; // Millones (M)
        } else if (Math.abs(value) >= 1000) {
            return `${(value / 1000).toFixed(1)}K`; // Miles (K)
        } else {
            return value.toString(); // Valores pequeños sin formato
        }
    }

    // Dibujar flujos de efectivo
    cashFlows.forEach(flow => {
        const x = margin + flow.period * periodWidth;

        // Usar el escalado híbrido para calcular la altura de la flecha
        const flowHeight = hybridScale(flow.amount, Math.min(maxFlow, maxScaleLimit));

        // Determinar la dirección de la flecha (positiva o negativa)
        const direction = flow.amount >= 0 ? -1 : 1; // -1 para arriba, 1 para abajo

        // Dibujar flecha
        ctx.beginPath();
        ctx.moveTo(x, originY);
        ctx.lineTo(x, originY + direction * flowHeight);
        ctx.strokeStyle = flow.amount >= 0 ? 'green' : 'red'; // Color según ingreso o egreso
        ctx.lineWidth = 2;

        // Punta de flecha (corregida para apuntar en la dirección correcta)
        if (flow.amount > 0) {
            // Flecha hacia arriba
            ctx.lineTo(x - 5, originY + direction * flowHeight + 10);
            ctx.moveTo(x, originY + direction * flowHeight);
            ctx.lineTo(x + 5, originY + direction * flowHeight + 10);
        } else {
            // Flecha hacia abajo
            ctx.lineTo(x - 5, originY + direction * flowHeight - 10);
            ctx.moveTo(x, originY + direction * flowHeight);
            ctx.lineTo(x + 5, originY + direction * flowHeight - 10);
        }

        ctx.stroke();
        ctx.lineWidth = 1;

        // Mostrar valor (ajustar posición del texto)
        ctx.fillStyle = 'black'; // Color del texto de cantidad
        const textOffset = flow.amount > 0 ? -20 : 20; // Ajuste de desplazamiento del texto
        ctx.fillText(formatLargeNumber(flow.amount), x + 20, originY + direction * flowHeight + textOffset);
    });
}

// Función para inicializar la búsqueda en cada sección
function initializeSearch() {
    document.querySelectorAll('.search-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            const section = e.target.closest('section');

            // Iterar sobre tarjetas de calculadora Y tarjetas de fórmula (selector combinado)
            section.querySelectorAll('.calculator-card, .formula-card').forEach(card => {
                let title = '';
                const calculatorTitleElement = card.querySelector('.text-xl.font-semibold'); // Título de calculadora
                const formulaTitleElement = card.querySelector('.formula-title'); // Título de fórmula

                // Determinar cuál elemento de título existe en la tarjeta actual
                if (calculatorTitleElement) {
                    title = calculatorTitleElement.textContent.toLowerCase();
                } else if (formulaTitleElement) {
                    title = formulaTitleElement.textContent.toLowerCase();
                }

                // Mostrar u ocultar la tarjeta según la coincidencia en el título
                if (title.includes(searchTerm)) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// Función para el análisis incremental
function analisisIncremental() {
    const deltaInversion = parseFloat(document.getElementById('deltaInversion').value);
    const deltaBeneficios = parseFloat(document.getElementById('deltaBeneficios').value);
    const tmar = parseFloat(document.getElementById('tmarIncremental').value) / 100;
    const vida = parseInt(document.getElementById('vidaIncremental').value);

    if ([deltaInversion, deltaBeneficios, tmar, vida].some(isNaN)) {
        showToast('Por favor ingrese todos los valores');
        return;
    }

    // Calcular VPN incremental
    const vpnIncremental = -deltaInversion + deltaBeneficios * ((1 - Math.pow(1 + tmar, -vida)) / tmar);

    // Calcular TIR incremental usando el método de Newton-Raphson
    let tirIncremental = tmar;
    let iteraciones = 0;
    const maxIteraciones = 100;
    const tolerancia = 0.0001;

    while (iteraciones < maxIteraciones) {
        const vpnActual = -deltaInversion + deltaBeneficios * ((1 - Math.pow(1 + tirIncremental, -vida)) / tirIncremental);
        const derivada = deltaBeneficios * (
            -vida * Math.pow(1 + tirIncremental, -vida - 1) / tirIncremental +
            (1 - Math.pow(1 + tirIncremental, -vida)) / Math.pow(tirIncremental, 2)
        );

        const nuevaTir = tirIncremental - vpnActual / derivada;

        if (Math.abs(nuevaTir - tirIncremental) < tolerancia) {
            tirIncremental = nuevaTir;
            break;
        }

        tirIncremental = nuevaTir;
        iteraciones++;
    }

    // Actualizar resultados
    document.getElementById('vpnIncremental').textContent = vpnIncremental.toFixed(2);
    document.getElementById('tirIncremental').textContent = (tirIncremental * 100).toFixed(2) + '%';

    const decision = document.getElementById('decisionIncremental');
    if (vpnIncremental > 0 && tirIncremental > tmar) {
        decision.textContent = 'Se recomienda realizar la inversión incremental';
        decision.className = 'font-semibold text-green-600';
    } else {
        decision.textContent = 'No se recomienda realizar la inversión incremental';
        decision.className = 'font-semibold text-red-600';
    }
}

// Función para comparar alternativas

function agregarAlternativa() {
    const container = document.getElementById('alternativas');
    const nuevaAlternativa = document.createElement('div');
    nuevaAlternativa.className = 'alternativa bg-gray-50 p-4 rounded-lg';
    nuevaAlternativa.innerHTML = `
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Inversión Inicial</label>
        <input type="number" class="form-input alt-inversion">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Flujo Anual</label>
        <input type="number" class="form-input alt-flujo">
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4 mt-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Vida Útil</label>
        <input type="number" class="form-input alt-vida">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Valor de Salvamento</label>
        <input type="number" class="form-input alt-salvamento">
      </div>
    </div>
  `;
    container.appendChild(nuevaAlternativa);
}

function compararAlternativas() {
    const tmar = parseFloat(document.getElementById('tmar').value) / 100;
    if (isNaN(tmar)) {
        showToast('Por favor ingrese la TMAR');
        return;
    }

    const alternativas = document.querySelectorAll('.alternativa');
    const resultados = [];

    alternativas.forEach((alt, index) => {
        const inversion = parseFloat(alt.querySelector('.alt-inversion').value);
        const flujo = parseFloat(alt.querySelector('.alt-flujo').value);
        const vida = parseInt(alt.querySelector('.alt-vida').value);
        const salvamento = parseFloat(alt.querySelector('.alt-salvamento').value);

        if ([inversion, flujo, vida, salvamento].some(isNaN)) {
            showToast(`Por favor complete todos los campos de la alternativa ${index + 1}`);
            return;
        }

        // Calcular VPN
        const vpn = -inversion +
            flujo * ((1 - Math.pow(1 + tmar, -vida)) / tmar) +
            salvamento * Math.pow(1 + tmar, -vida);

        // Calcular TIR
        let tir = tmar;
        let iteraciones = 0;
        const maxIteraciones = 100;
        const tolerancia = 0.0001;

        while (iteraciones < maxIteraciones) {
            const vpnActual = -inversion +
                flujo * ((1 - Math.pow(1 + tir, -vida)) / tir) +
                salvamento * Math.pow(1 + tir, -vida);

            const derivada = flujo * (
                -vida * Math.pow(1 + tir, -vida - 1) / tir +
                (1 - Math.pow(1 + tir, -vida)) / Math.pow(tir, 2)
            ) - vida * salvamento * Math.pow(1 + tir, -vida - 1);

            const nuevaTir = tir - vpnActual / derivada;

            if (Math.abs(nuevaTir - tir) < tolerancia) {
                tir = nuevaTir;
                break;
            }

            tir = nuevaTir;
            iteraciones++;
        }

        // Calcular B/C
        const beneficios = flujo * ((1 - Math.pow(1 + tmar, -vida)) / tmar) +
            salvamento * Math.pow(1 + tmar, -vida);
        const bc = beneficios / inversion;

        resultados.push({
            vpn,
            tir,
            bc
        });
    });

    // Actualizar tabla de resultados
    const tabla = document.getElementById('comparacionTable');
    tabla.innerHTML = '';

    resultados.forEach((res, index) => {
        const row = tabla.insertRow();
        row.innerHTML = `
      <td>Alternativa ${index + 1}</td>
      <td>${res.vpn.toFixed(2)}</td>
      <td>${(res.tir * 100).toFixed(2)}%</td>
      <td>${res.bc.toFixed(2)}</td>
    `;
    });

    // Determinar mejor alternativa
    const mejorVPN = Math.max(...resultados.map(r => r.vpn));
    const mejorIndex = resultados.findIndex(r => r.vpn === mejorVPN);

    const decision = document.getElementById('mejorAlternativa');
    decision.textContent = `La mejor alternativa es la Alternativa ${mejorIndex + 1} con un VPN de ${mejorVPN.toFixed(2)}`;
    decision.className = 'font-semibold text-green-600';
}

// Inicializar tabla y diagrama
updateCashFlowTable();
drawCashFlowDiagram();
