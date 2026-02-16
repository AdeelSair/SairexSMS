"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* ── Column definition ──────────────────────────────────────── */
export interface SxColumn<T> {
  key: string;
  header: string;
  /** Right-align numeric columns (amounts, counts) */
  numeric?: boolean;
  /** Use mono font for financial data */
  mono?: boolean;
  /** Column width — Tailwind class e.g. "w-32" */
  width?: string;
  /** Custom cell renderer */
  render?: (row: T, index: number) => React.ReactNode;
}

/* ── Props ──────────────────────────────────────────────────── */
interface SxDataTableProps<T> {
  columns: SxColumn<T>[];
  data: T[];
  /** Row click handler — enables pointer cursor */
  onRowClick?: (row: T, index: number) => void;
  /** Unique key extractor, defaults to `(row as any).id ?? index` */
  rowKey?: (row: T, index: number) => string | number;
  /** Show loading skeleton rows */
  loading?: boolean;
  /** Message when data is empty */
  emptyMessage?: string;
  className?: string;
}

export function SxDataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  rowKey,
  loading = false,
  emptyMessage = "No records found.",
  className,
}: SxDataTableProps<T>) {
  const getKey = rowKey ?? ((row: T, i: number) => (row.id as string | number) ?? i);

  return (
    <div
      className={cn(
        "overflow-auto rounded-lg border bg-card",
        className,
      )}
    >
      <Table>
        {/* ── Sticky header ────────────────────────────────── */}
        <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm">
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={cn(
                  "h-9 whitespace-nowrap px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                  col.numeric && "text-right",
                  col.width,
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {/* ── Loading skeleton ──────────────────────────── */}
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {columns.map((col) => (
                  <TableCell key={col.key} className="px-3 py-2">
                    <div className="h-4 animate-pulse rounded bg-muted" />
                  </TableCell>
                ))}
              </TableRow>
            ))}

          {/* ── Empty state ──────────────────────────────── */}
          {!loading && data.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-muted-foreground"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}

          {/* ── Data rows (compact: py-2) ────────────────── */}
          {!loading &&
            data.map((row, i) => (
              <TableRow
                key={getKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row, i) : undefined}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer",
                )}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      "px-3 py-2",
                      col.numeric && "text-right",
                      col.mono && "font-data",
                    )}
                  >
                    {col.render
                      ? col.render(row, i)
                      : (row[col.key] as React.ReactNode) ?? "—"}
                  </TableCell>
                ))}
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
