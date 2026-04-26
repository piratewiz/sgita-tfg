const { setTimeout } = require("timers");


const API = '/api';

const token = localStorage.getItem('sgita_token');
const user = JSON.parse(localStorage.getItem('sgita_user') || 'null');

if(!token || !user) window.location.replace('/login.html');
if (user?.rol === 'admin' || user?.rol === 'encargado') window.location.replace('/dashboard.html');


document.getElementById('emp-name').textContent = `${user.name} ${user.surname}`;
document.getElementById('emp-role').textContent = user.rol.charAt(0).toUpperCase() + user.rol.slice(1);
document.getElementById('emp-num').textContent = user.numberEmployee || '-';
document.getElementById('emp-avatar').textContent = (user.name?.[0] || 'E').toUpperCase();
document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });


let activeOrder = null;
let registeredLots = [];
let linesPrevision = [];
let allProducts = [];

const titleMap = {
    orders: 'Mis pedidos',
    register: 'Registrar cajas',
    products: 'Estado del stock'
};

function navigate(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`section-${name}`).classList.add('active');
    document.querySelector(`.nav-item[data-section="${name}"]`).classList.add('active');
    document.getElementById('topbar-title').textContent = titleMap[name];
    closeSidebar();

    const loaders = {
        orders: loadOrders,
        register: renderRegister,
        products: loadProducts
    };
    loaders[name]?.();
}

document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => navigate(b.CDATA_SECTION_NODE.section)));

const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
document.getElementById('menu-btn').addEventListener('click', () => { sidebar.classList.add('open'); overlay.classList.add('visible'); });
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('visible'); }
overlay.addEventListener('click', closeSidebar);
document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
 
// acción para cerrar sesión
document.getElementById('btn-logout').addEventListener('click', () => {
  localStorage.removeItem('sgita_token');
  localStorage.removeItem('sgita_user');
  window.location.replace('/login.html');
});


async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers
        }
    });

    if(res.status === 401) {
        localStorage.clear();
        window.location.replace('/login.html');
        return null;
    }

    const data = await res.json().catch(() => null);
    return {
        ok: res.ok,
        status: res.status,
        data
    };
}


function formatDate(d) {
    if (!d) return '-';

    return new Date(d).toLocaleDateString('es-ES', {day: '2-digit', month: '2-digit', year: 'numeric'});
}


