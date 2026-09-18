"""
GRAMSAARTHI — Business Template Service
Loads configurable business cost templates and scales capital/operating
projections dynamically for rural micro-enterprises without hardcoding assumptions.
"""

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

TEMPLATES_PATH = Path(__file__).resolve().parent.parent / "data" / "business_templates.json"
_CACHE: dict[str, Any] | None = None


def get_all_templates() -> dict[str, Any]:
    """Load and cache the business templates from business_templates.json."""
    global _CACHE
    if _CACHE is not None:
        return _CACHE

    try:
        with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
            _CACHE = json.load(f)
            return _CACHE
    except Exception as exc:
        logger.error("[TEMPLATES] Failed to read business_templates.json: %s", exc)
        return {}


def match_template(business_name_or_interest: str | None) -> dict[str, Any]:
    """
    Find matching business template based on user's selected business interest or recommendation.
    Falls back gracefully to 'generic' if unrecognised or empty.
    """
    templates = get_all_templates()
    if not business_name_or_interest:
        return templates.get("generic", {})

    query = str(business_name_or_interest).strip().lower()

    # Direct key lookup
    if query in templates:
        return templates[query]

    # Keyword mappings
    keyword_map = [
        (["dairy", "cow", "buffalo", "milk", "cattle", "pashu"], "dairy"),
        (["poultry", "chicken", "broiler", "layer", "bird", "egg", "murgi"], "poultry"),
        (["retail", "shop", "grocery", "kirana", "dukan", "general store"], "retail"),
        (["tailor", "textile", "garment", "cloth", "silai", "stitching", "sewing"], "textile"),
        (["food", "flour", "mill", "atta", "chakkhi", "spice", "bakery", "processing"], "food"),
        (["fish", "fisheries", "matsya", "aquaculture", "pond", "biofloc"], "fisheries"),
        (["transport", "truck", "mini-truck", "pickup", "vehicle", "logistics", "auto"], "transport"),
        (["agri", "nursery", "seed", "fertilizer", "crop", "farm input"], "agriculture"),
    ]

    for keywords, key in keyword_map:
        if any(kw in query for kw in keywords):
            return templates.get(key, templates.get("generic", {}))

    return templates.get("generic", {})


