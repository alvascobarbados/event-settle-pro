import { createFileRoute, Outlet, notFound } from "@tanstack/react-router";
import { useState } from "react";
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
  const { getEvent } = useSetlup();
  const event = getEvent(id);
  const [actionsOpen, setActionsOpen] = useState(false);

  if (!event) {
    return (
      <>
        <AppBar />
        <PageScroll>
          <EmptyState title="Event not found" body="Pick another event from the menu." />
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
