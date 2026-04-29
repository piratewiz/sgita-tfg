

const API = '/api';

const viewLoading = document.getElementById('view-loading');
const viewInvalid = document.getElementById('view-invalid');
const viewForm = document.getElementById('view-form');
const viewSuccess = document.getElementById('view-success');

const formReset = document.getElementById('form-reset');
const inputPass = document.getElementById('new-password');
const inputConfirm = document.getElementById('confirm-password');
const btnReset = document.getElementById('btn-reset');
const alertErr = document.getElementById('alert-err');
const employeeInfoEl = document.getElementById('employee-info');
const successNameEl = document.getElementById('success-name');

const togglePass = document.getElementById('toggle-pass');
const iconEye = document.getElementById('icon-eye');
const iconEyeOff = document.getElementById('icon-eye-off');

let resetToken = null;
let employeeName = '';

function showView(view) {
  [viewLoading, viewInvalid, viewForm, viewSuccess].forEach(v => {
    v.style.display = 'none';
  });
  view.style.display = 'block';
}

function setFieldError(fieldId, errorId, msg) {
  const field = document.getElementById(fieldId);
  const error = document.getElementById(errorId);

  field.classList.toggle('has-error', !!msg);
  error.textContent = msg || '';
}

function clearFieldError(fieldId, errorId) {
  setFieldError(fieldId, errorId, '');
}

function showAlert(el, msg) {
  el.textContent = msg,
  el.style.display = 'block';
}

function hideAlert(el) {
  el.style.display = 'none';
  el.textContent = '';
}

function setLoading(loading) {
  const text = btnReset.querySelector('.btn-text');
  const loader = btnReset.querySelector('.btn-loader');

  btnReset.disabled = loading;
  text.style.display = loading ? 'none' : '';
  loader.style.display = loading ? '' : 'none';
}

togglePass.addEventListener('click', () => {
  const isText = inputPass.type === 'text';
  inputPass.type = isText ? 'password' : 'text';
  iconEye.style.display = isText ? '' : 'none';
  iconEyeOff.style.display = isText ? 'none' : '';
  togglePass.setAttribute('aria-label', isText ? 'Mostrar contraseña' : 'Ocultar contraseña');
})

inputPass.addEventListener('input', () => clearFieldError('field-password', 'error-password'));
inputConfirm.addEventListener('input', () => clearFieldError('field-confirm', 'error-confirm'));

function validateForm() {
  let valid = true;
  const pass = inputPass.value;
  const confirm = inputConfirm.value;

  if(!pass) {
    setFieldError('field-password', 'error-password', 'La contraseña es obligatoria');
    valid = false;
  } else if (pass.length < 6) {
    setFieldError('field-password', 'error-password', 'La contraseña debe tener al menos 6 caracteres');
    valid = false;
  } else {
    clearFieldError('field-password', 'error-password');
  }

  if(!confirm) {
    setFieldError('field-confirm', 'error-confirm', 'Confirma la contraseña');
    valid = false;
  } else if (confirm !== pass) {
    setFieldError('field-confirm', 'error-confirm', 'Las contraseñas no coinciden');
    valid = false;
  } else {
    clearFieldError('field-confirm', 'error-confirm');
  }

  return valid;
}

async function verifyToken(token) {
  try {
    const res = await fetch(`${API}/auth/verify-reset-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });

        if(!res.ok) return null;

        const data = await res.json();
        return data;
  } catch (error) {
    return null;
  }
}

formReset.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAlert(alertErr);

  if(!validateForm()) return;
  setLoading(true);

  try {
    const res = await fetch(`${API}/auth/reset-password`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        token: resetToken,
        password: inputPass.value,
      }),
    });

    const data = await res.json();

    if(!res.ok) {
      showAlert(alertErr, data.message || 'No se ha podido restablecer la contraseña');
      return;
    }

    successNameEl.textContent = employeeName;
    showView(viewSuccess);
  } catch (error) {
    showAlert(alertErr, 'No es posible conectarse con el servidor.');
  } finally {
    setLoading(false);
  }
});

(async function init() {
  const params = new URLSearchParams(window.location.search);
  resetToken = params.get('token');

  if(!resetToken) {
    showView(viewInvalid);
    return;
  }

  const result = await verifyToken(resetToken);

  if(!result) {
    showView(viewInvalid);
    return;
  }

  employeeName = result.name || result.email || 'empleado';
  employeeInfoEl.textContent = result.name ? `${result.name} (${result.email})` : result.email;

  showView(viewForm);
})();