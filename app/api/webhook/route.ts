import { NextRequest, NextResponse } from 'next/server';
 
interface WebhookRequestBody {
  data?: {
    id?: number;
  };
}
 
interface OrderSubResource {
  [key: string]: unknown;
}
 
export async function POST(req: NextRequest) {
  try {
    const body: WebhookRequestBody = await req.json();
    const orderId = body?.data?.id;
 
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID not found in webhook' }, { status: 400 });
    }
 
    const storeHash = process.env.BC_STORE_HASH;
    const token = process.env.BC_API_TOKEN;
 
    if (!storeHash || !token) {
      return NextResponse.json({ error: 'Missing BigCommerce credentials' }, { status: 500 });
    }
 
    const baseUrl = `https://api.bigcommerce.com/stores/${storeHash}/v2/orders/${orderId}`;
    const headers = {
      'X-Auth-Token': token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
 
    // Step 1: Get main order details
    const orderRes = await fetch(baseUrl, { headers });
    if (!orderRes.ok) {
      throw new Error(`Order fetch failed: ${orderRes.status}`);
    }
 
    const orderDetails = (await orderRes.json()) as Record<string, unknown>;
 
    // Step 2: Get sub-resources
    const subEndpoints = ['products', 'fees', 'shipping_addresses', 'consignments', 'coupons'];
    const subData: OrderSubResource = {};
 
    await Promise.all(
      subEndpoints.map(async (key) => {
        try {
          const res = await fetch(`${baseUrl}/${key}`, { headers });
          if (res.ok) {
            subData[key] = await res.json();
          } else {
            subData[key] = { error: `Failed to fetch ${key}` };
          }
        } catch (error) {
          subData[key] = { error: `Exception while fetching ${key}` };
        }
      })
    );
 
    // Combine all data
    const fullOrder = {
      ...orderDetails,
      ...subData,
    };
 
    console.log('✅ Full Order Details:', JSON.stringify(fullOrder, null, 2));
 
    return NextResponse.json({ message: 'Order processed', order: fullOrder });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
 