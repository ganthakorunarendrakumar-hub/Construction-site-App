import { MaterialCategoryDef, MaterialItem, SteelBrand } from '../types';

export const INITIAL_STEEL_BRANDS: SteelBrand[] = [
  { id: 'sb-1', name: 'Tata Tiscon', code: 'TATA', is_active: true },
  { id: 'sb-2', name: 'Vizag Steel TMT', code: 'VIZAG', is_active: true },
  { id: 'sb-3', name: 'SAIL TMT', code: 'SAIL', is_active: true },
  { id: 'sb-4', name: 'JSW Neosteel', code: 'JSW', is_active: true },
  { id: 'sb-5', name: 'Agni TMT', code: 'AGNI', is_active: true },
  { id: 'sb-6', name: 'Kalliyath TMT', code: 'KALLIYATH', is_active: true },
  { id: 'sb-7', name: 'Kamdhenu TMT', code: 'KAMDHENU', is_active: true },
  { id: 'sb-8', name: 'Kairali TMT', code: 'KAIRALI', is_active: true },
  { id: 'sb-9', name: 'Prime Gold TMT', code: 'PRIMEGOLD', is_active: true },
  { id: 'sb-10', name: 'Other', code: 'OTHER', is_active: true },
];

export const INITIAL_STEEL_SIZES: string[] = [
  '6 mm',
  '8 mm',
  '10 mm',
  '12 mm',
  '16 mm',
  '20 mm',
  '25 mm',
  '28 mm',
  '32 mm'
];

export const INITIAL_SAND_TYPES: string[] = [
  'River Sand',
  'M Sand',
  'Pit Sand',
  'Concrete Sand',
  'Masonry Sand',
  'Fill Sand / Utility Sand',
  'Green Sand',
  'Dry Sand',
  'Resin Sand',
  'Other'
];

export const INITIAL_BRICKS_TYPES: string[] = [
  'Red Bricks',
  'Fly Ash Bricks',
  'Concrete Bricks',
  'Calcium Silicate / Sand-Lime Bricks',
  'Engineering Bricks',
  'Hollow Bricks',
  'Perforated Bricks',
  'AAC Blocks',
  'Porotherm Blocks',
  'Fire Bricks',
  'Other'
];

export const INITIAL_AGGREGATE_SIZES: string[] = [
  '10 mm',
  '20 mm',
  '40 mm',
  '63 mm',
  '80 mm',
  'Other'
];

