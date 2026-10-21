export async function fixtureLogin(
  base: string,
  email: string,
  password: string,
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(`${base}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (response.status !== 429) return response;
    const seconds = Number(
      response.headers.get("retry-after") ||
        response.headers.get("x-retry-after") ||
        10,
    );
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 60)
      throw new Error("Unexpected fixture login backoff");
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000 + 100));
  }
  throw new Error("Fixture login remained rate limited");
}
