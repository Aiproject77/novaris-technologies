// Supabase Edge Function — send-invoice
// Envoie la facture PDF au client via Resend (la clé API reste côté serveur).
//
// Déploiement :
//   supabase functions deploy send-invoice
//   supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
//   supabase secrets set FROM_EMAIL="Novaris Solution <facturation@novaris-solution.com>"
//
// Si votre domaine n'est pas encore vérifié dans Resend, utilisez temporairement
// FROM_EMAIL="Novaris Solution <onboarding@resend.dev>" (limité à votre propre
// adresse de test tant que le domaine n'est pas validé).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Novaris Solution <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY manquant dans les secrets de la fonction.");
    }

    const { to, subject, html, pdf_base64, filename, bcc } = await req.json();

    if (!to || !pdf_base64 || !filename) {
      return new Response(JSON.stringify({ error: "Champs requis manquants (to, pdf_base64, filename)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: Record<string, unknown> = {
      from: FROM_EMAIL,
      to: [to],
      subject: subject || "Votre facture — Novaris Solution",
      html: html || "<p>Veuillez trouver votre facture ci-jointe.</p>",
      attachments: [
        {
          filename,
          content: pdf_base64, // base64 brut, sans le préfixe data:application/pdf;base64,
        },
      ],
    };
    if (bcc) payload.bcc = [bcc];

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await resendRes.json();

    if (!resendRes.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: resendRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, resend: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
