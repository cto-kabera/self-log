import dns from "node:dns";
import net from "node:net";

export async function register() {
  dns.setDefaultResultOrder("ipv4first");
  net.setDefaultAutoSelectFamily(false);
}
