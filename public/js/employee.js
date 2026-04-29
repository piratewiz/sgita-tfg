
const API = '/api';

const token = localStorage.getItem('sgita_token');
const user = JSON.parse(localStorage.getItem('sgita_user') || 'null');

if(!token || !user) window.location.replace('/login.html');
if (user?.rol === 'admin' || user?.rol === 'encargado') window.location.replace('/dashboard.html');


document.getElementById('emp-name').textContent = `${user.name} ${user.surname}`;
document.getElementById('emp-role').textContent = user.rol.charAt(0).toUpperCase() + user.rol.slice(1);
document.getElementById('emp-num').textContent = user.numberEmployee || '-';
const empAvatarEl = document.getElementById('emp-avatar');
function renderEmpAvatarMarkup(person) {
    const role = (person?.rol || '').toLowerCase();
    const email = (person?.email || '').toLowerCase().trim();
    if (role === 'empleado' && email !== 'mock.employee@mock.sgita.local') {
        const fullName = `${person?.name || ''} ${person?.surname || ''}`.trim() || 'Empleado';
        return `<img src="/imgs/avatar-mujer.jpg" alt="Avatar de ${fullName}" class="avatar-photo" />`;
    }
    return (person?.name?.[0] || 'E').toUpperCase();
}
empAvatarEl.innerHTML = renderEmpAvatarMarkup(user);
document.getElementById('topbar-date').textContent =
  new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });


let activeOrder = null;
let registeredLots = [];
let linesPrevision = [];
let allProducts = [];
let orderProducts = [];

const titleMap = {
    pedidos: 'Mis pedidos',
    registro: 'Registrar cajas',
    productos: 'Estado del stock'
};

function navigate(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`section-${name}`).classList.add('active');
    document.querySelector(`.nav-item[data-section="${name}"]`).classList.add('active');
    document.getElementById('topbar-title').textContent = titleMap[name];
    closeSidebar();

    const loaders = {
        pedidos: loadOrders,
        registro: renderRegister,
        productos: loadProducts
    };
    loaders[name]?.();
}

document.querySelectorAll('.nav-item').forEach(b => b.addEventListener('click', () => navigate(b.dataset.section)));

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

function getOrderProductsFromLines(lines) {
    const unique = new Map();
    (lines || []).forEach((line) => {
        const product = line?.productId;
        if(!product) return;
        const rawId = typeof product === 'string' ? product : product._id;
        const id = rawId?.toString?.() || '';
        if(!id || unique.has(id)) return;
        unique.set(id, {
            _id: id,
            name: product.name || `Producto ${id}`,
            productCode: product.productCode || '',
        });
    });
    return Array.from(unique.values());
}


