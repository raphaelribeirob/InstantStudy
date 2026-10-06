import { randomUUID } from "node:crypto";

export type BridgeCommand = {
  id: string;
  action: string;
  params: Record<string, unknown>;
  createdAt: string;
};

type Waiter = {
  deviceId: string;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

export class BridgeQueue {
  private queues = new Map<string, BridgeCommand[]>();
  private waiters = new Map<string, Waiter>();

  constructor(private readonly timeoutMs: number) {}

  dispatch(
    deviceId: string,
    action: string,
    params: Record<string, unknown> = {},
  ): Promise<unknown> {
    const command: BridgeCommand = {
      id: randomUUID(),
      action,
      params,
      createdAt: new Date().toISOString(),
    };

    const queue = this.queues.get(deviceId) ?? [];
    queue.push(command);
    this.queues.set(deviceId, queue);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters.delete(command.id);
        this.removeQueuedCommand(deviceId, command.id);
        reject(
          new Error(
            `Timed out waiting for Anki device "${deviceId}". Is Anki open and the InstantStudy bridge connected?`,
          ),
        );
      }, this.timeoutMs);

      this.waiters.set(command.id, {
        deviceId,
        resolve,
        reject,
        timer,
      });
    });
  }

  poll(deviceId: string): BridgeCommand | null {
    const queue = this.queues.get(deviceId);
    if (!queue?.length) return null;

    const command = queue.shift() ?? null;
    if (!queue.length) this.queues.delete(deviceId);

    return command;
  }

  complete(
    deviceId: string,
    commandId: string,
    result: unknown,
    error?: string | null,
  ): boolean {
    const waiter = this.waiters.get(commandId);
    if (!waiter || waiter.deviceId !== deviceId) return false;

    clearTimeout(waiter.timer);
    this.waiters.delete(commandId);

    if (error) {
      waiter.reject(new Error(error));
    } else {
      waiter.resolve(result);
    }

    return true;
  }

  status(deviceId: string) {
    const queued = this.queues.get(deviceId)?.length ?? 0;
    let waiting = 0;

    for (const waiter of this.waiters.values()) {
      if (waiter.deviceId === deviceId) waiting += 1;
    }

    return { queued, waiting };
  }

  private removeQueuedCommand(deviceId: string, commandId: string) {
    const queue = this.queues.get(deviceId);
    if (!queue) return;

    const filtered = queue.filter((command) => command.id !== commandId);
    if (filtered.length) this.queues.set(deviceId, filtered);
    else this.queues.delete(deviceId);
  }
}
