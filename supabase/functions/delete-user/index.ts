import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: corsHeaders }
      );
    }

    const authHeader =
      req.headers.get("Authorization") || req.headers.get("authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing bearer token" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: userError?.message || "Not authenticated" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: adminProfile, error: adminProfileError } = await adminClient
      .from("profiles")
      .select("id,email,role,is_active")
      .eq("id", user.id)
      .single();

    if (adminProfileError || !adminProfile) {
      return new Response(
        JSON.stringify({
          error: adminProfileError?.message || "Admin profile not found",
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    if (adminProfile.role !== "admin" || !adminProfile.is_active) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const targetUserId = String(body.userId || "").trim();

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (targetUserId === user.id) {
      return new Response(
        JSON.stringify({ error: "You cannot delete your own account from here" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("*")
      .eq("id", targetUserId)
      .maybeSingle();

    await adminClient
      .from("jobs")
      .update({
        assigned_to: null,
        assigned_to_name: null,
      })
      .eq("assigned_to", targetUserId);

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(
      targetUserId
    );

    if (authDeleteError) {
      return new Response(
        JSON.stringify({ error: `Auth delete failed: ${authDeleteError.message}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { error: profileDeleteError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", targetUserId);

    if (profileDeleteError) {
      return new Response(
        JSON.stringify({
          error: `Profile delete failed: ${profileDeleteError.message}`,
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    await adminClient.from("audit_logs").insert({
      table_name: "profiles",
      record_id: targetUserId,
      action: "DELETE",
      changed_by: user.id,
      changed_by_email: adminProfile.email || user.email || null,
      old_data: targetProfile || null,
      new_data: null,
      summary: `User deleted: ${targetProfile?.email || targetUserId}`,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});