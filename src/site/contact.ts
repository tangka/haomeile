const configuredContact = import.meta.env.PUBLIC_CONTACT_EMAIL?.trim() || '';
export const contactEmail =
  /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(configuredContact)
    ? configuredContact
    : '';
