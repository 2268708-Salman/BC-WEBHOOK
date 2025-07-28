import { NextRequest, NextResponse } from 'next/server';
 
export async function POST(req: NextRequest): Promise<NextResponse> { console.log("✅ Webhook received at /api/webhook");
 
try { const rawBody = await req.text(); const body = JSON.parse(rawBody); const orderId = body?.data?.id;
 
if (!orderId) {
  return NextResponse.json({ error: 'Order ID not found in webhook' }, { status: 400 });
}
 
const storeHash = process.env.BC_STORE_HASH;
const token = process.env.BC_API_TOKEN;
 
if (!storeHash || !token) {
  return NextResponse.json({ error: 'Missing BigCommerce credentials' }, { status: 500 });
}
 
const headers = {
  'X-Auth-Token': token,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};
 
const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${orderId}`;
 
// Step 1: Get main order details
const orderRes = await fetch(baseUrl, { headers });
if (!orderRes.ok) {
  throw new Error(`Order fetch failed: ${orderRes.status}`);
}
const orderDetails = await orderRes.json();
 
// Step 2: Get sub-resources
const subEndpoints = ['products', 'fees', 'shipping_addresses', 'consignments', 'coupons', 'billing_address'];
const subData: Record<string, unknown> = {};
 
for (const key of subEndpoints) {
  try {
    const res = await fetch(`${baseUrl}/${key}`, { headers });
    if (res.ok) {
      subData[key] = await res.json();
    } else {
      subData[key] = { error: `Failed to fetch ${key}` };
    }
  } catch (err) {
    console.error(`❌ Error fetching ${key}:`, err);
    subData[key] = { error: `Exception while fetching ${key}` };
  }
}
 
// Step 3: Fetch customer details if customer_id exists
let customerDetails = null;
if (orderDetails.customer_id) {
  try {
const customerRes = await fetch(`https://api.bigcommerce.com/stores/${storeHash}/v3/customers/${orderDetails.customer_id}`, { headers });
    if (customerRes.ok) {
      const customerJson = await customerRes.json();
      customerDetails = customerJson.data;
    } else {
      console.error('❌ Failed to fetch customer details');
    }
  } catch (err) {
    console.error('❌ Exception while fetching customer details:', err);
  }
}
 
// Combine all data
const fullOrder = {
  ...orderDetails,
  ...subData,
  customer: customerDetails,
};
 
console.log('✅ Full Order Details with Customer:', JSON.stringify(fullOrder, null, 2));
return NextResponse.json({ message: 'Order processed', order: fullOrder });
 
} catch (error: unknown) { if (error instanceof Error) { console.error('❌ Failed to process order:', error.message); } else { console.error('❌ Unknown error:', error); } return NextResponse.json({ error: 'Internal server error' }, { status: 500 }); } }