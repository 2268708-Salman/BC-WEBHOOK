import { NextRequest, NextResponse } from 'next/server';
 
export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("✅ Webhook received at /api/webhook");
 
  try {
    const body = await req.json();
    const orderId = body?.data?.id;
 
    if (!orderId) {
      console.warn("⚠️ Order ID missing in webhook payload");
      return NextResponse.json({ error: 'Order ID not found in webhook' }, { status: 400 });
    }
 
    const storeHash = process.env.BC_STORE_HASH;
    const token = process.env.BC_API_TOKEN;
 
    if (!storeHash || !token) {
      console.error("❌ Missing BigCommerce credentials");
      return NextResponse.json({ error: 'Missing BigCommerce credentials' }, { status: 500 });
    }
 
const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${orderId}`;
    const headers = {
      'X-Auth-Token': token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
 
    // Step 1: Get main order details
    const orderRes = await fetch(baseUrl, { headers });
    if (!orderRes.ok) throw new Error(`Order fetch failed: ${orderRes.status}`);
    const orderDetails = await orderRes.json();
 
    // Step 2: Fetch sub-resources
    const subEndpoints = ['products', 'fees', 'shipping_addresses', 'consignments', 'coupons'];
    const subData: Record<string, unknown> = {};
 
    for (const key of subEndpoints) {
      try {
        const res = await fetch(`${baseUrl}/${key}`, { headers });
        subData[key] = res.ok ? await res.json() : { error: `Failed to fetch ${key}` };
      } catch (err) {
        console.error(`❌ Error fetching ${key}:`, err);
        subData[key] = { error: `Exception while fetching ${key}` };
      }
    }
    // Combine everything
    const fullOrder = {
      ...orderDetails,
      ...subData,
    };
 
    console.log("✅ Full Order Details:\n", JSON.stringify(fullOrder, null, 2));
    return NextResponse.json({ message: "Order processed", order: fullOrder });
 
  } catch (error: any) {
    console.error("❌ Failed to process webhook:", error.message || error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}