type SSEClient = {
  controller: ReadableStreamDefaultController;
  groupIds: Set<string>;
};

const clients = new Map<string, SSEClient>();
const groupSubs = new Map<string, Set<string>>();

export function addClient(clientId: string, controller: ReadableStreamDefaultController, groupIds: string[]) {
  clients.set(clientId, { controller, groupIds: new Set(groupIds) });
  for (const gid of groupIds) {
    if (!groupSubs.has(gid)) groupSubs.set(gid, new Set());
    groupSubs.get(gid)!.add(clientId);
  }
}

export function removeClient(clientId: string) {
  clients.delete(clientId);
  for (const [, subs] of groupSubs) subs.delete(clientId);
}

export function broadcast(groupId: string, event: string, data: unknown) {
  const encoder = new TextEncoder();
  const message = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const subs = groupSubs.get(groupId);
  if (!subs) return;
  for (const clientId of subs) {
    const client = clients.get(clientId);
    if (client) {
      try {
        client.controller.enqueue(message);
      } catch {
        removeClient(clientId);
      }
    }
  }
}

export function broadcastToUser(userId: string, event: string, data: unknown) {
  const encoder = new TextEncoder();
  const message = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  for (const [clientId, client] of clients) {
    if (client.groupIds.has(userId)) {
      try {
        client.controller.enqueue(message);
      } catch {
        removeClient(clientId);
      }
    }
  }
}
