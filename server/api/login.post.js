export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  const { username, password } = body;

  // Simulasi cek user (ganti dengan DB sebenarnya)
  const users = [
    { username: "admin", password: "admin123", role: "admin" },
    { username: "user", password: "user123", role: "user" },
  ];

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Invalid credentials" });
  }

  // Simulasi token (bisa pake JWT)
  const token = btoa(`${user.username}:${user.role}`);

  return {
    token,
    role: user.role,
    username: user.username,
  };
});
