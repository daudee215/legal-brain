'use client';

import { Redirect } from '../../../components/shell/Redirect';

/** The Tools page was folded into others: the calculator is on Deadlines & Tasks, the monthly report on the Dashboard. */
export default function ToolsMoved() {
  return <Redirect to="/app/tasks/?tab=calculator" />;
}
