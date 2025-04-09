import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showNavigationLabels?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showNavigationLabels = false,
}: PaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    
    // Always show first page
    pageNumbers.push(1);
    
    // Current page neighborhood
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (pageNumbers.indexOf(i) === -1) {
        pageNumbers.push(i);
      }
    }
    
    // Always show last page if there is more than one page
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }
    
    // Add ellipses
    const result = [];
    let prev = 0;
    
    for (const num of pageNumbers) {
      if (num - prev > 1) {
        result.push(-1); // -1 represents ellipsis
      }
      result.push(num);
      prev = num;
    }
    
    return result;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {showNavigationLabels && <div className="text-sm text-muted-foreground">Previous</div>}
      
      <div className="flex items-center">
        {pageNumbers.map((pageNumber, index) => 
          pageNumber === -1 ? (
            <Button
              key={`ellipsis-${index}`}
              variant="ghost"
              size="icon"
              disabled
              className="text-muted-foreground px-2"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              key={pageNumber}
              variant={pageNumber === currentPage ? "default" : "outline"}
              size="icon"
              onClick={() => pageNumber !== currentPage && onPageChange(pageNumber)}
              className="h-8 w-8"
            >
              {pageNumber}
            </Button>
          )
        )}
      </div>
      
      {showNavigationLabels && <div className="text-sm text-muted-foreground">Next</div>}
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}