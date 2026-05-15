self.addEventListener("push", (event) => {
	let payload = {};
	try {
		payload = event.data ? event.data.json() : {};
	} catch {
		payload = {};
	}

	const title = typeof payload.title === "string" && payload.title.length > 0 ? payload.title : "Clos Verde";
	const options = {
		body: typeof payload.body === "string" ? payload.body : "",
		tag: typeof payload.tag === "string" ? payload.tag : undefined,
		data: {
			url: typeof payload.url === "string" ? payload.url : "/",
		},
	};

	event.waitUntil(
		self.registration
			.showNotification(title, options)
			.then(() => console.log("[push-worker] showNotification resolved", title))
			.catch((err) => console.error("[push-worker] showNotification failed", err)),
	);
});

self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

	event.waitUntil(
		self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
			for (const client of clients) {
				if ("focus" in client) {
					client.navigate(targetUrl);
					return client.focus();
				}
			}
			return self.clients.openWindow(targetUrl);
		}),
	);
});
