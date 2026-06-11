const CACHE_NAME = 'pt-weather-game-v1';
const ASSETS_TO_CACHE = [
    '.',
    '.index.html',
    '.style.css',
    '.script.js',
    '.manifest.json',
    '.1.png',
    '.2.png',
    '.3.png',
    '.4.png',
    '.5.png',
    '.6.png',
    '.7.png',
    '.8.png',
    '.9.png'
];

 Cài đặt Service Worker và Cache tài nguyên
self.addEventListener('install', event = {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache = {
            console.log('Opened cache');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

 Xóa bộ nhớ cache cũ khi có phiên bản mới
self.addEventListener('activate', event = {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames = {
            return Promise.all(
                cacheNames.map(cacheName = {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

 Phản hồi yêu cầu mạng bằng Cache (Network fallback)
self.addEventListener('fetch', event = {
    event.respondWith(
        caches.match(event.request)
            .then(response = {
                 Trả về cache nếu tìm thấy, ngược lại dùng mạng fetch
                return response  fetch(event.request);
            })
    );
});