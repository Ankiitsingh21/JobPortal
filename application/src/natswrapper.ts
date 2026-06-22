import { connect, NatsConnection, StringCodec } from "nats";

const sc = StringCodec();

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

  publish(subject: string, data: Record<string, any>) {
    this.client.publish(subject, sc.encode(JSON.stringify(data)));
  }
}

export const natsWrapper = new NatsWrapper();