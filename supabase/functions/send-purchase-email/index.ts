import { isItalySandboxOrder } from "../_shared/sandboxOrder.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.1.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { resolveGenerationLanguage } from '../_shared/generationLanguage.ts';
import { purchaseEmailCopy } from '../_shared/orderLanguageCopy.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PURCHASE-EMAIL] ${step}${detailsStr}`);
};

interface PurchaseEmailRequest {
  email?: string;
  userName?: string;
  userId?: string; // Used to fetch email/name if not provided
  purchaseType: 'single' | 'package' | 'subscription' | 'video';
  planName: string;
  amount: number;
  currency: string;
  orderId?: string;
  credits?: number;
  isInstrumental?: boolean;
  renewalDate?: string;
  paymentMethod?: 'card' | 'pix';
  language?: string;
}

const formatCurrency = (amount: number, currency: string, language: unknown): string => {
  const value = amount / 100; // Convert from cents
  return new Intl.NumberFormat(resolveGenerationLanguage(language), {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(value);
};

const generatePurchaseEmailHtml = (data: PurchaseEmailRequest, language: unknown): string => {
  const copy = purchaseEmailCopy(language);
  const formattedAmount = formatCurrency(data.amount, data.currency, language);
  const currentDate = new Date().toLocaleDateString(resolveGenerationLanguage(language), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const isPixPayment = data.paymentMethod === 'pix';
  const paymentMethodLabel = isPixPayment ? 'PIX' : copy.card;
  const paymentConfirmationMessage = isPixPayment ? copy.pixConfirmed : copy.confirmed;

  let purchaseDetails = '';
  let purchaseTypeLabel = '';

  switch (data.purchaseType) {
    case 'subscription':
      purchaseTypeLabel = copy.subscription;
      purchaseDetails = `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>${copy.plan}</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.planName}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>${copy.type}</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.isInstrumental ? copy.instrumental : copy.vocal}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>${copy.creditsMonthly}</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.credits} ${copy.songsPerMonth}
          </td>
        </tr>
        ${data.renewalDate ? `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>${copy.nextRenewal}</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.renewalDate}
          </td>
        </tr>
        ` : ''}
      `;
      break;
    case 'package':
      purchaseTypeLabel = copy.packageLabel;
      purchaseDetails = `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>${copy.package}</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.planName}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>${copy.credits}</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.credits} ${copy.songs}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>${copy.type}</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.isInstrumental ? copy.instrumental : copy.vocal}
          </td>
        </tr>
      `;
      break;
    case 'video':
      purchaseTypeLabel = copy.video;
      purchaseDetails = `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>${copy.service}</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.planName}
          </td>
        </tr>
      `;
      break;
    default:
      purchaseTypeLabel = copy.single;
      purchaseDetails = `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>${copy.product}</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.planName}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <strong>${copy.type}</strong>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            ${data.isInstrumental ? copy.instrumental : copy.vocal}
          </td>
        </tr>
      `;
  }

  return `
<!DOCTYPE html>
<html lang="${resolveGenerationLanguage(language)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${copy.confirmationTitle} - Criando Músicas</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                🎵 Criando Músicas
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">
                ${copy.confirmationTitle}
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <!-- Greeting -->
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 22px;">
                ${copy.greeting.replace('{name}', data.userName || copy.customer)}
              </h2>
              
              <p style="margin: 0 0 25px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                ${paymentConfirmationMessage} ${copy.happy}
              </p>

              <!-- Order Badge -->
              <div style="background-color: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 12px 16px; margin-bottom: 25px; text-align: center;">
                <span style="color: #166534; font-weight: 600; font-size: 14px;">
                  ✅ ${isPixPayment ? copy.pixPaid : copy.paid}
                </span>
              </div>

              <!-- Purchase Details Card -->
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 16px; color: #374151; font-size: 16px; font-weight: 600; border-bottom: 2px solid #7c3aed; padding-bottom: 8px;">
                  ${copy.details}
                </h3>
                
                <table style="width: 100%; border-collapse: collapse; color: #4b5563; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong>${copy.date}</strong>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                      ${currentDate}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong>${copy.purchaseType}</strong>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                      ${purchaseTypeLabel}
                    </td>
                  </tr>
                  ${purchaseDetails}
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong>${copy.paymentMethod}</strong>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                      ${paymentMethodLabel}
                    </td>
                  </tr>
                  ${data.orderId ? `
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                      <strong>${copy.orderId}</strong>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: monospace; font-size: 12px;">
                      ${data.orderId.substring(0, 8)}...
                    </td>
                  </tr>
                  ` : ''}
                </table>

                <!-- Total -->
                <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #7c3aed; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 16px; font-weight: 600; color: #374151;">${copy.total}</span>
                  <span style="font-size: 24px; font-weight: 700; color: #7c3aed;">${formattedAmount}</span>
                </div>
              </div>

              <!-- Next Steps -->
              <div style="background-color: #eff6ff; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 12px; color: #1e40af; font-size: 14px; font-weight: 600;">
                  ${copy.nextTitle}
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #3730a3; font-size: 14px; line-height: 1.8;">
                  ${(data.purchaseType === 'subscription' ? copy.nextSubscription : data.purchaseType === 'package' ? copy.nextPackage : copy.nextSingle).map(item => `<li>${item.replace('{credits}', String(data.credits || ''))}</li>`).join('')}
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://criandomusicas.lovable.app/dashboard" 
                   style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  ${copy.dashboard}
                </a>
              </div>

              <!-- Support -->
              <p style="margin: 25px 0 0; color: #6b7280; font-size: 14px; text-align: center; line-height: 1.6;">
                ${copy.support}<br>
                <a href="mailto:contato@criandomusicas.com.br" style="color: #7c3aed; text-decoration: none; font-weight: 500;">
                  contato@criandomusicas.com.br
                </a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
                © ${new Date().getFullYear()} Criando Músicas. ${copy.rights}
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                ${copy.reason}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const data: PurchaseEmailRequest = await req.json();
    
    let language=resolveGenerationLanguage(data.language);
    if(data.orderId) {
      const sandboxClient=createClient(Deno.env.get('SUPABASE_URL')??'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'');
      if(await isItalySandboxOrder(sandboxClient,data.orderId)) return new Response(JSON.stringify({success:true,skipped:'italy_sandbox'}),{headers:{...corsHeaders,'Content-Type':'application/json'}});
      const {data:order,error:orderError}=await sandboxClient.from('orders').select('language').eq('id',data.orderId).maybeSingle();
      if(orderError) throw orderError;
      const {data:gift,error:giftError}=await sandboxClient.from('musical_gifts').select('details').eq('checkout_order_id',data.orderId).maybeSingle();
      if(giftError) throw giftError;
      language=resolveGenerationLanguage(gift?.details?.language,order?.language,data.language);
    }
    const copy=purchaseEmailCopy(language);
    // If userId provided but no email/userName, fetch from auth
    let email = data.email;
    let userName = data.userName;
    
    if (data.userId && (!email || !userName)) {
      logStep("Fetching user data from userId", { userId: data.userId });
      
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(data.userId);
      
      if (userError) {
        logStep("Error fetching user", { error: userError.message });
        throw new Error(`Failed to fetch user data: ${userError.message}`);
      }
      
      email = email || userData.user?.email || '';
      
      // Fetch profile for name
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('name')
        .eq('user_id', data.userId)
        .maybeSingle();
      
      userName = userName || profileData?.name || userData.user?.email?.split('@')[0] || copy.customer;
      
      logStep("User data fetched", { email, userName });
    }
    
    // Validate required fields
    if (!email || !userName || !data.planName || !data.amount) {
      throw new Error("Missing required fields: email, userName, planName, amount");
    }

    logStep("Sending purchase confirmation email", { 
      email, 
      purchaseType: data.purchaseType,
      planName: data.planName,
      paymentMethod: data.paymentMethod 
    });

    const html = generatePurchaseEmailHtml({ ...data, email, userName }, language);

    const emailResponse = await resend.emails.send({
      from: "Criando Músicas <noreply@criandomusicas.com.br>",
      replyTo: "contato@criandomusicas.com.br",
      to: [email],
      subject: (data.paymentMethod === 'pix' ? copy.pixSubject : copy.subject).replace('{plan}',data.planName),
      html,
    });


    if (emailResponse.error) {
      logStep("Resend error", { error: emailResponse.error });
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    logStep("Email sent successfully", { emailId: emailResponse.data?.id });

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
