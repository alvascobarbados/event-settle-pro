import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppBar, PageScroll } from "@/components/setlup/Shell";
import { TextInput } from "@/components/setlup/Sheets";
import { Card, Chip, EmptyState, FinePrint, PrimaryButton, SectionLabel } from "@/components/setlup/ui";
import { useSetlup } from "@/lib/setlup/store";
import type { Category, Section } from "@/lib/setlup/types";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Categories — SETLUP" },
      {
        name: "description",
        content: "The promoter's expense and revenue taxonomy: categories, subcategories, ordering and archiving.",
      },
      { property: "og:title", content: "Categories — SETLUP" },
      {
        property: "og:description",
        content: "The promoter's expense and revenue taxonomy: categories, subcategories, ordering and archiving.",
      },
    ],
  }),
  component: CategoriesPage,
});

const byOrder = (a: Category, b: Category) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

function CategoriesPage() {
  const { db } = useSetlup();

  return (
    <>
      <AppBar />
      <PageScroll>
        <div className="px-4 pb-10 pt-5">
          <h1 className="wide-116 text-[26px] font-black uppercase leading-none text-ink">Categories</h1>
          <div className="mt-2">
            <FinePrint>
            Your taxonomy. Bills route to a category, optionally a subcategory. Archived items stay on old records but
              disappear from the router.
            </FinePrint>
          </div>

          {db.categories.length === 0 && (
            <Card className="mt-5">
              <EmptyState title="No categories yet" body="Add your first expense category below." />
            </Card>
          )}

          <SectionBlock section="expenses" label="Expenses" />
          <SectionBlock section="revenue" label="Revenue" />

          <div className="mt-6">
            <Link to="/settings" className="text-[12.5px] font-extrabold uppercase tracking-[0.07em] text-mute">
              ← Settings
            </Link>
          </div>
        </div>
      </PageScroll>
    </>
  );
}

function SectionBlock({ section, label }: { section: Section; label: string }) {
  const { db, addCategory, reorderCategories } = useSetlup();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  const roots = db.categories.filter((c) => c.section === section && !c.parentId).sort(byOrder);

  const move = (list: Category[], id: string, delta: number) => {
    const i = list.findIndex((c) => c.id === id);
    const j = i + delta;
    if (i === -1 || j < 0 || j >= list.length) return;
    const ids = list.map((c) => c.id);
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    void reorderCategories(ids as string[]);
  };

  const dropOn = (list: Category[], targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = list.map((c) => c.id).filter((id) => id !== dragId);
    const at = ids.indexOf(targetId);
    ids.splice(at === -1 ? ids.length : at, 0, dragId);
    setDragId(null);
    void reorderCategories(ids);
  };

  return (
    <>
      <div className="mt-6">
        <SectionLabel>{label}</SectionLabel>
      </div>
      <Card className="mt-2 overflow-hidden">
        {roots.length === 0 ? (
          <EmptyState title={`No ${label.toLowerCase()} categories`} body="Add one below." />
        ) : (
          roots.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              onMove={(d) => move(roots, c.id, d)}
              onDragStart={() => setDragId(c.id)}
              onDrop={() => dropOn(roots, c.id)}
            />
          ))
        )}
        <div className="px-4 py-3.5">
          {adding ? (
            <>
              <TextInput
                value={name}
                autoFocus
                placeholder={`New ${label.toLowerCase()} category`}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="mt-3 flex gap-2">
                <PrimaryButton
                  onClick={async () => {
                    if (!name.trim()) return;
                    await addCategory(section, name.trim());
                    setName("");
                    setAdding(false);
                  }}
                >
                  Add category
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setName("");
                  }}
                  className="h-11 shrink-0 rounded-full bg-app px-5 text-[12.5px] font-extrabold uppercase tracking-[0.07em] text-ink"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="text-[12.5px] font-extrabold uppercase tracking-[0.07em]"
              style={{ color: "var(--accent-c)" }}
            >
              + Add category
            </button>
          )}
        </div>
      </Card>
    </>
  );
}

