/** Validates a rotated, database-held credential sent by pg_cron. */
export async function hasScheduledJobCredential(
  req: Request,
  admin: any,
  jobName: string,
): Promise<boolean> {
  const supplied = req.headers.get("x-scheduled-job-key");
  if (!supplied) return false;
  const { data, error } = await admin
    .from("scheduled_job_credentials")
    .select("credential")
    .eq("job_name", jobName)
    .eq("is_active", true)
    .maybeSingle();
  return !error && Boolean(data?.credential) && data.credential === supplied;
}