def compute_business_scale_and_costs(
    template: dict[str, Any],
    user_capital: int,
    requested_project_cost: int | None = None,
) -> dict[str, Any]:
    """
    Given a business template and user capital, compute:
    1. Total project cost & promoter contribution
    2. Capital expense breakdown (Capex)
    3. Scaled production units (animals, birds, workstations, setups)
    4. Expected monthly revenue & operating expenses (Opex)
    """
    default_margin_pct = template.get("default_margin_pct", 10.0)

    # 1. Determine Project Cost
    if requested_project_cost and requested_project_cost > 0:
        project_cost = int(requested_project_cost)
    else:
        # Scale according to user capital and standard margin
        margin_decimal = default_margin_pct / 100.0 if default_margin_pct > 0 else 0.10
        raw_cost = int(user_capital / margin_decimal) if user_capital > 0 else 500000
        # Round to nearest 25,000 for realistic banking proposal presentation
        project_cost = max(100000, round(raw_cost / 25000) * 25000)

    template_id = template.get("id", "generic")
    fixed_costs = template.get("fixed_costs", {})
    fixed_overhead = template.get("fixed_overhead_monthly", 5000)

    # 2. Business-specific operational scaling
    if template_id == "dairy":
        # Base unit: 5 animals = 5 * 75,000 (3.75L) + fixed (3.0L) = ~6.75L - 10L
        cost_per_animal = template.get("cost_per_animal", 75000)
        # Determine number of animals from project scale (allocated ~40-50% to animals)
        animal_budget = max(cost_per_animal * 2, int(project_cost * 0.45))
        animal_count = max(2, min(25, round(animal_budget / cost_per_animal)))

        capex = {
            "Milch Animals Purchase": animal_count * cost_per_animal,
            "Cattle Shed & Civil Works": int(fixed_costs.get("shed_and_civil_work", 120000) * (1 + (animal_count - 5) * 0.12)),
            "Milking Equipment & Chiller": fixed_costs.get("machinery_and_milking_equipment", 60000),
            "Fodder & Initial Feed Reserve": int(fixed_costs.get("initial_fodder_and_feed", 50000) * (animal_count / 5)),
            "Working Capital & Contingency": max(30000, project_cost - (animal_count * cost_per_animal) - 230000),
        }
        # Ensure total equals project_cost
        diff = project_cost - sum(capex.values())
        capex["Working Capital & Contingency"] = max(20000, capex["Working Capital & Contingency"] + diff)

        # Revenue & Opex
        assump = template.get("production_assumptions", {})
        daily_yield = assump.get("daily_milk_yield_litres_per_animal", 13)
        days = assump.get("milking_days_per_month", 26)
        milk_price = assump.get("milk_selling_price_per_litre", 42)
        byproduct = assump.get("dung_and_byproduct_revenue_monthly_per_animal", 800)

        monthly_revenue = int((animal_count * daily_yield * days * milk_price) + (animal_count * byproduct))

        v_costs = template.get("variable_costs_monthly_per_animal", {})
        v_per_animal = sum(v_costs.values()) if v_costs else 7800
        monthly_expenses = int((animal_count * v_per_animal) + fixed_overhead)
        scale_desc = f"{animal_count} Milch Animals (Crossbreed Cows/Buffaloes)"

    elif template_id == "poultry":
        cost_per_bird = template.get("cost_per_bird_capacity", 250)
        bird_count = max(500, min(10000, round((project_cost * 0.50 / cost_per_bird) / 250) * 250))

        capex = {
            "Poultry Shed Construction": int(fixed_costs.get("shed_construction_and_curtains", 200000) * (bird_count / 1000)),
            "Drinkers, Feeders & Brooder Setup": int(fixed_costs.get("feeders_drinkers_brooders", 60000) * (bird_count / 1000)),
            "Biosecurity & Water Sanitation": fixed_costs.get("biosecurity_and_water_sanitation", 30000),
            "Working Capital (Chicks & Initial Feed)": max(40000, project_cost - int(290000 * bird_count / 1000)),
        }
        diff = project_cost - sum(capex.values())
        capex["Working Capital (Chicks & Initial Feed)"] = max(20000, capex["Working Capital (Chicks & Initial Feed)"] + diff)

        assump = template.get("production_assumptions", {})
        weight = assump.get("average_body_weight_kg", 2.1)
        price_kg = assump.get("live_bird_selling_price_per_kg", 115)
        survival = assump.get("survival_rate_pct", 96) / 100.0
        batches = assump.get("batches_per_year", 6)

        annual_rev = bird_count * survival * weight * price_kg * batches
        monthly_revenue = int(annual_rev / 12)

        # In poultry, chicks, feed, and vaccination/medicines are incurred per batch (6 batches/year).
        # Amortize batch variable costs to a monthly average: batch_cost * batches / 12
        v_costs = template.get("variable_costs_monthly_per_100_birds", {})
        batch_factor = batches / 12.0
        batch_feed_per_100 = v_costs.get("feed_and_supplements", 14000)
        batch_vacc_per_100 = v_costs.get("vaccination_and_medicines", 1200)
        batch_chick_per_100 = v_costs.get("chicks_purchase", 3500)

        monthly_feed_per_100 = int(batch_feed_per_100 * batch_factor)
        monthly_vacc_per_100 = int(batch_vacc_per_100 * batch_factor)
        monthly_chick_per_100 = int(batch_chick_per_100 * batch_factor)

        monthly_var_per_100 = monthly_feed_per_100 + monthly_vacc_per_100 + monthly_chick_per_100
        monthly_expenses = int((bird_count / 100 * monthly_var_per_100) + fixed_overhead)
        scale_desc = f"{bird_count:,} Birds Capacity Unit"

    elif template_id == "retail":
        scale_factor = max(0.6, project_cost / 350000)
        capex = {
            "Shop Renovation, Racks & Counters": int(fixed_costs.get("shop_renovation_and_racks", 70000) * min(2.0, scale_factor)),
            "POS Billing, Barcode & Refrigeration": fixed_costs.get("pos_billing_and_refrigeration", 35000),
            "Initial Merchandise Inventory": int(fixed_costs.get("initial_merchandise_inventory", 180000) * scale_factor),
            "Advance Security Deposit": fixed_costs.get("advance_rental_deposit", 25000),
            "Working Capital Cash Buffer": max(25000, project_cost - int(310000 * scale_factor)),
        }
        diff = project_cost - sum(capex.values())
        capex["Working Capital Cash Buffer"] = max(20000, capex["Working Capital Cash Buffer"] + diff)

        assump = template.get("production_assumptions", {})
        base_daily = assump.get("base_daily_sales", 3200) * scale_factor
        days = assump.get("operating_days_per_month", 28)
        monthly_revenue = int(base_daily * days)

        cogs_pct = template.get("variable_costs_pct_of_sales", {}).get("cost_of_goods_sold_pct", 78.0) / 100.0
        spoilage_pct = template.get("variable_costs_pct_of_sales", {}).get("spoilage_and_leakage_pct", 2.0) / 100.0
        monthly_expenses = int((monthly_revenue * (cogs_pct + spoilage_pct)) + fixed_overhead)
        scale_desc = f"Retail Store (₹{monthly_revenue:,}/mo projected turnover)"

    elif template_id == "textile":
        cost_per_station = template.get("cost_per_workstation", 32000)
        station_count = max(2, min(15, round((project_cost * 0.40 / cost_per_station))))

        capex = {
            "Industrial Sewing Machines": station_count * cost_per_station,
            "Specialized Overlock Units": fixed_costs.get("overlock_and_interlock_units", 45000),
            "Cutting Tables & Ironing Press": fixed_costs.get("cutting_tables_and_steam_iron", 30000),
            "Fabric & Trims Inventory": int(fixed_costs.get("fabric_and_accessories_inventory", 50000) * (station_count / 4)),
            "Premises Setup & Working Capital": max(30000, project_cost - (station_count * cost_per_station) - 125000),
        }
        diff = project_cost - sum(capex.values())
        capex["Premises Setup & Working Capital"] = max(20000, capex["Premises Setup & Working Capital"] + diff)

        assump = template.get("production_assumptions", {})
        garments_day = assump.get("garments_stitched_per_day_per_station", 6)
        days = assump.get("working_days_per_month", 26)
        rate_garment = assump.get("average_stitching_charges_per_garment", 140)

        monthly_revenue = int(station_count * garments_day * days * rate_garment)

        v_costs = template.get("variable_costs_monthly_per_station", {})
        v_per_station = sum(v_costs.values()) if v_costs else 16200
        monthly_expenses = int((station_count * v_per_station) + fixed_overhead)
        scale_desc = f"{station_count} Industrial Stitching Workstations"

    elif template_id == "food":
        scale_factor = max(0.7, project_cost / 425000)
        capex = {
            "Heavy Flour Mill & Commercial Motor": int(fixed_costs.get("heavy_flour_mill_and_motor", 180000) * min(1.8, scale_factor)),
            "Spice Pulverizer & Destoner": fixed_costs.get("spice_pulverizer_and_destoner", 85000),
            "3-Phase Power Installation": fixed_costs.get("3phase_commercial_power_setup", 55000),
            "Raw Grain & Spice Stock": int(fixed_costs.get("grain_and_spice_raw_stock", 70000) * scale_factor),
            "Packaging & Working Capital": max(25000, project_cost - int(390000 * scale_factor)),
        }
        diff = project_cost - sum(capex.values())
        capex["Packaging & Working Capital"] = max(20000, capex["Packaging & Working Capital"] + diff)

        assump = template.get("production_assumptions", {})
        daily_milling = assump.get("base_daily_kg", 450) * scale_factor
        rate_milling = assump.get("milling_rate_per_kg", 4.5)
        packaged_sales = assump.get("packaged_flour_sales_monthly", 42000) * scale_factor
        days = assump.get("operating_days_per_month", 26)

        monthly_revenue = int((daily_milling * rate_milling * days) + packaged_sales)
        v_pct = 0.58  # raw materials and commercial energy
        monthly_expenses = int((monthly_revenue * v_pct) + fixed_overhead)
        scale_desc = f"Commercial Milling & Processing Unit ({int(daily_milling)} kg/day)"

    elif template_id == "transport":
        capex = {
            "Vehicle Down-Payment & Chassis": fixed_costs.get("vehicle_initial_downpayment_and_chassis", 220000),
            "Cargo Body Fabrication": fixed_costs.get("cargo_body_fabrication", 75000),
            "Commercial Permit & Fitness": fixed_costs.get("commercial_permit_and_fitness", 35000),
            "Annual Comprehensive Insurance": fixed_costs.get("comprehensive_annual_insurance", 40000),
            "Emergency Maintenance Reserve": max(20000, project_cost - 370000),
        }
        diff = project_cost - sum(capex.values())
        capex["Emergency Maintenance Reserve"] = max(20000, capex["Emergency Maintenance Reserve"] + diff)

        assump = template.get("production_assumptions", {})
        trips = assump.get("average_trips_per_month", 48)
        rate_trip = assump.get("average_freight_rate_per_trip", 1450)
        monthly_revenue = int(trips * rate_trip)

        v_costs = template.get("variable_costs_monthly_per_vehicle", {})
        monthly_expenses = int(sum(v_costs.values()) + fixed_overhead)
        scale_desc = "Commercial Cargo Mini-Truck (48 trips/month)"

    elif template_id == "fisheries":
        scale_factor = max(0.6, project_cost / 310000)
        capex = {
            "Pond Excavation & Dyke Works": int(fixed_costs.get("pond_excavation_and_dyke_bunding", 150000) * scale_factor),
            "Water Aerators & Pumps": fixed_costs.get("water_aerators_and_pumps", 65000),
            "Fingerlings Seed Stock": int(fixed_costs.get("seed_fingerlings_and_acclimatization", 45000) * scale_factor),
            "Storage & Security Fencing": fixed_costs.get("feed_storage_and_fencing", 30000),
            "Working Capital & Probiotics": max(20000, project_cost - int(290000 * scale_factor)),
        }
        diff = project_cost - sum(capex.values())
        capex["Working Capital & Probiotics"] = max(15000, capex["Working Capital & Probiotics"] + diff)

        assump = template.get("production_assumptions", {})
        harvest_kg = assump.get("harvest_yield_kg_per_year", 4000) * scale_factor
        price_kg = assump.get("average_farmgate_price_per_kg", 150)
        monthly_revenue = int((harvest_kg * price_kg) / 12)

        v_costs = template.get("variable_costs_monthly_per_acre", {})
        monthly_expenses = int((sum(v_costs.values()) * scale_factor) + fixed_overhead)
        scale_desc = f"Freshwater Aquaculture ({int(harvest_kg):,} kg annual yield)"

    elif template_id == "agriculture":
        scale_factor = max(0.6, project_cost / 355000)
        capex = {
            "Shade Net & Nursery Display Infrastructure": int(fixed_costs.get("shade_net_and_display_infrastructure", 85000) * min(2.0, scale_factor)),
            "Fertilizer & Certified Seed Inventory": int(fixed_costs.get("fertilizer_and_certified_seed_stock", 160000) * scale_factor),
            "Organic Biofertilizers & Hand Tools": fixed_costs.get("organic_biofertilizers_and_tools", 45000),
            "Dealer Licensing & Premises Deposit": fixed_costs.get("dealer_license_and_premises_deposit", 30000),
            "Working Capital Cash Reserve": max(25000, project_cost - int(320000 * scale_factor)),
        }
        diff = project_cost - sum(capex.values())
        capex["Working Capital Cash Reserve"] = max(20000, capex["Working Capital Cash Reserve"] + diff)

        assump = template.get("production_assumptions", {})
        base_daily = assump.get("base_daily_sales", 2900) * scale_factor
        days = assump.get("operating_days_per_month", 28)
        monthly_revenue = int(base_daily * days)

        cogs_pct = template.get("variable_costs_pct_of_sales", {}).get("cost_of_goods_sold_pct", 74.0) / 100.0
        logistics_pct = template.get("variable_costs_pct_of_sales", {}).get("logistics_and_handling_pct", 4.0) / 100.0
        monthly_expenses = int((monthly_revenue * (cogs_pct + logistics_pct)) + fixed_overhead)
        scale_desc = f"Agri-Input Store & Modern Nursery (₹{monthly_revenue:,}/mo turnover)"

    else:
        # Generic template
        scale_factor = max(0.5, project_cost / 325000)
        capex = {
            "Tools, Machinery & Work Setup": int(150000 * scale_factor),
            "Raw Materials & Initial Inventory": int(100000 * scale_factor),
            "Utility Connection & Licensing": 40000,
            "Working Capital Reserve": max(20000, project_cost - int(290000 * scale_factor)),
        }
        diff = project_cost - sum(capex.values())
        capex["Working Capital Reserve"] = max(15000, capex["Working Capital Reserve"] + diff)

        monthly_revenue = int(65000 * scale_factor)
        monthly_expenses = int((monthly_revenue * 0.65) + fixed_overhead)
        scale_desc = f"{template.get('name', 'Rural Business')} Unit"

    fixed_monthly = int(fixed_overhead)
    variable_monthly = max(0, int(monthly_expenses - fixed_overhead))

    return {
        "template_id": template_id,
        "business_name": template.get("name", "Rural Business"),
        "scale_description": scale_desc,
        "project_cost": project_cost,
        "default_interest_rate": template.get("default_interest_rate", 7.5),
        "default_tenure_months": template.get("default_tenure_months", 60),
        "default_moratorium_months": template.get("default_moratorium_months", 6),
        "default_margin_pct": default_margin_pct,
        "capex_breakdown": capex,
        "fixed_monthly_expenses": fixed_monthly,
        "variable_monthly_expenses": variable_monthly,
        "expected_monthly_revenue": monthly_revenue,
        "monthly_expenses": monthly_expenses,
        "applicable_schemes": template.get("applicable_schemes", ["PMMY"]),
    }
