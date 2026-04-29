

const API = '/api';

const token = localStorage.getItem('sgita_token');
const user = JSON.parse(localStorage.getItem('sgita_user') || 'null');

if (!token || !user) {
    window.location.replace('/login.html');
}

// pintar datos del usuario en el sidebar
const rolLabels = {admin: 'Administrador', encargado: 'Encargado', empleado: 'Empleado'};

document.getElementById('user-name').textContent = `${user.name} ${user.surname}`;
document.getElementById('user-role').textContent = rolLabels[user.rol] || user.rol;
document.getElementById('user-avatar').textContent = (user.name?.[0] || 'U').toUpperCase();

// pintar fecha en topbar
const now = new Date();
document.getElementById('topbar-date').textContent =
  now.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' });


// navegación
const sections = document.querySelectorAll('.section');
const navItems = document.querySelectorAll('.nav-item');
const topTitle = document.getElementById('topbar-title');
const titleMap = {inicio: 'Inicio', empleados: 'Empleados', productos: 'Productos', previsiones: 'Previsiones', incidencias: 'Incidencias'};

function navigate(name) {
    sections.forEach(s => s.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));
    document.getElementById(`section-${name}`).classList.add('active');
    document.querySelector(`.nav-item[data-section="${name}"]`).classList.add('active');
    topTitle.textContent = titleMap[name] || name;
    closeSidebar();

    // cargamos datos cuando cambiamos de sección
    const loaders = { inicio: loadInicio, empleados: loadEmployees, productos: loadProducts, previsiones: loadPrevision, incidencias: loadIncidences };
    loaders[name]?.();
}


navItems.forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.section)));

// sidebar para formato móvil
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

document.getElementById('menu-btn').addEventListener('click', () => {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
});

function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
}

overlay.addEventListener('click', closeSidebar );
document.getElementById('sidebar-close').addEventListener('click', closeSidebar);

// deslogearse
document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('sgita_token');
    localStorage.removeItem('sgita_user');
    window.location.replace('/login.html');
});

// fetch con auth
async function apiFetch(path) {
    const response = await fetch(`${API}${path}`, {
        headers: {Authorization: `Bearer ${token}`}
    });

    if(response.status === 401) {
        localStorage.removeItem('sgita_token');
        localStorage.removeItem('sgita_user');
        window.location.replace('/login.html');
        return null;
    }

    return response.ok ? response.json() : null;
}

async function apiPatch(path, body) {
    const response = await fetch(`${API}${path}`, {
        method: 'PATCH',
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });

    if(response.status === 401) {
      localStorage.removeItem('sgita_token');
      localStorage.removeItem('sgita_user');
      window.location.replace('/login.html');
      return null;
    }

    const data = await response.json().catch(() => null);
    return response.ok ? data : null;
}

function estadoBadge(estado) {
  const map = {
    'fresh':               '<span class="badge badge-green">Fresh</span>',
    'soon_expire':         '<span class="badge badge-amber">Soon to expire</span>',
    'expired':             '<span class="badge badge-red">Expired</span>',
    'pending':             '<span class="badge badge-blue">Pending</span>',
    'received':            '<span class="badge badge-green">Received</span>',
    'incidence':           '<span class="badge badge-red">With incidence</span>',
    'open':                '<span class="badge badge-red">Open</span>',
    'in progress':         '<span class="badge badge-amber">In progress</span>',
    'resolved':            '<span class="badge badge-green">Resolved</span>',
    'fresco':              '<span class="badge badge-green">Fresco</span>',
    'próximo a expirar':   '<span class="badge badge-amber">Próx. a expirar</span>',
    'caducado':            '<span class="badge badge-red">Caducado</span>',
    'pendiente':           '<span class="badge badge-blue">Pendiente</span>',
    'recibido':            '<span class="badge badge-green">Recibido</span>',
    'con incidencia':      '<span class="badge badge-red">Con incidencia</span>',
    'abierta':             '<span class="badge badge-red">Abierta</span>',
    'en gestión':          '<span class="badge badge-amber">En gestión</span>',
    'resuelta':            '<span class="badge badge-green">Resuelta</span>',
    'activo':              '<span class="badge badge-green">Activo</span>',
    'inactivo':            '<span class="badge badge-gray">Inactivo</span>',
    'admin':               '<span class="badge badge-purple">Admin</span>',
    'encargado':           '<span class="badge badge-teal">Encargado</span>',
    'empleado':            '<span class="badge badge-blue">Empleado</span>',
  };
  return map[estado] || `<span class="badge badge-gray">${estado}</span>`;
}

