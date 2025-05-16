import { Server } from "./server";

export class System {
  server: Server

  constructor() {
    this.server = new Server()
  }
}