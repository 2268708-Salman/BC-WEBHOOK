import { NextRequest, NextResponse } from "next/server";
 
const apiUrl = "https://api.bigcommerce.com/stores/YOUR_STORE_HASH/v2"; // or v3 if you're using v3
const token = process.env.BIGCOMMERCE_API_TOKEN!;
 
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
    if (!text) {
      return null; // Nothing to parse
    }
 
    return JSON.parse(text);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}
 
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = body?.data?.id;
 
    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }
 
    // 1. Fetch main order
    const order = await safeFetch(`${apiUrl}/orders/${orderId}`);
 
    // 2. Fetch related resources
    const customerId = order?.customer_id;
    const customer = customerId
      ? await safeFetch(`${apiUrl}/customers/${customerId}`)
      : null;
 
    const fees = await safeFetch(`${apiUrl}/orders/${orderId}/fees`);
    const coupons = await safeFetch(`${apiUrl}/orders/${orderId}/coupons`);
    const products = await safeFetch(`${apiUrl}/orders/${orderId}/products`);
 
    // 3. Log final result
    console.log("✅ Full Order Details with Customer:", {
      order,
      customer,
      fees,
      coupons,
      products,
    });
 
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Webhook Error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}