export const INITIAL_CATEGORIES: MaterialCategoryDef[] = [
  // 5 Core Primary Materials
  {
    id: 'cement',
    name: 'Cement',
    description: 'OPC & PPC cement bags, brand tracking, received/used/damaged balances.',
    iconName: 'Package',
    is_core: true,
    is_reusable: false,
    default_unit: 'bags',
    allowed_units: ['bags']
  },
  {
    id: 'steel',
    name: 'Steel & TMT Rebars',
    description: 'Thermo-mechanically treated rebars across standard diameters (6mm - 32mm) in kg and tonnes.',
    iconName: 'Layers',
    is_core: true,
    is_reusable: false,
    default_unit: 'kg',
    allowed_units: ['kg', 'tonnes']
  },
  {
    id: 'sand',
    name: 'Sand & M-Sand',
    description: 'River sand, manufactured sand, concrete sand in cubic metres, cubic feet, tonnes, and brass.',
    iconName: 'Mountain',
    is_core: true,
    is_reusable: false,
    default_unit: 'cft',
    allowed_units: ['cft', 'm3', 'tonnes', 'brass']
  },
  {
    id: 'bricks',
    name: 'Bricks & Blocks',
    description: 'Clay bricks, fly ash bricks, AAC lightweight blocks, masonry units in numbers and pallets.',
    iconName: 'Boxes',
    is_core: true,
    is_reusable: false,
    default_unit: 'Nos',
    allowed_units: ['Nos', 'Pallets']
  },
  {
    id: 'aggregate',
    name: 'Coarse Aggregate',
    description: 'Graded blue metal aggregates (10mm to 80mm) in tonnes, cubic metres, and cubic feet.',
    iconName: 'Gem',
    is_core: true,
    is_reusable: false,
    default_unit: 'tonnes',
    allowed_units: ['tonnes', 'm3', 'cft']
  },

  // New Regular Site-Use Materials Category (Promoted with Hand Tools & Safety PPE)
  {
    id: 'regular_site_use',
    name: 'Regular Site-Use Materials',
    description: 'General site supplies, masonry hand tools, safety workwear, electrical accessories, and site equipment.',
    iconName: 'ClipboardList',
    is_core: false,
    is_reusable: true,
    default_unit: 'Nos',
    allowed_units: ['Nos', 'Sets', 'Rolls', 'Meters', 'Pairs', 'Pcs']
  },

  // Existing Standard Categories (Preserved & Enhanced)
  {
    id: 'safety_ppe',
    name: 'Safety Items & PPE',
    description: 'Helmets, safety shoes, vests, harnesses, goggles, fire extinguishers, caution tape.',
    iconName: 'ShieldAlert',
    is_core: false,
    is_reusable: true,
    default_unit: 'Nos',
    allowed_units: ['Nos', 'Pairs', 'Sets', 'Rolls']
  },
  {
    id: 'hand_tools',
    name: 'Hand Tools',
    description: 'Hammers, spanners, screwdrivers, pliers, chisels, saws, trowels, measuring tapes, shovels.',
    iconName: 'Wrench',
    is_core: false,
    is_reusable: true,
    default_unit: 'Nos',
    allowed_units: ['Nos', 'Sets']
  },
  {
    id: 'power_tools',
    name: 'Power Tools',
    description: 'Angle grinders, demolition hammers, rotary drills, circular saws, vibrators, bar cutters.',
    iconName: 'Zap',
    is_core: false,
    is_reusable: true,
    default_unit: 'Nos',
    allowed_units: ['Nos', 'Sets']
  },
  {
    id: 'electrical',
    name: 'Electrical Tools & Materials',
    description: 'Extension boards, generators, cables, conduits, MCBs, industrial sockets, floodlights.',
    iconName: 'Cpu',
    is_core: false,
    is_reusable: false,
    default_unit: 'Meters',
    allowed_units: ['Meters', 'Nos', 'Rolls', 'Coils', 'Sets']
  },
  {
    id: 'welding_cutting',
    name: 'Welding & Cutting Equipment',
    description: 'Arc/TIG/MIG welding machines, gas cutting sets, electrodes, MS angles, structural steel.',
    iconName: 'Flame',
    is_core: false,
    is_reusable: true,
    default_unit: 'Nos',
    allowed_units: ['Nos', 'Sets', 'Cylinders', 'Packets', 'kg', 'Meters']
  },
  {
    id: 'plumbing',
    name: 'Plumbing & Sanitary Materials',
    description: 'UPVC/CPVC/PVC/GI pipes, fittings, valves, bib cocks, water meters, washbasins, drainage.',
    iconName: 'Droplet',
    is_core: false,
    is_reusable: false,
    default_unit: 'Nos',
    allowed_units: ['Nos', 'Meters', 'Lengths', 'Sets']
  },
  {
    id: 'painting_finishing',
    name: 'Painting & Finishing Materials',
    description: 'Primers, emulsion paints, enamel, distemper, wall putty, spray guns, sealants, brushes.',
    iconName: 'Paintbrush',
    is_core: false,
    is_reusable: false,
    default_unit: 'Liters',
    allowed_units: ['Liters', 'kg', 'Buckets', 'Rolls', 'Nos', 'Tubes']
  },
  {
    id: 'hardware_fasteners',
    name: 'Hardware & Fasteners',
    description: 'Anchor bolts, expansion bolts, nails, screws, threaded rods, nuts, washers, hinges, locks.',
    iconName: 'Crosshair',
    is_core: false,
    is_reusable: false,
    default_unit: 'kg',
    allowed_units: ['kg', 'Nos', 'Boxes', 'Packets']
  },
  {
    id: 'shuttering_scaffolding',
    name: 'Shuttering & Scaffolding Materials',
    description: 'Plywood sheets, props, scaffolding pipes, couplers, H-frames, walk boards, MS plates, tie rods.',
    iconName: 'Grid',
    is_core: false,
    is_reusable: true,
    default_unit: 'Nos',
    allowed_units: ['Nos', 'Sheets', 'Sets', 'Meters', 'Pairs']
  },

  // NEW Categories (Sections 3.C through 3.J)
  {
    id: 'adhesives_sealants',
    name: 'Adhesives, Tapes & Sealing Materials',
    description: 'Masking tape, duct tape, PVC/PTFE tape, epoxy adhesive, tile adhesive, PU/silicone sealants.',
    iconName: 'PackageCheck',
    is_core: false,
    is_reusable: false,
    default_unit: 'Rolls',
    allowed_units: ['Rolls', 'Nos', 'Tubes', 'kg', 'Bags', 'Buckets']
  },
  {
    id: 'flooring_tiles',
    name: 'Flooring, Tiles & Stonework',
    description: 'Ceramic/vitrified tiles, granite, marble, tile spacers, cutters, skirting, polishing pads.',
    iconName: 'Boxes',
    is_core: false,
    is_reusable: false,
    default_unit: 'Sq.Ft',
    allowed_units: ['Sq.Ft', 'Sq.Meters', 'Boxes', 'Nos', 'Bags', 'Sets']
  },
  {
    id: 'doors_windows_carpentry',
    name: 'Doors, Windows & Carpentry Materials',
    description: 'Wooden/flush doors, UPVC windows, mortise locks, plywood, laminates, glass panels, aluminium.',
    iconName: 'DoorOpen',
    is_core: false,
    is_reusable: false,
    default_unit: 'Nos',
    allowed_units: ['Nos', 'Sets', 'Sheets', 'Sq.Ft', 'Meters']
  },
  {
    id: 'waterproofing_roofing',
    name: 'Waterproofing & Roofing Materials',
    description: 'Bitumen coatings, APP/SBS membranes, polyurethane compounds, GI roof sheets, rain gutters.',
    iconName: 'Umbrella',
    is_core: false,
    is_reusable: false,
    default_unit: 'Liters',
    allowed_units: ['Liters', 'Rolls', 'kg', 'Bags', 'Sheets', 'Nos', 'Meters']
  },
  {
    id: 'site_cleaning_consumables',
    name: 'Site Cleaning & General Consumables',
    description: 'Shovels, wheelbarrows, brooms, garbage bins, cleaning liquids, water hoses, tarpaulins, bags.',
    iconName: 'Sparkles',
    is_core: false,
    is_reusable: true,
    default_unit: 'Nos',
    allowed_units: ['Nos', 'Sets', 'Rolls', 'Bags', 'Liters', 'Pairs']
  },
  {
    id: 'surveying_engineering',
    name: 'Surveying & Civil Engineering Equipment',
    description: 'Auto level, total station, theodolite, laser levels, GPS, rebar locator, rebound hammer, slump cones.',
    iconName: 'Compass',
    is_core: false,
    is_reusable: true,
    default_unit: 'Nos',
    allowed_units: ['Nos', 'Sets']
  },
  {
    id: 'lifting_logistics',
    name: 'Lifting, Material Handling & Site Logistics',
    description: 'Chain pulley blocks, wire-rope slings, pallet trucks, material trolleys, hoists, ladders, racks.',
    iconName: 'Truck',
    is_core: false,
    is_reusable: true,
    default_unit: 'Nos',
    allowed_units: ['Nos', 'Sets', 'Pairs', 'Meters']
  }
];

