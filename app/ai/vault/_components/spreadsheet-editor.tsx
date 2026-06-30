"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";

const isImageUrl = (url: string, colName: string) => {
  if (typeof url !== "string" || !url.trim().startsWith("http")) return false;
  const trimmed = url.trim();
  
  let isUrl = false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
    isUrl = parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }

  if (!isUrl) return false;

  const lowerCol = colName.toLowerCase();
  if (lowerCol.includes("image") || lowerCol.includes("thumbnail") || lowerCol.includes("photo") || lowerCol.includes("avatar") || lowerCol.includes("logo") || lowerCol.includes("picture")) {
    return true;
  }

  const path = parsed.pathname.toLowerCase();
  if (/\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i.test(path)) return true;
  if (parsed.hostname.includes("unsplash.com") || parsed.hostname.includes("picsum.photos")) return true;

  return false;
};

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
          const isImage = isImageUrl(value, colKey);
          
          if (isImage) {
            return (
              <div className="w-full bg-transparent border-none outline-none p-3 flex justify-center group relative">
                <a href={value.trim()} target="_blank" rel="noopener noreferrer" className="block w-full h-22 relative rounded-md overflow-hidden bg-app-surface-glass transition-all duration-300">
                  <img src={value.trim()} alt="Broken Image" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                    <span className="text-white text-xs font-medium bg-black/50 px-2.5 py-1 rounded-full backdrop-blur-md">View Full</span>
                  </div>
                </a>
              </div>
            );
          }

          return (
            <div className="w-full bg-transparent border-none outline-none text-sm text-app-text-secondary p-3 hover:bg-app-surface-glass-soft transition-colors h-full flex flex-col justify-start">
              <div className="leading-relaxed whitespace-pre-wrap line-clamp-3 hover:line-clamp-none transition-all overflow-hidden break-words">
                {value}
              </div>
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
  }, [columnsList, data, readOnly]);

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
                  <td key={cell.id} className="p-0 border-r border-app-border-default last:border-r-0 align-top min-w-[200px] max-w-[500px] break-words">
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
