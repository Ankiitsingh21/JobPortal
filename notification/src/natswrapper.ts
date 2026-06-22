import { connect, NatsConnection, StringCodec } from "nats";

export const sc = StringCodec();

class NatsWrapper {
  private _client?: NatsConnection;

  get client() {
    if (!this._client) throw new Error("Cannot access NATS client before connecting");
    return this._client;
  }

  async connect(url: string) {
    this._client = await connect({ servers: url });
    console.log("Connected to NATS");
  }
}

export const natsWrapper = new NatsWrapper();