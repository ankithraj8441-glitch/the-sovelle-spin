async function request(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && data.error) ||
      (typeof data === 'string' && data) ||
      `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return data;
}

export const api = {
  // Public / Customer
  getConfig: () => request('/api/config'),
  getSession: () => request('/api/session'),
  registerCustomer: (payload) =>
    request('/api/customers/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  customerLogin: (phone) =>
    request('/api/customers/login', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  customerLogout: () =>
    request('/api/customers/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  executeSpin: () =>
    request('/api/spin', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  confirmSpin: (spinId) =>
    request('/api/spin/confirm', {
      method: 'POST',
      body: JSON.stringify({ spinId }),
    }),

  // Admin
  adminLogin: (username, password) =>
    request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  adminLogout: () =>
    request('/api/admin/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  adminMe: () => request('/api/admin/me'),
  getAdminOverview: () => request('/api/admin/overview'),
  getAdminCustomers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/admin/customers${qs ? `?${qs}` : ''}`);
  },
  getAdminCoupons: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/admin/coupons${qs ? `?${qs}` : ''}`);
  },
  redeemCoupon: (identifier) =>
    request(`/api/admin/coupons/${encodeURIComponent(identifier)}/redeem`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  updateCouponValidity: (id, validUntil) =>
    request(`/api/admin/coupons/${encodeURIComponent(id)}/validity`, {
      method: 'PATCH',
      body: JSON.stringify({ validUntil }),
    }),
  getAdminRewards: () => request('/api/admin/rewards'),
  updateReward: (id, payload) =>
    request(`/api/admin/rewards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
