import { createFileRoute, Outlet, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppBar, PageScroll, accentVars } from "@/components/setlup/Shell";
import { BottomBar } from "@/components/setlup/BottomBar";
import { ActionSheet } from "@/components/setlup/Sheets";
import { useSetlup } from "@/lib/setlup/store";
import { EmptyState } from "@/components/setlup/ui";

export const Route = createFileRoute("/event/$id")({
  loader: ({ params }) => {
    if (!params.id) throw notFound();
    return { id: params.id };
  },
  component: EventLayout,
  notFoundComponent: () => <EmptyState title="Event not found" body="This event no longer exists." />,
});

function EventLayout() {
  const { id } = Route.useParams();
  const { getEvent, loading } = useSetlup();
  const event = getEvent(id);
  const [actionsOpen, setActionsOpen] = useState(false);
  const navigate = useNavigate();

  /* stale or deleted event id: send the user back to the lobby rather than a dead end */
  useEffect(() => {
    if (!loading && !event) void navigate({ to: "/", replace: true });
  }, [loading, event, navigate]);

  if (!event) {
    return (
      <>
        <AppBar />
        <PageScroll>
          <EmptyState title="Event not found" body="Taking you back to your events…" />
        </PageScroll>
      </>
    );
  }


  return (
    <div className="flex min-h-0 flex-1 flex-col" style={accentVars(event.accent)}>
      <AppBar eventName={event.name} />
      <PageScroll>
        <Outlet />
      </PageScroll>
      <BottomBar eventId={event.id} onPlus={() => setActionsOpen(true)} />
      <ActionSheet eventId={event.id} open={actionsOpen} onClose={() => setActionsOpen(false)} />
    </div>
  );
}
