"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { updateLeadStage } from "@/app/actions/crm";
import { Badge } from "@/components/ui/badge";
import { Surface } from "@/components/page-header";

function cardTone(status: string, stageName: string) {
  if (status === "won") return { rail: "bg-emerald-500", badge: "green" as const };
  if (status === "lost") return { rail: "bg-rose-500", badge: "red" as const };
  if (stageName === "Proposal") return { rail: "bg-amber-500", badge: "amber" as const };
  if (stageName === "Qualified") return { rail: "bg-violet-500", badge: "blue" as const };
  if (stageName === "Contacted") return { rail: "bg-sky-500", badge: "blue" as const };
  return { rail: "bg-muted-foreground/50", badge: "slate" as const };
}

function DraggableCard({
  lead,
  stageName,
}: {
  lead: { id: string; title: string; status: string; companyName: string | null; ownerName: string | null; stageId: string | null };
  stageName: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead, stageName },
  });

  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const tone = cardTone(lead.status, stageName);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative flex h-44 flex-col overflow-hidden rounded-xl border p-3 shadow-sm transition ${
        isDragging ? "opacity-40" : "border-border bg-card hover:shadow-md cursor-grab active:cursor-grabbing"
      }`}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${tone.rail}`} />
      <div className="min-w-0 pl-2">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/crm/leads/${lead.id}`}
            className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-foreground transition hover:text-primary"
            title={lead.title}
            onClick={(e) => e.stopPropagation()}
          >
            {lead.title}
          </Link>
          <Badge tone={tone.badge}>{lead.status}</Badge>
        </div>
        <p className="mt-2 truncate text-xs text-muted-foreground" title={lead.companyName || "No company"}>
          {lead.companyName || "No company"}
        </p>
        <p className="mt-2 truncate text-xs text-muted-foreground" title={lead.ownerName ?? "Unassigned"}>
          {lead.ownerName ?? "Unassigned"}
        </p>
      </div>
    </div>
  );
}

function DroppableColumn({
  stage,
  children,
}: {
  stage: { id: string; name: string; probability: number; isWon: boolean; isLost: boolean };
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { stageId: stage.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-64 rounded-xl border bg-card p-4 shadow-sm transition ${
        isOver ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">{stage.name}</h2>
          <p className="text-xs text-muted-foreground">{stage.probability}% probability</p>
        </div>
        <Badge tone={stage.isWon ? "green" : stage.isLost ? "red" : "slate"}>
          {(children as React.ReactElement[])?.length ?? 0}
        </Badge>
      </div>
      <div className="grid gap-3 min-h-[100px]">
        {children}
      </div>
    </div>
  );
}

export function PipelineBoard({
  stages,
}: {
  stages: {
    id: string;
    name: string;
    probability: number;
    isWon: boolean;
    isLost: boolean;
    leads: {
      id: string;
      title: string;
      status: string;
      companyName: string | null;
      ownerName: string | null;
      stageId: string | null;
    }[];
  }[];
}) {
  const [activeLead, setActiveLead] = useState<{
    id: string;
    title: string;
    status: string;
    companyName: string | null;
    ownerName: string | null;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveLead(null);

    if (!over || active.id === over.id) return;

    const leadData = active.data.current?.lead as {
      id: string;
      stageId: string | null;
    } | undefined;

    if (!leadData) return;

    const targetStageId = over.data.current?.stageId as string | undefined;
    if (!targetStageId || targetStageId === leadData.stageId) return;

    const formData = new FormData();
    formData.set("leadId", leadData.id);
    formData.set("stageId", targetStageId);
    await updateLeadStage(formData);
  }

  function handleDragStart(event: DragStartEvent) {
    const leadData = event.active.data.current?.lead;
    if (leadData) setActiveLead(leadData);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
        {stages.map((stage) => (
          <DroppableColumn key={stage.id} stage={stage}>
            {stage.leads.map((lead) => (
              <DraggableCard key={lead.id} lead={lead} stageName={stage.name} />
            ))}
          </DroppableColumn>
        ))}
      </div>
      <DragOverlay>
        {activeLead ? (
          <div className="relative flex h-44 flex-col overflow-hidden rounded-xl border border-primary bg-card p-3 shadow-xl">
            <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
            <div className="min-w-0 pl-2">
              <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
                {activeLead.title}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {activeLead.companyName || "No company"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {activeLead.ownerName ?? "Unassigned"}
              </p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
