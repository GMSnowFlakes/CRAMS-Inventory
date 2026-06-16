import { useAuth } from '../context/AuthContext';

const MATRIX = {
    admin: {
        manageUsers:     true,
        manageBranches:  true,
        manageProducts:  true,
        manageSuppliers: true,
        createPO:        true,
        managePO:        true,
        doInventory:     true,
        doStockCount:    true,
        viewReports:     true,
        viewAuditLogs:   true,
    },
    manager: {
        manageUsers:     false,
        manageBranches:  true,
        manageProducts:  true,
        manageSuppliers: true,
        createPO:        true,
        managePO:        true,
        doInventory:     true,
        doStockCount:    true,
        viewReports:     true,
        viewAuditLogs:   true,
    },
    staff: {
        manageUsers:     false,
        manageBranches:  false,
        manageProducts:  false,
        manageSuppliers: false,
        createPO:        false,
        managePO:        true,  // can receive
        doInventory:     true,
        doStockCount:    true,
        viewReports:     true,
        viewAuditLogs:   false,
    },
};

export function usePermission() {
    const { user } = useAuth();
    const role = user?.role ?? 'staff';
    const perms = MATRIX[role] ?? MATRIX.staff;
    const can = (action) => perms[action] ?? false;
    return { can, role };
}
