export async function SendCookie(token) {
    await fetch(`${process.env.CLIENT_URL}/api/call-back`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
}
//# sourceMappingURL=sending-cookie.js.map