<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recall_notices', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id');
            $table->foreignId('product_id')->constrained('products');
            $table->string('title');
            $table->text('reason');
            $table->enum('severity', ['low', 'medium', 'high', 'critical']);
            $table->enum('status', ['active', 'resolved'])->default('active');
            $table->integer('affected_qty');
            $table->integer('recovered_qty')->default(0);
            $table->foreignId('initiated_by')->constrained('users');
            $table->timestamp('resolved_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recall_notices');
    }
};
