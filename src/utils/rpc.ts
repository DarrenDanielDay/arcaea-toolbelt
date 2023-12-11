import { CompleteSignal, Task, future } from "./future";
import { createInvokeCapture } from "./invoke-capture";
import { deserialize, serialize } from "./transfer";
import { uuid } from "./uuid";

export interface BaseMessage {
  __arcaea_toolbelt_msg: true;
  id: string;
}

const createMessage = <T extends BaseMessage>(id: string, others: Omit<T, keyof BaseMessage>): T =>
  ({
    __arcaea_toolbelt_msg: true,
    id,
    ...others,
  } as T);

export enum MessageType {
  Ping = "ping",
  Request = "request",
  Response = "response",
  Error = "error",
}

export interface PingMessage extends BaseMessage {
  type: MessageType.Ping;
}

export interface RequestMessage<T> extends BaseMessage {
  type: MessageType.Request;
  body: T;
}

export interface ResponseMessage<T> extends BaseMessage {
  type: MessageType.Response;
  body: T;
}

export interface ErrorMessage extends BaseMessage {
  type: MessageType.Error;
  error: any;
}

export type AsyncMethod = (...args: any[]) => Promise<any>;

export interface AsyncAPIs {
  [property: string]: AsyncMethod | AsyncAPIs;
}

export interface Invoke {
  type: "invoke";
  path: string[];
  args: any[];
}

export const isInvoke = (obj: unknown): obj is Invoke => !!(obj && (obj as Partial<Invoke>).type === "invoke");

export type Message = PingMessage | RequestMessage<any> | ResponseMessage<any> | ErrorMessage;

export interface MessageHub {
  start(handler: (data: any) => void): MessagePort;
}

export interface MessagePort {
  post(content: any): void;
  stop(): void;
}

export const isMessage = (obj: unknown): obj is Message =>
  !!(obj && (obj as Partial<BaseMessage>).__arcaea_toolbelt_msg);

export class TaskPool {
  #pool = new Map<string, Task<any>>();
  create(specialId?: string) {
    const id = specialId ?? uuid();
    const task = future<any>();
    this.#pool.set(id, task);
    return { id, task };
  }
  done(id: string, value: any) {
    this.#pick(id)?.done(value);
  }

  abort(id: string, reason?: any) {
    this.#pick(id)?.abort(reason);
  }

  #pick(id: string) {
    const task = this.#pool.get(id);
    if (!task) {
      console.error(`Task id ${id} does not exist.`);
    }
    return task;
  }
}

export interface WindowConnection {
  input: Window;
  output: Window;
}

type ReceiveHandler = (data: any) => void;

export class WindowMessageHub implements MessageHub {
  constructor(public readonly connect: () => WindowConnection) {}

  start(handler: ReceiveHandler): MessagePort {
    return new WindowMessagePort(this.connect(), handler);
  }
}

export class WindowMessagePort implements MessagePort {
  #handler;
  constructor(public readonly connection: WindowConnection, handler: ReceiveHandler) {
    const { input } = this.connection;
    this.#handler = (event: MessageEvent) => {
      handler(deserialize(event.data));
    };
    input.addEventListener("message", this.#handler);
  }

  post(content: any): void {
    const { output } = this.connection;
    output.postMessage(serialize(content), "*");
  }
  stop(): void {
    const { input } = this.connection;
    input.removeEventListener("message", this.#handler);
  }
}

export interface RPCConnection<Host extends AsyncAPIs> {
  pool: TaskPool;
  api: Host;
  stop(): void;
}

export class RPC<Client extends AsyncAPIs, Host extends AsyncAPIs> {
  constructor(
    public readonly options: {
      hub: MessageHub;
      impl: Client;
    }
  ) {}

  start(): RPCConnection<Host> {
    const pool = new TaskPool();
    const pingId = "ping";
    const {
      task: { promise: connected },
    } = pool.create(pingId);
    const msg = createMessage<PingMessage>(pingId, { type: MessageType.Ping });
    const ping = () => {
      port.post(msg);
    };
    let conected = false;
    const pong = () => {
      if (!conected) {
        conected = true;
        ping();
      }
    };
    const pingTimer = setInterval(ping, 100);
    const port = this.options.hub.start(async (data) => {
      if (!isMessage(data)) return;
      switch (data.type) {
        case MessageType.Ping:
          pong();
          clearInterval(pingTimer);
          pool.done(pingId, data);
          break;
        case MessageType.Request:
          await this.onRequest(data, port);
          break;
        case MessageType.Response:
          await this.onResponse(data, pool);
          break;
        case MessageType.Error:
        default:
          await this.onError(data, pool);
          break;
      }
    });

    return {
      pool,
      api: createInvokeCapture(async (path, args) => {
        await connected;
        const { id: taskId, task } = pool.create();
        const message = createMessage<RequestMessage<Invoke>>(taskId, {
          type: MessageType.Request,
          body: {
            type: "invoke",
            args,
            path,
          },
        });
        port.post(message);
        return task.promise;
      }) as Host,
      stop() {
        clearInterval(pingTimer);
        port.stop();
        pool.abort(pingId);
      },
    };
  }

  protected async onRequest(data: RequestMessage<any>, port: MessagePort) {
    const { body, id } = data;
    if (isInvoke(body)) {
      try {
        let target: any = this.options.impl;
        let prev: any = undefined;
        const { path, args } = body;
        for (const property of path) {
          prev = target;
          target = Reflect.get(target, property);
        }
        const result = await Reflect.apply(target, prev, args);
        const message = createMessage<ResponseMessage<any>>(id, {
          type: MessageType.Response,
          body: result,
        });
        port.post(message);
      } catch (error) {
        port.post(
          createMessage<ErrorMessage>(id, {
            type: MessageType.Error,
            error: error,
          })
        );
      }
    }
  }

  protected async onResponse(data: ResponseMessage<any>, pool: TaskPool) {
    pool.done(data.id, data.body);
  }

  protected async onError(data: ErrorMessage, pool: TaskPool) {
    pool.abort(data.id, data.error);
  }
}