export const INITIAL_ITEMS_BY_CATEGORY: Record<string, string[]> = {
  safety_ppe: [
    'Safety helmets',
    'Safety shoes and steel-toe shoes',
    'Gumboots',
    'Reflective jackets and safety vests',
    'Raincoats and waterproof jackets',
    'Safety gloves',
    'Safety goggles and protective glasses',
    'Face shields and welding shields',
    'Dust masks and respirators',
    'Earplugs and earmuffs',
    'Safety belts and full-body harnesses',
    'Safety nets and fall-arrest equipment',
    'First-aid boxes',
    'Fire extinguishers',
    'Traffic cones, caution tape, and barricade tape'
  ],
  hand_tools: [
    'Claw hammers and ball-peen hammers',
    'Sledgehammers',
    'Spanners and adjustable wrenches',
    'Ring spanners and combination spanners',
    'Screwdrivers and screwdriver sets',
    'Pliers and cutting pliers',
    'Chisels',
    'Hacksaws and replacement blades',
    'Handsaws',
    'Trowels',
    'Spirit levels',
    'Water levels',
    'Plumb bobs',
    'Measuring tapes',
    'Crowbars and pry bars',
    'Pickaxes and mattocks',
    'Shovels and spades',
    'Wheelbarrows',
    'Wire cutters'
  ],
  power_tools: [
    'Angle grinders',
    'Demolition hammers',
    'Rotary hammers and hammer drills',
    'Cordless drills and impact drivers',
    'Circular saws',
    'Marble and tile cutters',
    'Concrete vibrators and needles',
    'Bar bending machines',
    'Bar cutting machines',
    'Core cutting machines',
    'Power trowels'
  ],
  electrical: [
    'Extension boards',
    'Diesel / petrol generators',
    'Cables and wires',
    'Conduit pipes and accessories',
    'MCBs and distribution boards',
    'Industrial plugs and sockets',
    'Inverters and UPS',
    'Temporary site lighting and floodlights',
    'Digital multimeters',
    'Earth testers',
    'Wire strippers and crimping tools'
  ],
  welding_cutting: [
    // Standard welding tools
    'Arc welding machines',
    'TIG welding machines',
    'MIG welding machines',
    'Gas cutting sets',
    'Welding electrodes and welding rods',
    'MIG/TIG welding consumables',
    'Gas cylinders',
    'Welding cables and holders',
    'Welding clamps and earth clamps',
    'Chipping hammers',
    'Steel wire brushes',
    // Section 3.I Fabrication & Steelwork materials
    'MS angles, channels and flats',
    'MS plates and sheets',
    'Structural beams and columns',
    'Square and rectangular hollow sections',
    'GI pipes and MS pipes',
    'Cutting and grinding discs',
    'Anti-spatter spray',
    'Metal primer and protective paint',
    'Bolts, nuts and washers',
    'Metal cutting blades'
  ],
  plumbing: [
    // Pipes & Fittings
    'UPVC pipes',
    'CPVC pipes',
    'PVC pipes',
    'GI pipes',
    'HDPE pipes',
    'Drainage and sewer pipes',
    'Fittings (elbows, tees, sockets, reducers, unions)',
    'Valves (ball, gate, check, foot)',
    'Bib cocks, stop cocks, and pillar cocks',
    'Water meters and float valves',
    'Water storage tanks',
    // Section 3.A Sanitary & Accessories
    'Washbasins, toilets and urinals',
    'Bathroom fittings and shower sets',
    'Floor traps and nahani traps',
    'Floor drains and gratings',
    'Pipe sealant and PTFE tape',
    'Solvent cement and primer'
  ],
  painting_finishing: [
    // Section 3.B Painting & Finishing
    'Interior primers and undercoats',
    'Exterior primers',
    'Interior and exterior paints',
    'Enamel paint',
    'Distemper',
    'Wall putty',
    'Plaster of Paris (POP)',
    'Thinners and cleaning solvents',
    'Waterproofing coatings',
    'Paint masking tape',
    'Sandpaper and sanding sheets',
    'Emery paper',
    'Paint brushes and rollers',
    'Paint trays and extension poles',
    'Putty knives and scrapers',
    'Paint buckets and mixing sticks',
    'Caulking guns and sealants',
    'Silicone sealant and acrylic sealant',
    'Paint spray guns',
    'Drop cloths and protective sheets'
  ],
  hardware_fasteners: [
    'Anchor bolts and expansion bolts',
    'Common nails and steel nails',
    'Wood screws and self-tapping screws',
    'Threaded rods, nuts, and washers',
    'Door hinges and butt hinges',
    'Tower bolts',
    'Door locks, handles, and latches',
    'Binding wire for reinforcement',
    'Wire mesh'
  ],
  shuttering_scaffolding: [
    'Scaffolding pipes and couplers',
    'Cuplock standards and ledgers',
    'Acrow props and adjustable steel props',
    'H-frames and walk boards',
    'MS shuttering plates',
    'Shuttering plywood sheets',
    'Tie rods, wing nuts, and water stoppers',
    'Formwork release oil',
    'Column clamps'
  ],
  // Section 3.C Adhesives, Tapes & Sealing Materials
  adhesives_sealants: [
    'Masking tape',
    'Duct tape',
    'Electrical insulation tape',
    'PVC pipe tape / PTFE tape',
    'Double-sided tape',
    'Aluminium foil tape',
    'Packaging tape',
    'Waterproofing tape',
    'Butyl sealing tape',
    'Thread-sealing compounds',
    'Epoxy adhesive',
    'Construction adhesive',
    'Tile adhesive',
    'Silicone sealant',
    'PU sealant',
    'Foam sealant',
    'Grout and joint fillers',
    'Waterproofing membranes'
  ],
  // Section 3.D Flooring, Tiles & Stonework
  flooring_tiles: [
    'Ceramic tiles and vitrified tiles',
    'Granite and marble',
    'Tile spacers and levelling clips',
    'Tile cutters and tile nippers',
    'Tile adhesive and grout',
    'Tile cleaning sponges',
    'Flooring screed materials',
    'Skirting tiles',
    'Stone polishing pads',
    'Marble cutting blades',
    'Flooring protection sheets',
    'Expansion joint profiles',
    'PVC flooring and laminate flooring',
    'Carpet and flooring adhesives'
  ],
  // Section 3.E Doors, Windows & Carpentry Materials
  doors_windows_carpentry: [
    'Wooden doors and frames',
    'Flush doors and laminated doors',
    'UPVC and aluminium windows',
    'Hinges and door handles',
    'Tower bolts and aldrops',
    'Door stoppers',
    'Mortise locks and cylinder locks',
    'Door closers',
    'Sliding door rollers and tracks',
    'Screws, nails and wood plugs',
    'Plywood, MDF and particle boards',
    'Laminates and edge-banding strips',
    'Wood adhesive',
    'Silicone sealant',
    'Door-frame anchors',
    'Glass panels and glazing beads',
    'Aluminium sections and accessories'
  ],
  // Section 3.F Waterproofing & Roofing Materials
  waterproofing_roofing: [
    'Waterproofing chemicals',
    'Bitumen coating',
    'Waterproofing membranes',
    'APP and SBS membranes',
    'Polyurethane waterproofing coatings',
    'Cementitious waterproofing compounds',
    'Roof sheets (GI and colour-coated)',
    'Polycarbonate sheets',
    'Ridge caps and flashing sheets',
    'Roofing screws and washers',
    'Rainwater gutters and downpipes',
    'Roof sealants',
    'Geotextile fabric',
    'Drainage boards',
    'Protective coatings'
  ],
  // Section 3.G Site Cleaning & General Consumables
  site_cleaning_consumables: [
    'Shovels and spades',
    'Pickaxes and crowbars',
    'Wheelbarrows',
    'Brooms and brushes',
    'Dustpans',
    'Buckets and plastic tubs',
    'Garbage bags and waste collection bins',
    'Cleaning cloths and cotton waste',
    'Mops and floor squeegees',
    'Scrub brushes',
    'Water hoses',
    'Rope and nylon cord',
    'Tarpaulins',
    'Plastic sheets',
    'Hessian cloth / gunny bags',
    'Drinking water cans',
    'Handwash and cleaning liquids',
    'Storage boxes and tool bags'
  ],
  // Section 3.H Surveying & Civil Engineering Equipment
  surveying_engineering: [
    'Auto level and dumpy level',
    'Total station',
    'Theodolite',
    'Laser level',
    'Survey tripod and staff',
    'Ranging rods',
    'Survey pegs and nails',
    'Measuring chain',
    'Cross-staff and offset rod',
    'GPS surveying equipment',
    'Rebar locator',
    'Concrete rebound hammer',
    'Concrete test cube moulds',
    'Slump cone set',
    'Vernier caliper',
    'Crack-width gauge',
    'Soil testing equipment'
  ],
  // Section 3.J Lifting, Material Handling & Site Logistics
  lifting_logistics: [
    'Chain pulley blocks',
    'Chain slings and wire-rope slings',
    'Shackles and eye bolts',
    'Webbing slings',
    'Manual and hydraulic pallet trucks',
    'Material trolleys',
    'Hand winches',
    'Hoists',
    'Lifting hooks',
    'Cargo ropes',
    'Ratchet tie-down straps',
    'Ladders (aluminium and fibreglass)',
    'Safety barricades',
    'Material storage racks',
    'Tool cabinets'
  ],
  // Regular Site-Use Materials
  regular_site_use: [
    'Sponges',
    'Cement Tubs',
    'Hammers',
    'Thapi',
    'Kharni',
    'Spade (Para) – Small',
    'Spade (Para) – Big',
    'Digging Bar (Gadda Para)',
    'Screwdrivers',
    'Cutting Pliers',
    'L-Square (Metni)',
    'Chisel',
    'Leveling Tool',
    'Spanners',
    'Testers',
    'Orange Helmets',
    'White Helmets',
    'Orange Jackets',
    'Green Jackets',
    'Power Sockets',
    'Tape (Small)',
    'Tape (Big)',
    'Electrical Tape',
    'Kandi Baddhalu',
    'Iron Stands',
    'Ladders',
    'Green Mat (50 m)',
    'Paint Brushes',
    'Paint Rollers'
  ]
};

