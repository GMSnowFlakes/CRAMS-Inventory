import { useQueryClient } from '@tanstack/react-query';

export function useCurrency() {
    const qc      = useQueryClient();
    const branding = qc.getQueryData(['branding']);
    const symbol   = branding?.currency_symbol ?? '$';

    function fmt(n) {
        return symbol + Number(n ?? 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    return { symbol, fmt };
}
