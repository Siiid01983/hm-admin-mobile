// Base URL of the existing self-hosted PHP API (same backend as the website).
export const API_BASE = 'https://hello-moving.com/hm-api';

// PUBLIC client API key — identical to the website's window.API_KEY. It is a
// bot/abuse deterrent that already ships to every browser (NOT user
// authentication), so embedding it in the app is consistent with how the web
// app ships it. Real authorization is the admin session token (X-ADMIN-TOKEN)
// minted by admin-login.php and stored in the device SecureStore.
export const API_KEY =
  'f42b73f2e834faf3bba6665cf89bf9883b26747d0313cb0a5cc126285d0251a6';
