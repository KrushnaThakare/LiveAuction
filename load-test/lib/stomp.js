/** Minimal STOMP helpers for /ws-overlay-native */

export function buildStompFrame(command, headers = {}, body = '') {
  const headerLines = Object.entries(headers).map(([key, value]) => `${key}:${value}`).join('\n');
  return `${command}\n${headerLines}\n\n${body}\0`;
}

export function wireOverlaySocket(socket, tournamentId, hooks = {}) {
  let subscribed = false;

  socket.on('open', () => {
    hooks.onOpen?.();
    socket.send(buildStompFrame('CONNECT', {
      'accept-version': '1.2',
      'heart-beat': '10000,10000',
    }));
  });

  socket.on('message', (data) => {
    const raw = String(data);
    if (!subscribed && raw.includes('CONNECTED')) {
      subscribed = true;
      hooks.onConnected?.();
      socket.send(buildStompFrame('SUBSCRIBE', {
        id: `overlay-${__VU}-${__ITER}`,
        destination: `/topic/overlay/${tournamentId}/snapshot`,
      }));
    }
    if (raw.includes('MESSAGE')) {
      hooks.onMessage?.(raw);
    }
  });

  socket.on('error', (e) => hooks.onError?.(e));
  socket.on('close', () => hooks.onClose?.());
}
