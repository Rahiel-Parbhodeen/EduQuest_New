const ERROR_ATTRIBUTE = 'data-inline-validation-for';

export function clearFieldError(control) {
  if (!(control instanceof Element)) return;
  const errorId = control.getAttribute(ERROR_ATTRIBUTE);
  if (errorId) document.getElementById(errorId)?.remove();
  control.removeAttribute(ERROR_ATTRIBUTE);
  control.removeAttribute('aria-invalid');
  const errorText = errorId || '';
  if (errorText) {
    const describedBy = (control.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter((id) => id && id !== errorText);
    if (describedBy.length) control.setAttribute('aria-describedby', describedBy.join(' '));
    else control.removeAttribute('aria-describedby');
  }
}

export function showFieldError(control, message) {
  if (!(control instanceof Element) || !message) return false;
  clearFieldError(control);
  const id = `field-error-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  const output = document.createElement('small');
  output.id = id;
  output.className = 'field-error inline-field-error';
  output.setAttribute('role', 'alert');
  output.textContent = message;
  const wrapper = control.closest('label') || control.parentElement;
  wrapper?.append(output);
  control.setAttribute(ERROR_ATTRIBUTE, id);
  control.setAttribute('aria-invalid', 'true');
  const describedBy = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (!describedBy.includes(id)) describedBy.push(id);
  control.setAttribute('aria-describedby', describedBy.join(' '));
  return true;
}

export function showFieldErrors(form, fields = {}) {
  if (!(form instanceof HTMLFormElement)) return;
  for (const [name, message] of Object.entries(fields)) {
    if (name === '_form') continue;
    const control = [...form.elements].find(
      (element) => element.name === name || element.id === name,
    );
    if (control) showFieldError(control, message);
  }
}

export function installInlineValidation() {
  if (typeof document === 'undefined' || document.documentElement.dataset.inlineValidation) return;
  document.documentElement.dataset.inlineValidation = 'installed';
  document.addEventListener('invalid', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) {
      event.preventDefault();
      showFieldError(event.target, event.target.validationMessage);
    }
  }, true);
  for (const eventName of ['input', 'change']) {
    document.addEventListener(eventName, (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) {
        clearFieldError(event.target);
      }
    });
  }
}

export async function apiRequest(path, options = {}, fallback = 'Something went wrong.') {
  const form = document.activeElement?.closest?.('form') || document.querySelector('form:focus-within');
  const response = await fetch(`/api/v1${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      ...(typeof FormData !== 'undefined' && options.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...(options.headers || {}),
    },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    showFieldErrors(form, body?.error?.fields);
    const error = new Error(body?.error?.message || fallback);
    error.fields = body?.error?.fields || {};
    error.status = response.status;
    throw error;
  }
  return body;
}

if (typeof document !== 'undefined') installInlineValidation();
