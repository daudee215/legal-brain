/** Restore points and the activity log (server side: supabase/safety.sql). Seniors only. */
import type { ActivityRow, BackupRow } from '../activityText';
import { supabase } from './client';

function check<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data;
}

export async function listBackups(chamberId: string): Promise<BackupRow[]> {
  const rows = check(
    await supabase().from('chamber_backups').select('id,kind,taken_at,reason,summary').eq('chamber_id', chamberId).order('taken_at', { ascending: false }).limit(60),
  );
  return (rows ?? []) as BackupRow[];
}

export async function listActivity(chamberId: string, limit = 60): Promise<ActivityRow[]> {
  const rows = check(
    await supabase().from('chamber_activity').select('id,at,user_name,role,kind,lines').eq('chamber_id', chamberId).order('at', { ascending: false }).limit(limit),
  );
  return (rows ?? []) as ActivityRow[];
}

/** Save a restore point right now. */
export async function takeBackupNow(chamberId: string): Promise<number> {
  return Number(check(await supabase().rpc('take_backup_now', { p_chamber: chamberId })));
}

/** Put the chamber back to a restore point (the current state is saved as a restore point first). */
export async function restoreBackup(backupId: string): Promise<void> {
  check(await supabase().rpc('restore_backup', { p_backup: backupId }));
}