function CategoryRow({
  category,
  onMove,
  onDragStart,
  onDrop,
}: {
  category: Category;
  onMove: (delta: number) => void;
  onDragStart: () => void;
  onDrop: () => void;
}) {
  const { db, addCategory, reorderCategories } = useSetlup();
  const [addingSub, setAddingSub] = useState(false);
  const [subName, setSubName] = useState("");
  const [dragSub, setDragSub] = useState<string | null>(null);

  const subs = db.categories.filter((c) => c.parentId === category.id).sort(byOrder);

  const moveSub = (id: string, delta: number) => {
    const i = subs.findIndex((c) => c.id === id);
    const j = i + delta;
    if (i === -1 || j < 0 || j >= subs.length) return;
    const ids = subs.map((c) => c.id);
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    void reorderCategories(ids as string[]);
  };

  const dropSubOn = (targetId: string) => {
    if (!dragSub || dragSub === targetId) return;
    const ids = subs.map((c) => c.id).filter((id) => id !== dragSub);
    const at = ids.indexOf(targetId);
    ids.splice(at === -1 ? ids.length : at, 0, dragSub);
    setDragSub(null);
    void reorderCategories(ids);
  };

  return (
    <div
      className="dashed-row"
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <NameRow category={category} onMove={onMove} />

      {subs.map((s) => (
        <div
          key={s.id}
          className="pl-6"
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            setDragSub(s.id);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.stopPropagation();
            dropSubOn(s.id);
          }}
        >
          <NameRow category={s} onMove={(d) => moveSub(s.id, d)} />
        </div>
      ))}

      <div className="pb-3 pl-6 pr-4">
        {addingSub ? (
          <>
            <TextInput
              autoFocus
              value={subName}
              placeholder="New subcategory"
              onChange={(e) => setSubName(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <PrimaryButton
                onClick={async () => {
                  if (!subName.trim()) return;
                  await addCategory(category.section, subName.trim(), category.id);
                  setSubName("");
                  setAddingSub(false);
                }}
              >
                Add subcategory
              </PrimaryButton>
              <button
                type="button"
                onClick={() => {
                  setAddingSub(false);
                  setSubName("");
                }}
                className="h-11 shrink-0 rounded-full bg-app px-5 text-[12.5px] font-extrabold uppercase tracking-[0.07em] text-ink"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAddingSub(true)}
            className="text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-mute"
          >
            + Add subcategory
          </button>
        )}
      </div>
    </div>
  );
}

function NameRow({ category, onMove }: { category: Category; onMove: (delta: number) => void }) {
  const { db, renameCategory, setCategoryArchived, deleteCategory } = useSetlup();
  const [value, setValue] = useState(category.name);
  const [editing, setEditing] = useState(false);

  const referenced =
    db.lines.some((l) => l.categoryId === category.id) || db.bills.some((b) => b.categoryId === category.id);

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <span aria-hidden className="cursor-grab select-none text-[13px] text-mute">
        ⠿
      </span>
      <div className="min-w-0 flex-1">
        {editing ? (
          <TextInput
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={async () => {
              setEditing(false);
              if (value.trim() && value.trim() !== category.name) await renameCategory(category.id, value.trim());
              else setValue(category.name);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
          />
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="block w-full text-left">
            <span className="block truncate text-[14px] font-semibold text-ink">{category.name}</span>
          </button>
        )}
      </div>
      {category.archived && <Chip tone="neutral">Archived</Chip>}
      <div className="flex shrink-0 items-center gap-1">
        <ArrowBtn label="Move up" onClick={() => onMove(-1)} up />
        <ArrowBtn label="Move down" onClick={() => onMove(1)} />
        {referenced || db.categories.some((c) => c.parentId === category.id) ? (
          <button
            type="button"
            onClick={() => void setCategoryArchived(category.id, !category.archived)}
            className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-mute"
          >
            {category.archived ? "Restore" : "Archive"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void deleteCategory(category.id)}
            className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-mute"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function ArrowBtn({ label, onClick, up }: { label: string; onClick: () => void; up?: boolean }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="grid h-7 w-7 place-items-center text-mute">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d={up ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"}
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
