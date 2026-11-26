'use client';

import { Redirect } from '../../../components/shell/Redirect';

/** Deadlines now live on the Deadlines & Tasks page. */
export default function DeadlinesMoved() {
  return <Redirect to="/app/tasks/?tab=deadlines" />;
}
