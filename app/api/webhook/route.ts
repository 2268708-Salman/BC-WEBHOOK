import { NextRequest, NextResponse } from 'next/server';
 
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orderId = body?.data?.id;
 
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID not found' }, { status: 400 });
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
 
    // Fetch main order
    const orderRes = await fetch(baseUrl, { headers });
    if (!orderRes.ok) throw new Error(`Order fetch failed: ${orderRes.status}`);
    const orderDetails = await orderRes.json();
 
    // Fetch related resources
    const subEndpoints = ['products', 'fees', 'shipping_addresses', 'consignments', 'coupons'];
    const subData: Record<string, unknown> = {};
 
    await Promise.all(
      subEndpoints.map(async (key) => {
        try {
          const res = await fetch(`${baseUrl}/${key}`, { headers });
          subData[key] = res.ok ? await res.json() : { error: `Failed to fetch ${key}` };
        } catch {
          subData[key] = { error: `Exception while fetching ${key}` };
        }
      })
    );
 
    const fullOrder = { ...orderDetails, ...subData };
    console.log('📦 Full Order Details:', fullOrder);
 
    return NextResponse.json({ message: 'Order processed', order: fullOrder });
  } catch (err: any) {
    console.error('❌ Error processing order:', err?.message || err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}