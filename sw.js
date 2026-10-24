const CACHE_NAME = 'mineglesus-v2';
const urlsToCache = [
  './index.html',
  './manifest.json'
];

// インストール時にキャッシュを作成
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((err) => console.error('Cache addAll failed:', err))
  );
  self.skipWaiting();
});

// 古いキャッシュのクリーンアップ
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// フェッチ時のフォールバック処理（オフライン対応）
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // キャッシュがあればそれを返す。なければネットワークへ行く
        if (cachedResponse) {
          // バックグラウンドで最新データを取得しつつキャッシュを更新（Stale-While-Revalidate）
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => {
            // ネットワークエラー（オフライン）時はスルー
          });

          return cachedResponse;
        }

        // キャッシュにない場合はネットワークから取得
        return fetch(event.request).catch(() => {
          // 完全なオフラインかつキャッシュにも無い場合のフォールバック
          // ナビゲーションリクエスト（ページ遷移）の場合は index.html を返す
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          // 画像や外部CDN（TailwindやjQuery）などでオフラインの場合は必要に応じてプレースホルダー等を返すことも可能
        });
      })
  );
});
