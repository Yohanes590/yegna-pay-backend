import "dotenv/config";
import app from "./app.js";
import dns from "node:dns";
import { prisma } from "./lib/prisma.js";
dns.setDefaultResultOrder("ipv4first");

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, async () => {
    console.log(`the type script server started on ${PORT}`);
});  