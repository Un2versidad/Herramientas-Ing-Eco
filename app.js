// Constantes globales
const CONSTANTS = {
    MAX_PERIOD: 20,
    SCROLL_SPEED: 1.5,
    TOAST_DURATION: 3000,
    MOBILE_ZOOM: '1',
    DESKTOP_ZOOM: '0.85',
    MAX_AMOUNT: 1e9 // Límite máximo de monto: 1 billón USD
};

// Estado global
let cashFlows = [{
        period: 0,
        amount: -120000
    },
    {
        period: 2,
        amount: 50000
    },
    {
        period: 7,
        amount: 50000
    },
    {
        period: 13,
        amount: 40000
    }
];
let escenarios = [];
let alternativas = [];
let canvas, ctx;

// Utility Functions
const Utils = {
    isMobile: () => /android|iphone|ipad|mobile/i.test(navigator.userAgent.toLowerCase()),
    formatCurrency: (value) => new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value),
    formatLargeNumber: (value) => {
        const absValue = Math.abs(value);
        if (absValue >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
        if (absValue >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
        if (absValue >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
        return value.toString();
    },
    getInputValue: (id, type = 'float') => {
        const value = document.getElementById(id).value;
        return type === 'int' ? parseInt(value) : parseFloat(value);
    }
};

// UI Management
const UI = {
    showToast: (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} fade-in`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), CONSTANTS.TOAST_DURATION);
    },

    activateTab: (tab) => {
        document.querySelectorAll('.nav-tab, .nav-tab-mobile').forEach(t =>
            t.classList.remove('active')
        );
        document.querySelectorAll('.tab-content').forEach(c =>
            c.classList.add('hidden')
        );
        tab.classList.add('active');
        const target = document.getElementById(tab.dataset.tab);
        if (target) target.classList.remove('hidden');
    },

    updateCopyright: () => {
        const copyright = document.querySelector('footer div.border-t p');
        if (copyright) {
            copyright.textContent = copyright.textContent.replace(
                /© \d{4}/,
                `© ${new Date().getFullYear()}`
            );
        }
    },

    updateElementText: (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }
};

// Event Handlers
const EventHandlers = {
    setupScroll: () => {
        if (!Utils.isMobile()) {
            document.documentElement.style.zoom = CONSTANTS.DESKTOP_ZOOM;
            document.body.style.overflow = 'hidden';

            let startY = 0,
                isScrolling = false;
            let smoothingFactor = 1; // Factor inicial de suavizado
            let lastDelta = 0,
                lastTime = 0;

            // Función para ajustar dinámicamente el factor de suavizado
            const adjustSmoothing = (delta, timeDiff) => {
                // Si el usuario desplaza rápido (timeDiff pequeño), reducimos la sensibilidad
                if (timeDiff < 50 && Math.abs(delta) > 50) {
                    smoothingFactor = Math.max(0.3, smoothingFactor * 0.9); // Más suave para dispositivos sensibles
                } else if (Math.abs(delta) < 20) {
                    smoothingFactor = Math.min(1.5, smoothingFactor * 1.1); // Más rápido para dispositivos lentos
                }
            };

            // Manejo del scroll con rueda del mouse o touchpad
            document.body.addEventListener('wheel', (e) => {
                e.preventDefault();
                const currentTime = performance.now();
                const timeDiff = currentTime - lastTime;
                const delta = e.deltaY * smoothingFactor;

                // Ajustar el factor dinámicamente
                adjustSmoothing(e.deltaY, timeDiff);

                window.scrollBy({
                    top: delta,
                    behavior: 'smooth'
                });

                lastDelta = e.deltaY;
                lastTime = currentTime;
            }, {
                passive: false
            });

            // Inicio del toque en pantallas táctiles
            document.body.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    startY = e.touches[0].clientY;
                    isScrolling = true;
                }
            });

            // Movimiento del toque
            document.body.addEventListener('touchmove', (e) => {
                if (!isScrolling || e.touches.length !== 1) return;
                e.preventDefault();
                const currentY = e.touches[0].clientY;
                const delta = -(currentY - startY) * smoothingFactor;

                window.scrollBy({
                    top: delta,
                    behavior: 'smooth'
                });
                startY = currentY;
            }, {
                passive: false
            });

            // Fin del toque
            document.body.addEventListener('touchend', () => isScrolling = false);
        } else {
            document.documentElement.style.zoom = CONSTANTS.MOBILE_ZOOM;
            console.log('Mobile scroll enabled');
        }
    },
    
    setupDOM: () => {
        document.addEventListener('DOMContentLoaded', () => {
            const navTabs = document.querySelectorAll('.nav-tab, .nav-tab-mobile');
            navTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    UI.activateTab(tab);
                    const mobileMenu = document.getElementById('mobileMenu');
                    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                        mobileMenu.classList.add('hidden');
                    }
                });
            });

            const defaultTab = document.querySelector('.nav-tab.active') || navTabs[0];
            if (defaultTab) UI.activateTab(defaultTab);

            canvas = document.getElementById('cashFlowCanvas');
            ctx = canvas?.getContext('2d');

            EventHandlers.setupSearch();
            UI.updateCopyright();
            CashFlowManager.updateTable();
            CashFlowManager.drawDiagram();
        });
    },

    setupSearch: () => {
        document.querySelectorAll('.search-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase().trim();
                const section = e.target.closest('section');
                section.querySelectorAll('.calculator-card, .formula-card').forEach(card => {
                    const titleEl = card.querySelector('.text-xl.font-semibold') ||
                        card.querySelector('.formula-title');
                    const title = titleEl?.textContent.toLowerCase() || '';
                    card.style.display = title.includes(term) ? '' : 'none';
                });
            });
        });
    }
};

// Financial Calculations
const Calculations = {
    calcularFactores: () => {
        const tasa = Utils.getInputValue('tasa') / 100;
        const periodos = Utils.getInputValue('periodos', 'int');

        if (isNaN(tasa) || isNaN(periodos) || tasa <= 0 || periodos <= 0) {
            UI.showToast('Por favor, ingrese valores numéricos válidos y positivos');
            return;
        }

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

        Object.entries(factores).forEach(([key, value]) =>
            UI.updateElementText(`factor-${key}`, value.toFixed(4))
        );
    },

    calcularValorPresente: () => {
        const vf = Utils.getInputValue('vp-vf');
        const tasa = Utils.getInputValue('vp-tasa') / 100;
        const periodos = Utils.getInputValue('vp-periodos', 'int');

        if (isNaN(vf) || isNaN(tasa) || isNaN(periodos) || tasa <= 0 || periodos <= 0) {
            UI.showToast('Por favor, ingrese valores numéricos válidos y positivos');
            return;
        }

        const vp = vf / Math.pow(1 + tasa, periodos);
        UI.updateElementText('valor-presente', vp.toFixed(2));
    },

    calcularValorFuturo: () => {
        const vp = Utils.getInputValue('vf-vp');
        const tasa = Utils.getInputValue('vf-tasa') / 100;
        const periodos = Utils.getInputValue('vf-periodos', 'int');

        if (isNaN(vp) || isNaN(tasa) || isNaN(periodos) || tasa <= 0 || periodos <= 0) {
            UI.showToast('Por favor, ingrese valores numéricos válidos y positivos');
            return;
        }

        const vf = vp * Math.pow(1 + tasa, periodos);
        UI.updateElementText('valor-futuro', vf.toFixed(2));
    },

    calcularVPN: () => {
        const inversion = Utils.getInputValue('vpn-inversion');
        const tasaDescuento = Utils.getInputValue('vpn-tasa-descuento') / 100;
        const flujoCaja = Utils.getInputValue('vpn-flujo-caja');
        const periodos = Utils.getInputValue('vpn-periodos', 'int');

        if ([inversion, tasaDescuento, flujoCaja, periodos].some(v => isNaN(v)) ||
            tasaDescuento <= 0 || periodos <= 0) {
            UI.showToast('Por favor, ingrese valores numéricos válidos y positivos');
            return;
        }

        let vpn = -inversion;
        for (let i = 1; i <= periodos; i++) {
            vpn += flujoCaja / Math.pow(1 + tasaDescuento, i);
        }
        UI.updateElementText('valor-vpn', vpn.toFixed(2));
    },

    calcularBono: () => {
        const valorNominal = Utils.getInputValue('bondFaceValue');
        const tasaCupon = Utils.getInputValue('bondCouponRate') / 100;
        const tasaMercado = Utils.getInputValue('bondMarketRate') / 100;
        const anos = Utils.getInputValue('bondYears', 'int');
        const frecuenciaPago = Utils.getInputValue('bondPaymentFreq', 'int');

        if ([valorNominal, tasaCupon, tasaMercado, anos, frecuenciaPago].some(isNaN)) {
            UI.showToast('Por favor ingrese todos los valores');
            return;
        }

        const n = anos * frecuenciaPago;
        const i = tasaMercado / frecuenciaPago;
        const cupon = (tasaCupon * valorNominal) / frecuenciaPago;

        let vp = 0,
            duracion = 0,
            convexidad = 0;
        for (let t = 1; t <= n; t++) {
            const factor = 1 / Math.pow(1 + i, t);
            vp += cupon * factor;
            duracion += t * cupon * factor;
            convexidad += t * (t + 1) * cupon * factor;
        }

        vp += valorNominal / Math.pow(1 + i, n);
        duracion += n * valorNominal / Math.pow(1 + i, n);
        convexidad += n * (n + 1) * valorNominal / Math.pow(1 + i, n);

        duracion = duracion / vp / frecuenciaPago;
        convexidad = convexidad / (vp * Math.pow(1 + i, 2)) / Math.pow(frecuenciaPago, 2);
        const prima = vp - valorNominal;

        UI.updateElementText('bondPV', vp.toFixed(2));
        UI.updateElementText('bondPremium', prima.toFixed(2));
        UI.updateElementText('bondDuration', duracion.toFixed(2));
        UI.updateElementText('bondConvexity', convexidad.toFixed(4));

        Calculations.generarTablaAmortizacion(valorNominal, cupon, n);
    },

    generarTablaAmortizacion: (valorNominal, cupon, periodos) => {
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
    },

    calcularReemplazo: () => {
        const costoNuevo = Utils.getInputValue('newAssetCost');
        const valorMercado = Utils.getInputValue('currentMarketValue');
        const costosOMActuales = Utils.getInputValue('currentOM');
        const costosOMNuevos = Utils.getInputValue('newOM');
        const tasa = Utils.getInputValue('replacementRate') / 100;

        if ([costoNuevo, valorMercado, costosOMActuales, costosOMNuevos, tasa].some(isNaN)) {
            UI.showToast('Por favor ingrese todos los valores');
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
    },

    calcularDepreciacion: () => {
        const costoInicial = Utils.getInputValue('depCost');
        const valorSalvamento = Utils.getInputValue('depSalvage');
        const vidaUtil = Utils.getInputValue('depLife', 'int');
        const metodo = document.getElementById('depMethod').value;

        if ([costoInicial, valorSalvamento, vidaUtil].some(isNaN)) {
            UI.showToast('Por favor ingrese todos los valores');
            return;
        }

        const tabla = document.getElementById('depTableBody');
        tabla.innerHTML = '';
        let valorLibros = costoInicial;
        const depreciable = costoInicial - valorSalvamento;

        for (let año = 1; año <= vidaUtil; año++) {
            let depreciacion;
            switch (metodo) {
                case 'sl':
                    depreciacion = depreciable / vidaUtil;
                    break;
                case 'syd':
                    const suma = (vidaUtil * (vidaUtil + 1)) / 2;
                    depreciacion = (depreciable * (vidaUtil - año + 1)) / suma;
                    break;
                case 'db':
                    depreciacion = valorLibros * (2 / vidaUtil);
                    if (año === vidaUtil) depreciacion = valorLibros - valorSalvamento;
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
    },

    analizarSensibilidad: () => {
        const inversionInicial = Utils.getInputValue('sensInitialInv');
        const flujoBase = Utils.getInputValue('sensBaseFlow');
        const tasaBase = Utils.getInputValue('sensBaseRate') / 100;
        const variacion = Utils.getInputValue('sensVariation') / 100;

        if ([inversionInicial, flujoBase, tasaBase, variacion].some(isNaN)) {
            UI.showToast('Por favor ingrese todos los valores');
            return;
        }

        const puntos = [];
        for (let i = -2; i <= 2; i++) {
            const flujo = flujoBase * (1 + i * variacion);
            const vpn = -inversionInicial + flujo * ((1 - Math.pow(1 + tasaBase, -10)) / tasaBase);
            puntos.push({
                x: i,
                y: vpn
            });
        }

        const canvasElement = document.getElementById('sensitivityChart');
        if (!canvasElement) {
            UI.showToast('No se encontró el elemento del gráfico');
            return;
        }
        const chartCtx = canvasElement.getContext('2d');
        if (!chartCtx) {
            UI.showToast('No se pudo obtener el contexto del gráfico');
            return;
        }

        if (window.sensitivityChart instanceof Chart) {
            window.sensitivityChart.destroy();
        }

        window.sensitivityChart = new Chart(chartCtx, {
            type: 'line',
            data: {
                labels: puntos.map(p => p.x),
                datasets: [{
                    label: 'VPN',
                    data: puntos.map(p => p.y),
                    borderColor: 'blue',
                    borderWidth: 2,
                    fill: false,
                    pointBackgroundColor: 'blue',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Variación (%)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Valor Presente Neto (VPN)'
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
    },

    analisisIncremental: () => {
        const deltaInversion = Utils.getInputValue('deltaInversion');
        const deltaBeneficios = Utils.getInputValue('deltaBeneficios');
        const tmar = Utils.getInputValue('tmarIncremental') / 100;
        const vida = Utils.getInputValue('vidaIncremental', 'int');

        if ([deltaInversion, deltaBeneficios, tmar, vida].some(isNaN)) {
            UI.showToast('Por favor ingrese todos los valores');
            return;
        }

        const vpnIncremental = -deltaInversion + deltaBeneficios * ((1 - Math.pow(1 + tmar, -vida)) / tmar);
        let tirIncremental = tmar;
        const maxIteraciones = 100;
        const tolerancia = 0.0001;

        for (let i = 0; i < maxIteraciones; i++) {
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
        }

        UI.updateElementText('vpnIncremental', vpnIncremental.toFixed(2));
        UI.updateElementText('tirIncremental', (tirIncremental * 100).toFixed(2) + '%');

        const decision = document.getElementById('decisionIncremental');
        decision.textContent = vpnIncremental > 0 && tirIncremental > tmar ?
            'Se recomienda realizar la inversión incremental' :
            'No se recomienda realizar la inversión incremental';
        decision.className = `font-semibold ${vpnIncremental > 0 && tirIncremental > tmar ? 'text-green-600' : 'text-red-600'}`;
    },

    compararAlternativas: () => {
        const tmar = Utils.getInputValue('tmar') / 100;
        if (isNaN(tmar)) {
            UI.showToast('Por favor ingrese la TMAR');
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
                UI.showToast(`Por favor complete todos los campos de la alternativa ${index + 1}`);
                return;
            }

            const vpn = -inversion + flujo * ((1 - Math.pow(1 + tmar, -vida)) / tmar) +
                salvamento * Math.pow(1 + tmar, -vida);

            let tir = tmar;
            const maxIteraciones = 100;
            const tolerancia = 0.0001;

            for (let i = 0; i < maxIteraciones; i++) {
                const vpnActual = -inversion + flujo * ((1 - Math.pow(1 + tir, -vida)) / tir) +
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
            }

            const beneficios = flujo * ((1 - Math.pow(1 + tmar, -vida)) / tmar) + salvamento * Math.pow(1 + tmar, -vida);
            const bc = beneficios / inversion;

            resultados.push({
                vpn,
                tir,
                bc
            });
        });

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

        const mejorVPN = Math.max(...resultados.map(r => r.vpn));
        const mejorIndex = resultados.findIndex(r => r.vpn === mejorVPN);
        const decision = document.getElementById('mejorAlternativa');
        decision.textContent = `La mejor alternativa es la Alternativa ${mejorIndex + 1} con un VPN de ${mejorVPN.toFixed(2)}`;
        decision.className = 'font-semibold text-green-600';
    }
};

// Cash Flow Management
const CashFlowManager = {
    addCashFlow: () => {
        const period = Utils.getInputValue('period', 'int');
        const amount = Utils.getInputValue('amount');

        if (isNaN(period) || period < 0 || period > CONSTANTS.MAX_PERIOD) {
            UI.showToast(`El período debe estar entre 0 y ${CONSTANTS.MAX_PERIOD}`);
            return;
        }
        if (isNaN(amount)) {
            UI.showToast('Monto inválido');
            return;
        }
        if (Math.abs(amount) > CONSTANTS.MAX_AMOUNT) {
            UI.showToast('El monto no puede exceder 1 billón de USD');
            return;
        }

        const index = cashFlows.findIndex(cf => cf.period === period);
        if (index !== -1) {
            cashFlows[index].amount = amount;
        } else {
            cashFlows.push({
                period,
                amount
            });
            cashFlows.sort((a, b) => a.period - b.period);
        }

        document.getElementById('period').value = '';
        document.getElementById('amount').value = '';
        CashFlowManager.updateTable();
        CashFlowManager.drawDiagram();
    },

    removeCashFlow: (index) => {
        cashFlows.splice(index, 1);
        CashFlowManager.updateTable();
        CashFlowManager.drawDiagram();
    },

    clearAllCashFlows: () => {
        cashFlows = [];
        CashFlowManager.updateTable();
        CashFlowManager.drawDiagram();
    },

    updateTable: () => {
        const tbody = document.getElementById('cashFlowTableBody');
        tbody.innerHTML = '';
        cashFlows.forEach((flow, i) => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50 transition-colors';
            row.innerHTML = `
        <td class="px-6 py-4 text-sm text-gray-900 text-center">${flow.period}</td>
        <td class="px-6 py-4 text-sm text-center">
          <span class="${flow.amount >= 0 ? 'text-green-600' : 'text-red-600'}">
            ${Utils.formatCurrency(flow.amount)}
          </span>
        </td>
        <td class="px-6 py-4 text-center">
          <button onclick="CashFlowManager.removeCashFlow(${i})" 
                  class="text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 rounded-full p-1">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </td>
      `;
            tbody.appendChild(row);
        });
    },

    drawDiagram: () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const margin = 40;
        const width = canvas.width - 2 * margin;
        const height = canvas.height - 2 * margin;
        const originY = canvas.height / 2;

        ctx.beginPath();
        ctx.moveTo(margin, originY);
        ctx.lineTo(canvas.width - margin, originY);
        ctx.strokeStyle = '#6b7280';
        ctx.stroke();

        if (!cashFlows.length) return;

        const maxPeriod = Math.max(...cashFlows.map(cf => cf.period));
        const periodWidth = width / (maxPeriod + 1);
        const maxFlow = Math.max(...cashFlows.map(cf => Math.abs(cf.amount)));

        ctx.fillStyle = '#6b7280';
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

        const hybridScale = (value) => {
            const scaled = Math.sqrt(Math.abs(value)) / Math.sqrt(Math.min(maxFlow, CONSTANTS.MAX_AMOUNT));
            return Math.max(scaled * (height / 2), 20);
        };

        cashFlows.forEach(flow => {
            const x = margin + flow.period * periodWidth;
            const flowHeight = hybridScale(flow.amount);
            const direction = flow.amount >= 0 ? -1 : 1;

            ctx.beginPath();
            ctx.moveTo(x, originY);
            ctx.lineTo(x, originY + direction * flowHeight);
            ctx.strokeStyle = flow.amount >= 0 ? 'green' : 'red';
            ctx.lineWidth = 2;

            const arrowDir = flow.amount > 0 ? 10 : -10;
            ctx.lineTo(x - 5, originY + direction * flowHeight + arrowDir);
            ctx.moveTo(x, originY + direction * flowHeight);
            ctx.lineTo(x + 5, originY + direction * flowHeight + arrowDir);
            ctx.stroke();
            ctx.lineWidth = 1;

            ctx.fillStyle = 'black';
            ctx.fillText(
                Utils.formatLargeNumber(flow.amount),
                x + 20,
                originY + direction * flowHeight + (flow.amount > 0 ? -20 : 20)
            );
        });
    }
};

// Scenarios Management
const ScenarioManager = {
    agregarEscenario: () => {
        const tipo = document.getElementById('scenarioType').value;
        const probabilidad = Utils.getInputValue('scenarioProb') / 100;
        const vpn = Utils.getInputValue('scenarioNPV');

        if (isNaN(probabilidad) || isNaN(vpn)) {
            UI.showToast('Por favor ingrese todos los valores');
            return;
        }

        escenarios.push({
            tipo,
            probabilidad,
            vpn
        });
        ScenarioManager.updateTable();
    },

    updateTable: () => {
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
    },

    calcularEscenarios: () => {
        if (!escenarios.length) {
            UI.showToast('Agregue al menos un escenario');
            return;
        }

        const sumProb = escenarios.reduce((sum, e) => sum + e.probabilidad, 0);
        if (Math.abs(sumProb - 1) > 0.01) {
            UI.showToast('La suma de probabilidades debe ser 100%');
            return;
        }

        const vpnEsperado = escenarios.reduce((sum, e) => sum + e.vpn * e.probabilidad, 0);
        const varianza = escenarios.reduce((sum, e) =>
            sum + e.probabilidad * Math.pow(e.vpn - vpnEsperado, 2), 0);
        const desviacion = Math.sqrt(varianza);

        UI.updateElementText('expectedNPV', vpnEsperado.toFixed(2));
        UI.updateElementText('npvStdDev', desviacion.toFixed(2));
    }
};

// Alternatives Management
const AlternativeManager = {
    agregarAlternativa: () => {
        const container = document.getElementById('alternativas');
        const div = document.createElement('div');
        div.className = 'alternativa bg-gray-50 p-4 rounded-lg';
        div.innerHTML = `
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
        container.appendChild(div);
    }
};

// Inicialización
EventHandlers.setupScroll();
EventHandlers.setupDOM();

// Exportar funciones al scope global
Object.assign(window, {
    ...Calculations,
    ...CashFlowManager,
    ...ScenarioManager,
    agregarAlternativa: AlternativeManager.agregarAlternativa,
    compararAlternativas: Calculations.compararAlternativas
});
