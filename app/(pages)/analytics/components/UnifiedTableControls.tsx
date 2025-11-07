import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Settings2 } from 'lucide-react';
import { Table as TanStackTable } from '@tanstack/react-table';
import { exportToCSV, ColumnMeta } from '../utils/tableUtils';

interface UnifiedTableControlsProps {
  table: TanStackTable<any>;
  columns: ColumnMeta[];
  filename: string;
  onDownload?: () => void; // Custom download handler (optional)
}

export const UnifiedTableControls: React.FC<UnifiedTableControlsProps> = ({
  table,
  columns,
  filename,
  onDownload,
}) => {
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }

    // Default CSV export
    const visibleColumns = table.getAllLeafColumns().filter(col => col.getIsVisible());
    const exportColumns = visibleColumns
      .map(col => {
        const meta = columns.find(c => c.id === col.id);
        return meta ? { id: col.id, label: meta.label } : null;
      })
      .filter(Boolean) as { id: string; label: string }[];

    const rows = table.getRowModel().rows.map(row => {
      const rowData: any = {};
      exportColumns.forEach(col => {
        rowData[col.id] = row.getValue(col.id);
      });
      return rowData;
    });

    exportToCSV(rows, exportColumns, filename);
  };

  return (
    <div className="flex justify-end items-center w-full mb-1 gap-1">
      {/* Column Customization Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 border-0">
            <Settings2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="max-h-[80vh] overflow-y-auto grid grid-cols-2 gap-x-4 p-2 w-[500px]"
        >
          {table.getAllLeafColumns().map(column => {
            const meta = columns.find(c => c.id === column.id);
            if (!meta) return null;

            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={value => column.toggleVisibility(!!value)}
                onSelect={e => e.preventDefault()}
                className="cursor-pointer"
              >
                {meta.label}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Download Button */}
      <Button variant="ghost" size="icon" className="h-7 w-7 border-0" onClick={handleDownload}>
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
};
