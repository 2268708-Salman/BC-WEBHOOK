import { NextRequest, NextResponse } from "next/server";
 
// ✅ Secure: Load store hash and API token from environment variables
const storeHash = process.env.BC_STORE_HASH!;
const token = process.env.BIGCOMMERCE_API_TOKEN!;
 
// ✅ API base URL
const apiUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2`;
 
// 🔁 Utility: Safe fetch with error handling
async function safeFetch(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "X-Auth-Token": token,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    });
 
    const text = await response.text();
    if (!text) return null;
 
    return JSON.parse(text);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}
 
// 📦 Webhook handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = body?.data?.id;
 
    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }
 
    // 1️⃣ Main order
    const order = await safeFetch(`${apiUrl}/orders/${orderId}`);
 
    // 2️⃣ Related resources
    const customerId = order?.customer_id;
    const customer = customerId
      ? await safeFetch(`${apiUrl}/customers/${customerId}`)
      : null;
 
    const fees = await safeFetch(`${apiUrl}/orders/${orderId}/fees`);
    const coupons = await safeFetch(`${apiUrl}/orders/${orderId}/coupons`);
    const products = await safeFetch(`${apiUrl}/orders/${orderId}/products`);
 
    // 3️⃣ Combine
    const fullData = { order, customer, fees, coupons, products };
 
    console.log("✅ Full Order Details with Customer:", fullData);
 
    return NextResponse.json({ success: true, data: fullData });
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}