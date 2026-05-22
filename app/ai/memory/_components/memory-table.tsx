"use client";

import React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
  VisibilityState,
  getPaginationRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  MoreHorizontal, 
  ArrowUpDown, 
  Settings2, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Pencil,
  Trash2,
  ShieldPlus,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MemoryItem } from "@/lib/memory-storage";
import { format } from "date-fns";


interface MemoryTableProps {
  data: MemoryItem[];
  onEdit: (memory: MemoryItem) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

export function MemoryTable({ data, onEdit, onDelete, onToggle }: MemoryTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const columns: ColumnDef<MemoryItem>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-app-surface-glass -ml-4 h-8 text-xs rounded-full py-0 px-2 font-normal"
        >
          Title
          <ArrowUpDown className="size-2.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="font-medium text-app-text-secondary truncate max-w-[200px]">
          {row.getValue("title") || "Untitled Memory"}
        </div>
      ),
    },
    {
      accessorKey: "content",
      header: "Memory",
      cell: ({ row }) => (
        <div className="text-app-text-soft text-[13px] leading-relaxed line-clamp-2 max-w-[500px]">
          {row.getValue("content")}
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.getValue("category") as string;
        return (
          <Badge
            variant="outline"
            className="capitalize bg-indigo-400/5 text-indigo-300 border-indigo-400/20 text-xs rounded-full py-0 px-2 font-normal"
          >
            {category}
          </Badge>
        );
      },
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.getValue("tags") as string[];
        return (
          <div className="flex flex-wrap gap-1 max-w-[150px]">
            {tags?.map((tag) => (
              <span key={tag} className="text-xs text-app-text-muted">
                #{tag}
              </span>
            ))}
            {!tags.length && <span className="text-xs text-app-text-ghost">-</span>}
          </div>
        );
      },
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-app-surface-glass -ml-4 h-8 text-xs rounded-full py-0 px-2 font-normal"
        >
          Updated
          <ArrowUpDown className="size-2.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const timestamp = row.getValue("updatedAt") as number;
        return (
          <div className="text-[11px] text-app-text-muted whitespace-nowrap">
            {timestamp ? format(timestamp, "MMM d, yyyy") : "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "enabled",
      header: "Status",
      cell: ({ row }) => {
        const enabled = row.getValue("enabled") as boolean;
        return (
          <Badge
            variant="outline"
            className={cn(
              "text-xs py-0 px-2 font-normal border-app-border-default rounded-full",
              enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-app-surface-glass text-app-text-muted"
            )}
          >
            {enabled ? "Active" : "Disabled"}
          </Badge>
        );
      },
    },

    {
      accessorKey: "source",
      header: "Source",
      cell: ({ row }) => (
        <div className="text-xs uppercase tracking-wider text-app-text-faint">
          {row.getValue("source") || "manual"}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const memory = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
             <button
              onClick={() => onToggle(memory.id)}
              className="size-8 rounded-full hover:bg-app-surface-glass flex items-center justify-center text-app-text-muted hover:text-app-text-primary transition-colors cursor-pointer"
              title={memory.enabled ? "Disable" : "Enable"}
            >
              {memory.enabled ? <ShieldCheck size={14} /> : <ShieldPlus size={14} />}
            </button>
            <button
              onClick={() => onEdit(memory)}
              className="size-8 rounded-full hover:bg-app-surface-glass flex items-center justify-center text-app-text-muted hover:text-app-text-primary transition-colors cursor-pointer"
              title="Edit"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(memory.id)}
              className="size-8 rounded-full hover:bg-red-500/10 flex items-center justify-center text-app-text-muted hover:text-red-300 transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-app-border-default bg-app-surface overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-app-surface-glass border-b border-app-border-subtle">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-none">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-app-text-muted h-10 px-4 text-[10px] font-medium uppercase tracking-widest">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-app-surface-glass-soft border-app-border-subtle transition-colors group"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 px-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-app-text-faint text-sm">
                  No memories found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="text-[11px] text-app-text-muted uppercase tracking-widest">
          {table.getFilteredRowModel().rows.length} total memories
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-app-text-muted uppercase tracking-widest">Rows per page</p>
            <div className="dropdown dropdown-top dropdown-end">
              <button
                tabIndex={0}
                className="h-8 px-3 rounded-full border border-app-border-default bg-app-surface-glass text-[11px] text-app-text-soft hover:text-app-text-primary flex items-center gap-2 transition-all cursor-pointer"
              >
                {table.getState().pagination.pageSize}
                <ChevronDown size={12} className="opacity-40" />
              </button>
              <ul tabIndex={0} className="dropdown-content z-10 menu p-2 shadow-2xl bg-app-surface-elevated border border-app-border-default rounded-xl w-24 mb-2">
                {[10, 20, 30, 50].map((pageSize) => (
                  <li key={pageSize}>
                    <button
                      onClick={() => table.setPageSize(pageSize)}
                      className={cn(
                        "text-[11px] py-2 justify-center",
                        table.getState().pagination.pageSize === pageSize
                          ? "bg-app-surface-glass-strong text-app-text-primary"
                          : "text-app-text-muted hover:bg-app-surface-glass"
                      )}
                    >
                      {pageSize}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="text-[11px] text-app-text-muted uppercase tracking-widest">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className="h-8 w-8 p-0 rounded-full bg-app-surface-glass border-app-border-default hover:bg-app-surface-glass-strong hover:text-app-text-primary disabled:opacity-20"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0 rounded-full bg-app-surface-glass border-app-border-default hover:bg-app-surface-glass-strong hover:text-app-text-primary disabled:opacity-20"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
