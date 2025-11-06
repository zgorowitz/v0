"use client"

import React, { useState, useEffect } from 'react';
import { LayoutWrapper } from "@/components/layout-wrapper"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { supabase, getCurrentUserOrganizationId } from '@/lib/supabase/client';

interface ShipmentPacking {
  shipment_id: string;
  packed_by_name: string;
  packed_by_email: string;
  created_at: string;
}

const ShipmentsPage = () => {
  const [data, setData] = useState<ShipmentPacking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [shipmentId, setShipmentId] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 30);
    return { from: sevenDaysAgo, to: new Date() };
  });

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchShipments();
  }, []);

  const fetchShipments = async () => {
    try {
      setLoading(true);
      setError(null);

      const userOrganizationId = await getCurrentUserOrganizationId();
      if (!userOrganizationId) {
        setError('No organization found for user');
        return;
      }

      // Use RPC function to join with organization_users
      const { data: results, error: queryError } = await supabase.rpc('get_shipment_packing_with_org', {
        p_organization_id: userOrganizationId,
        p_shipment_id: shipmentId.trim() || null,
        p_date_from: dateRange?.from?.toISOString().split('T')[0] || null,
        p_date_to: dateRange?.to?.toISOString().split('T')[0] || null
      });

      if (queryError) throw queryError;

      setData(results || []);
    } catch (err: any) {
      console.error('Error fetching shipments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchShipments();
  };

  if (error) {
    return (
      <LayoutWrapper>
        <div className="p-6">
          <div className="bg-red-50 border border-red-400 text-red-800 px-4 py-3 rounded-lg">
            <strong className="font-bold">Error: </strong>
            <span>{error}</span>
          </div>
        </div>
      </LayoutWrapper>
    );
  }

  return (
    <LayoutWrapper>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Shipments</h1>

        {/* Filters */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Shipment ID</label>
            <Input
              type="text"
              placeholder="Enter shipment ID"
              value={shipmentId}
              onChange={(e) => setShipmentId(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Date Range</label>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              numberOfMonths={2}
            >
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </DateRangePicker>
          </div>
          <Button onClick={handleApplyFilters} disabled={loading}>
            {loading ? 'Loading...' : 'Apply Filters'}
          </Button>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment ID</TableHead>
                <TableHead>Packed By Name</TableHead>
                <TableHead>Packed By Email</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No shipments found
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => (
                  <TableRow key={`${row.shipment_id}-${index}`}>
                    <TableCell>{row.shipment_id}</TableCell>
                    <TableCell>{row.packed_by_name}</TableCell>
                    <TableCell>{row.packed_by_email}</TableCell>
                    <TableCell>{row.created_at}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </LayoutWrapper>
  );
};

export default ShipmentsPage;
