@extends('emails.layout')

@section('subject', 'Low Stock Alert — ' . $product->name)

@section('content')
    <h1>Low Stock Alert</h1>
    <p>The following product has reached or fallen below its reorder level and requires restocking.</p>

    <table class="info-table">
        <tr>
            <td>Product</td>
            <td><strong>{{ $product->name }}</strong></td>
        </tr>
        <tr>
            <td>SKU</td>
            <td>{{ $product->sku }}</td>
        </tr>
        <tr>
            <td>Current Stock</td>
            <td><strong style="color:#dc2626;">{{ $currentStock }}</strong></td>
        </tr>
        <tr>
            <td>Reorder Level</td>
            <td>{{ $reorderLevel }}</td>
        </tr>
    </table>

    <div class="alert-box">
        Stock is at or below the reorder threshold. Consider creating a purchase order immediately.
    </div>

    <a href="{{ $inventoryUrl }}" class="btn">View Inventory</a>
@endsection
