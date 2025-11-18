# Crop Residue Factor Reference Tables

This document provides complete crop residue factor data for calculating residue yields from agricultural cropland. Backend engineers should use these tables when generating the LandIQ feedstock tileset to add residue-related attributes to each feature.

## Table of Contents

1. [How to Use This Document](#how-to-use-this-document)
2. [Orchard and Vineyard Residues](#orchard-and-vineyard-residues)
3. [Row Crop Residues](#row-crop-residues)
4. [Field Crop Residues](#field-crop-residues)
5. [Crop Name Mapping](#crop-name-mapping)
6. [Calculation Examples](#calculation-examples)

---

## How to Use This Document

### Calculation Process

For each cropland feature in the LandIQ tileset:

1. **Identify the crop**: Use the `main_crop_name` field
2. **Standardize the name**: Look up the standardized name in the [Crop Name Mapping](#crop-name-mapping) table
3. **Find the residue factors**: Look up the standardized name in the appropriate residue table
4. **Calculate residue amounts**:
   - `residue_wet_tons = acres × wetTonsPerAcre`
   - `residue_dry_tons = acres × dryTonsPerAcre`
5. **Add basic attributes to feature** (Tier 1A):
   - `residue_wet_tons` (Float)
   - `residue_dry_tons` (Float)
   - `residue_type` (String)
   - `moisture_content` (Float, 0-1)
6. **Add chemical composition attributes** (Tier 1B & 2):
   - **Proximate Analysis** (Tier 1B - HIGHEST PRIORITY):
     - `ash_content` (Float, %)
     - `volatile_solids` (Float, %)
     - `fixed_carbon` (Float, %)
   - **Ultimate Analysis** (Tier 2 - HIGH PRIORITY):
     - `carbon_pct` (Float, %)
     - `hydrogen_pct` (Float, %)
     - `nitrogen_pct` (Float, %)
     - `oxygen_pct` (Float, %)
     - `sulfur_pct` (Float, %)
   - **Compositional Analysis** (Tier 2 - HIGH PRIORITY):
     - `glucose_pct` (Float, %)
     - `xylose_pct` (Float, %)
     - `lignin_pct` (Float, %)
     - `energy_content_mj_kg` (Float, MJ/kg)
   - **Optional Elemental Analysis** (Tier 3 - if data available):
     - `phosphorus_pct` (Float, %)
     - `potassium_pct` (Float, %)
     - `silica_pct` (Float, %)

### Data Types

- **wetTonsPerAcre**: Wet tons of residue produced per acre per year (Float)
- **moistureContent**: Moisture content as decimal 0-1, where 0.4 = 40% moisture (Float)
- **dryTonsPerAcre**: Dry tons of residue produced per acre per year (Float)
- **seasonalAvailability**: Object with month abbreviations (Jan-Dec) as keys and boolean values indicating availability

---

## Orchard and Vineyard Residues

**Residue Type**: "Prunings"

These residues come from annual pruning of permanent tree and vine crops.

| Crop Name | Wet Tons/Acre | Moisture Content | Dry Tons/Acre | Peak Availability Months |
|-----------|---------------|------------------|---------------|-------------------------|
| Apples | 1.9 | 0.40 | 1.2 | Jan, Feb, Nov, Dec |
| Apricots | 2.5 | 0.40 | 1.5 | Jan, Feb, Jul, Aug, Dec |
| Avocados | 1.5 | 0.40 | 0.9 | Mar, Apr, May |
| Cherries | 2.1 | 0.40 | 1.2 | Jan, Feb, Jul, Aug, Dec |
| Dates | 0.6 | 0.43 | 0.3 | Jan, Feb, Jun, Jul |
| Figs | 2.2 | 0.43 | 1.3 | Jan, Feb, Nov, Dec |
| Grapes | 2.0 | 0.45 | 1.1 | Jan, Feb, Mar, Dec |
| Kiwifruit | 2.0 | 0.45 | 1.1 | Jan, Feb, Nov, Dec |
| Nectarines | 1.6 | 0.43 | 0.9 | Jan, Feb, Nov, Dec |
| Olives | 1.1 | 0.43 | 0.7 | Jan, Feb, Nov, Dec |
| Peaches | 2.3 | 0.43 | 1.3 | Jan, Feb, Nov, Dec |
| Pears | 2.3 | 0.40 | 1.4 | Jan, Feb, Nov, Dec |
| Persimmons | 1.6 | 0.43 | 0.9 | Jan, Feb, Nov, Dec |
| Plums & Prunes | 1.5 | 0.43 | 0.9 | Jan, Feb, Nov, Dec |
| Pomegranates | 1.6 | 0.43 | 0.9 | Jan, Feb, Nov, Dec |
| All Citrus | 2.5 | 0.40 | 1.5 | Feb, Mar, Jun |
| Almonds | 2.5 | 0.40 | 1.5 | Jan, Feb, Oct, Nov, Dec |
| Pecans | 1.6 | 0.40 | 1.0 | Jan, Feb, Dec |
| Pistachios | 1.0 | 0.43 | 0.6 | Jan, Feb, Dec |
| Walnuts | 1.0 | 0.43 | 0.6 | Jan, Feb, Dec |
| Fruits & Nuts unsp. | 1.6 | 0.50 | 0.8 | Jan, Feb, Nov, Dec |

### Detailed Seasonal Availability - Orchard and Vineyard

#### Apples
- **Available**: Jan, Feb, Nov, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct

#### Apricots
- **Available**: Jan, Feb, Jul, Aug, Dec
- **Not Available**: Mar, Apr, May, Jun, Sep, Oct, Nov

#### Avocados
- **Available**: Mar, Apr, May
- **Not Available**: Jan, Feb, Jun, Jul, Aug, Sep, Oct, Nov, Dec

#### Cherries
- **Available**: Jan, Feb, Jul, Aug, Dec
- **Not Available**: Mar, Apr, May, Jun, Sep, Oct, Nov

#### Dates
- **Available**: Jan, Feb, Jun, Jul
- **Not Available**: Mar, Apr, May, Aug, Sep, Oct, Nov, Dec

#### Figs
- **Available**: Jan, Feb, Nov, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct

#### Grapes
- **Available**: Jan, Feb, Mar, Dec
- **Not Available**: Apr, May, Jun, Jul, Aug, Sep, Oct, Nov

#### Kiwifruit
- **Available**: Jan, Feb, Nov, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct

#### Nectarines
- **Available**: Jan, Feb, Nov, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct

#### Olives
- **Available**: Jan, Feb, Nov, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct

#### Peaches
- **Available**: Jan, Feb, Nov, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct

#### Pears
- **Available**: Jan, Feb, Nov, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct

#### Persimmons
- **Available**: Jan, Feb, Nov, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct

#### Plums & Prunes
- **Available**: Jan, Feb, Nov, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct

#### Pomegranates
- **Available**: Jan, Feb, Nov, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct

#### All Citrus
- **Available**: Feb, Mar, Jun
- **Not Available**: Jan, Apr, May, Jul, Aug, Sep, Oct, Nov, Dec

#### Almonds
- **Available**: Jan, Feb, Oct, Nov, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep

#### Pecans
- **Available**: Jan, Feb, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov

#### Pistachios
- **Available**: Jan, Feb, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov

#### Walnuts
- **Available**: Jan, Feb, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov

#### Fruits & Nuts unsp.
- **Available**: Jan, Feb, Nov, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct

---

## Row Crop Residues

These residues come from annual vegetable, berry, and root crops.

| Crop Name | Residue Type | Wet Tons/Acre | Moisture Content | Dry Tons/Acre | Peak Availability Months |
|-----------|--------------|---------------|------------------|---------------|-------------------------|
| Artichokes | Top Silage | 1.7 | 0.73 | 0.5 | Mar, Apr, May, Sep, Oct |
| Asparagus | - | 2.2 | 0.80 | 0.4 | Jan-Jun |
| Green Lima Beans | Vines and Leaves | 1.0 | 0.80 | 0.2 | Jul, Aug, Sep |
| Berries | Prunings and Leaves | 1.3 | 0.40 | 0.8 | Jan, Feb, Jul, Aug, Nov, Dec |
| Snap Beans | Vines and Leaves | 1.0 | 0.80 | 0.2 | May-Oct |
| Broccoli | - | 1.0 | 0.80 | 0.2 | Jan-Apr, Sep-Dec |
| Cabbage | - | 1.0 | 0.80 | 0.2 | Jan-Jun, Sep-Dec |
| Cantaloupe Melons | Vines and Leaves | 1.2 | 0.80 | 0.2 | Jun-Sep |
| Carrots | Top Silage | 1.0 | 0.84 | 0.2 | Year-round |
| Cauliflower | - | 1.0 | 0.80 | 0.2 | Jan-Apr, Sep-Dec |
| Celery | - | 1.0 | 0.80 | 0.2 | Jan, Feb, Oct, Nov, Dec |
| Cucumbers | Vines and Leaves | 1.7 | 0.80 | 0.3 | May-Oct |
| Garlic | - | 1.0 | 0.73 | 0.3 | Jun, Jul, Aug |
| Combined Melons | Vines and Leaves | 1.2 | 0.80 | 0.2 | Jun-Sep |
| Lettuce and Romaine | - | 1.0 | 0.80 | 0.2 | Year-round |
| Dry Onions | - | 1.0 | 0.73 | 0.3 | May-Oct |
| Green Onions | - | 1.0 | 0.73 | 0.3 | Year-round |
| Hot Peppers | Stems & Leaf Meal | 1.0 | 0.80 | 0.2 | Jul-Oct |
| Sweet Peppers | Stems & Leaf Meal | 1.0 | 0.80 | 0.2 | Jul-Oct |
| Spices & herbs | - | 1.1 | 0.80 | 0.2 | Year-round |
| Spinach | - | 1.0 | 0.80 | 0.2 | Jan-Apr, Sep-Dec |
| Squash | Vines and Leaves | 1.2 | 0.80 | 0.2 | May-Sep |
| Sweet Corn | Stover | 4.7 | 0.20 | 3.8 | Jun-Oct |
| Tomatoes | Vines and Leaves | 1.3 | 0.80 | 0.3 | Jun-Oct |
| Unsp. vegetables | - | 1.4 | 0.80 | 0.3 | Year-round |
| Potatoes | Vines and Leaves | 1.2 | 0.80 | 0.2 | Apr-Aug |
| Sweet Potatos | Vines and Leaves | 1.2 | 0.80 | 0.2 | Jul-Oct |
| Sugar Beets | Top Silage | 2.4 | 0.75 | 0.6 | Apr-Sep |

### Detailed Seasonal Availability - Row Crops

#### Artichokes
- **Available**: Mar, Apr, May, Sep, Oct
- **Not Available**: Jan, Feb, Jun, Jul, Aug, Nov, Dec

#### Asparagus
- **Available**: Jan, Feb, Mar, Apr, May, Jun
- **Not Available**: Jul, Aug, Sep, Oct, Nov, Dec

#### Green Lima Beans
- **Available**: Jul, Aug, Sep
- **Not Available**: Jan-Jun, Oct-Dec

#### Berries
- **Available**: Jan, Feb, Jul, Aug, Nov, Dec
- **Not Available**: Mar, Apr, May, Jun, Sep, Oct

#### Snap Beans
- **Available**: May, Jun, Jul, Aug, Sep, Oct
- **Not Available**: Jan, Feb, Mar, Apr, Nov, Dec

#### Broccoli
- **Available**: Jan, Feb, Mar, Apr, Sep, Oct, Nov, Dec
- **Not Available**: May, Jun, Jul, Aug

#### Cabbage
- **Available**: Jan, Feb, Mar, Apr, May, Jun, Sep, Oct, Nov, Dec
- **Not Available**: Jul, Aug

#### Cantaloupe Melons
- **Available**: Jun, Jul, Aug, Sep
- **Not Available**: Jan-May, Oct-Dec

#### Carrots
- **Available**: All months (Jan-Dec)

#### Cauliflower
- **Available**: Jan, Feb, Mar, Apr, Sep, Oct, Nov, Dec
- **Not Available**: May, Jun, Jul, Aug

#### Celery
- **Available**: Jan, Feb, Oct, Nov, Dec
- **Not Available**: Mar, Apr, May, Jun, Jul, Aug, Sep

#### Cucumbers
- **Available**: May, Jun, Jul, Aug, Sep, Oct
- **Not Available**: Jan, Feb, Mar, Apr, Nov, Dec

#### Garlic
- **Available**: Jun, Jul, Aug
- **Not Available**: Jan-May, Sep-Dec

#### Combined Melons
- **Available**: Jun, Jul, Aug, Sep
- **Not Available**: Jan-May, Oct-Dec

#### Lettuce and Romaine
- **Available**: All months (Jan-Dec)

#### Dry Onions
- **Available**: May, Jun, Jul, Aug, Sep, Oct
- **Not Available**: Jan, Feb, Mar, Apr, Nov, Dec

#### Green Onions
- **Available**: All months (Jan-Dec)

#### Hot Peppers
- **Available**: Jul, Aug, Sep, Oct
- **Not Available**: Jan-Jun, Nov, Dec

#### Sweet Peppers
- **Available**: Jul, Aug, Sep, Oct
- **Not Available**: Jan-Jun, Nov, Dec

#### Spices & herbs
- **Available**: All months (Jan-Dec)

#### Spinach
- **Available**: Jan, Feb, Mar, Apr, Sep, Oct, Nov, Dec
- **Not Available**: May, Jun, Jul, Aug

#### Squash
- **Available**: May, Jun, Jul, Aug, Sep
- **Not Available**: Jan-Apr, Oct-Dec

#### Sweet Corn
- **Available**: Jun, Jul, Aug, Sep, Oct
- **Not Available**: Jan-May, Nov, Dec

#### Tomatoes
- **Available**: Jun, Jul, Aug, Sep, Oct
- **Not Available**: Jan-May, Nov, Dec

#### Unsp. vegetables
- **Available**: All months (Jan-Dec)

#### Potatoes
- **Available**: Apr, May, Jun, Jul, Aug
- **Not Available**: Jan, Feb, Mar, Sep-Dec

#### Sweet Potatos
- **Available**: Jul, Aug, Sep, Oct
- **Not Available**: Jan-Jun, Nov, Dec

#### Sugar Beets
- **Available**: Apr, May, Jun, Jul, Aug, Sep
- **Not Available**: Jan, Feb, Mar, Oct, Nov, Dec

---

## Field Crop Residues

These residues come from grain, seed, and hay crops.

| Crop Name | Residue Type | Wet Tons/Acre | Moisture Content | Dry Tons/Acre | Peak Availability Months |
|-----------|--------------|---------------|------------------|---------------|-------------------------|
| Corn | Stover | 2.9 | 0.20 | 2.3 | Aug, Sep, Oct, Nov |
| Sorghum | Stover | 2.2 | 0.20 | 1.8 | Aug, Sep, Oct |
| Wheat | Straw & Stubble | 1.2 | 0.14 | 1.0 | May, Jun, Jul, Aug |
| Barley | Straw & Stubble | 0.9 | 0.15 | 0.7 | Jun, Jul, Aug |
| Oats | Straw & Stubble | 0.5 | 0.15 | 0.4 | Jun, Jul |
| Rice | Straw | 1.8 | 0.14 | 1.6 | Sep, Oct |
| Safflower | Straw & Stubble | 0.9 | 0.14 | 0.8 | Jul, Aug, Sep |
| Sunflower | Straw & Stubble | 0.9 | 0.14 | 0.8 | Aug, Sep, Oct |
| Cotton | Straw & Stubble | 1.5 | 0.14 | 1.3 | Sep, Oct, Nov |
| Beans | vines and leaves | 1.0 | 0.80 | 0.2 | Jul, Aug, Sep |
| Lima Beans | Vines and Leaves | 1.0 | 0.80 | 0.2 | Jul, Aug, Sep |
| Cowpeas & South. Peas | Vines and Leaves | 1.0 | 0.80 | 0.2 | Jul, Aug, Sep |
| Soybeans | Stover | 1.0 | 0.20 | 0.8 | Sep, Oct |
| Rye | Straw & Stubble | 0.5 | 0.14 | 0.4 | Jun, Jul |
| Triticale | Straw & Stubble | 1.2 | 0.14 | 1.0 | May, Jun, Jul |
| Alfalfa | Stems & Leaf Meal | 1.0 | 0.11 | 0.9 | Mar-Oct |
| Bermuda Grass Seed | Grass | 1.0 | 0.60 | 0.4 | May-Sep |
| Unsp. Field & Seed | Stubble | 1.0 | 0.14 | 0.86 | Year-round |

### Detailed Seasonal Availability - Field Crops

#### Corn
- **Available**: Aug, Sep, Oct, Nov
- **Not Available**: Jan-Jul, Dec

#### Sorghum
- **Available**: Aug, Sep, Oct
- **Not Available**: Jan-Jul, Nov, Dec

#### Wheat
- **Available**: May, Jun, Jul, Aug
- **Not Available**: Jan-Apr, Sep-Dec

#### Barley
- **Available**: Jun, Jul, Aug
- **Not Available**: Jan-May, Sep-Dec

#### Oats
- **Available**: Jun, Jul
- **Not Available**: Jan-May, Aug-Dec

#### Rice
- **Available**: Sep, Oct
- **Not Available**: Jan-Aug, Nov, Dec

#### Safflower
- **Available**: Jul, Aug, Sep
- **Not Available**: Jan-Jun, Oct-Dec

#### Sunflower
- **Available**: Aug, Sep, Oct
- **Not Available**: Jan-Jul, Nov, Dec

#### Cotton
- **Available**: Sep, Oct, Nov
- **Not Available**: Jan-Aug, Dec

#### Beans
- **Available**: Jul, Aug, Sep
- **Not Available**: Jan-Jun, Oct-Dec

#### Lima Beans
- **Available**: Jul, Aug, Sep
- **Not Available**: Jan-Jun, Oct-Dec

#### Cowpeas & South. Peas
- **Available**: Jul, Aug, Sep
- **Not Available**: Jan-Jun, Oct-Dec

#### Soybeans
- **Available**: Sep, Oct
- **Not Available**: Jan-Aug, Nov, Dec

#### Rye
- **Available**: Jun, Jul
- **Not Available**: Jan-May, Aug-Dec

#### Triticale
- **Available**: May, Jun, Jul
- **Not Available**: Jan-Apr, Aug-Dec

#### Alfalfa
- **Available**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct
- **Not Available**: Jan, Feb, Nov, Dec

#### Bermuda Grass Seed
- **Available**: May, Jun, Jul, Aug, Sep
- **Not Available**: Jan-Apr, Oct-Dec

#### Unsp. Field & Seed
- **Available**: All months (Jan-Dec)

---

## Crop Name Mapping

Use this table to map LandIQ crop names to standardized residue factor table names.

| LandIQ Crop Name | Standardized Name | Residue Category |
|------------------|-------------------|------------------|
| Alfalfa & Alfalfa Mixtures | Alfalfa | Field Crop |
| Almonds | Almonds | Orchard and Vineyard |
| Apples | Apples | Orchard and Vineyard |
| Apricots | Apricots | Orchard and Vineyard |
| Artichokes | Artichokes | Row Crop |
| Asparagus | Asparagus | Row Crop |
| Avocados | Avocados | Orchard and Vineyard |
| Barley | Barley | Field Crop |
| Beans (Dry) | Beans | Field Crop |
| Bush Berries | Berries | Row Crop |
| Broccoli | Broccoli | Row Crop |
| Cabbage | Cabbage | Row Crop |
| Carrots | Carrots | Row Crop |
| Cauliflower | Cauliflower | Row Crop |
| Celery | Celery | Row Crop |
| Cherries | Cherries | Orchard and Vineyard |
| Citrus and Subtropical | All Citrus | Orchard and Vineyard |
| Cole Crops | Cabbage | Row Crop |
| Corn, Sorghum and Sudan | Corn | Field Crop |
| Cotton | Cotton | Field Crop |
| Cucumbers | Cucumbers | Row Crop |
| Dates | Dates | Orchard and Vineyard |
| Figs | Figs | Orchard and Vineyard |
| Garlic | Garlic | Row Crop |
| Grapes | Grapes | Orchard and Vineyard |
| Green Lima Beans | Green Lima Beans | Row Crop |
| Kiwis | Kiwifruit | Orchard and Vineyard |
| Lettuce/Leafy Greens | Lettuce and Romaine | Row Crop |
| Lima Beans | Lima Beans | Field Crop |
| Melons, Squash and Cucumbers | Combined Melons | Row Crop |
| Miscellaneous Deciduous | Fruits & Nuts unsp. | Orchard and Vineyard |
| Miscellaneous Field Crops | Unsp. Field & Seed | Field Crop |
| Miscellaneous Grain and Hay | Unsp. Field & Seed | Field Crop |
| Miscellaneous Grasses | Bermuda Grass Seed | Field Crop |
| Miscellaneous Subtropical Fruits | All Citrus | Orchard and Vineyard |
| Miscellaneous Truck Crops | Unsp. vegetables | Row Crop |
| Nectarines | Nectarines | Orchard and Vineyard |
| Oats | Oats | Field Crop |
| Olives | Olives | Orchard and Vineyard |
| Onions and Garlic | Dry Onions | Row Crop |
| Peaches/Nectarines | Peaches | Orchard and Vineyard |
| Pears | Pears | Orchard and Vineyard |
| Pecans | Pecans | Orchard and Vineyard |
| Peppers | Hot Peppers | Row Crop |
| Persimmons | Persimmons | Orchard and Vineyard |
| Pistachios | Pistachios | Orchard and Vineyard |
| Plums | Plums & Prunes | Orchard and Vineyard |
| Pomegranates | Pomegranates | Orchard and Vineyard |
| Potatoes | Potatoes | Row Crop |
| Prunes | Plums & Prunes | Orchard and Vineyard |
| Rice | Rice | Field Crop |
| Safflower | Safflower | Field Crop |
| Sorghum | Sorghum | Field Crop |
| Spinach | Spinach | Row Crop |
| Squash | Squash | Row Crop |
| Sugar beets | Sugar Beets | Row Crop |
| Sunflowers | Sunflower | Field Crop |
| Sweet Corn | Sweet Corn | Row Crop |
| Sweet Peppers | Sweet Peppers | Row Crop |
| Sweet Potatoes | Sweet Potatos | Row Crop |
| Tomatoes | Tomatoes | Row Crop |
| Walnuts | Walnuts | Orchard and Vineyard |
| Wheat | Wheat | Field Crop |
| Wild Rice | Rice | Field Crop |

---

## Calculation Examples

### Example 1: Almond Orchard

**Source Data:**
- `main_crop_name`: "Almonds"
- `acres`: 150.5

**Lookup Process:**
1. Standardized name: "Almonds" (same)
2. Category: Orchard and Vineyard
3. Residue factors from table:
   - wetTonsPerAcre: 2.5
   - moistureContent: 0.40
   - dryTonsPerAcre: 1.5
   - residueType: "Prunings"

**Calculations:**
- `residue_wet_tons = 150.5 × 2.5 = 376.25`
- `residue_dry_tons = 150.5 × 1.5 = 225.75`

**Output Attributes:**
```json
{
  "main_crop_name": "Almonds",
  "acres": 150.5,
  "residue_wet_tons": 376.25,
  "residue_dry_tons": 225.75,
  "residue_type": "Prunings",
  "moisture_content": 0.40,
  "ash_content": 3.2,
  "volatile_solids": 78.5,
  "fixed_carbon": 18.3,
  "carbon_pct": 48.5,
  "hydrogen_pct": 6.1,
  "nitrogen_pct": 0.8,
  "oxygen_pct": 41.4,
  "sulfur_pct": 0.1,
  "glucose_pct": 42.0,
  "xylose_pct": 18.5,
  "lignin_pct": 22.0,
  "energy_content_mj_kg": 18.2,
  "phosphorus_pct": null,
  "potassium_pct": null,
  "silica_pct": null
}
```
**Note**: Chemical composition values shown are illustrative examples. Actual values should come from biomass databases for almond prunings.

### Example 2: Corn Field

**Source Data:**
- `main_crop_name`: "Corn, Sorghum and Sudan"
- `acres`: 420.0

**Lookup Process:**
1. Standardized name: "Corn" (from mapping table)
2. Category: Field Crop
3. Residue factors from table:
   - wetTonsPerAcre: 2.9
   - moistureContent: 0.20
   - dryTonsPerAcre: 2.3
   - residueType: "Stover"

**Calculations:**
- `residue_wet_tons = 420.0 × 2.9 = 1,218.0`
- `residue_dry_tons = 420.0 × 2.3 = 966.0`

**Output Attributes:**
```json
{
  "main_crop_name": "Corn, Sorghum and Sudan",
  "acres": 420.0,
  "residue_wet_tons": 1218.0,
  "residue_dry_tons": 966.0,
  "residue_type": "Stover",
  "moisture_content": 0.20,
  "ash_content": 6.5,
  "volatile_solids": 75.2,
  "fixed_carbon": 18.3,
  "carbon_pct": 46.8,
  "hydrogen_pct": 5.9,
  "nitrogen_pct": 0.7,
  "oxygen_pct": 39.9,
  "sulfur_pct": 0.2,
  "glucose_pct": 38.5,
  "xylose_pct": 21.2,
  "lignin_pct": 15.8,
  "energy_content_mj_kg": 17.5,
  "phosphorus_pct": null,
  "potassium_pct": null,
  "silica_pct": null
}
```
**Note**: Chemical composition values shown are illustrative examples based on typical corn stover literature values.

### Example 3: Tomato Field

**Source Data:**
- `main_crop_name`: "Tomatoes"
- `acres`: 85.3

**Lookup Process:**
1. Standardized name: "Tomatoes" (same)
2. Category: Row Crop
3. Residue factors from table:
   - wetTonsPerAcre: 1.3
   - moistureContent: 0.80
   - dryTonsPerAcre: 0.3
   - residueType: "Vines and Leaves"

**Calculations:**
- `residue_wet_tons = 85.3 × 1.3 = 110.89`
- `residue_dry_tons = 85.3 × 0.3 = 25.59`

**Output Attributes:**
```json
{
  "main_crop_name": "Tomatoes",
  "acres": 85.3,
  "residue_wet_tons": 110.89,
  "residue_dry_tons": 25.59,
  "residue_type": "Vines and Leaves",
  "moisture_content": 0.80,
  "ash_content": 12.5,
  "volatile_solids": 68.0,
  "fixed_carbon": 19.5,
  "carbon_pct": 42.5,
  "hydrogen_pct": 5.8,
  "nitrogen_pct": 2.1,
  "oxygen_pct": 37.1,
  "sulfur_pct": 0.4,
  "glucose_pct": 28.0,
  "xylose_pct": 15.5,
  "lignin_pct": 18.5,
  "energy_content_mj_kg": 16.2,
  "phosphorus_pct": null,
  "potassium_pct": null,
  "silica_pct": null
}
```
**Note**: Chemical composition values shown are illustrative examples based on vegetable residue literature values.

### Example 4: Crop Not in Tables

**Source Data:**
- `main_crop_name`: "Eucalyptus"
- `acres`: 200.0

**Lookup Process:**
1. Look up "Eucalyptus" in mapping table: **NOT FOUND**
2. No residue factors available for this crop

**Output Attributes:**
```json
{
  "main_crop_name": "Eucalyptus",
  "acres": 200.0,
  "residue_wet_tons": null,
  "residue_dry_tons": null,
  "residue_type": null,
  "moisture_content": null
}
```

**Note**: For crops without residue factors, set all residue-related fields to `null`. These crops typically don't generate harvestable agricultural residues (e.g., urban areas, pasture, ornamental crops).

---

## Chemical Composition Data

### Overview

Chemical composition values should be added to each crop feature based on the **residue type** (Prunings, Stover, Straw & Stubble, etc.) and **crop category** (Orchard/Row/Field). These values come from agricultural biomass literature and databases.

### Data Sources for Chemical Composition

Backend engineers should compile chemical composition data from:

1. **Phyllis2 Database** - ECN Biomass Database (https://phyllis.nl/)
   - Comprehensive database of biomass composition
   - Search by crop/residue type
   - Download proximate, ultimate, and compositional analysis data

2. **USDA Agricultural Research Service**
   - Agricultural waste characterization studies
   - Regional biomass composition data

3. **Peer-Reviewed Literature**
   - Agricultural engineering journals
   - Bioenergy and biomass journals
   - Crop-specific residue studies

4. **Industry Standards**
   - ASTM standards for biomass analysis
   - Representative values for common agricultural residues

### Recommended Approach

1. **Group by Residue Type**: Different residue types from the same crop have different compositions
   - Example: Corn grain ≠ Corn stover
   - Example: Almond nuts ≠ Almond prunings

2. **Use Representative Averages**: Compile multiple literature values and use mean/median
   - Document sources and ranges
   - Note regional variations if significant

3. **Prioritize Data Quality**: 
   - Tier 1 (Proximate Analysis): Most critical, most widely available
   - Tier 2 (Ultimate & Compositional): High value, good availability
   - Tier 3 (Elemental): Only add if high-quality data exists

### Example Composition Data Structure

For each standardized crop name and residue type, create entries like:

```json
{
  "standardized_name": "Corn",
  "residue_type": "Stover",
  "proximate_analysis": {
    "moisture_content": 0.20,
    "ash_content": 6.5,
    "volatile_solids": 75.2,
    "fixed_carbon": 18.3
  },
  "ultimate_analysis": {
    "carbon_pct": 46.8,
    "hydrogen_pct": 5.9,
    "nitrogen_pct": 0.7,
    "oxygen_pct": 39.9,
    "sulfur_pct": 0.2
  },
  "compositional_analysis": {
    "glucose_pct": 38.5,
    "xylose_pct": 21.2,
    "lignin_pct": 15.8
  },
  "energy_content_mj_kg": 17.5
}
```

### Typical Ranges by Residue Category

#### Field Crop Residues (Stover, Straw, Stubble)
- **Moisture**: 10-20% (as collected)
- **Ash**: 4-12%
- **Volatile Solids**: 70-80%
- **Fixed Carbon**: 15-20%
- **Energy Content**: 15-18 MJ/kg (dry basis)

#### Orchard/Vineyard Residues (Prunings)
- **Moisture**: 40-50% (as collected)
- **Ash**: 2-6%
- **Volatile Solids**: 75-85%
- **Fixed Carbon**: 12-18%
- **Energy Content**: 16-19 MJ/kg (dry basis)

#### Row Crop Residues (Vines, Leaves, Tops)
- **Moisture**: 70-85% (as collected)
- **Ash**: 8-20%
- **Volatile Solids**: 65-75%
- **Fixed Carbon**: 8-15%
- **Energy Content**: 14-17 MJ/kg (dry basis)

**Note**: These are typical ranges. Actual values should come from specific literature sources for each crop type.

---

## Implementation Notes

1. **Precision**: Round calculated values to 2 decimal places for tons, 1 decimal for percentages
2. **Null Handling**: Use `null` (not 0) for crops without residue factors or composition data
3. **Validation**: Verify that calculated values are positive and within reasonable ranges
4. **Performance**: Consider pre-computing a lookup table for all crop names to avoid repeated lookups
5. **Composition Data**: Store chemical composition separately from quantity factors - they apply to the residue type, not per-acre

### Quality Checks

- Proximate analysis components should sum to ~100% (moisture + ash + volatile solids + fixed carbon)
- Ultimate analysis components should sum to ~100% (C + H + N + O + S + ash)
- All percentages should be 0-100
- Energy content typically ranges 12-22 MJ/kg for agricultural residues
- Cross-reference multiple sources when values seem unusual

---

## Data Sources

**Residue Quantity Factors** are derived from:
- USDA Agricultural Residue Studies
- California-specific crop yield data
- Industry standard moisture content values
- Harvest timing and seasonal availability patterns

**Chemical Composition Data** should be compiled from:
- Phyllis2 ECN Biomass Database
- USDA Agricultural Research Service publications
- Peer-reviewed biomass characterization studies
- ASTM standard reference materials

---

## Maintenance

When updating this document:
1. Ensure consistency with `src/lib/tileset-registry.ts` in the repository
2. Update the version date below
3. Document changes in the change log

**Tileset Reference**: `sustainasoft.cal-bioscape-landiq-cropland-{YYYY-MM}`  
**Version**: 1.2  
**Last Updated**: 2024-10-16  
**Data Year**: 2023

### Change Log
- **v1.2 (2024-10-16)**: Updated to reference new standardized tileset naming convention (`sustainasoft.cal-bioscape-landiq-cropland-{YYYY-MM}`). Updated maintenance notes to reference `tileset-registry.ts` instead of `constants.ts`.
- **v1.1 (2024-10-16)**: Added chemical composition requirements (Proximate, Ultimate, Compositional, and Elemental analysis fields) per backend team feedback. Added guidance on sourcing composition data from biomass databases.
- **v1.0 (2024-10-16)**: Initial release with residue quantity factors and seasonal availability data.
