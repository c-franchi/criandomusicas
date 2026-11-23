import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export interface RequestAuth {
  admin: any;
  user: User | null;
  isServiceRole: boolean;
  isAdmin: boolean;
}

/**
 * Verifies the bearer token with Auth. The service role is accepted only for
 * server-to-server calls; anonymous and publishable keys never authenticate.
 */
export async function getRequestAuth(req: Request): Promise<RequestAuth> {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

  if (token && serviceRoleKey && token === serviceRoleKey) {
    return { admin, user: null, isServiceRole: true, isAdmin: true };
  }

  if (!token) return { admin, user: null, isServiceRole: false, isAdmin: false };

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) {
    return { admin, user: null, isServiceRole: false, isAdmin: false };
  }

  const { data: adminRole } = await admin
    .from("user_roles")
    .select("id")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  return {
    admin,
    user: data.user,
    isServiceRole: false,
    isAdmin: Boolean(adminRole),
  };
}

export function authError(
  corsHeaders: Record<string, string>,
  status = 401,
): Response {
  return new Response(
    JSON.stringify({ error: status === 401 ? "Unauthorized" : "Forbidden" }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

export function canAccessUser(auth: RequestAuth, userId: string): boolean {
  return auth.isServiceRole || auth.isAdmin || auth.user?.id === userId;
}
