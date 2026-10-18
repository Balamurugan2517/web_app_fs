// Load test with k6 (open source):  k6 run -e BASE=https://staging.your-shop.in tests/load/shop.k6.js
// Pass mark: p95 < 800 ms, errors < 1 %. NEVER run against production during business hours.
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { stages: [{ duration: '1m', target: 25 }, { duration: '3m', target: 50 }, { duration: '1m', target: 0 }], thresholds: { http_req_duration: ['p(95)<800'], http_req_failed: ['rate<0.01'] } };
const BASE = __ENV.BASE || 'http://localhost:3000';

// eslint-disable-next-line import/no-anonymous-default-export
export default function () {
  for (const path of ['/', '/shop', '/shop?department=women', '/shop?sale=1', '/size-guide', '/api/health']) {
    const r = http.get(`${BASE}${path}`);
    check(r, { [`${path} is 200`]: (x) => x.status === 200 });
    sleep(Math.random() * 2 + 0.5);
  }
  const price = http.post(`${BASE}/api/cart/price`, JSON.stringify({ items: [{ productId: '00000000-0000-0000-0000-000000000000', size: 'M', quantity: 1 }], couponCode: '' }), { headers: { 'Content-Type': 'application/json' } });
  check(price, { 'cart price answers (not 5xx)': (x) => x.status < 500 });
}
