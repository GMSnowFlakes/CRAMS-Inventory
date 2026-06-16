<?php

namespace App\Services;

use App\Models\Company;
use App\Models\Product;
use App\Models\Setting;

class IndustryKitService
{
    /**
     * Returns all available kits with metadata.
     */
    public static function all(): array
    {
        return array_map(fn($k) => [
            'id'          => $k,
            'name'        => self::kits()[$k]['name'],
            'description' => self::kits()[$k]['description'],
            'icon'        => self::kits()[$k]['icon'],
            'color'       => self::kits()[$k]['color'],
        ], array_keys(self::kits()));
    }

    /**
     * Apply a kit to the given company.
     * Seeds product categories (as Setting), expense categories, units.
     * Does NOT delete existing products/expenses.
     */
    public static function apply(Company $company, string $kitId): void
    {
        $kits = self::kits();
        if (!isset($kits[$kitId])) {
            abort(422, "Unknown kit: {$kitId}");
        }

        $kit = $kits[$kitId];

        // Store kit metadata on company
        $company->update(['industry_kit' => $kitId]);

        // Store kit config as Settings (keyed per company)
        Setting::set("kit:{$company->id}:product_categories", json_encode($kit['product_categories']));
        Setting::set("kit:{$company->id}:expense_categories",  json_encode($kit['expense_categories']));
        Setting::set("kit:{$company->id}:units",               json_encode($kit['units']));
        Setting::set("kit:{$company->id}:name",                $kit['name']);
        Setting::set("kit:{$company->id}:tax_label",           $kit['tax_label'] ?? 'Tax');
        Setting::set("kit:{$company->id}:suggested_reorder",   (string) ($kit['suggested_reorder'] ?? 10));
    }

    /**
     * Get kit config for a company.
     */
    public static function forCompany(int $companyId): array
    {
        $raw = Setting::get("kit:{$companyId}:product_categories");

        if (!$raw) {
            // Return general defaults
            $kit = self::kits()['general'];
            return [
                'product_categories' => $kit['product_categories'],
                'expense_categories' => $kit['expense_categories'],
                'units'              => $kit['units'],
                'tax_label'          => $kit['tax_label'] ?? 'Tax',
            ];
        }

        return [
            'product_categories' => json_decode(Setting::get("kit:{$companyId}:product_categories", '[]'), true),
            'expense_categories'  => json_decode(Setting::get("kit:{$companyId}:expense_categories", '[]'), true),
            'units'               => json_decode(Setting::get("kit:{$companyId}:units", '[]'), true),
            'tax_label'           => Setting::get("kit:{$companyId}:tax_label", 'Tax'),
        ];
    }

    // -------------------------------------------------------------------------
    // Kit definitions
    // -------------------------------------------------------------------------

