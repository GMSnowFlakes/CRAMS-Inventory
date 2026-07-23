<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_levels', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'product_id']);
            $table->unique(['company_id', 'product_id', 'branch_id']);
        });
    }

    public function down(): void
    {
        Schema::table('stock_levels', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'product_id', 'branch_id']);
            $table->unique(['company_id', 'product_id']);
        });
    }
};
