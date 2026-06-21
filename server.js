import app from "./app.js";
import dns from "node:dns";
import { prisma } from "./lib/prisma.js";
dns.setDefaultResultOrder("ipv4first");
app.listen(process.env.PORT, async () => {
    console.log(`the type script server started on ${process.env.PORT}`);
});
//# sourceMappingURL=server.js.map