function statusBadge(status) {
    const map = {
    'fresh':            '<span class="badge badge-green">Fresh</span>',
    'soon_expire':      '<span class="badge badge-amber">Soon to expire</span>',
    'expired':          '<span class="badge badge-red">Expired</span>',
    'pending':          '<span class="badge badge-blue">Pending</span>',
    'received':         '<span class="badge badge-green">Received</span>',
    'incidence':        '<span class="badge badge-amber">With incidence</span>',
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


async function loadOrders() {
  const container = document.getElementById('pedidos-list');
  container.innerHTML = '<div class="empty-state">Cargando...</div>';
 
  const r = await apiFetch('/orders/status/pending');
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
        <span class="pc-num">${p.numberOrder}</span>
        ${statusBadge(p.status)}
      </div>
      <div class="pc-body">
        <div class="pc-row">
          <svg viewBox="0 0 20 20" fill="none"><path d="M10 2a6 6 0 016 6c0 4-6 10-6 10S4 12 4 8a6 6 0 016-6z" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/></svg>
          <span class="pc-label">Proveedor</span>
          <span class="pc-val">${p.providerId?.name || '—'}</span>
        </div>
        <div class="pc-row">
          <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="8" width="13" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="6" cy="17" r="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="17" r="1.5" stroke="currentColor" stroke-width="1.4"/></svg>
          <span class="pc-label">Furgoneta</span>
          <span class="pc-val">${p.truckId?.licencePlate || '—'} <span style="font-weight:400;color:var(--text-soft);font-size:11px">${p.truckId?.truckModel || ''}</span></span>
        </div>
        <div class="pc-row">
          <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M10 7v3l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          <span class="pc-label">Previsto</span>
          <span class="pc-val" style="font-family:var(--font-mono);font-size:12px">${formatDateTime(p.dateArriveOrder)}</span>
        </div>
      </div>
      <div class="pc-footer">
        <button class="btn-seleccionar" onclick="selectOrder('${p._id}')">Comenzar recepción →</button>
      </div>
    </div>`).join('');
}


async function selectOrder(id) {
    const r = await apiFetch(`/orders/${id}`);
    if (!r?.ok) return;

    activeOrder = r.data;
    registeredLots = [];
    linesPrevision = r.data.lines || [];
    orderProducts = getOrderProductsFromLines(linesPrevision);

    const rp = await apiFetch('/products');
    allProducts = rp?.data || [];

    navigate('registro');
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

  document.getElementById('pa-num').textContent        = activeOrder.numberOrder;
  document.getElementById('pa-proveedor').textContent  = `Proveedor: ${activeOrder.providerId?.name || '—'}`;
  document.getElementById('pa-furgoneta').textContent  = `Furgoneta: ${activeOrder.truckId?.licencePlate || '—'}`;
  banner.style.display  = 'flex';
  noMsg.style.display   = 'none';
  content.style.display = 'block';
 
  // Llenar select de productos
  const sel = document.getElementById('sel-producto');
  const productsForOrder = orderProducts.length > 0 ? orderProducts : allProducts;
  sel.innerHTML = '<option value="">Selecciona un producto...</option>' +
    productsForOrder.map(p => `<option value="${p._id}">${p.name}${p.productCode ? ` (${p.productCode})` : ''}</option>`).join('');

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

    const code = document.getElementById('inp-codigo').value.trim();
    const productId = document.getElementById('sel-producto').value;
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
    if (registeredLots.some(l => l.batchCode === code)) {
        return showAlert('alert-individual', `El código "${code}" ya fue registrado en esta sesión`);
    }

    const r = await apiFetch(`/orders/${activeOrder._id}/batch`, {
        method: 'POST',
        body: JSON.stringify({
            batchCode: code,
            productId,
            unitQuantity: units,
            expireDate: caducity
        })
    });

    if (!r?.ok) {
        return showAlert('alert-individual', r?.data?.message || 'Error al registrar la caja');
    }

    const prod = allProducts.find(p => p._id === productId);
    registeredLots.push({
        batchCode: code, 
        productId, 
        productName: prod?.name || '-',
        unitQuantity: units,
        expireDate: caducity
    });


    // limpiamos los campos
    document.getElementById('inp-codigo').value = '';
    document.getElementById('inp-unidades').value = '';
    document.getElementById('inp-caducidad').value = '';
    document.getElementById('sel-producto').value = '';

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

        const [codigoLote, productInputRaw, unitsStr, expirationDate] = parts;
        const productInput = productInputRaw.trim();
        const unitQuantity = parseInt(unitsStr);
        if (!codigoLote || !productInput || isNaN(unitQuantity) || unitQuantity < 1 || !expirationDate) {
            errors.push(`Line ${i + 1}: datos inválidos`);
            continue;
        }

        if (registeredLots.some(l => l.batchCode === codigoLote)) {
            errors.push(`Line ${i+1}: código "${codigoLote}" ya registrado`);
            continue;
        }

        const normalizedProduct = allProducts.find((p) => p._id === productInput || (p.productCode || '').toLowerCase() === productInput.toLowerCase() || (p.name || '').toLowerCase() === productInput.toLowerCase());

        if (!normalizedProduct) {
            errors.push(`Line ${i + 1}: producto "${productInput}" no existe`);
            continue;
        }

        lots.push({batchCode: codigoLote, productId: normalizedProduct._id.toString(), unitQuantity, expireDate: expirationDate});
    }

    if (errors.length > 0) return showAlert('alert-bulk', errors.join('\n'));

    const r = await apiFetch(`/orders/${activeOrder._id}/lots/bulk`, {
        method: 'POST',
        body: JSON.stringify({lots})
    });

    if (!r?.ok) {
        const backendErrors = Array.isArray(r?.data?.errors) ? r.data.errors : [];
        const details = backendErrors.length > 0 ? `\n${backendErrors.join('\n')}` : '';
        return showAlert('alert-bulk', `${r?.data?.message || 'Error al registrar las cajas'}${details}`);
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
            const rawProdId = line.productId?._id || line.productId;
            const prodId = rawProdId?.toString?.() || '';
            const name = line.productId?.name || prodId;
            const code = line.productId?.productCode || '';
            const expected = line.expectedQuantity;
            const received = registeredLots.filter(l => (l.productId?.toString?.() || '') === prodId).length;
            const cls = received === 0 ? '' : received < expected ? 'warn' : received > expected ? 'over' : 'ok';
            const icon = received === expected && received > 0 ? '✓' : '';

            return `<div class="pt-row">
                    <span class="pt-prod" title="${name}">${name}${code ? `<br><small class="pt-code">${code}</small>` : ''}</span>
                    <span class="pt-num">${expected}</span>
                    <span class="pt-rec ${cls}">${received}${icon}</span>
                    <span>${received === 0 ? '—' : received < expected ? statusBadge('pending') : received === expected ? statusBadge('received') : statusBadge('incidence')}</span>
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
            <span class="caja-code">${l.batchCode}</span>
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

    const typeMap = {
        'cantidad incorrecta': 'incorrect quantity',
        'producto caducado': 'expired product',
        'daño': 'damaged product',
        'otro': 'other',
    };

    const r = await apiFetch('/incidences', {
        method: 'POST',
        body: JSON.stringify({
            orderId: activeOrder._id,
            providerId: activeOrder.providerId?._id || activeOrder.providerId,
            type: typeMap[type] || type,
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
    document.getElementById('modal-cerrar').style.display = 'flex';
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
    const confirmBtn = document.getElementById('btn-confirm-cerrar');
    if(confirmBtn.disabled) return;
    confirmBtn.disabled = true;

    try {
        const r = await apiFetch(`/orders/${activeOrder._id}/close`, {
            method: 'POST'
        });

        
        if (!r?.ok) {
            showAlert('alert-cerrar-err', r?.data?.message || 'Error al cerrar el pedido');
            return;
        }

        showAlert('alert-cerrar-ok', r?.data?.message || 'Pedido cerrado correctamente');

        setTimeout(() => {
            document.getElementById('modal-cerrar').style.display = 'none';
            activeOrder = null;
            registeredLots = [];
            linesPrevision = [];
            navigate('pedidos');
        }, 1800);
    } finally {
        confirmBtn.disabled = false;
    }
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
        'fresh':            { bg: '#f0fdf4', txt: '#16a34a', dot: '#22c55e' },
        'soon_expire': { bg: '#fffbeb', txt: '#b45309', dot: '#f59e0b' },
        'expired':          { bg: '#fef2f2', txt: '#dc2626', dot: '#ef4444' },
    };

    grid.innerHTML = list.length === 0
    ? '<div class="empty-state">No hay productos con ese filtro</div>'
    : list.map(p => {
        const c = colorMap[p.status] || { bg: '#f3f4f6', txt: '#4b5563', dot: '#9ca3af' };
        return `
        <div class="stock-card" style="border-top: 3px solid ${c.dot}">
          <div class="sc-top">
            <div>
              <div class="sc-name">${p.name}</div>
              <div class="sc-cat">${p.category || '—'}</div>
            </div>
            ${statusBadge(p.status)}
          </div>
          <div>
            <span class="sc-qty">${p.quantity}</span>
            <span class="sc-unit"> ${p.unitType}</span>
          </div>
          <div class="sc-exp">Caduca: ${formatDate(p.expirationDate)}</div>
        </div>`;
      }).join('');
}


document.getElementById('search-stock').addEventListener('input', renderStock);
document.getElementById('filter-estado-stock').addEventListener('change', renderStock);
document.getElementById('filter-cat-stock').addEventListener('change', renderStock);


loadOrders();