function formatDate(d) {
    if(!d) return '-';
    return new Date(d).toLocaleDateString('es-ES', {day: '2-digit', month: '2-digit', year: 'numeric'});
}

function formatDateTime(d) {
    if(!d) return '-';
    return new Date(d).toLocaleString('es-ES', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'});
}

function emptyRow(cols, msg = 'Sin resultados') {
    return `<tr><td colspan="${cols}" class="empty">${msg}</td></tr>`;
}


// para panel inicio
async function loadInicio() {
    const [products, employees, orders, incidences, minStockProducts] = await Promise.all([apiFetch('/products'),
        apiFetch('/employees'),
        apiFetch('/orders'),
        apiFetch('/incidences'),
        apiFetch('/products/stock'),
    ]);


    // KPIS
    const prods = products || [];
    const emps = employees || [];
    const ords = orders || [];
    const incs = incidences || [];
    
    const fresh = prods.filter(p => p.status === 'fresh').length;
    const soonExpire = prods.filter(p => p.status === 'soon_expire').length;
    const expired = prods.filter(p => p.status === 'expired').length;
    const today = new Date().toDateString();
    const prevToday = ords.filter(order => order.status === 'pending' && new Date(order.dateArriveOrder).toDateString() === today).length;
    const openIncidences = incs.filter(i => i.status === 'open').length;


    document.getElementById('kpi-total').textContent = prods.length;
    document.getElementById('kpi-frescos').textContent = fresh
    document.getElementById('kpi-proximos').textContent = soonExpire
    document.getElementById('kpi-caducados').textContent = expired
    document.getElementById('kpi-empleados').textContent = emps.filter(e => e.active).length;
    document.getElementById('kpi-previsiones').textContent = prevToday;

    // sección incidencias
    const badge = document.getElementById('badge-incidencias');
    badge.textContent = openIncidences;
    badge.classList.toggle('visible', openIncidences > 0);


    // tabla stock
    const minStock = prods.filter(p => p.quantity <= p.minStock);
    const tbodyBS = document.querySelector('#tbl-bajo-stock tbody');
    tbodyBS.innerHTML = minStock.length === 0 ? emptyRow(4, 'No hay productos bajo stock mínimo') : minStock.slice(0, 8).map(p => `
        <tr>
          <td>${p.name}</td>
          <td>${p.category}</td>
          <td><strong>${p.quantity}</strong> ${p.unitType}</td>
          <td class="td-soft">${p.minStock} ${p.unitType}</td>
        </tr>
        `).join('');


    // tabla con incidencias abiertas
    const incHome = incs.filter(i => i.status === 'open');
    const tbodyIH = document.querySelector('#tbl-incidencias-home tbody');
    tbodyIH.innerHTML = incHome.length === 0 ? emptyRow(4, 'No hay incidencias abiertas') : incHome.slice(0, 6).map(i => `
            <tr>
          <td>${i.orderId?.numberOrder || '—'}</td>
          <td>${i.type}</td>
          <td>${i.providerId?.name || '—'}</td>
          <td>${estadoBadge(i.status)}</td>
        </tr>
        `).join('');
}


// empleados
let allEmployees = [];

async function loadEmployees() {
    const data = await apiFetch('/employees');
    allEmployees = data || [];
    renderEmployees();
}

function renderEmployees() {
    const search = document.getElementById('search-empleados').value.toLowerCase();
    const rol = document.getElementById('filter-rol').value;
    const active = document.getElementById('filter-activo').value

    let list = allEmployees;
    if (search) list = list.filter(e => `${e.name} ${e.surname}`.toLowerCase().includes(search) || e.email.toLowerCase().includes(search) || e.numberEmployee?.toLowerCase().includes(search));

    if(rol) list = list.filter(e => e.rol === rol);
    if(active !== '') list = list.filter(e => String(e.active) === active);

    const tbody = document.querySelector('#tbl-empleados tbody');
  tbody.innerHTML = list.length === 0
    ? emptyRow(5)
    : list.map(e => `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:30px;height:30px;border-radius:50%;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:#2563eb;flex-shrink:0;">
                ${(e.name?.[0] || '?').toUpperCase()}
              </div>
              <div>
                <div style="font-weight:500;font-size:13px;">${e.name} ${e.surname}</div>
                <div class="td-soft">${e.email}</div>
              </div>
            </div>
          </td>
          <td class="td-soft" style="font-family:var(--font-mono)">${e.numberEmployee || '—'}</td>
          <td class="td-soft">${e.dni}</td>
          <td>${estadoBadge(e.rol)}</td>
          <td>${estadoBadge(e.active ? 'activo' : 'inactivo')}</td>
        </tr>`).join('');
}

document.getElementById('search-empleados').addEventListener('input', renderEmployees);
document.getElementById('filter-rol').addEventListener('change', renderEmployees);
document.getElementById('filter-activo').addEventListener('change', renderEmployees);


// productos
let allProducts = [];

async function loadProducts() {
    const data = await apiFetch('/products');
    allProducts = data || [];
    renderProducts();
}

function renderProducts() {
    const search = document.getElementById('search-productos').value.toLowerCase();
    const category = document.getElementById('filter-categoria').value
    const status = document.getElementById('filter-estado-prod').value
    const date = document.getElementById('filter-fecha-prod').value


    let list = allProducts;
    if (search)    list = list.filter(p => p.name.toLowerCase().includes(search) || p.productCode?.toLowerCase().includes(search));
    if (category) list = list.filter(p => p.category?.toLowerCase() === category.toLowerCase());
    if (status)    list = list.filter(p => p.status === status);
    if (date)     list = list.filter(p => p.expirationDate && new Date(p.expirationDate) <= new Date(date));

  const tbody = document.querySelector('#tbl-productos tbody');
  tbody.innerHTML = list.length === 0
    ? emptyRow(7)
    : list.map(p => `
        <tr>
          <td><span style="font-weight:500">${p.name}</span></td>
          <td>${p.category || '—'}</td>
          <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-soft)">${p.productCode || '—'}</td>
          <td><strong>${p.quantity}</strong></td>
          <td class="td-soft">${p.unitType}</td>
          <td class="td-soft" style="font-family:var(--font-mono);font-size:12px">${formatDate(p.expirationDate)}</td>
          <td>${estadoBadge(p.status)}</td>
        </tr>`).join('');
}


document.getElementById('search-productos').addEventListener('input', renderProducts);
document.getElementById('filter-categoria').addEventListener('change', renderProducts);
document.getElementById('filter-estado-prod').addEventListener('change', renderProducts);
document.getElementById('filter-fecha-prod').addEventListener('change', renderProducts);

// previsiones
let allOrders = [];

async function loadPrevision () {
    const data = await apiFetch('/orders');
    allOrders = data || [];
    renderPrevisions();
}

function renderPrevisions() {
    const status = document.getElementById('filter-estado-pedido').value;
    const date = document.getElementById('filter-fecha-pedido').value;

    let list = allOrders;
    if (status) list = list.filter(p => p.status === status);
    if (date) list = list.filter(p => p.dateArriveOrder && formatDate(p.dateArriveOrder) === formatDate(date));

    const container = document.getElementById('previsiones-list');

    if(list.length === 0) {
        container.innerHTML = '<div class="empty-state">No hay previsiones con ese filtro</div>';
        return;
    }

    container.innerHTML = list.map(p => {
    const lineas = p.lineas || [];
    return `
    <div class="prevision-card">
      <div class="prev-header">
        <span class="prev-num">${p.numberOrder}</span>
        ${estadoBadge(p.status)}
      </div>
      <div class="prev-body">
        <div class="prev-row">
          <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="8" width="13" height="8" rx="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="6" cy="17" r="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="17" r="1.5" stroke="currentColor" stroke-width="1.4"/></svg>
          <span class="prev-label">Furgoneta</span>
          <span class="prev-val">${p.truckId?.licencePlate || '—'} <span style="color:var(--text-soft);font-weight:400;font-size:12px">${p.truckId?.truckModel || ''}</span></span>
        </div>
        <div class="prev-row">
          <svg viewBox="0 0 20 20" fill="none"><path d="M10 2a6 6 0 016 6c0 4-6 10-6 10S4 12 4 8a6 6 0 016-6z" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="8" r="2" stroke="currentColor" stroke-width="1.4"/></svg>
          <span class="prev-label">Proveedor</span>
          <span class="prev-val">${p.providerId?.name || '—'}</span>
        </div>
        <div class="prev-row">
          <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.4"/><path d="M10 7v3l2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          <span class="prev-label">Previsto</span>
          <span class="prev-val" style="font-family:var(--font-mono);font-size:13px">${formatDateTime(p.dateArriveOrder)}</span>
        </div>
        ${lineas.length > 0 ? `
        <div class="prev-productos">
          <div class="prev-productos-title">Productos esperados</div>
          <div class="prev-product-list">
            ${lineas.slice(0, 5).map(l => `
              <div class="prev-product-item">
                <span class="prev-product-name">${l.productId?.name || l.productId || '—'}</span>
                <span class="prev-product-qty">${l.expectedQuantity} cajas</span>
              </div>`).join('')}
            ${lineas.length > 5 ? `<div style="font-size:12px;color:var(--text-xsoft);padding:4px 10px">+${lineas.length - 5} más...</div>` : ''}
          </div>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');
}

document.getElementById('filter-estado-pedido').addEventListener('change', renderPrevisions);
document.getElementById('filter-fecha-pedido').addEventListener('change', renderPrevisions);


// incidencias
let allIncidences = [];
let currentIncID = null;

async function loadIncidences() {
    const data = await apiFetch('/incidences');
    allIncidences = data || [];
    renderIncidences();
}

function renderIncidences() {
    const search = document.getElementById('search-incidencias').value.toLowerCase();
    const status = document.getElementById('filter-estado-inc').value;
    const statusFilterMap = {
        'abierta': 'open',
        'en gestión': 'in progress',
        'resuelto': 'resolved',
        'open': 'open',
        'in progress': 'in progress',
        'resolved': 'resolved',
    };
    const normalizedStatus = statusFilterMap[status] || '';

    let list = allIncidences;
    if(search) list = list.filter(i => (i.orderId?.numberOrder || '').toLowerCase().includes(search) || (i.providerId?.name || '').toLowerCase().includes(search));

    if(normalizedStatus) list = list.filter(i => i.status === normalizedStatus);

    const tbody = document.querySelector('#tbl-incidencias tbody');
  tbody.innerHTML = list.length === 0
    ? emptyRow(7)
    : list.map(i => `
        <tr>
          <td style="font-family:var(--font-mono);font-size:12px">${i.orderId?.numberOrder || '—'}</td>
          <td>${i.providerId?.name || '—'}</td>
          <td>${i.type}</td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${i.description}">${i.description}</td>
          <td>${estadoBadge(i.status)}</td>
          <td class="td-soft" style="font-family:var(--font-mono);font-size:12px">${formatDate(i.createdAt)}</td>
          <td>
            ${i.status !== 'resolved' ? `<button class="btn-action" onclick="openModal('${i._id}', '${i.status}')">Actualizar</button>` : '—'}
          </td>
        </tr>`).join('');
}

document.getElementById('search-incidencias').addEventListener('input', renderIncidences);
document.getElementById('filter-estado-inc').addEventListener('change', renderIncidences);


// para cambio de estado
function openModal(id, actualStatus) {
    currentIncID = id;
    const opts = document.querySelectorAll('.estado-opt');
    const statusValueMap = {
        'abierta': 'open',
        'en gestión': 'in progress',
        'resuelto': 'resolved',
        'open': 'open',
        'in progress': 'in progress',
        'resolved': 'resolved',
    };
    const normalizedCurrent = statusValueMap[actualStatus] || actualStatus;
    opts.forEach(o => o.classList.toggle('selected', (statusValueMap[o.dataset.val] || o.dataset.val) === normalizedCurrent));
    document.getElementById('modal-overlay').style.display = 'flex';
}

document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('modal-overlay').style.display = 'none';
});

document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if(e.target === e.currentTarget) document.getElementById('modal-overlay').style.display = 'none';
});

