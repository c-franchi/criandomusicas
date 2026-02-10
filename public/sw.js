self.addEventListener("push", function (event) {
  console.log("[SW] Push recebido");

  const title = "Teste Push Simples";
  const options = {
    body: "Se você ver isso, o SW está OK",
    icon: "/favicon.png",
    badge: "/favicon.png",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
