export const zodFieldErrors = (issues = []) => {
  const fields = {};
  for (const issue of issues) {
    const field = issue.path?.length ? issue.path.join('.') : '_form';
    fields[field] ??= issue.message || 'Check this field.';
  }
  return fields;
};
