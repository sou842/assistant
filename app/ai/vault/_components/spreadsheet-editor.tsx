"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";

interface SpreadsheetEditorProps {
  initialData?: any[];
  onChange: (data: any[]) => void;
}

export function SpreadsheetEditor({ initialData, onChange }: SpreadsheetEditorProps) {
  const [data, setData] = useState<any[]>(() => 
    Array.isArray(initialData) && initialData.length > 0 
      ? initialData 
      : [{ col1: "", col2: "", col3: "" }]
  );

  const [columnsList, setColumnsList] = useState<string[]>(() => {
    if (Array.isArray(initialData) && initialData.length > 0) {
      const allKeys = new Set<string>();
      initialData.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
      return Array.from(allKeys);
    }
    return ["col1", "col2", "col3"];
  });

  // Notify parent on change
  useEffect(() => {
    onChange(data);
  }, [data, onChange]);

  const updateData = (rowIndex: number, columnId: string, value: string) => {
    setData((old) =>
      old.map((row, index) => {
        if (index === rowIndex) {
          return {
            ...row,
            [columnId]: value,
          };
        }
        return row;
      })
    );
  };

  const columns = useMemo<ColumnDef<any>[]>(() => {
    return columnsList.map((colKey) => ({
      accessorKey: colKey,
      header: () => (
        <div className="flex items-center justify-between group">
          <input
            className="bg-transparent border-none outline-none text-white/70 font-semibold text-sm w-full"
            value={colKey}
            onChange={(e) => {
              const newKey = e.target.value;
              // Handle column rename logic here if needed for advanced usage
              // For now, it just looks editable but acts as a label
            }}
            readOnly
          />
        </div>
      ),
      cell: ({ row, column, getValue }) => {
        const initialValue = getValue() as string;
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [value, setValue] = useState(initialValue || "");

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
          setValue(initialValue || "");
        }, [initialValue]);

        const onBlur = () => {
          updateData(row.index, column.id, value);
        };

        return (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onBlur}
            className="w-full bg-transparent border-none outline-none text-sm text-white/90 p-2 focus:bg-white/5 transition-colors"
            placeholder="..."
          />
        );
      },
    }));
  }, [columnsList, data]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const addRow = () => {
    const newRow: any = {};
    columnsList.forEach(col => newRow[col] = "");
    setData([...data, newRow]);
  };

  const addColumn = () => {
    const newColName = `col${columnsList.length + 1}`;
    setColumnsList([...columnsList, newColName]);
    setData(data.map(row => ({ ...row, [newColName]: "" })));
  };

  const removeRow = (index: number) => {
    setData(data.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-white/80 transition"
        >
          <Plus size={14} /> Add Row
        </button>
        <button
          onClick={addColumn}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-white/80 transition"
        >
          <Plus size={14} /> Add Column
        </button>
      </div>

      <div className="flex-1 overflow-auto border border-white/10 rounded-xl bg-black">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-white/10 bg-white/5">
                <th className="w-10 p-2 border-r border-white/10"></th>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="p-3 border-r border-white/10 last:border-r-0 min-w-[150px]"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, index) => (
              <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="w-10 p-2 border-r border-white/10 text-center">
                  <button
                    onClick={() => removeRow(index)}
                    className="p-1 text-white/20 hover:text-red-400 rounded transition opacity-50 hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-0 border-r border-white/10 last:border-r-0">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="p-8 text-center text-white/40 text-sm">
            No rows added yet.
          </div>
        )}
      </div>
    </div>
  );
}
