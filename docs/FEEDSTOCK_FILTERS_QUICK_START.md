# Feedstock Filters - Quick Start Guide

## What Was Added

Three new filter sections were added below the existing "Feedstock Seasonal Availability" slider in the Filters panel.

## Data Architecture Note

These filters work with the **Three-Tier Data Architecture**:
- **Vector Tiles** contain `residue_type` for fast filtering
- **feedstock_definitions.json** contains moisture/energy/processing data for each `residue_type`
- Filters determine which `residue_type` values match, then query the tiles

## Location

```
Left Sidebar → Filters Section (Accordion) → Below "Feedstock Seasonal Availability"
```

## New Filter Sections

### 1. Feedstock Type
**What it does:** Filters crops by residue type category

**Options (6 checkboxes):**
- ☑ Grain Crop Residues
- ☑ Vegetable Crop Residues
- ☑ Fruit Crop Residues
- ☑ Nut Crop Residues
- ☑ Fiber Crop Residues
- ☑ Forage/Hay Residues

**Default:** All selected (shows all crop types)

**Example Use:** Uncheck all except "Grain Crop Residues" to see only corn, wheat, rice, etc.

---

### 2. Moisture Content
**What it does:** Filters by water content level in the residue

**Options (3 checkboxes):**
- ☑ Low (<15%)
- ☑ Medium (15-30%)
- ☑ High (>30%)

**Default:** All selected (shows all moisture levels)

**Example Use:** 
- Select only "Low" for dry materials good for combustion
- Select only "High" for wet materials suitable for anaerobic digestion

---

### 3. Energy Content
**What it does:** Filters by heating value (calorific value)

**Options (3 checkboxes):**
- ☑ Low (<12 MJ/kg)
- ☑ Medium (12-17 MJ/kg)
- ☑ High (>17 MJ/kg)

**Default:** All selected (shows all energy levels)

**Example Use:** Select only "High" to find best feedstocks for energy generation

---

## How Filters Work Together

### AND Logic Between Filter Types
When you select options from DIFFERENT filter sections, crops must match ALL of them:

**Example:**
```
Feedstock Type: "Grain Crop Residues" 
+ 
Moisture Content: "Low (<15%)"
=
Result: Only low-moisture grain residues (corn stover, wheat straw, etc.)
```

### OR Logic Within Filter Types
When you select multiple options in the SAME filter section, crops can match ANY of them:

**Example:**
```
Energy Content: "High (>17 MJ/kg)" OR "Medium (12-17 MJ/kg)"
=
Result: All crops with either medium OR high energy content
```

---

## Quick Use Cases

### Use Case 1: Find Summer Grain Crops
1. Set "Feedstock Seasonal Availability" to June-August
2. Go to "Feedstock Type"
3. Uncheck all except "Grain Crop Residues"
4. Map shows grain crops available in summer

### Use Case 2: Find High-Energy, Dry Feedstocks
1. Go to "Moisture Content", uncheck all except "Low (<15%)"
2. Go to "Energy Content", uncheck all except "High (>17 MJ/kg)"
3. Map shows dry, high-energy feedstocks ideal for combustion

### Use Case 3: Compare Vegetable vs Fruit Residues
1. Go to "Feedstock Type"
2. Uncheck all
3. Check only "Vegetable Crop Residues"
4. Note which crops appear
5. Uncheck "Vegetable", check "Fruit Crop Residues"
6. Compare the results

### Use Case 4: Find Low-Moisture Nut Crops
1. Go to "Feedstock Type", uncheck all except "Nut Crop Residues"
2. Go to "Energy Content", select only "High (>17 MJ/kg)"
3. Map shows high-energy nut crop residues

---

## Tips

1. **Reset to Default:** Check all boxes in all filter sections to see everything

2. **Narrow Down Gradually:** Start with one filter, then add more to refine

3. **Hover for Info:** Each filter section has an ⓘ icon - hover to see detailed explanations

4. **Check the Count:** Console logs show how many crops match your filters (open browser DevTools)

5. **Combine with Crop Types:** The crop legend/filter still works - you can use both systems together

---

## Troubleshooting

### No crops showing on map?
- **Most common cause:** At least one filter section has NO checkboxes selected
- Check that each filter section (Feedstock Type, Moisture Content, Energy Content) has at least ONE checkbox checked
- If you uncheck all boxes in any section, NO crops will appear (this is by design)
- To see all crops: Check ALL boxes in ALL filter sections

### Filter not working?
- Check browser console (F12) for error messages
- Refresh the page and try again
- Make sure the "Crop Residues" layer is enabled
- Verify at least one checkbox is checked in each filter section

### Want to start over?
- Check all boxes in all filter sections
- Set seasonal slider back to January-December (full range)
- This shows all crops

### Important: Empty Filter Behavior
- **Unchecking ALL boxes in a section = Show NOTHING**
- This applies to all three new filter sections
- Example: If you uncheck all moisture levels, no crops will appear
- To show crops again, check at least one box in that section

---

## Visual Layout

```
┌─────────────────────────────────────┐
│ FILTERS                        ▼    │
├─────────────────────────────────────┤
│ Feedstock Seasonal Availability     │
│ [═══════●═══════] Jan to Dec        │
├─────────────────────────────────────┤
│ Feedstock Type                      │
│ ☑ Grain Crop Residues              │
│ ☑ Vegetable Crop Residues          │
│ ☑ Fruit Crop Residues              │
│ ☑ Nut Crop Residues                │
│ ☑ Fiber Crop Residues              │
│ ☑ Forage/Hay Residues              │
├─────────────────────────────────────┤
│ Moisture Content                    │
│ ☑ Low (<15%)                       │
│ ☑ Medium (15-30%)                  │
│ ☑ High (>30%)                      │
├─────────────────────────────────────┤
│ Energy Content                      │
│ ☑ Low (<12 MJ/kg)                  │
│ ☑ Medium (12-17 MJ/kg)             │
│ ☑ High (>17 MJ/kg)                 │
└─────────────────────────────────────┘
```

---

## Next Steps

1. Open the application: http://localhost:3000
2. Click on the "Filters" accordion in the left sidebar
3. Scroll down past "Feedstock Seasonal Availability"
4. You'll see the three new filter sections (Feedstock Type, Moisture Content, Energy Content)
5. Start experimenting with different combinations!

For detailed technical information, see `FEEDSTOCK_FILTERS_IMPLEMENTATION.md`
