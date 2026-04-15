// supabase/functions/job-notifications/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type JobRecord = {
  id: string;
  job_number?: string | null;
  customer?: string | null;
  email?: string | null;
  phone?: string | null;
  device?: string | null;
  make?: string | null;
  model?: string | null;
  service_type?: string | null;
  fault?: string | null;
  issue?: string | null;
  status?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  price?: number | null;
  labour_cost?: number | null;
  parts_cost?: number | null;
  paid?: boolean | null;
  donated?: boolean | null;
  collected?: boolean | null;
  ready_at?: string | null;
  completed_at?: string | null;
  collected_at?: string | null;
  paid_at?: string | null;
  status_changed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type WebhookPayload = {
  type?: string;
  table?: string;
  schema?: string;
  record?: JobRecord | null;
  old_record?: JobRecord | null;
};

function money(value: number | null | undefined): string {
  const num = Number(value ?? 0);
  if (Number.isNaN(num)) return "£0.00";
  return `£${num.toFixed(2)}`;
}

function safeText(value: string | null | undefined, fallback = "—"): string {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Workshop Hub <notifications@YOURDOMAIN.COM>",
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  const bodyText = await res.text();

  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${bodyText}`);
  }

  return bodyText;
}

async function getAssignedUserEmail(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Profile lookup error:", error);
    return null;
  }

  return data?.email ?? null;
}

function buildJobSummaryHtml(job: JobRecord): string {
  const customer = escapeHtml(safeText(job.customer, "Unknown customer"));
  const jobNumber = escapeHtml(safeText(job.job_number, "Unknown job"));
  const device = escapeHtml(safeText(job.device, "Unknown device"));
  const make = escapeHtml(safeText(job.make, ""));
  const model = escapeHtml(safeText(job.model, ""));
  const serviceType = escapeHtml(safeText(job.service_type, "—"));
  const fault = escapeHtml(safeText(job.fault, "—"));
  const issue = escapeHtml(safeText(job.issue, "—"));
  const assigned = escapeHtml(safeText(job.assigned_to_name, "Unassigned"));

  const makeModel = [make === "—" ? "" : make, model === "—" ? "" : model]
    .filter(Boolean)
    .join(" ");

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 12px;">${jobNumber}</h2>
      <p><strong>Customer:</strong> ${customer}</p>
      <p><strong>Device:</strong> ${device}${makeModel ? ` (${escapeHtml(makeModel)})` : ""}</p>
      <p><strong>Service Type:</strong> ${serviceType}</p>
      <p><strong>Fault:</strong> ${fault}</p>
      <p><strong>Issue:</strong> ${issue}</p>
      <p><strong>Assigned Engineer:</strong> ${assigned}</p>
      <p><strong>Status:</strong> ${escapeHtml(safeText(job.status, "—"))}</p>
      <p><strong>Quoted Price:</strong> ${escapeHtml(money(job.price))}</p>
    </div>
  `;
}

function assignmentChanged(record: JobRecord | null | undefined, oldRecord: JobRecord | null | undefined): boolean {
  return (record?.assigned_to ?? null) !== (oldRecord?.assigned_to ?? null);
}

function statusChanged(record: JobRecord | null | undefined, oldRecord: JobRecord | null | undefined): boolean {
  return (record?.status ?? null) !== (oldRecord?.status ?? null);
}

Deno.serve(async (req: Request) => {
  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing RESEND_API_KEY secret" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const payload = (await req.json()) as WebhookPayload;
    const record = payload.record;
    const oldRecord = payload.old_record;

    if (!record) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "No record in payload" }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const results: Array<{ type: string; to: string; subject: string }> = [];

    // 1) Assigned engineer notification
    if (assignmentChanged(record, oldRecord) && record.assigned_to) {
      const assignedEmail = await getAssignedUserEmail(record.assigned_to);

      if (assignedEmail) {
        const subject = `Assigned: ${safeText(record.job_number, "Workshop job")}`;
        const html = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h1 style="font-size: 20px;">You have been assigned a job</h1>
            ${buildJobSummaryHtml(record)}
            <p>Please log in to Workshop Hub to review and update the job.</p>
          </div>
        `;

        await sendEmail({
          to: assignedEmail,
          subject,
          html,
        });

        results.push({ type: "assigned", to: assignedEmail, subject });
      }
    }

    // 2) Customer notification: ready for collection
    if (
      statusChanged(record, oldRecord) &&
      record.status === "Ready for Collection" &&
      record.email
    ) {
      const subject = `${safeText(record.job_number, "Your job")} is ready for collection`;
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h1 style="font-size: 20px;">Your item is ready for collection</h1>
          <p>Hello ${escapeHtml(safeText(record.customer, "there"))},</p>
          <p>Your item is now ready for collection.</p>
          ${buildJobSummaryHtml(record)}
          <p>Please contact the workshop if you need collection details.</p>
        </div>
      `;

      await sendEmail({
        to: record.email,
        subject,
        html,
      });

      results.push({ type: "ready_for_collection", to: record.email, subject });
    }

    // 3) Customer notification: completed
    if (
      statusChanged(record, oldRecord) &&
      record.status === "Completed" &&
      record.email
    ) {
      const subject = `${safeText(record.job_number, "Your job")} has been completed`;
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h1 style="font-size: 20px;">Your job has been completed</h1>
          <p>Hello ${escapeHtml(safeText(record.customer, "there"))},</p>
          <p>Your job has now been completed.</p>
          ${buildJobSummaryHtml(record)}
          <p>Please contact the workshop if you need further details.</p>
        </div>
      `;

      await sendEmail({
        to: record.email,
        subject,
        html,
      });

      results.push({ type: "completed", to: record.email, subject });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sent: results,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("job-notifications error:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});