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
  readOnly?: boolean;
}

export function SpreadsheetEditor({ initialData, onChange, readOnly = false }: SpreadsheetEditorProps) {
  const parsedInitialData = useMemo(() => {
    let parsed = initialData;
    if (typeof initialData === 'string' && initialData.trim() !== '') {
      try {
        parsed = JSON.parse(initialData);
      } catch (e) {
        console.error("Failed to parse spreadsheet initialData", e);
      }
    }
    return Array.isArray(parsed) ? parsed : [];
  }, [initialData]);

  const [data, setData] = useState<any[]>(() =>
    parsedInitialData.length > 0
      ? parsedInitialData
      : [{ col1: "", col2: "", col3: "" }]
  );

  const [columnsList, setColumnsList] = useState<string[]>(() => {
    if (parsedInitialData.length > 0) {
      const allKeys = new Set<string>();
      parsedInitialData.forEach((row: any) => Object.keys(row).forEach(k => allKeys.add(k)));
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
            className="bg-transparent border-none outline-none text-app-text-soft font-semibold text-sm w-full"
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
          if (!readOnly) updateData(row.index, column.id, value);
        };

        if (readOnly) {
          return (
            <div className="w-full bg-transparent border-none outline-none text-sm text-app-text-secondary p-2">
              {value}
            </div>
          );
        }

        return (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onBlur}
            className="w-full bg-transparent border-none outline-none text-sm text-app-text-secondary p-2 focus:bg-app-surface-glass transition-colors"
            placeholder="..."
            readOnly={readOnly}
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
      {!readOnly && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-app-surface-glass hover:bg-app-surface-glass-strong text-xs font-medium text-app-text-secondary transition"
          >
            <Plus size={14} /> Add Row
          </button>
          <button
            onClick={addColumn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-app-surface-glass hover:bg-app-surface-glass-strong text-xs font-medium text-app-text-secondary transition"
          >
            <Plus size={14} /> Add Column
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto border border-app-border-default rounded-xl bg-app-canvas">
        <table className="w-full text-left border-collapse">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-app-border-default bg-app-surface-glass">
                {!readOnly && <th className="w-10 p-2 border-r border-app-border-default"></th>}
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="p-3 border-r border-app-border-default last:border-r-0 min-w-[150px]"
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
              <tr key={row.id} className="border-b border-app-border-subtle hover:bg-app-surface-glass-soft">
                {!readOnly && (
                  <td className="w-10 p-2 border-r border-app-border-default text-center">
                    <button
                      onClick={() => removeRow(index)}
                      className="p-1 text-app-text-faint hover:text-red-400 rounded transition opacity-50 hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                )}
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-0 border-r border-app-border-default last:border-r-0">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="p-8 text-center text-app-text-muted text-sm">
            No rows added yet.
          </div>
        )}
      </div>
    </div>
  );
}
