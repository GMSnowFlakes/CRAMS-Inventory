import { useQuery } from '@tanstack/react-query';
import api from '../api/client';

export function useKitConfig() {
    const { data } = useQuery({
        queryKey: ['industry-kits-config'],
        queryFn: () => api.get('/industry-kits/config').then(r => r.data),
        staleTime: 5 * 60 * 1000,
    });

    return {
        productCategories: data?.product_categories ?? [],
        expenseCategories: data?.expense_categories ?? [],
        units:             data?.units ?? ['pcs', 'box', 'kg', 'L', 'set'],
        taxLabel:          data?.tax_label ?? 'Tax',
        suggestedReorder:  data?.suggested_reorder ?? 10,
    };
}
