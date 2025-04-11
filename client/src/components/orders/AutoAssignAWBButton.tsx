import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { autoAssignAWB } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Tag } from 'lucide-react';

interface AutoAssignAWBButtonProps {
  clientId?: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function AutoAssignAWBButton({ 
  clientId, 
  variant = 'default',
  size = 'default',
  className = ''
}: AutoAssignAWBButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleClick = async () => {
    setIsProcessing(true);
    try {
      const result = await autoAssignAWB(clientId);
      
      // Refresh orders data
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      toast({
        title: 'AWB Numbers Assigned',
        description: `Successfully assigned ${result.updatedCount} AWB numbers to orders.`,
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to assign AWB numbers. Please try again.',
        variant: 'destructive',
      });
      console.error('Error assigning AWB numbers:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button 
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Assigning...
        </>
      ) : (
        <>
          <Tag className="mr-2 h-4 w-4" />
          Auto-Assign AWB
        </>
      )}
    </Button>
  );
}