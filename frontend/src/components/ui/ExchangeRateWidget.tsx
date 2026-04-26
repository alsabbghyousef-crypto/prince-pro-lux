import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function ExchangeRateWidget() {
  const [newRate, setNewRate] = useState('');
  const queryClient = useQueryClient();

  const { data: currentRate, isSuccess } = useQuery({
    queryKey: ['exchangeRate'],
    queryFn: async () => {
      const response = await api.get('/settings/exchange-rate');
      return response.data.exchangeRate;
    }
  });

  useEffect(() => {
    if (isSuccess && currentRate !== undefined) {
      setNewRate(String(currentRate));
    }
  }, [currentRate, isSuccess]);

  const updateMutation = useMutation({
    mutationFn: async (rate: number) => {
      await api.put('/settings/exchange-rate', { exchangeRate: rate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeRate'] });
      queryClient.invalidateQueries({ queryKey: ['exchangeRateHistory'] });
    }
  });

  const handleUpdate = () => {
    const rate = Number(newRate);
    if (rate > 0 && rate !== (currentRate)) {
      updateMutation.mutate(rate);
    }
  };

  return (
    <div className="flex items-center bg-card border border-primary/20 rounded-full overflow-hidden h-9 shadow-sm">
      <div className="flex items-center px-3 bg-secondary/30 border-l border-primary/10 h-full">
        <span className="text-xs font-black text-primary">$1 =</span>
      </div>
      
      <div className="flex items-center flex-1 h-full relative">
        <input 
          type="number"
          min="0"
          value={newRate}
          onChange={e => setNewRate(e.target.value)}
          className="w-24 bg-transparent h-full px-2 text-sm font-bold text-center outline-none text-foreground placeholder-muted-foreground"
        />
      </div>

      <button
        onClick={handleUpdate}
        disabled={!newRate || Number(newRate) <= 0 || Number(newRate) === (currentRate) || updateMutation.isPending}
        className="h-full px-4 bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center gap-1 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:bg-primary/20 disabled:text-primary disabled:cursor-not-allowed"
      >
        {updateMutation.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <>
            حفظ
          </>
        )}
      </button>
    </div>
  );
}
