

const API = '/api'

const viewLogin  = document.getElementById('view-login');
const viewForgot = document.getElementById('view-forgot');
 
// variables para login
const formLogin    = document.getElementById('form-login');
const inputEmail   = document.getElementById('email');
const inputPass    = document.getElementById('password');
const btnLogin     = document.getElementById('btn-login');
const alertLogin   = document.getElementById('alert-login');
const togglePass   = document.getElementById('toggle-pass');
const iconEye      = document.getElementById('icon-eye');
const iconEyeOff   = document.getElementById('icon-eye-off');
 
// variables para recuperación contraseña
const formForgot      = document.getElementById('form-forgot');
const inputForgotEmail= document.getElementById('forgot-email');
const btnForgotSubmit = document.getElementById('btn-forgot-submit');
const alertForgotOk   = document.getElementById('alert-forgot-ok');
const alertForgotErr  = document.getElementById('alert-forgot-err');


function showView(view) {
    [viewLogin, viewForgot].forEach(v => {
        v.style.display = 'none';
        v.style.animation = 'none';
    });

    view.style.display = 'block'

    void view.offsetWidth;
    view.style.animation = '';
}

document.getElementById('btn-forgot').addEventListener('click', () => {
    clearAlerts();
    showView(viewForgot);
    inputForgotEmail.focus();
});

document.getElementById('btn-back').addEventListener('click',() => {
    clearAlerts();
    showView(viewLogin);
    inputEmail.focus();
});

togglePass.addEventListener('click', () => {
    const isText = inputPass.type === 'text';
    inputPass.type = isText ? 'password' : 'text';
    iconEye.style.display = isText ? '' : 'none';
    iconEyeOff.style.display = isText ? 'none' : '';
    togglePass.setAttribute('aria-label', isText ? 'Mostrar contraseña': 'Ocultar contraseña');
});

// validamos formulario
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldError(fieldId, errorId, msg) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(errorId);

    field.classList.toggle('has-error', !!msg);
    error.textContent = msg || '';
}

function clearFieldError(fieldId, errorId) {
    setFieldError(fieldId, errorId, '');
}

function clearAlerts() {
    [alertLogin, alertForgotOk, alertForgotErr].forEach(el => {
        el.style.display = 'none';
        el.textContent = '';
    });
}

function showAlert(el, msg) {
    el.textContent = msg;
    el.style.display = 'block';
    el.scrollIntoView({behavior: 'smooth', block: 'nearest'});
}

// validación del formulario
function validateLoginForm() {
    let valid = true;
    const email = inputEmail.ariaValueMax.trim();
    const pass = inputPass.value

    if(!email) {
        setFieldError('field-email', 'error-email', 'El email es obligatorio');
        valid = false;
    } else if (!EMAIL_RE.test(email)) {
        setFieldError('field-email', 'error-email', 'Introduce un email válido por favor');
        valid = false;
    } else {
        clearFieldError('field-email', 'error-email')
    }

    if(!pass) {
        setFieldError('field-password', 'error-password', 'La contraseña es obligatoria');
        valid = false;
    } else if (pass.length < 6) {
        setFieldError('field-password', 'error-password', 'La contraseña debe tener al menos 6 caracteres');
        valid = false;
    } else {
        clearFieldError('field-password', 'error-password')
    }

    return valid;
}

function validateForgotForm() {
    const email = inputForgotEmail.value.trim();
    if(!email) {
        setFieldError('field-forgot-email', 'error-forgot-email', 'Email obligatorio');
        return false;
    }

    if(!EMAIL_RE.test(email)) {
        setFieldError('field-forgot-email', 'error-forgot-email', 'Introduce un email válido');
        return false;
    }

    clearFieldError('field-forgot-email', 'error-forgot-email');
    return true;
}

function setLoading(btn, loading) {
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');

    btn.disabled = loading;
    text.style.display = loading ? 'none' : '';
    loader.style.display = loading ? '' : 'none';
}


inputEmail.addEventListener('input', () => clearFieldError('field-email', 'error-email'));
inputPass.addEventListener('input', () => clearFieldError('field-password', 'error-password'));
inputForgotEmail.addEventListener('input', () => clearFieldError('field-forgot-email', 'error-forgot-email'));

// enviar formulario
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();

    if(!validateLoginForm()) return;

    setLoading(btnLogin, true);

    try {
        const response = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                email: inputEmail.value.trim().toLowerCase(),
                password: inputPass.value,
            }),
        });

        const data = await response.json();

        if(!response.ok) {
            // manejamos credenciales inválidas o campos faltantes
            showAlert(alertLogin, data.message || 'Error al iniciar sesión, inténtalo de nuevo por favor.');
            if(response,status === 401) {
                setFieldError('field-email', 'error-email', ' ');
                setFieldError('field-password', 'error-password', ' ');
            }
            return;
        }

        // si el inicio de sesión tiene éxito, se guarda token y se redigire al panel según rol del empleado
        localStorage.setItem('sgita_token', data.token);
        localStorage.setItem('sgita_user', JSON.stringify(data.employee));

        const rol = data.employee?.rol;
        if(rol === 'admin' || rol === 'encargado') {
            window.location.href = '/dashboard.html';
        } else {
            window.location.href = '/employee.html';
        }

    } catch (error) {
        console.error(error);
        showAlert(alertLogin, 'No se puede conectar con el servidor.');
    } finally {
        setLoading(btnLogin, false);
    }
});


// funcionalidad para recuperar la contraseña
formForgot.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();

    if(!validateForgotForm()) return;

    setLoading(btnForgotSubmit, true);

    try {
        const response = await fetch(`${API}/auth/forgot-password`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email: inputForgotEmail.value.trim().toLowerCase()}),
        });

        const data = await response.json();

        if(!response.ok) {
            showAlert(alertForgotErr, data.message || 'No se ha podido enviar tu email, inténtalo de nuevo por favor');
            return;
        }

        // si es correcto, mostrar éxito del proceso
        showAlert(alertForgotOk, 'Si existe una cuenta con tu email, recibirás un enlace en tu correo. Revisa también la carpeta de spam.');

        inputForgotEmail.value = '';
    } catch (error) {
        console.error(error);
        showAlert(alertForgotErr, 'No se ha podido conectar con el servidor.');
    } finally {
        setLoading(btnForgotSubmit, false);
    }
});


// si hay sesión activa, poder redirigir al usuario
(function checkExistingSession() {
    const token = localStorage.getItem('sgita_token');
    const user = localStorage.getItem('sgita_user');
    if(!token || !user) return;

    try {
        const {rol} = JSON.parse(user);
        if(rol === 'admin' || rol === 'encargado') {
            window.location.replace('/dashboard.html');
        } else {
            window.localStorage.replace('/employee.html');
        }
    } catch (error) {
        localStorage.removeItem('sgita_token');
        localStorage.removeItem('sgita_user');
    }
})();