    private static function kits(): array
    {
        return [
            'general' => [
                'name'        => 'General Inventory',
                'description' => 'All-purpose inventory for any business type.',
                'icon'        => '📦',
                'color'       => '#6366f1',
                'tax_label'   => 'Tax',
                'suggested_reorder' => 10,
                'product_categories' => ['Electronics', 'Clothing', 'Food & Beverage', 'Office Supplies', 'Tools & Hardware', 'Health & Beauty', 'Sports & Outdoors', 'Toys & Games', 'Books & Media', 'Other'],
                'expense_categories' => ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Maintenance', 'Transportation', 'Other'],
                'units'              => ['pcs', 'box', 'set', 'pair', 'kg', 'g', 'L', 'mL', 'pack', 'roll', 'sheet', 'unit'],
            ],

            'salon' => [
                'name'        => 'Salon & Barbershop',
                'description' => 'Hair, skin, and nail services. Track color, tools, and retail products.',
                'icon'        => '✂️',
                'color'       => '#ec4899',
                'tax_label'   => 'VAT',
                'suggested_reorder' => 5,
                'product_categories' => ['Hair Color & Bleach', 'Shampoo & Conditioner', 'Styling Products', 'Nail Supplies', 'Skin Care', 'Tools & Equipment', 'Salon Retail', 'Disposables', 'Towels & Linens', 'Cleaning Supplies'],
                'expense_categories' => ['Rent', 'Utilities', 'Staff Wages', 'Product Supplies', 'Equipment Maintenance', 'Marketing', 'Laundry', 'Insurance', 'Other'],
                'units'              => ['pcs', 'bottle', 'tube', 'sachet', 'box', 'set', 'pair', 'roll', 'pack', 'gallon'],
            ],

            'hardware' => [
                'name'        => 'Hardware Store',
                'description' => 'Fasteners, tools, building materials, and electrical supplies.',
                'icon'        => '🔧',
                'color'       => '#f59e0b',
                'tax_label'   => 'VAT',
                'suggested_reorder' => 20,
                'product_categories' => ['Fasteners & Screws', 'Hand Tools', 'Power Tools', 'Electrical', 'Plumbing', 'Paints & Coatings', 'Building Materials', 'Safety Equipment', 'Adhesives & Sealants', 'Lumber & Wood', 'Roofing', 'Garden & Outdoor'],
                'expense_categories' => ['Rent', 'Utilities', 'Staff Wages', 'Freight & Delivery', 'Equipment Repair', 'Marketing', 'Store Supplies', 'Insurance', 'Vehicle Fuel', 'Other'],
                'units'              => ['pcs', 'box', 'bag', 'kg', 'L', 'meter', 'roll', 'bundle', 'pair', 'sheet', 'set', 'length'],
            ],

            'pharmacy' => [
                'name'        => 'Pharmacy',
                'description' => 'Medicines, OTC drugs, vitamins, and medical sundries.',
                'icon'        => '💊',
                'color'       => '#10b981',
                'tax_label'   => 'VAT-Exempt',
                'suggested_reorder' => 15,
                'product_categories' => ['Prescription Medicines', 'OTC Medicines', 'Vitamins & Supplements', 'First Aid', 'Medical Devices', 'Baby & Maternal', 'Personal Care', 'Contraceptives', 'Diagnostic', 'Herbal & Alternative'],
                'expense_categories' => ['Rent', 'Utilities', 'Pharmacist Salary', 'Staff Wages', 'Cold Chain Storage', 'Regulatory Fees', 'Marketing', 'Shrinkage & Expiry', 'Insurance', 'Other'],
                'units'              => ['tab', 'cap', 'bottle', 'sachet', 'ampoule', 'vial', 'tube', 'box', 'strip', 'pack', 'mL', 'mg'],
            ],

            'vape' => [
                'name'        => 'Vape Shop',
                'description' => 'E-cigarettes, mods, pods, e-liquids, and accessories.',
                'icon'        => '💨',
                'color'       => '#8b5cf6',
                'tax_label'   => 'Excise Tax',
                'suggested_reorder' => 10,
                'product_categories' => ['Disposable Vapes', 'Pod Systems', 'Box Mods', 'E-Liquids', 'Coils & Pods', 'Batteries & Chargers', 'Accessories', 'Nicotine Salts', 'CBD Products', 'Merchandise'],
                'expense_categories' => ['Rent', 'Utilities', 'Staff Wages', 'Age Verification Tools', 'Marketing', 'Excise Tax Compliance', 'Display & Fixtures', 'Insurance', 'Other'],
                'units'              => ['pcs', 'box', 'pack', 'bottle (30mL)', 'bottle (60mL)', 'bottle (100mL)', 'set', 'bundle'],
            ],

            'beauty_supply' => [
                'name'        => 'Beauty Supply',
                'description' => 'Wholesale and retail beauty products, cosmetics, wigs, and accessories.',
                'icon'        => '💄',
                'color'       => '#f43f5e',
                'tax_label'   => 'VAT',
                'suggested_reorder' => 8,
                'product_categories' => ['Makeup & Cosmetics', 'Skin Care', 'Hair Care', 'Wigs & Extensions', 'Nail Products', 'Fragrances', 'Tools & Brushes', 'Men\'s Grooming', 'Professional Line', 'Accessories'],
                'expense_categories' => ['Rent', 'Utilities', 'Staff Wages', 'Display & Fixtures', 'Marketing', 'Samples & Testers', 'Shrinkage', 'Insurance', 'Delivery', 'Other'],
                'units'              => ['pcs', 'bottle', 'tube', 'box', 'set', 'pack', 'oz', 'mL', 'g', 'pair', 'roll'],
            ],

            'pet_supply' => [
                'name'        => 'Pet Supply',
                'description' => 'Pet food, medicine, accessories, and grooming supplies.',
                'icon'        => '🐾',
                'color'       => '#f97316',
                'tax_label'   => 'VAT',
                'suggested_reorder' => 10,
                'product_categories' => ['Dog Food', 'Cat Food', 'Bird & Small Animal Feed', 'Fish & Aquatic', 'Pet Medicine & Vitamins', 'Grooming Products', 'Toys & Accessories', 'Cages & Housing', 'Collars & Leashes', 'Litter & Bedding', 'Treats & Chews'],
                'expense_categories' => ['Rent', 'Utilities', 'Staff Wages', 'Veterinary Supplies', 'Grooming Services', 'Marketing', 'Cold Storage', 'Delivery', 'Insurance', 'Other'],
                'units'              => ['kg', 'g', 'pcs', 'bag', 'can', 'bottle', 'pack', 'box', 'sachet', 'set'],
            ],

            'restaurant' => [
                'name'        => 'Restaurant Ingredients',
                'description' => 'Kitchen ingredients, dry goods, beverages, and consumables.',
                'icon'        => '🍽️',
                'color'       => '#ef4444',
                'tax_label'   => 'VAT',
                'suggested_reorder' => 3,
                'product_categories' => ['Meat & Poultry', 'Seafood', 'Vegetables & Fruits', 'Dairy & Eggs', 'Dry Goods & Grains', 'Oils & Condiments', 'Beverages', 'Spices & Herbs', 'Bread & Pastry', 'Frozen Items', 'Cleaning & Sanitation', 'Packaging & Disposables'],
                'expense_categories' => ['Rent', 'Utilities', 'Kitchen Staff', 'Service Staff', 'Waste Management', 'Marketing', 'Repairs & Maintenance', 'Laundry', 'Gas & Fuel', 'Licenses & Permits', 'Other'],
                'units'              => ['kg', 'g', 'L', 'mL', 'pcs', 'bundle', 'tray', 'dozen', 'can', 'bottle', 'pack', 'bag', 'box'],
            ],

            'construction' => [
                'name'        => 'Construction Materials',
                'description' => 'Structural, finishing, and MEP materials for construction projects.',
                'icon'        => '🏗️',
                'color'       => '#78716c',
                'tax_label'   => 'VAT',
                'suggested_reorder' => 50,
                'product_categories' => ['Cement & Concrete', 'Steel & Rebar', 'Sand & Aggregates', 'Lumber & Wood', 'Hollow Blocks & Bricks', 'Roofing Materials', 'Tiles & Flooring', 'Electrical Materials', 'Plumbing Materials', 'Paints & Finishes', 'Doors & Windows', 'Insulation'],
                'expense_categories' => ['Warehouse Rent', 'Utilities', 'Staff Wages', 'Heavy Equipment Rental', 'Delivery & Logistics', 'Wastage', 'Insurance', 'Permits', 'Marketing', 'Other'],
                'units'              => ['bag', 'pc', 'bundle', 'length', 'sheet', 'kg', 'ton', 'm²', 'm³', 'roll', 'set', 'gallon'],
            ],

            'auto_parts' => [
                'name'        => 'Auto Parts',
                'description' => 'OEM and aftermarket car parts, accessories, and fluids.',
                'icon'        => '🚗',
                'color'       => '#64748b',
                'tax_label'   => 'VAT',
                'suggested_reorder' => 5,
                'product_categories' => ['Engine Parts', 'Brake System', 'Suspension & Steering', 'Electrical & Lighting', 'Filters & Fluids', 'Transmission & Clutch', 'Exhaust System', 'Body Parts & Panels', 'Tires & Wheels', 'Car Accessories', 'Car Care Products', 'Tools & Equipment'],
                'expense_categories' => ['Rent', 'Utilities', 'Staff Wages', 'Freight & Shipping', 'Core Returns', 'Marketing', 'Warranty Claims', 'Insurance', 'Other'],
                'units'              => ['pcs', 'set', 'pair', 'box', 'bottle', 'L', 'gallon', 'kit', 'roll', 'unit'],
            ],

            'apparel' => [
                'name'        => 'Uniform & Apparel',
                'description' => 'Clothing, uniforms, workwear, and accessories.',
                'icon'        => '👕',
                'color'       => '#3b82f6',
                'tax_label'   => 'VAT',
                'suggested_reorder' => 10,
                'product_categories' => ['Polo & T-Shirts', 'Pants & Shorts', 'Jackets & Outerwear', 'Uniforms', 'Workwear & PPE', 'Dresses & Skirts', 'Footwear', 'Headwear & Caps', 'Bags & Backpacks', 'Accessories', 'Undergarments', 'Sports & Activewear'],
                'expense_categories' => ['Rent', 'Utilities', 'Staff Wages', 'Embroidery & Printing', 'Packaging', 'Marketing', 'Alterations', 'Returns', 'Insurance', 'Other'],
                'units'              => ['pcs', 'pair', 'set', 'dozen', 'bundle', 'box', 'roll'],
            ],

            'electronics' => [
                'name'        => 'Electronics Store',
                'description' => 'Gadgets, components, cables, and consumer electronics.',
                'icon'        => '📱',
                'color'       => '#0ea5e9',
                'tax_label'   => 'VAT',
                'suggested_reorder' => 5,
                'product_categories' => ['Mobile Phones', 'Laptops & Computers', 'Tablets', 'Audio & Headphones', 'Cameras', 'TV & Displays', 'Components & Parts', 'Cables & Adapters', 'Power & Batteries', 'Smart Home', 'Gaming', 'Accessories'],
                'expense_categories' => ['Rent', 'Utilities', 'Staff Wages', 'Warranty & Repairs', 'Marketing', 'Display & Fixtures', 'Shrinkage & Theft', 'Insurance', 'Delivery', 'Other'],
                'units'              => ['pcs', 'unit', 'box', 'set', 'pair', 'bundle', 'pack', 'roll', 'meter'],
            ],

            'warehouse' => [
                'name'        => 'Warehouse / Distribution',
                'description' => 'Bulk storage, logistics, and distribution center operations.',
                'icon'        => '🏭',
                'color'       => '#84cc16',
                'tax_label'   => 'VAT',
                'suggested_reorder' => 100,
                'product_categories' => ['Palletized Goods', 'Bulk Dry Goods', 'Refrigerated Items', 'Hazardous Materials', 'Fragile Items', 'Consumer Goods', 'Industrial Supplies', 'Packaging Materials', 'Returns & RMA', 'Oversized Items'],
                'expense_categories' => ['Rent / Lease', 'Utilities', 'Forklift & Equipment', 'Staff Wages', 'Security', 'Shipping & Logistics', 'Packaging Supplies', 'Insurance', 'Maintenance', 'Other'],
                'units'              => ['pallet', 'carton', 'box', 'kg', 'ton', 'unit', 'roll', 'bag', 'L', 'set'],
            ],

            'school_supply' => [
                'name'        => 'School Supply',
                'description' => 'Stationery, books, arts & crafts, and school essentials.',
                'icon'        => '📚',
                'color'       => '#f59e0b',
                'tax_label'   => 'VAT-Exempt',
                'suggested_reorder' => 20,
                'product_categories' => ['Notebooks & Paper', 'Pens & Pencils', 'Art Supplies', 'Bags & Backpacks', 'Books & References', 'Calculators & Rulers', 'Coloring & Crafts', 'Filing & Organization', 'Correction Supplies', 'Science & Lab', 'Sports & PE', 'Others'],
                'expense_categories' => ['Rent', 'Utilities', 'Staff Wages', 'Back-to-School Marketing', 'Packaging', 'Delivery', 'Display & Fixtures', 'Insurance', 'Other'],
                'units'              => ['pcs', 'box', 'pack', 'set', 'ream', 'dozen', 'roll', 'bottle', 'pair', 'bundle'],
            ],

            'medical_supply' => [
                'name'        => 'Medical Supply',
                'description' => 'Hospital consumables, devices, PPE, and diagnostic equipment.',
                'icon'        => '🏥',
                'color'       => '#06b6d4',
                'tax_label'   => 'VAT-Exempt',
                'suggested_reorder' => 20,
                'product_categories' => ['Surgical Consumables', 'PPE & Protective Gear', 'Diagnostic Equipment', 'Wound Care', 'IV Supplies', 'Respiratory', 'Orthopedic Supplies', 'Patient Monitoring', 'Sterilization', 'Dental Supplies', 'Rehabilitation', 'Lab Supplies'],
                'expense_categories' => ['Rent', 'Utilities', 'Staff Wages', 'Cold Chain', 'Sterilization', 'Regulatory Compliance', 'Marketing', 'Insurance', 'Delivery', 'Other'],
                'units'              => ['pcs', 'box', 'pack', 'pair', 'roll', 'bottle', 'vial', 'set', 'kit', 'carton'],
            ],
        ];
    }
}
