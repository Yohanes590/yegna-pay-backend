export async function SendCookie(token: string) {
    await fetch(`${process.env.CLIENT_URL!}/api/call-back`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })
}