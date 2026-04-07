"use client";

import { OpenPanelComponent } from "@openpanel/nextjs";

export default function AnalyticsProvider() {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  return (
    <OpenPanelComponent
      clientId="090aaec6-c9c4-4ed0-850b-905df704ef1c"
      apiUrl="https://analytics.vaven.io/api"
      trackScreenViews={true}
      trackOutgoingLinks={true}
    />
  );
}
