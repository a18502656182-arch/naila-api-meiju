// api/site_config.js
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  // GET: 读取配置
  if (req.method === "GET") {
    const { key } = req.query;
    if (!key) return res.json({ error: "missing key" });
    const { data } = await supabase
      .from("site_config")
      .select("value")
      .eq("key", key)
      .single();
    return res.json({ value: data?.value ?? null });
  }

  // POST: 写入配置（需要管理员权限）
  if (req.method === "POST") {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "unauthorized" });

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return res.status(401).json({ error: "unauthorized" });

    // 检查是否管理员
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) return res.status(403).json({ error: "forbidden" });

    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: "missing key" });

    await supabase.from("site_config").upsert({ key, value }, { onConflict: "key" });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "method not allowed" });
};
