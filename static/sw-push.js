/* Service Worker Push & Notification handlers for Weather PWA */
self.addEventListener('push', function (event) {
	var data = {};
	try {
		data = event.data ? event.data.json() : {};
	} catch (e) {
		data = {
			title: 'Weather Alert',
			body: event.data ? event.data.text() : 'Upcoming weather changes'
		};
	}

	var title = data.title || 'Weather Alert';
	var options = {
		body: data.body || 'Upcoming weather changes',
		icon: data.icon || './icons/app/icon-192.png',
		badge: data.badge || './icons/app/icon-192.png',
		tag: data.tag || 'weather-alert',
		data: data.data || { url: './' }
	};

	event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
	event.notification.close();
	var targetUrl = (event.notification.data && event.notification.data.url) || './';

	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
			var i, client;
			// Prefer an existing app window already showing the target URL
			for (i = 0; i < windowClients.length; i++) {
				client = windowClients[i];
				if ('focus' in client && client.url.indexOf(targetUrl) !== -1) {
					return client.focus();
				}
			}
			for (i = 0; i < windowClients.length; i++) {
				client = windowClients[i];
				if ('focus' in client) {
					return client.focus();
				}
			}
			if (self.clients.openWindow) {
				return self.clients.openWindow(targetUrl);
			}
		})
	);
});
