/** Map socket callback payloads to a localized user-facing string. */
export function resolveServerError(res, t, vars = {}) {
  if (res?.errorKey) {
    return t(`toasts.${res.errorKey}`, vars);
  }
  if (res?.error) {
    return res.error;
  }
  return t('toasts.serverError');
}
