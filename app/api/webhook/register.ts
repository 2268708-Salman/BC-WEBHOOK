import { NextResponse } from "next/server";
 
export async function GET() {
  const storeHash = "odoo5yipek";
  const accessToken = "9n9pesj0pgfcn49wukqcbruar6tcxt4";
 
  const webhookPayload = {
    scope: "store/order/created",
destination: "https://bc-webhook-h3b6.vercel.app/api/webhook",
    is_active: true,
    events_history_enabled: true
  };
 
  try {
const response = await fetch(`https://api.bigcommerce.com/stores/${storeHash}/v3/hooks`, {
      method: "POST",
      headers: {
        "X-Auth-Token": accessToken,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(webhookPayload)
    });
 
    const data = await response.json();
    console.log("✅ Webhook Registration Response:", data);
 
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Failed to register webhook:", error);
    return NextResponse.json({ error: "Webhook registration failed" }, { status: 500 });
  }
}