document.querySelectorAll('.estado-opt').forEach(btn => {
    btn.addEventListener('click', async () => {
        const rawStatus = btn.dataset.val;
        const statusMap = {
            'abierta': 'open',
            'en gestión': 'in progress',
            'resuelto': 'resolved',
            'open': 'open',
            'in progress': 'in progress',
            'resolved': 'resolved',
        };
        const newStatus = statusMap[rawStatus] || rawStatus;
        document.querySelectorAll('.estado-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        const res = await apiPatch(`/incidences/${currentIncID}/status`, { status: newStatus });
        if (res) {
            const idx = allIncidences.findIndex(i => i._id === currentIncID);
            if (idx !== -1) allIncidences[idx].status = newStatus;
            await loadIncidences();

            const abiertas = allIncidences.filter(i => i.status === 'open').length;
            const badge = document.getElementById('badge-incidencias');
            badge.textContent = abiertas;
            badge.classList.toggle('visible', abiertas > 0);
        }
        
        setTimeout(() => {
            document.getElementById('modal-overlay').style.display = 'none';
        }, 300);
    });
});

// registrar nuevas previsiones
// asi consigo no depender del mock de datos, y se hace mas realista la app
async function previPost(path, body) {
  const response = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });
    if (response.status === 401) {
        localStorage.removeItem('sgita_token');
        localStorage.removeItem('sgita_user');
        window.location.replace('/login.html');
        return null;
    }
    const data = await response.json().catch(() => null);
    return { ok: response.ok, data };
}

