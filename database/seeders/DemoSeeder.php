<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Company;
use App\Models\Customer;
use App\Models\Product;
use App\Models\StockLevel;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $company = Company::create([
            'name'      => 'Demo Retail Co.',
            'slug'      => 'demo-retail',
            'email'     => 'demo@inventoryos.app',
            'currency'  => 'USD',
            'is_active' => true,
        ]);

        User::create([
            'company_id' => $company->id,
            'name'       => 'Demo Admin',
            'email'      => 'demo@inventoryos.app',
            'password'   => Hash::make('demo1234'),
            'role'       => 'admin',
        ]);

        $branch = Branch::create([
            'company_id' => $company->id,
            'name'       => 'Main Store',
            'code'       => 'MAIN',
            'is_main'    => true,
            'is_active'  => true,
        ]);

        $branch2 = Branch::create([
            'company_id' => $company->id,
            'name'       => 'Warehouse',
            'code'       => 'WH01',
            'is_main'    => false,
            'is_active'  => true,
        ]);

        $suppliers = [
            ['Acme Distribution',  'sales@acme.com',     '+1 555 0100', '100 Industrial Pkwy, Newark, NJ', 'John Smith'],
            ['Global Supplies',    'orders@globalsup.com', '+1 555 0101', '42 Commerce Blvd, Chicago, IL', 'Lisa Park'],
            ['TechWholesale Inc',  'hello@techwh.com',    '+1 555 0102', '78 Tech Lane, Austin, TX',      'Mark Chen'],
        ];
        $supplierIds = [];
        foreach ($suppliers as [$name, $email, $phone, $address, $contact]) {
            $supplierIds[] = Supplier::create([
                'company_id'    => $company->id,
                'name'          => $name,
                'email'         => $email,
                'phone'         => $phone,
                'address'       => $address,
                'contact_person'=> $contact,
                'is_active'     => true,
            ])->id;
        }

        $products = [
            ['Wireless Mouse',       'ELEC-001', 'Electronics', 12.50,  29.99,  50,  15],
            ['Mechanical Keyboard',  'ELEC-002', 'Electronics', 45.00,  89.99,  25,  10],
            ['USB-C Hub 7-in-1',     'ELEC-003', 'Electronics', 18.00,  45.00,  80,  20],
            ['27" Monitor',           'ELEC-004', 'Electronics', 180.00, 329.00, 8,   5],
            ['Laptop Stand',         'OFFICE-01','Office',      15.00,  35.00,  60,  15],
            ['Desk Lamp LED',        'OFFICE-02','Office',      22.00,  49.99,  35,  10],
            ['Office Chair',         'OFFICE-03','Office',      120.00, 249.00, 12,  5],
            ['A4 Paper Ream',        'OFFICE-04','Office',      4.50,   8.99,   200, 50],
            ['Coffee Beans 1kg',     'PANTRY-01','Pantry',      12.00,  24.00,  40,  10],
            ['Bottled Water 24pk',   'PANTRY-02','Pantry',      6.00,   14.99,  100, 30],
            ['First Aid Kit',        'SAFETY-01','Safety',      18.00,  39.99,  20,  5],
            ['Fire Extinguisher',    'SAFETY-02','Safety',      45.00,  89.00,  6,   3],
            ['Blue Pen Box 50',      'OFFICE-05','Office',      8.00,   19.99,  75,  20],
            ['Sticky Notes Pack',    'OFFICE-06','Office',      3.50,   7.99,   150, 40],
            ['External SSD 1TB',     'ELEC-005', 'Electronics', 75.00,  149.00, 18,  5],
            ['Webcam 1080p',         'ELEC-006', 'Electronics', 28.00,  59.99,  45,  10],
        ];
        foreach ($products as $i => [$name, $sku, $cat, $cost, $sell, $stock, $reorder]) {
            $product = Product::create([
                'company_id'   => $company->id,
                'supplier_id'  => $supplierIds[$i % count($supplierIds)],
                'name'         => $name,
                'sku'          => $sku,
                'category'     => $cat,
                'unit'         => 'pcs',
                'cost_price'   => $cost,
                'selling_price'=> $sell,
                'reorder_level'=> $reorder,
                'is_active'    => true,
            ]);
            StockLevel::create([
                'company_id' => $company->id,
                'product_id' => $product->id,
                'branch_id'  => $branch->id,
                'quantity'   => $stock,
            ]);
            StockLevel::create([
                'company_id' => $company->id,
                'product_id' => $product->id,
                'branch_id'  => $branch2->id,
                'quantity'   => intval($stock * 0.4),
            ]);
        }

        $customers = [
            ['Walk-in Customer',  null,         '+1 555 9000', 'N/A'],
            ['Metro Mart',        'buyer@metromart.com', '+1 555 9001', '500 Retail St, Boston, MA'],
            ['QuickStop Stores',  'procurement@quickstop.com', '+1 555 9002', '12 Market Ave, Miami, FL'],
        ];
        foreach ($customers as [$name, $email, $phone, $address]) {
            Customer::create([
                'company_id' => $company->id,
                'name'       => $name,
                'email'      => $email,
                'phone'      => $phone,
                'address'    => $address,
                'is_active'  => true,
            ]);
        }

        // Low stock item to trigger alerts on dashboard
        $lowProduct = Product::create([
            'company_id'   => $company->id,
            'supplier_id'  => $supplierIds[0],
            'name'         => 'Network Cable 5m',
            'sku'          => 'ELEC-007',
            'category'     => 'Electronics',
            'unit'         => 'pcs',
            'cost_price'   => 3.00,
            'selling_price'=> 9.99,
            'reorder_level'=> 10,
            'is_active'    => true,
        ]);
        StockLevel::create([
            'company_id' => $company->id,
            'product_id' => $lowProduct->id,
            'branch_id'  => $branch->id,
            'quantity'   => 3,
        ]);
    }
}
