// Unregister service worker from previous Gatsby website,
// otherwise returning visitors can't see the new site

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', () => {
  self.registration.unregister();
  self.clients.matchAll({ type: 'window' }).then(clients => {
    for (const client of clients) {
      client.navigate(client.url);
    }
  });
});
