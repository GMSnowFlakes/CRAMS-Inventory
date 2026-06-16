<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Only needed for PostgreSQL installs that ran the original migration
        // before transfer types were added. SQLite and MySQL are handled by
        // the original migration already including all six types.
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_type_check");
        DB::statement("ALTER TABLE inventory_movements ALTER COLUMN type TYPE VARCHAR(20)");
        DB::statement("ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_type_check CHECK (type IN ('stock_in','stock_out','adjustment','transfer','transfer_in','transfer_out'))");
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::statement("ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_type_check");
        DB::statement("ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_type_check CHECK (type IN ('stock_in','stock_out','adjustment','transfer'))");
    }
};