const modalNP = document.getElementById('modal-nueva-prevision');
let npProducts = [];

function openNewPrevision() {
  document.getElementById('form-nueva-prevision').reset();
  document.getElementById('np-lines').innerHTML = '';
  document.getElementById('np-error').style.display = 'none';
  document.getElementById('btn-np-submit').disabled = false;
  document.getElementById('btn-np-submit').textContent = 'Registrar Previsión';
  loadNPSelects();
  addNPLine();
  modalNP.style.display = 'flex';
}

function closeNewPrevision() {
  modalNP.style.display = 'none';
}

document.getElementById('btn-nueva-prevision').addEventListener('click', openNewPrevision);
document.getElementById('modal-np-close').addEventListener('click', closeNewPrevision);
document.getElementById('btn-np-cancel').addEventListener('click', closeNewPrevision);
modalNP.addEventListener('click', e => {if (e.target === modalNP) closeNewPrevision(); });

async function loadNPSelects() {
  const [providers, trucks, products] = await Promise.all([
    apiFetch('/providers'),
    apiFetch('/trucks'),
    apiFetch('/products'),
  ]);

  npProducts = products || [];

  const provSel = document.getElementById('np-provider');
  provSel.innerHTML = '<option value="">Seleccionar proveedor...</option>' + (providers || []).map(p => `<option value="${p._id}">${p.name}</option>`).join('');

  const truckSel = document.getElementById('np-truck');
  truckSel.innerHTML = '<option value="">Seleccionar furgoneta...</option>' + (trucks || []).map(t => `<option value="${t._id}">${t.licencePlate}${t.truckModel ? ' – ' + t.truckModel : ''}</option>`).join('');

  document.querySelectorAll('.np-product-sel').forEach(sel => fillProductOptions(sel));
}