export interface InitialItemSeedDef {
  name: string;
  subcategory: string;
  default_unit: string;
  min_stock_alert: number;
  is_reusable: boolean;
  specification?: string;
}

export const REGULAR_SITE_USE_SUBCATEGORIES = [
  'General Site Supplies',
  'Hand Tools & Masonry Tools',
  'Safety Items & Workwear',
  'Electrical Accessories',
  'Site Equipment & Other Supplies',
  'Painting Supplies'
] as const;

export const REGULAR_SITE_USE_DETAILED_ITEMS: InitialItemSeedDef[] = [
  // General Site Supplies
  {
    name: 'Sponges',
    subcategory: 'General Site Supplies',
    default_unit: 'Nos',
    min_stock_alert: 10,
    is_reusable: false,
    specification: 'High-density cleaning and masonry finishing sponge'
  },
  {
    name: 'Cement Tubs',
    subcategory: 'General Site Supplies',
    default_unit: 'Nos',
    min_stock_alert: 5,
    is_reusable: true,
    specification: 'Heavy-duty HDPE mortar & cement mixing tub'
  },

  // Hand Tools & Masonry Tools
  {
    name: 'Hammers',
    subcategory: 'Hand Tools & Masonry Tools',
    default_unit: 'Nos',
    min_stock_alert: 5,
    is_reusable: true,
    specification: 'Drop-forged steel claw & ball-peen site hammer'
  },
  {
    name: 'Thapi',
    subcategory: 'Hand Tools & Masonry Tools',
    default_unit: 'Nos',
    min_stock_alert: 5,
    is_reusable: true,
    specification: 'Masonry plastering finishing trowel (Thapi)'
  },
  {
    name: 'Kharni',
    subcategory: 'Hand Tools & Masonry Tools',
    default_unit: 'Nos',
    min_stock_alert: 5,
    is_reusable: true,
    specification: 'Bricklaying pointed trowel (Kharni)'
  },
  {
    name: 'Spade (Para) – Small',
    subcategory: 'Hand Tools & Masonry Tools',
    default_unit: 'Nos',
    min_stock_alert: 4,
    is_reusable: true,
    specification: 'Small steel excavation spade with wooden handle'
  },
  {
    name: 'Spade (Para) – Big',
    subcategory: 'Hand Tools & Masonry Tools',
    default_unit: 'Nos',
    min_stock_alert: 4,
    is_reusable: true,
    specification: 'Large heavy-duty steel spade (Para) for earthwork & batching'
  },
  {
    name: 'Digging Bar (Gadda Para)',
    subcategory: 'Hand Tools & Masonry Tools',
    default_unit: 'Nos',
    min_stock_alert: 3,
    is_reusable: true,
    specification: '5-foot solid steel digging crowbar (Gadda Para)'
  },
  {
    name: 'Screwdrivers',
    subcategory: 'Hand Tools & Masonry Tools',
    default_unit: 'Sets',
    min_stock_alert: 4,
    is_reusable: true,
    specification: 'Insulated flat-head & Phillips screwdriver set'
  },
  {
    name: 'Cutting Pliers',
    subcategory: 'Hand Tools & Masonry Tools',
    default_unit: 'Nos',
    min_stock_alert: 4,
    is_reusable: true,
    specification: '8-inch combination wire cutting pliers'
  },
  {
    name: 'L-Square (Metni)',
    subcategory: 'Hand Tools & Masonry Tools',
    default_unit: 'Nos',
    min_stock_alert: 3,
    is_reusable: true,
    specification: 'Steel 90-degree right angle masonry square (Metni)'
  },
  {
    name: 'Chisel',
    subcategory: 'Hand Tools & Masonry Tools',
    default_unit: 'Nos',
    min_stock_alert: 5,
    is_reusable: true,
    specification: 'Cold chisel & pointed masonry chipping chisel'
  },
  {
    name: 'Leveling Tool',
    subcategory: 'Hand Tools & Masonry Tools',
    default_unit: 'Nos',
    min_stock_alert: 3,
    is_reusable: true,
    specification: 'Spirit level with magnetic base & water level tube'
  },
  {
    name: 'Spanners',
    subcategory: 'Hand Tools & Masonry Tools',
    default_unit: 'Sets',
    min_stock_alert: 3,
    is_reusable: true,
    specification: 'Open-ended and ring spanner set (8mm - 32mm)'
  },
  {
    name: 'Testers',
    subcategory: 'Hand Tools & Masonry Tools',
    default_unit: 'Nos',
    min_stock_alert: 5,
    is_reusable: true,
    specification: '500V electrical neon mains test screwdriver'
  },

  // Safety Items & Workwear
  {
    name: 'Orange Helmets',
    subcategory: 'Safety Items & Workwear',
    default_unit: 'Nos',
    min_stock_alert: 10,
    is_reusable: true,
    specification: 'Industrial safety helmet - High visibility orange (Labour/Mason)'
  },
  {
    name: 'White Helmets',
    subcategory: 'Safety Items & Workwear',
    default_unit: 'Nos',
    min_stock_alert: 10,
    is_reusable: true,
    specification: 'Industrial safety helmet - White (Engineers/Supervisors/Visitors)'
  },
  {
    name: 'Orange Jackets',
    subcategory: 'Safety Items & Workwear',
    default_unit: 'Nos',
    min_stock_alert: 10,
    is_reusable: true,
    specification: 'Fluorescent orange reflective safety vest with 2-inch tape'
  },
  {
    name: 'Green Jackets',
    subcategory: 'Safety Items & Workwear',
    default_unit: 'Nos',
    min_stock_alert: 10,
    is_reusable: true,
    specification: 'Fluorescent green reflective safety vest with 2-inch tape'
  },

  // Electrical Accessories
  {
    name: 'Power Sockets',
    subcategory: 'Electrical Accessories',
    default_unit: 'Nos',
    min_stock_alert: 8,
    is_reusable: false,
    specification: '16A / 6A multi-pin industrial & temporary site distribution socket'
  },
  {
    name: 'Tape (Small)',
    subcategory: 'Electrical Accessories',
    default_unit: 'Rolls',
    min_stock_alert: 10,
    is_reusable: false,
    specification: 'Small width adhesive / masking tape roll'
  },
  {
    name: 'Tape (Big)',
    subcategory: 'Electrical Accessories',
    default_unit: 'Rolls',
    min_stock_alert: 10,
    is_reusable: false,
    specification: 'Wide packaging & surface masking tape roll (2-inch)'
  },
  {
    name: 'Electrical Tape',
    subcategory: 'Electrical Accessories',
    default_unit: 'Rolls',
    min_stock_alert: 12,
    is_reusable: false,
    specification: 'PVC flame-retardant electrical insulation tape'
  },

  // Site Equipment & Other Supplies
  {
    name: 'Kandi Baddhalu',
    subcategory: 'Site Equipment & Other Supplies',
    default_unit: 'Sets',
    min_stock_alert: 4,
    is_reusable: true,
    specification: 'Masonry screed leveling battens / straight-edge battis (Kandi Baddhalu)'
  },
  {
    name: 'Iron Stands',
    subcategory: 'Site Equipment & Other Supplies',
    default_unit: 'Nos',
    min_stock_alert: 6,
    is_reusable: true,
    specification: 'Steel tripod / plastering trestle staging iron stand'
  },
  {
    name: 'Ladders',
    subcategory: 'Site Equipment & Other Supplies',
    default_unit: 'Nos',
    min_stock_alert: 2,
    is_reusable: true,
    specification: 'Heavy-duty aluminium A-type 10-step ladder'
  },
  {
    name: 'Green Mat (50 m)',
    subcategory: 'Site Equipment & Other Supplies',
    default_unit: 'Rolls',
    min_stock_alert: 2,
    is_reusable: false,
    specification: '50-meter green agro-shade netting / building dust barrier mesh'
  },

  // Painting Supplies
  {
    name: 'Paint Brushes',
    subcategory: 'Painting Supplies',
    default_unit: 'Nos',
    min_stock_alert: 10,
    is_reusable: false,
    specification: 'Professional masonry & emulsion paint brushes (2", 3", 4")'
  },
  {
    name: 'Paint Rollers',
    subcategory: 'Painting Supplies',
    default_unit: 'Nos',
    min_stock_alert: 6,
    is_reusable: false,
    specification: '9-inch wall paint roller with heavy-duty handle & sleeve'
  }
];
