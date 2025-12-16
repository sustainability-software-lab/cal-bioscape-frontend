# Documentation

This directory contains technical documentation, specifications, and reference guides for the BioCIRV Frontend project.

## Three-Tier Data Architecture

The feedstock data implementation follows a three-tier architecture for optimal performance:

| Tier | Location | Content | Purpose |
|------|----------|---------|---------|
| **Tier 1** | MapBox Vector Tiles | `feedstock_id`, `residue_type`, `total_yield`, geometry | Fast map rendering |
| **Tier 2** | Static JSON (`feedstock_definitions.json`) | Compositional constants by `residue_type` | O(1) client-side joins |
| **Tier 3** | Backend API (FastAPI) | `cost_per_ton`, `availability_status` | Real-time data |

**Key Design Decisions:**
- Keep vector tiles "thin" (<500kb) for fast rendering
- Chemical composition is constant per `residue_type` → stored in static JSON, not tiles
- Transactional data requires real-time API access, not tile regeneration

See [TILESET_SPECIFICATIONS.md](./TILESET_SPECIFICATIONS.md) for complete details.

## Contents

### Naming Conventions
- **[NAMING_CONVENTION_FINAL.md](./NAMING_CONVENTION_FINAL.md)** - Final naming convention established for the project

### Tileset Documentation
- **[TILESET_SPECIFICATIONS.md](./TILESET_SPECIFICATIONS.md)** - Comprehensive tileset specifications and technical details (includes Three-Tier Architecture)
- **[README_TILESET_SPECS.md](./README_TILESET_SPECS.md)** - Tileset specifications overview
- **[TILESET_QUICK_REFERENCE.md](./TILESET_QUICK_REFERENCE.md)** - Quick reference guide for tilesets
- **[TILESET_UPDATE_GUIDE.md](./TILESET_UPDATE_GUIDE.md)** - Guide for updating tilesets
- **[TILESET_IMPLEMENTATION_SUMMARY.md](./TILESET_IMPLEMENTATION_SUMMARY.md)** - Summary of the tileset implementation

### Data and Factors
- **[CROP_RESIDUE_FACTORS.md](./CROP_RESIDUE_FACTORS.md)** - Crop residue factors and `feedstock_definitions.json` template

### Deployment and Infrastructure
- **[DEPLOYMENT_ARCHITECTURE.md](./DEPLOYMENT_ARCHITECTURE.md)** - Project deployment architecture documentation
- **[CLOUDBUILD.md](./CLOUDBUILD.md)** - Cloud Build configuration and setup documentation
- **[.cloudbuild-summary.md](./.cloudbuild-summary.md)** - Cloud Build quick reference summary

### Feedstock Filters
- **[FEEDSTOCK_FILTERS_IMPLEMENTATION.md](./FEEDSTOCK_FILTERS_IMPLEMENTATION.md)** - Detailed feedstock filters implementation
- **[FEEDSTOCK_FILTERS_QUICK_START.md](./FEEDSTOCK_FILTERS_QUICK_START.md)** - Quick start guide for feedstock filters

## Organization

This directory is intended for:
- Technical specifications
- Implementation guides
- Reference documentation
- Architecture documentation
- Data definitions and factors

For completed task summaries, see the `/task-summaries-archive` directory.
