const CACHE_NAME = 'lyb-v1.0';
const urlsToCache = [
  './',
  './lyb.html',
  './lyb.css',
  './lyb.js',
  './xlsx.full.min.js',
  './manifest.json'
];

// 安装Service Worker
self.addEventListener('install', function(event) {
  console.log('Service Worker 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('缓存文件:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('所有资源已缓存');
        return self.skipWaiting();
      })
  );
});

// 激活Service Worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker 激活');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// 拦截网络请求
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // 如果缓存中有，返回缓存内容
        if (response) {
          return response;
        }
        
        // 否则从网络获取
        return fetch(event.request).then(function(response) {
          // 检查是否有效响应
          if(!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // 克隆响应
          var responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(function() {
        // 网络请求失败时，可以返回离线页面
        return caches.match('./lyb.html');
      })
  );
});