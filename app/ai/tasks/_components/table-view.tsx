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
import { useDraggable } from "@dnd-kit/core";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MoreHorizontal, ArrowUpDown, Settings2, Search, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface TaskTableProps {
  tasks: any[];
  onEdit: (task: any) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function TaskTable({ tasks, onEdit, onDelete, onStatusChange }: TaskTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const columns: ColumnDef<any>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px] border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px] border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="hover:bg-white/5 -ml-4"
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => <div className="font-medium text-white capitalize">{row?.getValue("title")}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            className={cn(
              "capitalize rounded-full",
              status === "done" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
              status === "in-progress" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
              status === "todo" && "bg-blue-500/10 text-blue-500 border-blue-500/20",
              status === "backlog" && "bg-slate-500/10 text-slate-500 border-slate-500/20"
            )}
          >
            {status.replace("-", " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        const priority = row.getValue("priority") as string;
        return (
          <Badge
            variant="outline"
            className={cn(
              "capitalize rounded-full",
              priority === "urgent" && "text-red-400 border-red-400/20",
              priority === "high" && "text-orange-400 border-orange-400/20",
              priority === "medium" && "text-blue-400 border-blue-400/20",
              priority === "low" && "text-slate-400 border-slate-400/20"
            )}
          >
            {priority}
          </Badge>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => {
        const date = row.getValue("dueDate");
        return <div className="text-white/60">{date ? format(new Date(date as string), "MMM d, yyyy") : "-"}</div>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const task = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/5">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10 text-white">
              <DropdownMenuItem onClick={() => onEdit(task)}>Edit</DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(task._id)}
                className="text-red-400 focus:text-red-400"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: tasks,
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
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/20" />
          <Input
            placeholder="Search tasks..."
            value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("title")?.setFilterValue(event.target.value)
            }
            className="pl-10 bg-white/5 border-white/10 focus:border-white/20 h-10 rounded-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white flex gap-2">
                <Settings2 className="size-4" />
                <span>View</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px] bg-zinc-900 border-white/10 text-white">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/2 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-white/3">
            {table?.getHeaderGroups()?.map((headerGroup) => (
              <TableRow key={headerGroup?.id} className="hover:bg-transparent border-white/10">
                {headerGroup?.headers?.map((header) => (
                  <TableHead key={header?.id} className="text-white/40 py-2 px-6">
                    {header?.isPlaceholder
                      ? null
                      : flexRender(header?.column?.columnDef?.header, header?.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <DraggableTableRow key={row.id} row={row}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4 px-6">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </DraggableTableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-white/20">
                  No tasks found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-2 py-4">
          <div className="text-xs text-white/40">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex items-center gap-6 lg:gap-8">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-white/40">Rows per page</p>
              <div className="dropdown dropdown-top dropdown-end">
                <button
                  tabIndex={0}
                  className="h-8 px-3 rounded-full border border-white/10 bg-white/5 text-[11px] text-white/60 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
                >
                  {table.getState().pagination.pageSize}
                  <ChevronDown size={12} className="opacity-40" />
                </button>
                <ul tabIndex={0} className="dropdown-content z-10 menu p-2 shadow-2xl bg-[#0F0F0F] border border-white/10 rounded-xl w-24 mb-2">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <li key={pageSize}>
                      <button
                        onClick={() => table.setPageSize(pageSize)}
                        className={cn(
                          "text-[11px] py-2 justify-center",
                          table.getState().pagination.pageSize === pageSize
                            ? "bg-white/10 text-white"
                            : "text-white/40 hover:bg-white/5"
                        )}
                      >
                        {pageSize}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex w-[100px] items-center justify-center text-xs font-medium text-white/40">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-full bg-white/5 border-white/10"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeft className="h-4 w-4 text-white" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0 rounded-full bg-white/5 border-white/10"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRight className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DraggableTableRow({ row, children }: { row: any, children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(row.original._id),
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-state={row.getIsSelected() && "selected"}
      className={cn(
        "hover:bg-white/[0.04] border-white/5 transition-colors cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
    >
      {children}
    </TableRow>
  );
}