function fillProductOptions(sel) {
  const current = sel.value;
  sel.innerHTML = '<option value="">Seleccionar producto...</option>' + npProducts.map(p => `<option value="${p._id}"${p._id === current ? ' selected' : ''}>${p.name}${p.productCode ? ' (' + p.productCode + ')' : ''}</option>`).join('');
}

function addNPLine() {
  const container = document.getElementById('np-lines');
  const div = document.createElement('div');
  div.className = 'np-line';
  div.innerHTML = `
        <select class="form-input np-product-sel" required>
          <option value="">Seleccionar producto...</option>
        </select>
        <input type="number" class="form-input np-qty" min="1" value="1" placeholder="Cant." required />
        <button type="button" class="btn-remove-line" title="Eliminar línea">×</button>
    `;

    div.querySelector('.btn-remove-line').addEventListener('click', () => {
      if (document.querySelectorAll('.np-line').length > 1) div.remove();
    });

    fillProductOptions(div.querySelector('.np-product-sel'));
    container.appendChild(div);
}

document.getElementById('btn-add-line').addEventListener('click', addNPLine);

document.getElementById('form-nueva-prevision').addEventListener('submit', async e => {
  e.preventDefault();
  const errorEl = document.getElementById('np-error');
  errorEl.style.display = 'none';

  const orderNumber = document.getElementById('np-number').value.trim();
  const providerId = document.getElementById('np-provider').value;
  const truckId = document.getElementById('np-truck').value;
  const previsionArrivalDate = document.getElementById('np-date').value;

  const lines = [];
  let linesValid = true;
  document.querySelectorAll('.np-line').forEach(row => {
    const productId = row.querySelector('.np-product-sel').value;
    const qty = parseInt(row.querySelector('.np-qty').value, 10);
    if (!productId || !qty || qty < 1) {
      linesValid = false;
      return;
    }
    lines.push({productId, expectedQuantity: qty});
  });

  if (!orderNumber || !providerId || !truckId || !previsionArrivalDate) {
    errorEl.textContent = 'Debes completar todos los campos';
    errorEl.style.display = 'block';
    return;
  }

  if (!linesValid || lines.length === 0) {
    errorEl.textContent = 'Debes añadir al menos una línea de producto válida';
    errorEl.style.display = 'block';
    return;
  }

  const submitBtn = document.getElementById('btn-np-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Registrando...'

  const result = await previPost('/orders', {orderNumber, providerId, truckId, previsionArrivalDate, lines});

  submitBtn.disabled = false;
  submitBtn.textContent = 'Registrar Previsión';

  if (!result || !result.ok) {
    errorEl.textContent = result?.data?.message || 'Error al intentar registrar la previsión';
    errorEl.style.display = 'block';
    return;
  }

  closeNewPrevision();
  await loadPrevision();
});

loadInicio();