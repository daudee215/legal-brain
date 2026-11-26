'use client';

import { Redirect } from '../../../components/shell/Redirect';

/** The Studio now lives inside Settings. */
export default function StudioMoved() {
  return <Redirect to="/app/settings/" />;
}
