const CACHE_NAME = 'reply-app-v1';

// 앱 설치 시 기본 파일 저장
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/icon-512x512.png'
            ]);
        })
    );
});

// 인터넷 끊겼을 때 캐시된 화면 띄우기
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});