<?php

namespace App\Mail;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LowStockAlert extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Product $product,
        public readonly int $currentStock,
        public readonly int $reorderLevel,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Low Stock Alert — ' . $this->product->name,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.low-stock-alert',
            with: [
                'product'      => $this->product,
                'currentStock' => $this->currentStock,
                'reorderLevel' => $this->reorderLevel,
                'inventoryUrl' => config('app.url') . '/inventory',
            ],
        );
    }
}
