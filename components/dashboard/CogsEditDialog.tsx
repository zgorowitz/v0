"use client"

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateSingleCogs } from '@/lib/cogs/actions';

interface CogsEditDialogProps {
  itemId: string;
  currentValue: number;
  onUpdate: (itemId: string, newValue: number) => void;
}

export function CogsEditDialog({ itemId, currentValue, onUpdate }: CogsEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(currentValue || '0'));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const updatedValue = await updateSingleCogs(itemId, value);
      onUpdate(itemId, updatedValue);
      setOpen(false);
    } catch (error) {
      alert('Failed to update COGS. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div
          className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded inline-block"
          onClick={() => {
            setValue(String(currentValue || '0'));
            setOpen(true);
          }}
        >
          ${currentValue?.toFixed(2) || '0.00'}
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Unit COGS</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="cogs" className="text-right text-sm font-medium">
              COGS ($)
            </label>
            <input
              id="cogs"
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="col-span-3 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