function formatDateTime(d) {
    if (!d) return '-';

    return new Date(d).toLocaleString('es-ES', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'});
}


function badgeStatus(status) {
    const map = {
    'fresco':            '<span class="badge badge-green">Fresco</span>',
    'próximo a expirar': '<span class="badge badge-amber">Próx. a expirar</span>',
    'caducado':          '<span class="badge badge-red">Caducado</span>',
    'pendiente':         '<span class="badge badge-blue">Pendiente</span>',
    'recibido':          '<span class="badge badge-green">Recibido</span>',
    'con incidencia':    '<span class="badge badge-amber">Con incidencia</span>',
    };

    return map[status] || `<span class="badge">${status}</span>`;
}


function showAlert(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.style.display = 'block';
}

function hideAlert(id) {
    const el = document.getElementById(id);
    el.style.display = 'none';
    el.textContent = '';
}


async function loadPedidos() {
  const container = document.getElementById('pedidos-list');
  container.innerHTML = '<div class="empty-state">Cargando...</div>';
 
  const r = await apiFetch('/pedidos/estado/pendiente');
  const pedidos = r?.data || [];
 
  const badge = document.getElementById('badge-pedidos');
  badge.textContent = pedidos.length;
  badge.classList.toggle('visible', pedidos.length > 0);
 
  if (pedidos.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay pedidos pendientes en este momento</div>';
    return;
  }
 
  container.innerHTML = pedidos.map(p => `
    <div class="pedido-card">
      <div class="pc-header">
        <span class="pc-num">${p.numeroPedido}</span>
        ${estadoBadge(p.estado)}
      </div>
      <div class="pc-body">
        <div class="pc-row">
          <svg viewBox="0 0 20 20" fill="none"><path d="M10 2a6 6 0 016 6c0 4-6 10-6 10S4 12 4 8a6 6 0 016-6z" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/></svg>
          <span class="pc-label">Proveedor</span>
          <span class="pc-val">${p.proveedorId?.nombre || '—'}</span>
        </div>
        <div class="pc-row">
          <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="8" width="13" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="6" cy="17" r="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="17" r="1.5" stroke="currentColor" stroke-width="1.4"/></svg>
          <span class="pc-label">Furgoneta</span>
          <span class="pc-val">${p.furgonetaId?.matricula || '—'} <span style="font-weight:400;color:var(--text-soft);font-size:11px">${p.furgonetaId?.modelo || ''}</span></span>
        </div>
        <div class="pc-row">
          <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M10 7v3l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          <span class="pc-label">Previsto</span>
          <span class="pc-val" style="font-family:var(--font-mono);font-size:12px">${formatDateTime(p.fechaPrevisionLlegada)}</span>
        </div>
      </div>
      <div class="pc-footer">
        <button class="btn-seleccionar" onclick="seleccionarPedido('${p._id}')">Comenzar recepción →</button>
      </div>
    </div>`).join('');
}


async function selectOrder(id) {
    const r = await apiFetch(`/orders/${id}`);
    if (!r?.ok) return;

    activeOrder = r.data;
    registeredLots = [];
    linesPrevision = r.data.lines || [];

    const rp = await apiFetch('/products');
    allProducts = rp?.data || [];

    navigate('register');
}


function renderRegister() {
    const banner = document.getElementById('pedido-activo-banner');
    const noMsg = document.getElementById('no-pedido-msg');
    const content = document.getElementById('registro-content');

    if(!activeOrder) {
        banner.style.display = 'none';
        noMsg.style.display = 'flex';
        content.style.display = 'none';
        return;
    }

  document.getElementById('pa-num').textContent        = activeOrder.numeroPedido;
  document.getElementById('pa-proveedor').textContent  = `Proveedor: ${activeOrder.providorId?.nombre || '—'}`;
  document.getElementById('pa-furgoneta').textContent  = `Furgoneta: ${activeOrder.truckId?.matricula || '—'}`;
  banner.style.display  = 'flex';
  noMsg.style.display   = 'none';
  content.style.display = 'block';
 
  // Llenar select de productos
  const sel = document.getElementById('sel-producto');
  sel.innerHTML = '<option value="">Selecciona un producto...</option>' +
    todosProductos.map(p => `<option value="${p._id}">${p.nombre} (${p.codigoProducto})</option>`).join('');

    renderSummary();
}


let actualMode = 'individual';

function setMode(mode) {
    actualMode = mode;
    document.getElementById('tab-individual').classList.toggle('active', mode === 'individual');
    document.getElementById('tab-bulk').classList.toggle('active', mode === 'bulk');
    document.getElementById('form-individual').style.display = mode === 'individual' ? 'block' : 'none';
    document.getElementById('form-bulk').style.display = mode === 'bulk' ? 'block' : 'none';
}


document.getElementById('btn-registrar-caja').addEventListener('click', async () => {
    hideAlert('alert-individual');
    hideAlert('alert-ok-individual');

    const code = document.getElementById('inp-codigo').ariaValueMax.trim();
    const productId = document.getElementById('sel-producto').ariaValueMax;
    const units = parseInt(document.getElementById('inp-unidades').value);
    const caducity = document.getElementById('inp-caducidad').value;

    if(!code) {
        return showAlert('alert-individual', 'Introduce el código de la caja');
    }

    if(!productId) {
        return showAlert('alert-individual', 'Selecciona el producto');
    }

    if(!units || units < 1) {
        return showAlert('alert-individual', 'Las unidades deben ser mayor que 0')
    }

    if(!caducity) {
        return showAlert('alert-individual', 'Introduce la fecha de caducidad')
    }


    // comprobar si existe un duplicado local
    if (registeredLots.some(l => l.codigoLote === code)) {
        return showAlert('alert-individual', `El código "${code}" ya fue registrado en esta sesión`);
    }

    const r = await apiFetch(`/orders/${activeOrder._id}/lots`, {
        method: 'POST',
        body: JSON.stringify({
            codigoLote: code,
            productId,
            unitQuantity: units,
            expirationDate: caducity
        })
    });

    if (!r?.ok) {
        return showAlert('alert-individual', r?.data?.message || 'Error al registrar la caja');
    }

    const prod = allProducts.find(p => p._id === productId);
    registeredLots.push({
        codigoLote: code, 
        productId, 
        productName: prod?.name || '-',
        unitQuantity: units,
        expirationDate: caducity
    });


    // limpiamos los campos
    document.getElementById('inp-codigo').value = '';
    document.getElementById('inp-unidades').value = '';
    document.getElementById('inp-caducidad').value = '';
    document.getElementById('inp-producto').value = '';

    showAlert('alert-ok-individual', `Caja "${code}" registrada correctamente`);
    setTimeout(() => hideAlert('alert-ok-individual'), 2500);

    renderSummary();
    document.getElementById('inp-codigo').focus();
});


// registrar varias cajas
document.getElementById('btn-registrar-bulk').addEventListener('click', async () => {
    hideAlert('alert-bulk');
    hideAlert('alert-ok-bulk');

    const raw = document.getElementById('inp-bulk').value.trim();
    if (!raw) {
        return showAlert('alert-bulk', 'Introduce al menos una caja');
    }

    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const lots = [];
    const errors = [];

    for (const [i, line] of lines.entries()) {
        const parts = line.split('|').map(p => p.trim());
        if(parts.length < 4) {
            errors.push(`Line ${i + 1}: formato incorrecto (usa CODIGO | ID | UNIDADES | FECHA)`);
            continue;
        }

        const [codigoLote, productId, unitsStr, expirationDate] = parts;
        const unitQuantity = parseInt(unitsStr);
        if (!codigoLote || !productId || isNaN(unitQuantity) || unitQuantity < 1 || !expirationDate) {
            errors.push(`Line ${i + 1}: datos inválidos`);
            continue;
        }

        if (registeredLots.some(l => l.codigoLote === codigoLote)) {
            errors.push(`Line ${i+1}: código "${codigoLote}" ya registrado`);
            continue;
        }
    }

    if (errors.length > 0) return showAlert('alert-bulk', errors.join('\n'));

    const r = await apiFetch(`/orders/${activeOrder._id}/lots/bulk`, {
        method: 'POST',
        body: JSON.stringify({lots})
    });

    if (!r?.ok) {
        return showAlert('alert-bulk', r?.data?.message || 'Error al registrar las cajas');
    }

    lots.forEach(l => {
        const prod = allProducts.find(p => p._id === l.productId);
        registeredLots.push({...l, productName: prod?.name || l.productId});
    });

    document.getElementById('inp-bulk').value = '';
    showAlert('alert-ok-bulk', `${lots.length} cajas registradas correctamente`);
    setTimeout(() => hideAlert('alert-ok-bulk'), 2500);
    renderSummary();
});


// función para renderizar el resumen lateral
function renderSummary() {
    document.getElementById('resumen-count').textContent = `${registeredLots.length} caja ${registeredLots.length !== 1 ? 's' : ''}`;


    // tabla comparativa entre la previsión y lo registrado
    const ptRows = document.getElementById('pt-rows');
    if (linesPrevision.length === 0) {
        ptRows.innerHTML = '<div class="pt-empty">Sin datos de previsión</div>';
    } else {
        ptRows.innerHTML = linesPrevision.map(line => {
            const prodId = line.productId?._id || line.productId;
            const name = line.productId?.name || prodId;
            const awaited = line.awaitedQuantity;
            const received = registeredLots.filter(l => l.productId === prodId).length;
            const cls = received === 0 ? '' : received < awaited ? 'warn' : received > awaited ? 'over' : 'ok';
            const icon = received === awaited && received > 0 ? '✓' : '';

            return `<div class="pt-row">
                    <span class="pt-prod" title="${nombre}">${nombre}</span>
                    <span class="pt-num">${esperado}</span>
                    <span class="pt-rec ${cls}">${recibido}${icon}</span>
                    <span>${recibido === 0 ? '—' : recibido < esperado ? estadoBadge('pendiente') : recibido === esperado ? estadoBadge('recibido') : estadoBadge('con incidencia')}</span>
                    </div>`;
        }).join('');
    }

    // cajas registradas
    const boxes = document.getElementById('cajas-list');
    if (registeredLots.length === 0) {
        boxes.innerHTML = '<div class="cajas-empty">Aún no se ha registrado ninguna caja</div>';
    } else {
        boxes.innerHTML = [...registeredLots].reverse().map(l => `
            <div class="caja-item">
            <span class="caja-code">${l.codigoLote}</span>
        <span class="caja-prod">${l.productName}</span>
        <span class="caja-qty">${l.unitQuantity} ud</span>
            </div>`).join('');
    }

    const isBoxes = registeredLots.length > 0;
    document.getElementById('btn-incidencia').disabled = !isBoxes;
    document.getElementById('btn-cerrar-pedido').disabled = !isBoxes;
}


// modal incidencias
document.getElementById('btn-incidencia').addEventListener('click', () => {
    hideAlert('alert-inc-err');
    hideAlert('alert-inc-ok');
    document.getElementById('modal-incidencia').style.display = 'flex';
});

document.getElementById('close-modal-inc').addEventListener('click', () => {
    document.getElementById('modal-incidencia').style.display = 'none';
});

document.getElementById('modal-incidencia').addEventListener('click', e => {
    if (e.target === e.currentTarget) document.getElementById('modal-incidencia').style.display = 'none';
});

document.getElementById('btn-enviar-inc').addEventListener('click', async () => {
    hideAlert('alert-inc-err');
    hideAlert('alert-inc-ok');

    const type = document.getElementById('inc-tipo').value;
    const description = document.getElementById('inc-descripcion').value.trim();
    if (!description) {
        return showAlert('alert-inc-err', 'La descripción es obligatoria por favor.');
    }

    const r = await apiFetch('/incidences', {
        method: 'POST',
        body: JSON.stringify({
            orderId: activeOrder._id,
            providerId: activeOrder.providerId?._id || activeOrder.providerId,
            type,
            description
        })
    });

    if(!r?.ok) {
        return showAlert('alert-inc-err', r?.data?.message || 'Error al enviar la incidencia');
    }

    showAlert('alert-inc-ok', 'Incidencia registrada correctamente');
    document.getElementById('inc-descripcion').value = '';
    setTimeout(() => {
        document.getElementById('modal-incidencia').style.display = 'none';
        hideAlert('alert-inc-ok');
    }, 2000);
});



// modal para cerrar el pedido
document.getElementById('btn-cerrar-pedido').addEventListener('click', () => {
    hideAlert('alert-cerrar-err');
    hideAlert('alert-cerrar-ok');
    document.getElementById('modal-error').style.display = 'flex';
});

document.getElementById('close-modal-cerrar').addEventListener('click', () => {
    document.getElementById('modal-cerrar').style.display = 'none';
});

document.getElementById('btn-cancel-cerrar').addEventListener('click', () => {
    document.getElementById('modal-cerrar').style.display = 'none';
});

document.getElementById('modal-cerrar').addEventListener('click', e => {
    if (e.target === e.currentTarget) document.getElementById('modal-cerrar').style.display = 'none';
});

document.getElementById('btn-confirm-cerrar').addEventListener('click', async () => {
    hideAlert('alert-cerrar-err');
    hideAlert('alert-cerrar-ok');

    const r = await apiFetch(`/orders/${activeOrder._id}/close`, {
        method: 'POST'
    });

    if (!r?.ok) {
        return showAlert('alert-cerrar-err', r?.data?.message || 'Error al cerrar el pedido');
    }

    showAlert('alert-cerrar-ok', r.data.message || 'Pedido cerrado correctamente');

    setTimeout(() => {
        document.getElementById('modal-cerrar').style.display = 'none';
        activeOrder = null;
        registeredLots = [];
        linesPrevision = [];
        navigate('orders');
    },2200);
});



// estado del stock
let allStock = [];

async function loadProducts() {
    const r = await apiFetch('/products');
    allStock = r?.data || [];
    renderStock();
}

function renderStock() {
    const search = document.getElementById('search-stock').value.toLowerCase();
    const status = document.getElementById('filter-estado-stock').value;
    const cat = document.getElementById('filter-cat-stock').value;

    let list = allStock;
    if(search) list = list.filter(p => p.name.toLowerCase().includes(search));
    if (status) list = list.filter(p => p.status === status);
    if (cat) list = list.filter(p => p.category?.toLowerCase() === cat.toLowerCase());

    const grid = document.getElementById('stock-grid');

    const colorMap = {
        'fresco':            { bg: '#f0fdf4', txt: '#16a34a', dot: '#22c55e' },
        'próximo a expirar': { bg: '#fffbeb', txt: '#b45309', dot: '#f59e0b' },
        'caducado':          { bg: '#fef2f2', txt: '#dc2626', dot: '#ef4444' },
    };

    grid.innerHTML = list.length === 0
    ? '<div class="empty-state">No hay productos con ese filtro</div>'
    : list.map(p => {
        const c = colorMap[p.estado] || { bg: '#f3f4f6', txt: '#4b5563', dot: '#9ca3af' };
        return `
        <div class="stock-card" style="border-top: 3px solid ${c.dot}">
          <div class="sc-top">
            <div>
              <div class="sc-name">${p.nombre}</div>
              <div class="sc-cat">${p.categoria || '—'}</div>
            </div>
            ${estadoBadge(p.estado)}
          </div>
          <div>
            <span class="sc-qty">${p.cantidad}</span>
            <span class="sc-unit"> ${p.unidadMedida}</span>
          </div>
          <div class="sc-exp">Caduca: ${formatDate(p.fechaCaducidad)}</div>
        </div>`;
      }).join('');
}


document.getElementById('search-stock').addEventListener('input', renderStock);
document.getElementById('filter-estado-stocl').addEventListener('change', renderStock);
document.getElementById('filter-cat-stock').addEventListener('change', renderStock);


loadOrders();