
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  registration: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_type?: string;
  vehicle_category?: string;
  service_name: string;
  service_price: number;
  total_price: number;
  booking_date: string;
  booking_time: string;
  selected_addons: Json;
  payment_confirmed: boolean | null;
  deposit_amount: number | null;
  remaining_amount: number | null;
  created_at: string;
  updated_at: string;
}

export function BookingsDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          console.log('Bookings data changed, refetching...');
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bookings:', error);
        toast({
          title: "Error",
          description: "Failed to fetch bookings data",
          variant: "destructive"
        });
        return;
      }

      setBookings(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5); // HH:MM format
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const calculateDeposit = (totalPrice: number): number => {
    return totalPrice * 0.2; // 20% deposit
  };

  const calculateRemaining = (totalPrice: number): number => {
    return totalPrice * 0.8; // 80% remaining
  };

  const getAddonsDisplay = (addons: Json): string => {
    if (Array.isArray(addons) && addons.length > 0) {
      return addons.map(addon => {
        if (typeof addon === 'object' && addon !== null && 'name' in addon) {
          return addon.name;
        }
        return String(addon);
      }).join(', ');
    }
    return '';
  };

  const isUpcoming = (bookingDate: string, bookingTime: string): boolean => {
    const now = new Date();
    const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
    return bookingDateTime > now;
  };

  const upcomingBookings = bookings.filter(booking => 
    isUpcoming(booking.booking_date, booking.booking_time)
  );

  const pastBookings = bookings.filter(booking => 
    !isUpcoming(booking.booking_date, booking.booking_time)
  );

  const renderBookingsTable = (bookingsList: Booking[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Payment Status</TableHead>
            <TableHead>Billing</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookingsList.map((booking) => (
            <TableRow key={booking.id} className="hover:bg-muted/50">
              <TableCell>
                <div>
                  <div className="font-medium">{booking.customer_name}</div>
                  <div className="text-sm text-muted-foreground">{booking.customer_email}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">{booking.customer_phone}</div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{booking.registration}</div>
                  <div className="text-sm text-muted-foreground">
                    {booking.vehicle_make} {booking.vehicle_model}
                  </div>
                  {booking.vehicle_type && (
                    <div className="text-xs text-muted-foreground">
                      {booking.vehicle_type} - {booking.vehicle_category}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{booking.service_name}</div>
                  <div className="text-sm text-muted-foreground">
                    Service: {formatCurrency(booking.service_price)}
                  </div>
                  {getAddonsDisplay(booking.selected_addons) && (
                    <div className="text-xs text-muted-foreground">
                      Addons: {getAddonsDisplay(booking.selected_addons)}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{formatDate(booking.booking_date)}</div>
                  <div className="text-sm text-muted-foreground">{formatTime(booking.booking_time)}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className={`text-sm font-medium ${booking.payment_confirmed ? 'text-green-600' : 'text-orange-600'}`}>
                  {booking.payment_confirmed ? 'Confirmed' : 'Pending'}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">
                    Total: {formatCurrency(booking.total_price)}
                  </div>
                  <div className="text-sm text-green-600">
                    Deposit (20%): {formatCurrency(calculateDeposit(booking.total_price))}
                  </div>
                  <div className="text-sm text-orange-600">
                    Remaining (80%): {formatCurrency(calculateRemaining(booking.total_price))}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {formatDate(booking.created_at)}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Bookings Dashboard</CardTitle>
          <CardDescription>
            Real-time view of all bookings ({bookings.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">
                Upcoming Bookings ({upcomingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="past">
                Past Bookings ({pastBookings.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-6">
              {upcomingBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No upcoming bookings found
                </div>
              ) : (
                renderBookingsTable(upcomingBookings)
              )}
            </TabsContent>
            <TabsContent value="past" className="mt-6">
              {pastBookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No past bookings found
                </div>
              ) : (
                renderBookingsTable(pastBookings)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
