// تنظیم محیط روی Edge برای حداکثر سرعت و پشتیبانی از XHTTP
export const config = { runtime: "edge" };

export default async function trafficBridge(request) {
  // ۱. دریافت آدرس مقصد (Target)
  const remoteServer = (process.env.TARGET_DOMAIN || "").trim().replace(/\/+$/, "");
  
  if (!remoteServer) {
    return new Response("Configuration Error: Remote Server missing", { status: 500 });
  }

  try {
    // ۲. ساخت URL مقصد با حفظ مسیر و کوئری‌ها
    const url = new URL(request.url);
    const destinationUrl = remoteServer + url.pathname + url.search;

    // ۳. فیلتر کردن هدرها برای امنیت و پنهان‌کاری
    const bridgeHeaders = new Headers();
    const blacklist = [
      "host", "connection", "x-real-ip", "x-forwarded-for", 
      "cf-connecting-ip", "forwarded", "via", "x-vercel-id"
    ];

    for (const [key, value] of request.headers.entries()) {
      if (!blacklist.includes(key.toLowerCase()) && !key.toLowerCase().startsWith("x-vercel-")) {
        bridgeHeaders.set(key, value);
      }
    }

    // ۴. شبیه‌سازی User-Agent (اختیاری اما مفید برای پنهان‌کاری)
    bridgeHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36");

    // ۵. اجرای عملیات رله به صورت Full Streaming
    const response = await fetch(destinationUrl, {
      method: request.method,
      headers: bridgeHeaders,
      body: request.body, // ارسال مستقیم استریم بدنه درخواست
      duplex: "half",    // الزامی برای ارسال Body در محیط Edge
      redirect: "manual"
    });

    // ۶. بازگرداندن پاسخ سرور اصلی به کاربر
    return response;

  } catch (err) {
    console.error("Bridge Failure:", err.message);
    return new Response("Connectivity Issue: " + err.message, { status: 502 });
  }
}
