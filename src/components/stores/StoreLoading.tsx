import { Skeleton } from '@/components/ui/skeleton';

const StoreLoading = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Loading */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="py-4 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-32" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* Content Loading */}
      <main className="w-full py-12">
        <div className="w-full space-y-12">
          {/* Hero Section Loading */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center space-y-4">
              <Skeleton className="h-12 w-48 mx-auto" />
              <Skeleton className="h-6 w-96 mx-auto" />
            </div>
          </div>

          {/* Stats Loading */}
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mx-auto">
              <Skeleton className="h-24 w-full" />
            </div>
          </div>

          {/* Grid Loading */}
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-80 w-full" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StoreLoading;