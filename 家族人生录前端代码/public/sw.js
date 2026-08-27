// ===== Service Worker - 离线模式 =====
const CACHE_NAME = 'family-life-record-v1';
const OFFLINE_URL = '/offline.html';

// 需要缓存的资源
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/bundle.css',
];

// 安装：缓存资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 请求：先缓存后网络
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // API 请求：网络优先
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // 离线时返回离线页面
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // 静态资源：先缓存后网络
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(OFFLINE_URL));
    })
  );
});

// 后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

// 同步离线队列
async function syncOfflineQueue() {
  // 通过 BroadcastChannel 通知主线程同步
  const channel = new BroadcastChannel('family-sync');
  channel.postMessage({ type: 'trigger-sync' });
}

// 消息处理
self.addEventListener('message', (event) => {
  if (event.data.type === 'skip-waiting') {
    self.skipWaiting();
  }
});
